#!/usr/bin/env node
// ============================================================
// scripts/update.mjs
// Pull latest, install deps, apply pending SQL migrations,
// then rebuild. Driven by DATABASE_URL in .env.local.
// ============================================================
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");
const MIGRATIONS_DIR = join(ROOT, "migrations");

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const args = new Set(process.argv.slice(2));
const SKIP_PULL = args.has("--no-pull");
const SKIP_BUILD = args.has("--no-build");
const SKIP_INSTALL = args.has("--no-install");

function header(text) {
  console.log(`\n${C.bold}${C.cyan}━━ ${text} ━━${C.reset}`);
}

function ok(text) {
  console.log(`${C.green}✓${C.reset} ${text}`);
}

function warn(text) {
  console.log(`${C.yellow}!${C.reset} ${text}`);
}

function fail(text) {
  console.log(`${C.red}✗${C.reset} ${text}`);
}

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    fail(`.env.local not found at ${ENV_PATH}`);
    console.log(`Run ${C.bold}npm run setup${C.reset} (or ./setup.command) first.`);
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", cwd: ROOT, ...opts });
  if (r.status !== 0) {
    fail(`${cmd} ${cmdArgs.join(" ")} exited with code ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}╭─────────────────────────────────────────╮${C.reset}`);
  console.log(`${C.bold}${C.cyan}│${C.reset}        ${C.bold}Meridian Update${C.reset}                  ${C.bold}${C.cyan}│${C.reset}`);
  console.log(`${C.bold}${C.cyan}╰─────────────────────────────────────────╯${C.reset}`);

  // ── 1. Pull latest ──────────────────────────────────────────────────
  if (!SKIP_PULL && existsSync(join(ROOT, ".git"))) {
    header("Git pull");
    const before = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim();
    run("git", ["pull", "--ff-only"]);
    const after = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim();
    if (before === after) {
      ok("Already up to date.");
    } else {
      ok(`Updated ${before?.slice(0, 7)} → ${after?.slice(0, 7)}`);
    }
  } else if (SKIP_PULL) {
    warn("Skipping git pull (--no-pull)");
  }

  // ── 2. Install deps ─────────────────────────────────────────────────
  if (!SKIP_INSTALL) {
    header("Install dependencies");
    run("npm", ["install"]);
    ok("Dependencies up to date.");
  }

  // ── 3. Migrations ───────────────────────────────────────────────────
  header("Apply migrations");
  const env = loadEnv();
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    fail("DATABASE_URL is missing from .env.local.");
    console.log(
      `Re-run ${C.bold}npm run setup${C.reset} to add it. The wizard will prompt for the\n` +
      `Postgres connection string from Supabase → Settings → Database.`,
    );
    process.exit(1);
  }

  // Lazy-require pg so missing-deps don't crash the very first install run.
  let Pool;
  try {
    ({ Pool } = await import("pg"));
  } catch {
    fail("The `pg` package is not installed. Re-run `npm install`.");
    process.exit(1);
  }

  // Supabase connection strings often need SSL; pg accepts ?sslmode=require
  // or we can let Pool's default config handle it. Force SSL with reject=false
  // since Supabase's CA isn't always in Node's bundled trust store.
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists _meridian_migrations (
        id          text primary key,
        applied_at  timestamptz not null default now()
      )
    `);

    // Detect existing manually-applied schema. If `pillars` exists but the
    // migrations table is empty, baseline 001 is already in effect — pre-mark
    // it so re-running idempotent CREATEs doesn't duplicate work or trip
    // policy/constraint conflicts in the future.
    const { rows: applied } = await client.query(
      `select id from _meridian_migrations`,
    );
    if (applied.length === 0) {
      const { rows: probe } = await client.query(`
        select 1 as has_pillars
        from information_schema.tables
        where table_schema = 'public' and table_name = 'pillars'
        limit 1
      `);
      if (probe.length > 0) {
        warn("Detected existing schema — marking 001_initial as applied without running it.");
        await client.query(
          `insert into _meridian_migrations (id) values ($1) on conflict do nothing`,
          ["001_initial"],
        );
      }
    }

    const appliedIds = new Set(
      (await client.query(`select id from _meridian_migrations`)).rows.map((r) => r.id),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{3}_.+\.sql$/.test(f))
      .sort();

    if (files.length === 0) {
      warn("No migrations found in migrations/.");
    }

    let appliedCount = 0;
    for (const file of files) {
      const id = file.replace(/\.sql$/, "");
      if (appliedIds.has(id)) {
        console.log(`${C.dim}skip${C.reset}  ${id}`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`${C.cyan}apply${C.reset} ${id}…`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          `insert into _meridian_migrations (id) values ($1)`,
          [id],
        );
        await client.query("commit");
        appliedCount++;
        ok(`${id} applied.`);
      } catch (err) {
        await client.query("rollback");
        fail(`${id} failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    }

    if (appliedCount === 0) {
      ok("Database already up to date.");
    } else {
      ok(`${appliedCount} migration${appliedCount === 1 ? "" : "s"} applied.`);
    }
  } finally {
    client.release();
    await pool.end();
  }

  // ── 4. Build ────────────────────────────────────────────────────────
  if (!SKIP_BUILD) {
    header("Build");
    run("npm", ["run", "build"]);
    ok("Build complete.");
  }

  console.log(`\n${C.green}${C.bold}✓ Update finished.${C.reset}`);
  console.log(
    `Start the app with ${C.bold}./start.command${C.reset} ` +
    `(${C.bold}start.bat${C.reset} on Windows) or ${C.bold}npm run dev${C.reset}.\n`,
  );
}

main().catch((err) => {
  fail(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

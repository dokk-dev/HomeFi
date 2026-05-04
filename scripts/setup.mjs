#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

const rl = createInterface({ input: stdin, output: stdout });

function header(text) {
  console.log(`\n${C.bold}${C.cyan}━━ ${text} ━━${C.reset}`);
}

function note(text) {
  console.log(`${C.dim}${text}${C.reset}`);
}

async function ask(label, { default: def, secret = false, required = false, help } = {}) {
  if (help) note(help);
  const suffix = def ? ` ${C.dim}(${def})${C.reset}` : required ? ` ${C.yellow}(required)${C.reset}` : ` ${C.dim}(optional, Enter to skip)${C.reset}`;
  while (true) {
    const answer = (await rl.question(`${C.bold}${label}${C.reset}${suffix}: `)).trim();
    if (!answer && def) return def;
    if (!answer && required) {
      console.log(`${C.red}This field is required.${C.reset}`);
      continue;
    }
    return answer;
  }
}

async function confirm(label, def = false) {
  const yn = def ? "[Y/n]" : "[y/N]";
  const a = (await rl.question(`${label} ${yn} `)).trim().toLowerCase();
  if (!a) return def;
  return a.startsWith("y");
}

function maskExisting(existing) {
  // Parse current .env.local into a map for showing as defaults
  const map = {};
  if (!existing) return map;
  for (const line of existing.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return map;
}

function quote(v) {
  if (v === "" || v === undefined || v === null) return "";
  if (/[\s#"'$`\\]/.test(v)) return `"${v.replace(/"/g, '\\"')}"`;
  return v;
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}╭─────────────────────────────────────────╮${C.reset}`);
  console.log(`${C.bold}${C.cyan}│${C.reset}      ${C.bold}MyFi / Meridian Setup Wizard${C.reset}      ${C.bold}${C.cyan}│${C.reset}`);
  console.log(`${C.bold}${C.cyan}╰─────────────────────────────────────────╯${C.reset}`);
  console.log(`\nThis wizard will create ${C.bold}.env.local${C.reset} with your personal config.`);
  console.log(`Press ${C.bold}Enter${C.reset} to accept defaults or skip optional fields.\n`);

  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const current = maskExisting(existing);

  if (existing) {
    const overwrite = await confirm(
      `${C.yellow}.env.local already exists.${C.reset} Update it (your current values will be shown as defaults)?`,
      true,
    );
    if (!overwrite) {
      console.log("Aborted. No changes made.");
      rl.close();
      return;
    }
  }

  // ── NextAuth ──
  header("NextAuth (sign-in core)");
  const NEXTAUTH_URL = await ask("App URL", {
    default: current.NEXTAUTH_URL || "http://localhost:3000",
    help: "Where the app runs. Use the localhost default unless you're deploying.",
  });

  let NEXTAUTH_SECRET = current.NEXTAUTH_SECRET || "";
  if (!NEXTAUTH_SECRET) {
    NEXTAUTH_SECRET = randomBytes(32).toString("base64");
    console.log(`${C.green}✓ Auto-generated NEXTAUTH_SECRET${C.reset}`);
  } else {
    console.log(`${C.green}✓ Keeping existing NEXTAUTH_SECRET${C.reset}`);
  }

  // ── Supabase ──
  header("Supabase (database)");
  note("Get these at: https://app.supabase.com → your project → Settings → API");
  const NEXT_PUBLIC_SUPABASE_URL = await ask("Project URL", {
    default: current.NEXT_PUBLIC_SUPABASE_URL,
    required: !current.NEXT_PUBLIC_SUPABASE_URL,
    help: "Looks like: https://xxxxx.supabase.co",
  });
  const NEXT_PUBLIC_SUPABASE_ANON_KEY = await ask("Anon (public) key", {
    default: current.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    required: !current.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  const SUPABASE_SERVICE_ROLE_KEY = await ask("Service role key", {
    default: current.SUPABASE_SERVICE_ROLE_KEY,
    required: !current.SUPABASE_SERVICE_ROLE_KEY,
    help: "Keep this secret — it bypasses Row Level Security.",
  });
  note("");
  note("Postgres connection string (used by the update script to apply migrations).");
  note("Find it in Supabase → Project Settings → Database → Connection string → URI.");
  note("Replace [YOUR-PASSWORD] with your DB password.");
  const DATABASE_URL = await ask("Postgres connection URL", {
    default: current.DATABASE_URL,
    help: "Looks like: postgresql://postgres:<password>@db.xxxx.supabase.co:5432/postgres",
  });

  // ── OAuth: GitHub ──
  header("GitHub OAuth (sign-in provider)");
  note("Skip both if you only plan to use Google. Setup guide:");
  note("https://github.com/settings/developers → New OAuth App");
  note(`  Homepage URL:    ${NEXTAUTH_URL}`);
  note(`  Callback URL:    ${NEXTAUTH_URL}/api/auth/callback/github`);
  const GITHUB_CLIENT_ID = await ask("GitHub Client ID", { default: current.GITHUB_CLIENT_ID });
  const GITHUB_CLIENT_SECRET = await ask("GitHub Client Secret", { default: current.GITHUB_CLIENT_SECRET });

  // ── OAuth: Google ──
  header("Google OAuth (sign-in provider)");
  note("Skip both if you only plan to use GitHub. Setup guide:");
  note("https://console.cloud.google.com → APIs & Services → Credentials");
  note(`  Authorized redirect URI: ${NEXTAUTH_URL}/api/auth/callback/google`);
  const GOOGLE_CLIENT_ID = await ask("Google Client ID", { default: current.GOOGLE_CLIENT_ID });
  const GOOGLE_CLIENT_SECRET = await ask("Google Client Secret", { default: current.GOOGLE_CLIENT_SECRET });

  if (!GITHUB_CLIENT_ID && !GOOGLE_CLIENT_ID) {
    console.log(`${C.yellow}⚠  No OAuth provider configured — sign-in won't work yet.${C.reset}`);
    console.log(`${C.yellow}   Re-run this wizard once you've registered at least one.${C.reset}`);
  }

  // ── Notion (optional integration) ──
  header("Notion integration (optional — skip if you don't want sync)");
  note("Create a public OAuth integration: https://www.notion.so/my-integrations");
  note(`  Redirect URI: ${NEXTAUTH_URL}/api/integrations/notion/callback`);
  const NOTION_CLIENT_ID = await ask("Notion Client ID", { default: current.NOTION_CLIENT_ID });
  const NOTION_CLIENT_SECRET = await ask("Notion Client Secret", { default: current.NOTION_CLIENT_SECRET });
  const NOTION_REDIRECT_URI = await ask("Notion Redirect URI", {
    default: current.NOTION_REDIRECT_URI || `${NEXTAUTH_URL}/api/integrations/notion/callback`,
  });

  // ── Ollama ──
  header("Ollama (required — local AI provider)");
  note("Install from https://ollama.com if you don't have it. After install, run:");
  note("  ollama serve");
  note("  ollama pull llama3");
  const OLLAMA_BASE_URL = await ask("Ollama base URL", {
    default: current.OLLAMA_BASE_URL || "http://localhost:11434",
  });
  const OLLAMA_MODEL = await ask("Ollama model", {
    default: current.OLLAMA_MODEL || "llama3",
    help: "The model name as installed via `ollama pull <name>`.",
  });

  // ── Write ──
  const out = `# Generated by scripts/setup.mjs on ${new Date().toISOString()}
# Re-run with: npm run setup

# ── NextAuth ──
NEXTAUTH_URL=${quote(NEXTAUTH_URL)}
NEXTAUTH_SECRET=${quote(NEXTAUTH_SECRET)}

# ── GitHub OAuth ──
GITHUB_CLIENT_ID=${quote(GITHUB_CLIENT_ID)}
GITHUB_CLIENT_SECRET=${quote(GITHUB_CLIENT_SECRET)}

# ── Google OAuth ──
GOOGLE_CLIENT_ID=${quote(GOOGLE_CLIENT_ID)}
GOOGLE_CLIENT_SECRET=${quote(GOOGLE_CLIENT_SECRET)}

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=${quote(NEXT_PUBLIC_SUPABASE_URL)}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${quote(NEXT_PUBLIC_SUPABASE_ANON_KEY)}
SUPABASE_SERVICE_ROLE_KEY=${quote(SUPABASE_SERVICE_ROLE_KEY)}
DATABASE_URL=${quote(DATABASE_URL)}

# ── Notion (optional integration) ──
NOTION_CLIENT_ID=${quote(NOTION_CLIENT_ID)}
NOTION_CLIENT_SECRET=${quote(NOTION_CLIENT_SECRET)}
NOTION_REDIRECT_URI=${quote(NOTION_REDIRECT_URI)}

# ── Ollama ──
OLLAMA_BASE_URL=${quote(OLLAMA_BASE_URL)}
OLLAMA_MODEL=${quote(OLLAMA_MODEL)}
`;

  writeFileSync(ENV_PATH, out, { mode: 0o600 });
  console.log(`\n${C.green}${C.bold}✓ Wrote ${ENV_PATH}${C.reset}`);

  // ── Final reminders ──
  header("Next steps");
  if (DATABASE_URL) {
    console.log(`1. ${C.bold}Apply database schema:${C.reset} ${C.cyan}./update.command${C.reset} (or ${C.cyan}npm run update${C.reset})`);
    console.log(`   This applies all SQL migrations to your Supabase project.`);
  } else {
    console.log(`1. ${C.yellow}DATABASE_URL was skipped${C.reset} — re-run setup to enable automatic migrations.`);
    console.log(`   For now, paste ${C.bold}migrations/*.sql${C.reset} into Supabase → SQL Editor manually.`);
  }
  console.log(`2. ${C.bold}Start the app:${C.reset} ${C.cyan}./start.command${C.reset} (or ${C.cyan}npm run dev${C.reset})`);
  console.log(`   Then open ${C.cyan}${NEXTAUTH_URL}${C.reset}\n`);

  rl.close();
}

main().catch((err) => {
  console.error(`\n${C.red}Setup failed:${C.reset}`, err.message);
  rl.close();
  process.exit(1);
});

"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import Image from "next/image";
import {
  User, Layout, Bell, Shield,
  Moon, Sun, SunMoon, BellOff, Music, Archive,
  Check, Camera, Sparkles,
} from "lucide-react";
import { ICON_REGISTRY, PILLAR_ICONS } from "@/lib/icons/pillarIcons";

type Tab = "profile" | "workspace" | "notifications" | "security";
type Theme = "dark" | "light" | "auto";

const PILLAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

interface PillarRow { id: string; slug: string; label: string; color: string; }
interface Props { name: string; email: string; avatarUrl: string | null; pillars: PillarRow[]; }

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={onChange}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? "bg-primary" : "bg-surface-container-highest"}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export function SettingsClient({ name, email, avatarUrl, pillars }: Props) {
  const { update: updateSession } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile
  const [displayName, setDisplayName] = useState(name);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(avatarUrl);
  const [profileSaved, setProfileSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Appearance
  const [theme, setTheme] = useState<Theme>("dark");
  // Notifications
  const [blockNotifs, setBlockNotifs] = useState(false);
  const [playMusic, setPlayMusic] = useState(false);
  const [autoArchive, setAutoArchive] = useState(true);

  // Workspace
  const initValues = () => Object.fromEntries(pillars.map((p) => [p.id, { label: p.label, color: p.color }]));
  const [pillarDrafts, setPillarDrafts] = useState<Record<string, { label: string; color: string }>>(initValues);
  const [pillarBases, setPillarBases] = useState<Record<string, { label: string; color: string }>>(initValues);
  const [pillarSaving, setPillarSaving] = useState<Record<string, boolean>>({});
  const [pillarSaved, setPillarSaved] = useState<Record<string, boolean>>({});
  const [iconOverrides, setIconOverrides] = useState<Record<string, string>>({});
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);

  // Security
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("meridian-prefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.theme) { setTheme(p.theme); applyTheme(p.theme as Theme); }
        if (typeof p.blockNotifs === "boolean") setBlockNotifs(p.blockNotifs);
        if (typeof p.playMusic === "boolean") setPlayMusic(p.playMusic);
        if (typeof p.autoArchive === "boolean") setAutoArchive(p.autoArchive);
      }
      const ov = localStorage.getItem("meridian-icon-overrides");
      if (ov) setIconOverrides(JSON.parse(ov));
    } catch {}
  }, []);

  function applyTheme(t: Theme) {
    const prefersDark =
      t === "dark" ||
      (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    function switchTheme() {
      document.documentElement.classList.toggle("dark", prefersDark);
    }

    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition) {
      doc.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  }

  function savePrefs(updates: object) {
    try {
      const cur = JSON.parse(localStorage.getItem("meridian-prefs") ?? "{}");
      localStorage.setItem("meridian-prefs", JSON.stringify({ ...cur, ...updates }));
    } catch {}
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Optimistic preview
    const blobUrl = URL.createObjectURL(file);
    setPreviewAvatar(blobUrl);
    window.dispatchEvent(new CustomEvent("avatar-changed", { detail: { url: blobUrl } }));

    // Upload to Supabase Storage
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      setPreviewAvatar(url);
      window.dispatchEvent(new CustomEvent("avatar-changed", { detail: { url } }));
      await updateSession();
    }
  }

  async function handleSaveProfile() {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    await updateSession();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
    toast("Profile saved");
  }

  async function handleSavePillar(pillarId: string) {
    const draft = pillarDrafts[pillarId];
    if (!draft) return;
    setPillarSaving((s) => ({ ...s, [pillarId]: true }));
    try {
      await fetch(`/api/pillars/${pillarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: draft.label, color: draft.color }),
      });
      setPillarBases((b) => ({ ...b, [pillarId]: { ...draft } }));
      setPillarSaved((s) => ({ ...s, [pillarId]: true }));
      setTimeout(() => setPillarSaved((s) => ({ ...s, [pillarId]: false })), 2500);
      toast("Pillar saved");
      // Notify sidebar so label updates without a page refresh
      const pillar = pillars.find((p) => p.id === pillarId);
      if (pillar) {
        window.dispatchEvent(new CustomEvent("pillar-label-changed", {
          detail: { slug: pillar.slug, label: draft.label, color: draft.color },
        }));
      }
    } finally {
      setPillarSaving((s) => ({ ...s, [pillarId]: false }));
    }
  }

  function handleIconSelect(slug: string, iconName: string) {
    const updated = { ...iconOverrides, [slug]: iconName };
    setIconOverrides(updated);
    setOpenPickerFor(null);
    try {
      localStorage.setItem("meridian-icon-overrides", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("icon-overrides-changed"));
    } catch {}
  }

  const TABS = [
    { key: "profile" as Tab, label: "Profile", icon: User },
    { key: "workspace" as Tab, label: "Workspace", icon: Layout },
    { key: "notifications" as Tab, label: "Notifications", icon: Bell },
    { key: "security" as Tab, label: "Security", icon: Shield },
  ];

  const THEMES = [
    { key: "dark" as Theme, label: "Dark", icon: <Moon size={18} /> },
    { key: "light" as Theme, label: "Light", icon: <Sun size={18} /> },
    { key: "auto" as Theme, label: "Auto", icon: <SunMoon size={18} /> },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
      {/* ── Tab nav ─────────────────────────────────────────────────── */}
      <nav className="flex md:flex-col md:w-56 md:flex-shrink-0 border-b md:border-b-0 md:border-r border-outline-variant/10 md:py-8 md:px-3 md:space-y-1 overflow-x-auto px-3 pt-4 pb-0 gap-1 md:gap-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline px-3 mb-2 md:mb-4 hidden md:block">Settings</p>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap flex-shrink-0 md:w-full ${
              activeTab === key
                ? "bg-primary/10 text-primary font-semibold border-b-2 md:border-b-0 border-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-2xl w-full space-y-8">

          {/* ── PROFILE ─────────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <>
              <div>
                <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">Profile</h1>
                <p className="text-on-surface-variant text-sm mt-1">Manage your identity and appearance.</p>
              </div>

              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6 md:gap-8">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-surface-container-highest overflow-hidden">
                      {previewAvatar ? (
                        <Image src={previewAvatar} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" unoptimized={previewAvatar.startsWith("blob:")} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary text-2xl font-bold font-headline">
                          {(name || "?")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md hover:opacity-80 transition-opacity"
                    >
                      <Camera size={12} color="white" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                  </div>

                  <div className="flex-1 space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Display Name</label>
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-surface-container rounded-lg px-4 py-3 text-on-surface text-sm border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Email Address</label>
                      <input type="email" value={email} disabled
                        className="w-full bg-surface-container/50 rounded-lg px-4 py-3 text-on-surface-variant text-sm border border-outline-variant/10 cursor-not-allowed" />
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleSaveProfile}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-headline font-bold text-white transition-all hover:opacity-90 active:scale-95"
                        style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}>
                        {profileSaved ? <><Check size={15} /> Saved</> : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6 space-y-7">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-4">Interface Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map(({ key, label, icon }) => (
                      <button key={key} onClick={() => { setTheme(key); savePrefs({ theme: key }); applyTheme(key); }}
                        className={`flex flex-col items-center gap-2.5 py-4 rounded-xl border transition-colors ${
                          theme === key ? "border-primary/50 bg-primary/10 text-primary" : "border-outline-variant/20 text-outline hover:border-outline-variant/40 hover:text-on-surface-variant"
                        }`}>
                        {icon}
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── WORKSPACE ───────────────────────────────────────────── */}
          {activeTab === "workspace" && (
            <>
              <div>
                <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">Workspace</h1>
                <p className="text-on-surface-variant text-sm mt-1">Customize your learning pillars.</p>
              </div>

              <div className="space-y-4">
                {pillars.map((pillar) => {
                  const draft = pillarDrafts[pillar.id] ?? { label: pillar.label, color: pillar.color };
                  const base = pillarBases[pillar.id] ?? { label: pillar.label, color: pillar.color };
                  const isDirty = draft.label !== base.label || draft.color !== base.color;
                  const isSaving = pillarSaving[pillar.id];
                  const isSaved = pillarSaved[pillar.id];
                  const overrideKey = iconOverrides[pillar.slug];
                  const Icon = (overrideKey ? ICON_REGISTRY[overrideKey] : null) ?? PILLAR_ICONS[pillar.slug];
                  const defaultIconKey = Object.entries(ICON_REGISTRY).find(([, v]) => v === PILLAR_ICONS[pillar.slug])?.[0];
                  const currentIconKey = overrideKey ?? defaultIconKey;
                  const isPickerOpen = openPickerFor === pillar.slug;

                  return (
                    <div key={pillar.id} className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Icon picker */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenPickerFor(isPickerOpen ? null : pillar.slug)}
                            className="w-11 h-11 rounded-xl flex items-center justify-center border-2 hover:scale-105 transition-transform"
                            style={{ backgroundColor: `${draft.color}15`, borderColor: `${draft.color}40` }}
                            title="Change icon"
                          >
                            {Icon && <Icon size={20} style={{ color: draft.color }} />}
                          </button>
                          {isPickerOpen && (
                            <div className="absolute left-0 top-13 z-50 bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-4 shadow-2xl w-60" style={{ top: "52px" }}>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Choose Icon</p>
                              <div className="grid grid-cols-5 gap-1.5">
                                {Object.entries(ICON_REGISTRY).map(([key, IconComp]) => (
                                  <button key={key} onClick={() => handleIconSelect(pillar.slug, key)}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                      key === currentIconKey ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                                    }`}>
                                    <IconComp size={16} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Label */}
                        <input
                          type="text"
                          value={draft.label}
                          onChange={(e) => setPillarDrafts((d) => ({ ...d, [pillar.id]: { ...draft, label: e.target.value } }))}
                          className="flex-1 bg-surface-container rounded-lg px-4 py-2 text-on-surface text-sm border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all font-semibold"
                        />

                        {/* Color swatches */}
                        <div className="flex gap-1.5 flex-wrap max-w-[112px]">
                          {PILLAR_COLORS.map((c) => (
                            <button key={c} onClick={() => setPillarDrafts((d) => ({ ...d, [pillar.id]: { ...draft, color: c } }))}
                              className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                              style={{ backgroundColor: c, outline: draft.color === c ? `2px solid ${c}` : "2px solid transparent", outlineOffset: "2px" }} />
                          ))}
                        </div>

                        {/* Save */}
                        <button
                          onClick={() => handleSavePillar(pillar.id)}
                          disabled={!isDirty && !isSaved || isSaving}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                            isSaved ? "bg-emerald-500/20 text-emerald-400" : isDirty ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-surface-container text-outline cursor-not-allowed"
                          }`}
                        >
                          {isSaving ? "Saving…" : isSaved ? <><Check size={12} /> Saved</> : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── NOTIFICATIONS ───────────────────────────────────────── */}
          {activeTab === "notifications" && (
            <>
              <div>
                <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">Notifications</h1>
                <p className="text-on-surface-variant text-sm mt-1">Configure your focus environment.</p>
              </div>
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-8">
                <div className="flex items-start justify-between mb-7">
                  <div>
                    <h2 className="text-xl font-headline font-bold text-on-surface">Focus Mode</h2>
                    <p className="text-on-surface-variant text-sm mt-1">Preferences for deep work sessions.</p>
                  </div>
                  <Sparkles size={20} className="text-primary mt-1 flex-shrink-0" />
                </div>
                <div className="space-y-4">
                  {[
                    { key: "blockNotifs", label: "Block Notifications", desc: "Suppress all alerts during focus", icon: <BellOff size={18} className="text-on-surface-variant" />, val: blockNotifs, fn: () => { const v = !blockNotifs; setBlockNotifs(v); savePrefs({ blockNotifs: v }); } },
                    { key: "playMusic", label: "Play Focus Music", desc: "Auto-start lo-fi on session begin", icon: <Music size={18} className="text-on-surface-variant" />, val: playMusic, fn: () => { const v = !playMusic; setPlayMusic(v); savePrefs({ playMusic: v }); } },
                    { key: "autoArchive", label: "Auto-Archive Tasks", desc: "Clean up completed items automatically", icon: <Archive size={18} className="text-on-surface-variant" />, val: autoArchive, fn: () => { const v = !autoArchive; setAutoArchive(v); savePrefs({ autoArchive: v }); } },
                  ].map(({ key, label, desc, icon, val, fn }) => (
                    <div key={key} className="flex items-center gap-4 bg-surface-container rounded-xl p-5 border border-outline-variant/10">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">{label}</p>
                        <p className="text-xs text-outline mt-0.5">{desc}</p>
                      </div>
                      <Toggle checked={val} onChange={fn} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── SECURITY ────────────────────────────────────────────── */}
          {activeTab === "security" && (
            <>
              <div>
                <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">Security</h1>
                <p className="text-on-surface-variant text-sm mt-1">Manage account security and data.</p>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 flex items-center justify-between gap-8">
                <div>
                  <h3 className="text-base font-headline font-bold text-red-400 mb-1">Deactivate Workspace</h3>
                  <p className="text-sm text-on-surface-variant">Permanently delete your workspace and all associated data.</p>
                </div>
                {deleteConfirm ? (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-red-300 whitespace-nowrap">Are you sure?</span>
                    <button onClick={() => setDeleteConfirm(false)} className="text-xs font-semibold text-outline hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg border border-outline-variant/20">Cancel</button>
                    <button className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors px-3 py-1.5 rounded-lg" onClick={() => { setDeleteConfirm(false); /* TODO: DELETE /api/account */ }}>Confirm Delete</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)} className="text-[11px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors whitespace-nowrap px-4 py-2 rounded-lg border border-red-500/20 hover:border-red-400/40 flex-shrink-0">
                    Delete Account
                  </button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

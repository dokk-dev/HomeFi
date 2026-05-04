"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import Image from "next/image";
import {
  User, Layout, Bell, Shield, Plug,
  Moon, Sun, SunMoon, BellOff, Music, Archive,
  Check, Camera, Sparkles, Plus, Trash2, Target,
  Link2, RefreshCw, AlertCircle,
} from "lucide-react";
import { ICON_REGISTRY, resolveIcon } from "@/lib/icons/pillarIcons";
import { CompetencyEditor } from "@/components/pillars/CompetencyEditor";
import type { CompetencyArea } from "@/lib/types";

type Tab = "profile" | "workspace" | "integrations" | "notifications" | "security";
type Theme = "dark" | "light" | "auto";

interface NotionSyncSettings {
  tasks: boolean;
  pillars: boolean;
  chat: boolean;
  quiz: boolean;
}

interface NotionInfo {
  configured: boolean;
  connected: boolean;
  workspaceName: string | null;
  lastSyncedAt: string | null;
  settings: NotionSyncSettings;
}

const PILLAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

interface PillarRow {
  id: string;
  slug: string;
  label: string;
  color: string;
  icon_key: string | null;
  competency_areas?: CompetencyArea[];
}
interface Props {
  name: string;
  email: string;
  avatarUrl: string | null;
  pillars: PillarRow[];
  notion: NotionInfo;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={onChange}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? "bg-primary" : "bg-surface-container-highest"}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export function SettingsClient({ name, email, avatarUrl, pillars: initialPillars, notion: initialNotion }: Props) {
  const { update: updateSession } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Notion integration state
  const [notion, setNotion] = useState<NotionInfo>(initialNotion);
  const [notionSyncing, setNotionSyncing] = useState(false);
  const [notionDisconnecting, setNotionDisconnecting] = useState(false);
  interface NotionSyncLogRow {
    id: string;
    entity_type: string;
    entity_id: string | null;
    action: string;
    status: string;
    message: string | null;
    synced_at: string;
  }
  const [notionLog, setNotionLog] = useState<NotionSyncLogRow[]>([]);
  const [notionLogOpen, setNotionLogOpen] = useState(false);

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

  // Workspace — pillar list is mutable (create/delete)
  const [pillars, setPillars] = useState<PillarRow[]>(initialPillars);
  const initValues = (list: PillarRow[]) => Object.fromEntries(list.map((p) => [p.id, { label: p.label, color: p.color }]));
  const [pillarDrafts, setPillarDrafts] = useState<Record<string, { label: string; color: string }>>(() => initValues(initialPillars));
  const [pillarBases, setPillarBases] = useState<Record<string, { label: string; color: string }>>(() => initValues(initialPillars));
  const [pillarSaving, setPillarSaving] = useState<Record<string, boolean>>({});
  const [pillarSaved, setPillarSaved] = useState<Record<string, boolean>>({});
  const [pillarDeleting, setPillarDeleting] = useState<Record<string, boolean>>({});
  const [iconOverrides, setIconOverrides] = useState<Record<string, string>>({});
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);

  // New pillar form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [creatingPillar, setCreatingPillar] = useState(false);

  // Competency editor
  const [editingPillarId, setEditingPillarId] = useState<string | null>(null);

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

    // Persist to DB so it survives localStorage clearing
    const pillar = pillars.find((p) => p.slug === slug);
    if (pillar) {
      fetch(`/api/pillars/${pillar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon_key: iconName }),
      }).catch(() => {});
    }
  }

  async function handleCreatePillar() {
    if (!newLabel.trim()) return;
    setCreatingPillar(true);
    try {
      const res = await fetch("/api/pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), color: newColor }),
      });
      if (res.ok) {
        const pillar: PillarRow = await res.json();
        setPillars((prev) => [...prev, pillar]);
        setPillarDrafts((d) => ({ ...d, [pillar.id]: { label: pillar.label, color: pillar.color } }));
        setPillarBases((b) => ({ ...b, [pillar.id]: { label: pillar.label, color: pillar.color } }));
        setNewLabel("");
        setNewColor("#6366f1");
        setShowNewForm(false);
        toast("Pillar created — define the mastery rubric next");
        window.dispatchEvent(new CustomEvent("pillars-changed"));
        // Immediately open the rubric editor for the new pillar
        setEditingPillarId(pillar.id);
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast(err.error ?? "Failed to create pillar");
      }
    } finally {
      setCreatingPillar(false);
    }
  }

  async function handleDeletePillar(pillarId: string) {
    setPillarDeleting((s) => ({ ...s, [pillarId]: true }));
    try {
      const res = await fetch(`/api/pillars/${pillarId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        const deleted = pillars.find((p) => p.id === pillarId);
        setPillars((prev) => prev.filter((p) => p.id !== pillarId));
        setPillarDrafts((d) => { const n = { ...d }; delete n[pillarId]; return n; });
        setPillarBases((b) => { const n = { ...b }; delete n[pillarId]; return n; });
        toast("Pillar deleted");
        if (deleted) window.dispatchEvent(new CustomEvent("pillars-changed"));
      }
    } finally {
      setPillarDeleting((s) => ({ ...s, [pillarId]: false }));
    }
  }

  // Read URL params on mount: tab focus + notion connect feedback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "integrations") setActiveTab("integrations");
    if (params.get("notion_connected") === "1") {
      toast("Notion connected — try a sync now");
    }
    const err = params.get("notion_error");
    if (err) toast(`Notion connect failed: ${err}`);
    if (params.has("tab") || params.has("notion_connected") || params.has("notion_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  async function handleNotionSync() {
    setNotionSyncing(true);
    try {
      const res = await fetch("/api/integrations/notion/sync", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        const { synced } = body as { synced: { pillars: number; tasks: number; chat: number; quiz: number } };
        toast(`Synced — ${synced.pillars} pillars, ${synced.tasks} tasks, ${synced.chat} chat, ${synced.quiz} quiz`);
        setNotion((n) => ({ ...n, lastSyncedAt: new Date().toISOString() }));
      } else {
        toast(body.errors?.[0] ?? "Sync failed");
      }
    } finally {
      setNotionSyncing(false);
    }
  }

  async function handleNotionDisconnect() {
    setNotionDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/notion/disconnect", { method: "POST" });
      if (res.ok) {
        setNotion((n) => ({ ...n, connected: false, workspaceName: null, lastSyncedAt: null }));
        toast("Notion disconnected");
      }
    } finally {
      setNotionDisconnecting(false);
    }
  }

  async function handleSyncToggle(key: keyof NotionSyncSettings, value: boolean) {
    const prev = notion.settings;
    setNotion((n) => ({ ...n, settings: { ...n.settings, [key]: value } }));
    const res = await fetch("/api/integrations/notion/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) {
      setNotion((n) => ({ ...n, settings: prev }));
      toast("Couldn't save preference");
    }
  }

  async function handleOpenLog() {
    setNotionLogOpen((o) => !o);
    if (notionLog.length === 0) {
      const res = await fetch("/api/integrations/notion/log");
      if (res.ok) setNotionLog(await res.json());
    }
  }

  const TABS = [
    { key: "profile" as Tab, label: "Profile", icon: User },
    { key: "workspace" as Tab, label: "Workspace", icon: Layout },
    { key: "integrations" as Tab, label: "Integrations", icon: Plug },
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
                  const isDeleting = pillarDeleting[pillar.id];
                  const overrideKey = iconOverrides[pillar.slug];
                  const Icon = resolveIcon(pillar.slug, pillar.icon_key, iconOverrides);
                  const currentIconKey = overrideKey ?? pillar.icon_key ?? undefined;
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
                          disabled={(!isDirty && !isSaved) || isSaving}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                            isSaved ? "bg-emerald-500/20 text-emerald-400" : isDirty ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-surface-container text-outline cursor-not-allowed"
                          }`}
                        >
                          {isSaving ? "Saving…" : isSaved ? <><Check size={12} /> Saved</> : "Save"}
                        </button>

                        {/* Rubric */}
                        <button
                          onClick={() => setEditingPillarId(pillar.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-surface-container transition-colors flex-shrink-0 relative"
                          title={
                            (pillar.competency_areas?.length ?? 0) > 0
                              ? "Edit mastery rubric"
                              : "Set mastery rubric"
                          }
                          style={{
                            color:
                              (pillar.competency_areas?.length ?? 0) > 0
                                ? pillar.color
                                : undefined,
                          }}
                        >
                          <Target size={14} />
                          {(pillar.competency_areas?.length ?? 0) === 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeletePillar(pillar.id)}
                          disabled={isDeleting}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                          title="Delete pillar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* New pillar form (capped at 6) */}
                {pillars.length >= 6 ? (
                  <div className="w-full py-3 rounded-2xl border-2 border-dashed border-outline-variant/20 text-outline text-center text-xs font-semibold">
                    Pillar limit reached (6 max). Delete one to add another.
                  </div>
                ) : showNewForm ? (
                  <div className="bg-surface-container-low rounded-2xl border border-primary/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">New Pillar</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        placeholder="Pillar name"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreatePillar()}
                        autoFocus
                        className="flex-1 bg-surface-container rounded-lg px-4 py-2 text-on-surface text-sm border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all font-semibold"
                      />
                      <div className="flex gap-1.5 flex-wrap max-w-[112px]">
                        {PILLAR_COLORS.map((c) => (
                          <button key={c} onClick={() => setNewColor(c)}
                            className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                            style={{ backgroundColor: c, outline: newColor === c ? `2px solid ${c}` : "2px solid transparent", outlineOffset: "2px" }} />
                        ))}
                      </div>
                      <button
                        onClick={handleCreatePillar}
                        disabled={!newLabel.trim() || creatingPillar}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                      >
                        {creatingPillar ? "Creating…" : <><Check size={12} /> Create</>}
                      </button>
                      <button
                        onClick={() => { setShowNewForm(false); setNewLabel(""); setNewColor("#6366f1"); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-outline-variant/20 text-outline hover:text-on-surface hover:border-outline-variant/40 transition-colors text-sm font-semibold"
                  >
                    <Plus size={16} />
                    Add pillar
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── INTEGRATIONS ────────────────────────────────────────── */}
          {activeTab === "integrations" && (
            <>
              <div>
                <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">Integrations</h1>
                <p className="text-on-surface-variant text-sm mt-1">Connect Meridian to outside tools.</p>
              </div>

              {/* Notion */}
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-8 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                      <Link2 size={20} className="text-on-surface-variant" />
                    </div>
                    <div>
                      <h2 className="text-lg font-headline font-bold text-on-surface">Notion</h2>
                      <p className="text-xs text-outline mt-0.5">
                        {notion.connected
                          ? `Connected to ${notion.workspaceName ?? "your workspace"}`
                          : "Mirror your tasks, pillars, AI history, and quizzes into Notion."}
                      </p>
                    </div>
                  </div>
                  {!notion.configured ? (
                    <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      <AlertCircle size={14} />
                      Run <code className="font-mono">npm run setup</code> to add Notion OAuth credentials.
                    </div>
                  ) : notion.connected ? (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleNotionSync}
                        disabled={notionSyncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition-all"
                      >
                        <RefreshCw size={13} className={notionSyncing ? "animate-spin" : ""} />
                        {notionSyncing ? "Syncing…" : "Sync now"}
                      </button>
                      <button
                        onClick={handleNotionDisconnect}
                        disabled={notionDisconnecting}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:text-red-400 border border-outline-variant/20 hover:border-red-400/40 disabled:opacity-40 transition-colors"
                      >
                        {notionDisconnecting ? "…" : "Disconnect"}
                      </button>
                    </div>
                  ) : (
                    <a
                      href="/api/integrations/notion/authorize"
                      className="px-5 py-2 rounded-xl text-xs font-headline font-bold text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
                    >
                      Connect Notion
                    </a>
                  )}
                </div>

                {notion.connected && notion.lastSyncedAt && (
                  <p className="text-[11px] text-outline">
                    Last synced {new Date(notion.lastSyncedAt).toLocaleString()}
                  </p>
                )}

                {/* What to sync */}
                <div className={notion.connected ? "" : "opacity-50 pointer-events-none"}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">What to sync</p>
                  <div className="space-y-2">
                    {([
                      { key: "tasks" as const, label: "Tasks", desc: "Each task becomes a row in its pillar's database." },
                      { key: "pillars" as const, label: "Pillars", desc: "One Notion database per pillar." },
                      { key: "chat" as const, label: "AI suggestions", desc: "Tutor chat history archived as Notion blocks." },
                      { key: "quiz" as const, label: "Quiz / mastery", desc: "Quiz results logged in a Notion database." },
                    ]).map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center gap-4 bg-surface-container rounded-xl p-4 border border-outline-variant/10">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface">{label}</p>
                          <p className="text-xs text-outline mt-0.5">{desc}</p>
                        </div>
                        <Toggle
                          checked={notion.settings[key]}
                          onChange={() => handleSyncToggle(key, !notion.settings[key])}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sync log (collapsible) */}
                {notion.connected && (
                  <details open={notionLogOpen} onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open && notionLog.length === 0) handleOpenLog();
                  }}>
                    <summary className="text-[10px] font-bold uppercase tracking-widest text-outline cursor-pointer hover:text-on-surface-variant transition-colors">
                      Sync log (last 20)
                    </summary>
                    <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
                      {notionLog.length === 0 ? (
                        <p className="text-xs text-outline">No entries yet.</p>
                      ) : notionLog.map((row) => (
                        <div key={row.id} className="text-[11px] flex items-start gap-2 py-1 border-b border-outline-variant/5">
                          <span className={`font-bold uppercase tracking-wider ${row.status === "error" ? "text-red-400" : "text-emerald-400"}`}>
                            {row.action}
                          </span>
                          <span className="text-outline">{row.entity_type}</span>
                          <span className="flex-1 text-on-surface-variant truncate">{row.message ?? ""}</span>
                          <span className="text-outline whitespace-nowrap">
                            {new Date(row.synced_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
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

      {editingPillarId && (() => {
        const editingPillar = pillars.find((p) => p.id === editingPillarId);
        if (!editingPillar) return null;
        return (
          <CompetencyEditor
            pillarId={editingPillar.id}
            pillarLabel={editingPillar.label}
            pillarColor={editingPillar.color}
            initial={editingPillar.competency_areas ?? []}
            onClose={() => setEditingPillarId(null)}
            onSaved={(competencies) => {
              setPillars((prev) =>
                prev.map((p) =>
                  p.id === editingPillarId ? { ...p, competency_areas: competencies } : p,
                ),
              );
            }}
          />
        );
      })()}
    </div>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";
import { RestoreTaskButton } from "@/components/tasks/RestoreTaskButton";
import { CheckCircle2, Archive } from "lucide-react";

export default async function ArchivePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, pillars(slug, label, color)")
    .eq("user_id", session.user.id)
    .eq("is_complete", true)
    .order("updated_at", { ascending: false });

  // Group by pillar
  const groups = new Map<string, { label: string; color: string; slug: string; tasks: typeof tasks }>();
  for (const task of tasks ?? []) {
    const slug = task.pillars?.slug ?? "unknown";
    if (!groups.has(slug)) {
      groups.set(slug, { label: task.pillars?.label ?? slug, color: task.pillars?.color ?? "#6366f1", slug, tasks: [] });
    }
    groups.get(slug)!.tasks!.push(task);
  }

  const totalCompleted = tasks?.length ?? 0;

  return (
    <div className="p-4 md:p-10 flex-1 space-y-10 max-w-4xl w-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-2">
            Archive
          </div>
          <h1 className="text-2xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            Completed Tasks
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {totalCompleted} task{totalCompleted !== 1 ? "s" : ""} completed
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Archive size={28} className="text-primary" />
        </div>
      </div>

      {totalCompleted === 0 && (
        <div className="bg-surface-container-low rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
          <CheckCircle2 size={40} className="text-outline" />
          <div>
            <p className="text-on-surface font-semibold">Nothing archived yet</p>
            <p className="text-on-surface-variant text-sm mt-1">Completed tasks will appear here.</p>
          </div>
        </div>
      )}

      {Array.from(groups.values()).map((group) => {
        const Icon = PILLAR_ICONS[group.slug] ?? null;
        return (
          <section key={group.slug}>
            {/* Pillar heading */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${group.color}1a` }}
              >
                {Icon && <Icon size={15} style={{ color: group.color }} />}
              </div>
              <span className="text-xs font-label font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                {group.label}
              </span>
              <span className="text-[10px] font-label text-outline ml-1">
                {group.tasks!.length}
              </span>
            </div>

            <div className="space-y-2">
              {group.tasks!.map((task) => {
                const completedAt = task.updated_at
                  ? new Date(task.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : null;

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 size={16} style={{ color: group.color }} className="flex-shrink-0 opacity-70" />
                      <div className="min-w-0">
                        <p className="text-sm text-on-surface-variant line-through decoration-outline/40 truncate">
                          {task.title}
                        </p>
                        {completedAt && (
                          <p className="text-[10px] text-outline mt-0.5">Completed {completedAt}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <RestoreTaskButton taskId={task.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

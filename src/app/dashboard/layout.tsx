import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-64 flex-1 flex flex-col min-h-screen bg-surface">
        <TopBar />
        <div className="flex-1 flex flex-col">{children}</div>
      </main>
    </div>
  );
}

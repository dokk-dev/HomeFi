import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen bg-surface">
        <TopBar />
        <div className="flex-1 flex flex-col pb-16 md:pb-0">{children}</div>
      </main>
      <MobileNav />
      <OnboardingModal />
    </div>
  );
}

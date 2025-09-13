import { Dashboard } from '../Dashboard';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from '../AppSidebar';

export default function DashboardExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <Dashboard />
        </main>
      </div>
    </SidebarProvider>
  );
}
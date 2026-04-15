import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar — hidden on mobile, shown on lg+ */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-4 hidden lg:flex" />
            <span className="text-xs font-medium text-muted-foreground">
              DM Setter OS
            </span>
          </header>
          <main className="flex-1 overflow-auto pb-16 lg:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
      <VoiceAssistant />
    </SidebarProvider>
  );
}

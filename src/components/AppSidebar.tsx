import {
  LayoutDashboard, Inbox, GitBranch, Users, BookOpen,
  GraduationCap, Target, BarChart3, Settings, Activity, Link2, Chrome,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "KPI Tracker", url: "/app/kpi", icon: Activity },
  { title: "Inbox", url: "/app/inbox", icon: Inbox },
  { title: "Pipeline", url: "/app/pipeline", icon: GitBranch },
  { title: "Prospects", url: "/app/prospects", icon: Users },
  { title: "Scripts Library", url: "/app/scripts", icon: BookOpen },
  { title: "Coaching", url: "/app/coaching", icon: GraduationCap },
  { title: "Training Mode", url: "/app/training", icon: Target },
  { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
  { title: "Integrations", url: "/app/integrations", icon: Link2 },
  { title: "Chrome Extension", url: "/app/extension", icon: Chrome },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-sm font-bold tracking-tight">
                <span className="gradient-text">DM Setter</span>{" "}
                <span className="text-muted-foreground">OS</span>
              </span>
            )}
            {collapsed && <span className="gradient-text font-bold">DS</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

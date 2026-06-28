import {
  LayoutDashboard, Inbox, GitBranch, Users, BookOpen,
  GraduationCap, Target, BarChart3, Settings, Activity, Chrome, Package, Library, Clock, LogOut,
  Phone,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: typeof LayoutDashboard };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/app", icon: LayoutDashboard },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Inbox", url: "/app/inbox", icon: Inbox },
      { title: "Pipeline", url: "/app/pipeline", icon: GitBranch },
      { title: "Follow-Ups", url: "/app/followups", icon: Clock },
      { title: "Prospects", url: "/app/prospects", icon: Users },
    ],
  },
  {
    label: "Calling",
    items: [
      { title: "Phone Setting", url: "/app/phonesetting", icon: Phone },
    ],
  },
  {
    label: "AI",
    items: [
      { title: "My Offer", url: "/app/offer", icon: Package },
      { title: "Knowledge Base", url: "/app/knowledge", icon: Library },
      { title: "Scripts Library", url: "/app/scripts", icon: BookOpen },
      { title: "Coaching", url: "/app/coaching", icon: GraduationCap },
      { title: "Training Mode", url: "/app/training", icon: Target },
    ],
  },
  {
    label: "Performance",
    items: [
      { title: "KPI Tracker", url: "/app/kpi", icon: Activity },
      { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Chrome Extension", url: "/app/extension", icon: Chrome },
      { title: "Settings", url: "/app/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-1">
          {!collapsed ? (
            <span className="text-sm font-bold tracking-tight">
              <span className="gradient-text">DM Setter</span>{" "}
              <span className="text-muted-foreground">OS</span>
            </span>
          ) : (
            <span className="gradient-text font-bold">OS</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
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
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent" tooltip="Sign out">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Inbox, GitBranch, Activity, BarChart3, Menu,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const primaryTabs = [
  { title: "Home", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Inbox", url: "/app/inbox", icon: Inbox },
  { title: "Pipeline", url: "/app/pipeline", icon: GitBranch },
  { title: "KPIs", url: "/app/kpi", icon: Activity },
];

const moreTabs = [
  { title: "Prospects", url: "/app/prospects" },
  { title: "Scripts", url: "/app/scripts" },
  { title: "Coaching", url: "/app/coaching" },
  { title: "Training", url: "/app/training" },
  { title: "Analytics", url: "/app/analytics" },
  { title: "Integrations", url: "/app/integrations" },
  { title: "Settings", url: "/app/settings" },
];

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-16 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2">
              {moreTabs.map((tab) => {
                const isActive = location.pathname === tab.url;
                return (
                  <Link
                    key={tab.url}
                    to={tab.url}
                    onClick={() => setShowMore(false)}
                    className={`p-3 rounded-xl text-center text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {tab.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {primaryTabs.map((tab) => (
            <NavLink
              key={tab.url}
              to={tab.url}
              end={tab.end}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground transition-colors"
              activeClassName="text-primary"
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.title}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
              showMore ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

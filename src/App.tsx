import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { validateEnv } from "@/lib/env";
import AppLayout from "./components/AppLayout";

// Eager: auth + shell entry points (small, needed immediately)
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy: feature pages are code-split so the initial bundle stays small
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InboxPage = lazy(() => import("./pages/InboxPage"));
const PipelinePage = lazy(() => import("./pages/PipelinePage"));
const ProspectsPage = lazy(() => import("./pages/ProspectsPage"));
const ScriptsPage = lazy(() => import("./pages/ScriptsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const CoachingPage = lazy(() => import("./pages/CoachingPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const KPITrackerPage = lazy(() => import("./pages/KPITrackerPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"));
const ExtensionPage = lazy(() => import("./pages/ExtensionPage"));
const OfferPage = lazy(() => import("./pages/OfferPage"));
const KnowledgeBasePage = lazy(() => import("./pages/KnowledgeBasePage"));
const FollowUpsPage = lazy(() => import("./pages/FollowUpsPage"));

validateEnv();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — avoid duplicate refetches across components
      gcTime: 5 * 60_000, // keep cache 5 min for fast back-nav
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // offline recovery
    },
    mutations: { retry: 0 },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[40vh]">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

/** Wraps a lazy page in a Suspense + per-area error boundary. */
const Guard = ({ name, children }: { name: string; children: React.ReactNode }) => (
  <ErrorBoundary name={name}>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Guard name="Dashboard"><Dashboard /></Guard>} />
              <Route path="kpi" element={<Guard name="KPI Tracker"><KPITrackerPage /></Guard>} />
              <Route path="inbox" element={<Guard name="Inbox"><InboxPage /></Guard>} />
              <Route path="pipeline" element={<Guard name="Pipeline"><PipelinePage /></Guard>} />
              <Route path="followups" element={<Guard name="Follow-Ups"><FollowUpsPage /></Guard>} />
              <Route path="prospects" element={<Guard name="Prospects"><ProspectsPage /></Guard>} />
              <Route path="scripts" element={<Guard name="Scripts"><ScriptsPage /></Guard>} />
              <Route path="offer" element={<Guard name="My Offer"><OfferPage /></Guard>} />
              <Route path="knowledge" element={<Guard name="Knowledge Base"><KnowledgeBasePage /></Guard>} />
              <Route path="analytics" element={<Guard name="Analytics"><AnalyticsPage /></Guard>} />
              <Route path="coaching" element={<Guard name="Coaching"><CoachingPage /></Guard>} />
              <Route path="training" element={<Guard name="Training"><TrainingPage /></Guard>} />
              <Route path="settings" element={<Guard name="Settings"><SettingsPage /></Guard>} />
              <Route path="integrations" element={<Guard name="Integrations"><IntegrationsPage /></Guard>} />
              <Route path="integrations/callback" element={<Guard name="OAuth"><OAuthCallbackPage /></Guard>} />
              <Route path="extension" element={<Guard name="Extension"><ExtensionPage /></Guard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import InboxPage from "./pages/InboxPage";
import PipelinePage from "./pages/PipelinePage";
import ProspectsPage from "./pages/ProspectsPage";
import ScriptsPage from "./pages/ScriptsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CoachingPage from "./pages/CoachingPage";
import TrainingPage from "./pages/TrainingPage";
import SettingsPage from "./pages/SettingsPage";
import KPITrackerPage from "./pages/KPITrackerPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import ExtensionPage from "./pages/ExtensionPage";
import OfferPage from "./pages/OfferPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import FollowUpsPage from "./pages/FollowUpsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
              <Route index element={<Dashboard />} />
              <Route path="kpi" element={<KPITrackerPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="followups" element={<FollowUpsPage />} />
              <Route path="prospects" element={<ProspectsPage />} />
              <Route path="scripts" element={<ScriptsPage />} />
              <Route path="offer" element={<OfferPage />} />
              <Route path="knowledge" element={<KnowledgeBasePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="coaching" element={<CoachingPage />} />
              <Route path="training" element={<TrainingPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="integrations/callback" element={<OAuthCallbackPage />} />
              <Route path="extension" element={<ExtensionPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

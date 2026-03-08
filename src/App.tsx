import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import InboxPage from "./pages/InboxPage";
import PipelinePage from "./pages/PipelinePage";
import ProspectsPage from "./pages/ProspectsPage";
import ScriptsPage from "./pages/ScriptsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CoachingPage from "./pages/CoachingPage";
import TrainingPage from "./pages/TrainingPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="prospects" element={<ProspectsPage />} />
            <Route path="scripts" element={<ScriptsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="coaching" element={<CoachingPage />} />
            <Route path="training" element={<TrainingPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

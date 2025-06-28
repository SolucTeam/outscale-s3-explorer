
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BackendConsole } from "./components/BackendConsole";
import { ActionHistory } from "./components/ActionHistory";
import Login from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import BucketView from "./pages/BucketView";
import FolderView from "./pages/FolderView";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const GlobalSidebar = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';
  
  if (isLoginPage) return null;
  
  return (
    <div className="fixed right-4 top-4 bottom-4 w-80 z-50 space-y-4 max-h-screen overflow-hidden">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-[45%] overflow-hidden">
        <ActionHistory />
      </div>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-[50%] overflow-hidden">
        <BackendConsole />
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <div className="min-h-screen">
            <Routes>
              {/* Route racine avec redirection intelligente */}
              <Route path="/" element={<Index />} />
              
              {/* Route publique */}
              <Route path="/login" element={<Login />} />
              
              {/* Routes protégées */}
              <Route path="/dashboard" element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </ErrorBoundary>
              } />
              
              <Route path="/bucket/:name" element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <BucketView />
                  </ProtectedRoute>
                </ErrorBoundary>
              } />
              
              <Route path="/bucket/:name/folder/:path/*" element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <FolderView />
                  </ProtectedRoute>
                </ErrorBoundary>
              } />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Console Backend globale */}
            <GlobalSidebar />
          </div>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

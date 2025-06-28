
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BackendConsole } from "./components/BackendConsole";
import Login from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import BucketView from "./pages/BucketView";
import FolderView from "./pages/FolderView";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <div className="min-h-screen flex">
            <div className="flex-1">
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
            </div>
            
            {/* Console Backend fixe à droite sur toutes les pages protégées - positionnée plus bas */}
            <ProtectedRoute>
              <div className="w-80 flex-shrink-0 border-l bg-white">
                <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pt-4">
                  <BackendConsole />
                </div>
              </div>
            </ProtectedRoute>
          </div>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

import Login from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import BucketView from "./pages/BucketView";
import FolderView from "./pages/FolderView";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import { Header } from "./components/Header";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            {/* Header global qui prend toute la largeur */}
            <ProtectedRoute>
              <div className="w-full border-b bg-white">
                <Header />
              </div>
            </ProtectedRoute>
            
            <div className="flex flex-1">
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
              
            </div>
          </div>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

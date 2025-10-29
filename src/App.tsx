import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useSessionWarning } from "./hooks/useSessionWarning";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { lazy, Suspense } from "react";

// Lazy loading des routes
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BucketView = lazy(() => import("./pages/BucketView"));
const FolderView = lazy(() => import("./pages/FolderView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Index = lazy(() => import("./pages/Index"));

import { Header } from "./components/Header";

const queryClient = new QueryClient();

const AppContent = () => {
  useSessionWarning();
  useOnlineStatus();

  return (
    <div className="min-h-screen flex flex-col">
      <ProtectedRoute>
        <div className="w-full border-b bg-white">
          <Header />
        </div>
      </ProtectedRoute>
      
      <div className="flex flex-1">
        <div className="flex-1">
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </div>
          }>
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
          </Suspense>
        </div>
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
          <AppContent />
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

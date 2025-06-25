
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BucketPage } from "./pages/BucketPage";
import { FolderPage } from "./pages/FolderPage";
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
            {/* Route publique */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Routes protégées */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/bucket/:bucketName" element={
              <ProtectedRoute>
                <BucketPage />
              </ProtectedRoute>
            } />
            
            <Route path="/bucket/:bucketName/folder/:folderPath" element={
              <ProtectedRoute>
                <FolderPage />
              </ProtectedRoute>
            } />
            
            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

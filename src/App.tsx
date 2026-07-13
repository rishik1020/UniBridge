import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import AdminPortal from "./pages/AdminPortal.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import RaiseComplaint from "./pages/RaiseComplaint.tsx";
import MyComplaints from "./pages/MyComplaints.tsx";
import Trending from "./pages/Trending.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminComplaints from "./pages/AdminComplaints.tsx";
import AdminAnalytics from "./pages/AdminAnalytics.tsx";
import AdminQR from "./pages/AdminQR.tsx";
import AdminDepartments from "./pages/AdminDepartments.tsx";
import AdminUsers from "./pages/AdminUsers.tsx";
import DepartmentDashboard from "./pages/DepartmentDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-portal" element={<AdminPortal />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute requireRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/complaints" element={<ProtectedRoute requireRole="student"><MyComplaints /></ProtectedRoute>} />
            <Route path="/complaints/new" element={<ProtectedRoute requireRole="student"><RaiseComplaint /></ProtectedRoute>} />
            <Route path="/trending" element={<ProtectedRoute requireRole="student"><Trending /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/complaints" element={<ProtectedRoute requireRole="admin"><AdminComplaints /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute requireRole="admin"><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/qr" element={<ProtectedRoute requireRole="admin"><AdminQR /></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute requireRole="admin"><AdminDepartments /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireRole="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/department" element={<ProtectedRoute requireRole="department"><DepartmentDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

// App.jsx
import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingFallback from "@/components/ui/LoadingFallback";




const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Services = lazy(() => import("@/pages/Services"));
const LandingDespega = lazy(() => import("@/pages/LandingDespega"));
const Terminos = lazy(() => import("@/pages/TerminosCondiciones"));
const PoliticaPrivacidad = lazy(() => import("@/pages/PoliticaPrivacidad"));
const Development = lazy(() => import("@/pages/Development"));
const LandingDTE = lazy(() => import("@/pages/LandingDTE"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const Registro = lazy(() => import("@/pages/Registro"));
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const Clients = lazy(() => import("@/pages/dashboard/crm/Clients"));
const ClientDetail = lazy(() => import("@/pages/dashboard/crm/ClientDetail"));
const Projects = lazy(() => import("@/pages/dashboard/projects/Projects"));
const ProjectServices = lazy(() => import("@/pages/dashboard/projects/ProjectServices"));
const ProjectReports = lazy(() => import("@/pages/dashboard/projects/ProjectReports"));
const ProjectInvoices = lazy(() => import("@/pages/dashboard/projects/ProjectInvoices"));
const Invoices = lazy(() => import("@/pages/dashboard/invoices/Invoices"));
const Inbox = lazy(() => import("@/pages/dashboard/inbox/Inbox"));
const TeamChat = lazy(() => import("@/pages/dashboard/chat/TeamChat"));
const Settings = lazy(() => import("@/pages/dashboard/settings/Settings"));
const ScheduleCall = lazy(() => import("@/pages/ScheduleCall"));
const AdminAppointments = lazy(() => import("@/pages/AdminAppointments"));
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UIProvider, useUI } from "@/context/UIContext";
import PortalLayout from "@/layouts/PortalLayout";
import { Navigate } from "react-router-dom";

const AppContent = () => {
  const { isNavbarOpen } = useUI();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const shouldRedirect = sessionStorage.getItem('postLoginRedirect') === '1';
    if (shouldRedirect && user) {
      sessionStorage.removeItem('postLoginRedirect');
      if (!location.pathname.startsWith('/dashboard')) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="relative min-h-screen">
      <ScrollToTop />

      {/* Overlay de efecto blur 2px */}
      {isNavbarOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-[2px] bg-black/10 transition-all duration-300"
          style={{ pointerEvents: 'none' }}
        />
      )}

      <Suspense fallback={<LoadingFallback type="spinner" />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/Nosotros" element={<About />} />
          <Route path="/Contacto" element={<Contact />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/despega" element={<LandingDespega />} />
          <Route path="/tyc" element={<Terminos />} />
          <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          <Route path="/desarrollo" element={<Development />} />
          <Route path="/dte" element={<LandingDTE />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/schedule-call/:projectId?" element={<ScheduleCall />} />

          {/* Private Portal Routes */}
          <Route path="/dashboard" element={<PortalLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:clientId" element={<ClientDetail />} />
            <Route path="services" element={<ProjectServices />} />
            <Route path="reports" element={<ProjectReports />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="projects" element={<Projects />} />
            {/* Redirect old project detail routes to services */}
            <Route path="projects/:projectId" element={<Navigate to="services" replace />} />
            <Route path="projects/:projectId/services" element={<Navigate to="/dashboard/services" replace />} />
            <Route path="projects/:projectId/reports" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="projects/:projectId/invoices" element={<Navigate to="/dashboard/invoices" replace />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="team-chat" element={<TeamChat />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Settings />} /> {/* Reusing Settings for Profile for now */}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <UIProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </UIProvider>
    </Router>
  );
};

export default App;

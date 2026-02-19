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
const CompleteProfile = lazy(() => import("@/pages/CompleteProfile"));
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const Clients = lazy(() => import("@/pages/dashboard/crm/Clients"));
const ClientDetail = lazy(() => import("@/pages/dashboard/crm/ClientDetail"));
const Projects = lazy(() => import("@/pages/dashboard/projects/Projects"));
const ProjectTasks = lazy(() => import("@/pages/dashboard/projects/ProjectTasks"));
const ProjectReports = lazy(() => import("@/pages/dashboard/projects/ProjectReports"));
const ProjectInvoices = lazy(() => import("@/pages/dashboard/projects/ProjectInvoices"));
const ClientAppointments = lazy(() => import("@/pages/dashboard/projects/ClientAppointments"));
const Invoices = lazy(() => import("@/pages/dashboard/invoices/Invoices"));
const Inbox = lazy(() => import("@/pages/dashboard/inbox/Inbox"));
const TeamChat = lazy(() => import("@/pages/dashboard/chat/TeamChat"));
const ClientChat = lazy(() => import("@/pages/dashboard/chat/ClientChat"));
const MessagingHubRedirect = lazy(() => import("@/pages/dashboard/messages/MessagingHubRedirect"));
const Settings = lazy(() => import("@/pages/dashboard/settings/Settings"));
const ScheduleCall = lazy(() => import("@/pages/ScheduleCall"));
const AdminAppointments = lazy(() => import("@/pages/AdminAppointments"));
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UIProvider, useUI } from "@/context/UIContext";
import PortalLayout from "@/layouts/PortalLayout";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";

import dteLogo from "@/assets/LOGODTE.svg";

const AppContent = () => {
  const { isNavbarOpen } = useUI();
  const { user, onboardingStatus, loading, isProfileIncomplete } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the initial landing after OAuth login
    const justLoggedIn = sessionStorage.getItem('justLoggedIn') === '1';

    if (user && justLoggedIn && onboardingStatus !== 'loading') {
      sessionStorage.removeItem('justLoggedIn');

      // 1. If profile is incomplete, that's priority #1
      if (isProfileIncomplete) {
        navigate('/complete-profile', { replace: true });
        return;
      }

      // 2. If profile is OK, check onboarding status for new users
      if (onboardingStatus === 'new') {
        navigate('/schedule-call', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, onboardingStatus, isProfileIncomplete, navigate]);

  // Premium Loader for initial auth/onboarding detection
  if (loading || (user && onboardingStatus === 'loading' && sessionStorage.getItem('justLoggedIn') === '1')) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white font-product">
        <motion.img
          src={dteLogo}
          alt="DTE"
          className="w-[180px] mb-8"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [0.98, 1, 0.98]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className="w-48 h-[2px] bg-neutral-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#00D1FF]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

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
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/schedule-call/:projectId?" element={<ScheduleCall />} />

          {/* Private Portal Routes */}
          <Route path="/dashboard" element={<PortalLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:clientId" element={<ClientDetail />} />
            <Route path="tasks" element={<ProjectTasks />} />
            <Route path="reports" element={<ProjectReports />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<Navigate to="tasks" replace />} />
            <Route path="projects/:projectId/services" element={<Navigate to="/dashboard/tasks" replace />} />
            <Route path="services" element={<Navigate to="/dashboard/tasks" replace />} />
            <Route path="projects/:projectId/reports" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="projects/:projectId/invoices" element={<Navigate to="/dashboard/invoices" replace />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="team-chat" element={<TeamChat />} />
            <Route path="client-chat" element={<ClientChat />} />
            <Route path="messages" element={<MessagingHubRedirect />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="my-appointments" element={<ClientAppointments />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Settings />} />

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

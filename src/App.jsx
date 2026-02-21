// App.jsx
import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingFallback from "@/components/ui/LoadingFallback";
import { lazyRoute, routeKeys, scheduleIdlePreload } from "@/router/routePrefetch";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UIProvider, useUI } from "@/context/UIContext";
import PortalLayout from "@/layouts/PortalLayout";

const Home = lazyRoute(routeKeys.home);
const About = lazyRoute(routeKeys.about);
const Contact = lazyRoute(routeKeys.contact);
const Services = lazyRoute(routeKeys.services);
const LandingDespega = lazyRoute(routeKeys.landingDespega);
const Terminos = lazyRoute(routeKeys.terminos);
const PoliticaPrivacidad = lazyRoute(routeKeys.politicaPrivacidad);
const Development = lazyRoute(routeKeys.development);
const LandingDTE = lazyRoute(routeKeys.landingDte);
const AdminLogin = lazyRoute(routeKeys.adminLogin);
const Registro = lazyRoute(routeKeys.registro);
const CompleteProfile = lazyRoute(routeKeys.completeProfile);
const DashboardHome = lazyRoute(routeKeys.dashboardHome);
const Clients = lazyRoute(routeKeys.clients);
const ClientDetail = lazyRoute(routeKeys.clientDetail);
const Projects = lazyRoute(routeKeys.projects);
const ProjectTasks = lazyRoute(routeKeys.projectTasks);
const ProjectReports = lazyRoute(routeKeys.projectReports);
const ClientAppointments = lazyRoute(routeKeys.clientAppointments);
const Invoices = lazyRoute(routeKeys.invoices);
const Inbox = lazyRoute(routeKeys.inbox);
const TeamChat = lazyRoute(routeKeys.teamChat);
const ClientChat = lazyRoute(routeKeys.clientChat);
const MessagingHubRedirect = lazyRoute(routeKeys.messagingHubRedirect);
const Settings = lazyRoute(routeKeys.settings);
const ScheduleCall = lazyRoute(routeKeys.scheduleCall);
const AdminAppointments = lazyRoute(routeKeys.adminAppointments);

const AppContent = () => {
  const { isNavbarOpen } = useUI();
  const { user, onboardingStatus, loading, isProfileIncomplete } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboardPath = location.pathname.toLowerCase().startsWith('/dashboard');
  const [isDashboardReloadFallback, setIsDashboardReloadFallback] = useState(() => {
    if (typeof window === 'undefined') return false;
    const navigationEntry = performance.getEntriesByType('navigation')?.[0];
    const isReload = navigationEntry?.type === 'reload';
    return isReload && window.location.pathname.toLowerCase().startsWith('/dashboard');
  });

  useEffect(() => {
    const publicCandidates = ["/servicios", "/desarrollo", "/dte", "/contacto", "/nosotros"];
    const dashboardCandidates = [
      "/dashboard/projects",
      "/dashboard/messages",
      "/dashboard/team-chat",
      "/dashboard/client-chat",
      "/dashboard/tasks",
      "/dashboard/invoices",
      "/dashboard/settings",
      "/dashboard/my-appointments",
    ];

    const isDashboardPath = location.pathname.toLowerCase().startsWith("/dashboard");
    const routes = user || isDashboardPath ? dashboardCandidates : publicCandidates;
    return scheduleIdlePreload(routes, 1200);
  }, [user, location.pathname]);

  useEffect(() => {
    if (!isDashboardReloadFallback) return;
    const timer = window.setTimeout(() => setIsDashboardReloadFallback(false), 0);
    return () => window.clearTimeout(timer);
  }, [isDashboardReloadFallback]);

  useEffect(() => {
    // Handle the initial landing after OAuth login
    const justLoggedIn = sessionStorage.getItem('justLoggedIn') === '1';
    const currentPath = location.pathname.toLowerCase();

    if (user && justLoggedIn && onboardingStatus !== 'loading') {
      sessionStorage.removeItem('justLoggedIn');

      // 1. If profile is incomplete, that's priority #1
      if (isProfileIncomplete && currentPath !== '/complete-profile') {
        navigate('/complete-profile', { replace: true });
        return;
      }

      // 2. If profile is complete, continue to dashboard unless user is on public home
      if (currentPath !== '/') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, onboardingStatus, isProfileIncomplete, navigate, location.pathname]);

  // Premium Loader for initial auth/onboarding detection
  if (loading || (user && onboardingStatus === 'loading' && sessionStorage.getItem('justLoggedIn') === '1')) {
    return <LoadingFallback type="brand" fullScreen />;
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

      <Suspense
        fallback={
          isDashboardPath && isDashboardReloadFallback
            ? <LoadingFallback type="brand" fullScreen />
            : <LoadingFallback type="spinner" />
        }
      >
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

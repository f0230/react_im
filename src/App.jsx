// App.jsx
import React, { Suspense, useEffect, useState, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingFallback from "@/components/ui/LoadingFallback";
import { BRAND_LOADER_CYCLE_MS } from "@/components/ui/loadingFallback.constants";
import { lazyRoute, routeKeys, scheduleIdlePreload } from "@/router/routePrefetch";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UIProvider, useUI } from "@/context/UIContext";
import useCycleLockedVisibility from "@/hooks/useCycleLockedVisibility";

const Home = lazyRoute(routeKeys.home);
const Colors = lazyRoute(routeKeys.colors);
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
const Invite = lazyRoute(routeKeys.invite);
const CompleteProfile = lazyRoute(routeKeys.completeProfile);
const DashboardHome = lazyRoute(routeKeys.dashboardHome);
const Clients = lazyRoute(routeKeys.clients);
const ClientDetail = lazyRoute(routeKeys.clientDetail);
const Projects = lazyRoute(routeKeys.projects);
const ProjectTasks = lazyRoute(routeKeys.projectTasks);
const ProjectReports = lazyRoute(routeKeys.projectReports);
const ProjectIntegrations = lazyRoute(routeKeys.projectIntegrations);
const ClientAppointments = lazyRoute(routeKeys.clientAppointments);
const Invoices = lazyRoute(routeKeys.invoices);
const FinancesOverview = lazyRoute(routeKeys.financesOverview);
const FinancesLedger = lazyRoute(routeKeys.financesLedger);
const FinancesPeriod = lazyRoute(routeKeys.financesPeriod);
const FinancesSettings = lazyRoute(routeKeys.financesSettings);
const Inbox = lazyRoute(routeKeys.inbox);
const TeamChat = lazyRoute(routeKeys.teamChat);
const ClientChat = lazyRoute(routeKeys.clientChat);
const MessagingHubRedirect = lazyRoute(routeKeys.messagingHubRedirect);
const Settings = lazyRoute(routeKeys.settings);
const ScheduleCall = lazyRoute(routeKeys.scheduleCall);
const AdminAppointments = lazyRoute(routeKeys.adminAppointments);
const Studio = lazyRoute(routeKeys.studio);
const PortalLayout = lazy(() => import('@/layouts/PortalLayout'));

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
    const path = location.pathname.toLowerCase();
    const isDashboardPath = path.startsWith("/dashboard");
    const isAuthenticated = Boolean(user);

    const publicCandidates = ["/servicios", "/desarrollo", "/dte", "/contacto", "/nosotros"];

    let routes = publicCandidates;
    if (isAuthenticated || isDashboardPath) {
      if (path.startsWith("/dashboard/reports")) {
        routes = ["/dashboard/projects", "/dashboard/tasks"];
      } else if (path.startsWith("/dashboard/tasks")) {
        routes = ["/dashboard/projects", "/dashboard/reports"];
      } else if (path.startsWith("/dashboard/projects")) {
        routes = ["/dashboard/tasks", "/dashboard/reports"];
      } else if (path.startsWith("/dashboard/inbox") || path.startsWith("/dashboard/messages")) {
        routes = ["/dashboard/projects", "/dashboard/reports"];
      } else {
        routes = ["/dashboard/projects", "/dashboard/tasks", "/dashboard/reports"];
      }
    }

    const dedupedRoutes = Array.from(new Set(routes.filter((route) => route.toLowerCase() !== path)));
    return scheduleIdlePreload(dedupedRoutes, 1800);
  }, [user, location.pathname]);

  useEffect(() => {
    if (!isDashboardReloadFallback) return;
    const timer = window.setTimeout(() => setIsDashboardReloadFallback(false), 0);
    return () => window.clearTimeout(timer);
  }, [isDashboardReloadFallback]);

  useEffect(() => {
    // Handle the initial landing after a REAL new login (not tab refocus/token refresh).
    // `justLoggedIn` is only set in AuthContext when prevUser was null/different user.
    const justLoggedIn = sessionStorage.getItem('justLoggedIn') === '1';
    const currentPath = location.pathname.toLowerCase();

    if (user && justLoggedIn && onboardingStatus !== 'loading') {
      sessionStorage.removeItem('justLoggedIn');

      // 1. If profile is incomplete, go to complete-profile
      if (isProfileIncomplete && currentPath !== '/complete-profile') {
        navigate('/complete-profile', { replace: true });
        return;
      }

      // 2. Only redirect to /dashboard if the user is on a public-facing page.
      // If they're already inside /dashboard/*, let them stay where they are.
      const isOnPublicPage = !currentPath.startsWith('/dashboard');
      if (isOnPublicPage && currentPath !== '/complete-profile') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, onboardingStatus, isProfileIncomplete, navigate, location.pathname]);

  const shouldShowAuthLoader = loading;
  const showAuthLoader = useCycleLockedVisibility(Boolean(shouldShowAuthLoader), BRAND_LOADER_CYCLE_MS);
  const showDashboardReloadBrandFallback = useCycleLockedVisibility(
    isDashboardPath && isDashboardReloadFallback,
    BRAND_LOADER_CYCLE_MS
  );

  // Premium Loader for initial auth/onboarding detection
  if (showAuthLoader) {
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
          showDashboardReloadBrandFallback
            ? <LoadingFallback type="brand" fullScreen />
            : <LoadingFallback type="spinner" />
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/colors" element={<Colors />} />
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
          <Route path="/invite" element={<Invite />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/meet/:projectId?" element={<ScheduleCall />} />

          {/* Private Portal Routes */}
          <Route path="/dashboard" element={<PortalLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:clientId" element={<ClientDetail />} />
            <Route path="tasks" element={<ProjectTasks />} />
            <Route path="reports" element={<ProjectReports />} />
            <Route path="integrations" element={<ProjectIntegrations />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="finances" element={<FinancesOverview />} />
            <Route path="finances/ledger" element={<FinancesLedger />} />
            <Route path="finances/periods/:periodId" element={<FinancesPeriod />} />
            <Route path="finances/settings" element={<FinancesSettings />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<Navigate to="tasks" replace />} />
            <Route path="projects/:projectId/services" element={<Navigate to="/dashboard/tasks" replace />} />
            <Route path="services" element={<Navigate to="/dashboard/tasks" replace />} />
            <Route path="projects/:projectId/reports" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="projects/:projectId/integrations" element={<ProjectIntegrations />} />
            <Route path="projects/:projectId/invoices" element={<Navigate to="/dashboard/invoices" replace />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="team-chat" element={<TeamChat />} />
            <Route path="client-chat" element={<ClientChat />} />
            <Route path="messages" element={<MessagingHubRedirect />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="my-appointments" element={<ClientAppointments />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Settings />} />
            <Route path="studio" element={<Studio />} />

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

// App.jsx
import React, { Suspense, useEffect, useState, lazy } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingFallback from "@/components/ui/LoadingFallback";
import { BRAND_LOADER_CYCLE_MS } from "@/components/ui/loadingFallback.constants";
import { lazyRoute, routeKeys, scheduleIdlePreload } from "@/router/routePrefetch";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UIProvider, useUI } from "@/context/UIContext";
import useCycleLockedVisibility from "@/hooks/useCycleLockedVisibility";
import SEO from "@/components/SEO";
import { shouldNoIndexPath } from "@/config/seo";

const Home = lazyRoute(routeKeys.home);
const Brief = lazyRoute(routeKeys.brief);
const Colors = lazyRoute(routeKeys.colors);
const About = lazyRoute(routeKeys.about);
const Contact = lazyRoute(routeKeys.contact);
const Services = lazyRoute(routeKeys.services);
const LandingDespega = lazyRoute(routeKeys.landingDespega);
const Terminos = lazyRoute(routeKeys.terminos);
const PoliticaPrivacidad = lazyRoute(routeKeys.politicaPrivacidad);
// const Development = lazyRoute(routeKeys.development);
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
const ProjectContentPlanning = lazyRoute(routeKeys.projectContentPlanning);
const ProjectReports = lazyRoute(routeKeys.projectReports);
const ProjectBrandDocs    = lazyRoute(routeKeys.projectBrandDocs);
const ClientAppointments = lazyRoute(routeKeys.clientAppointments);
const Invoices = lazyRoute(routeKeys.invoices);
const FinancesDashboard = lazyRoute(routeKeys.financesDashboard);
const Inbox = lazyRoute(routeKeys.inbox);
const TeamChat = lazyRoute(routeKeys.teamChat);
const ClientChat = lazyRoute(routeKeys.clientChat);
const MessagingHubRedirect = lazyRoute(routeKeys.messagingHubRedirect);
const Settings = lazyRoute(routeKeys.settings);
const ScheduleCall = lazyRoute(routeKeys.scheduleCall);
const AdminAppointments = lazyRoute(routeKeys.adminAppointments);
const Studio = lazyRoute(routeKeys.studio);
const StudioDTE = lazyRoute(routeKeys.studioDte);
const HeroPanchoPreview = lazy(() => import('@/pages/HeroPanchoPreview'));
const PortalLayout = lazy(() => import('@/layouts/PortalLayout'));

const FinancesPeriodRedirect = () => {
  const { periodId } = useParams();
  return <Navigate to={`/dashboard/finances?tab=periodos&period=${periodId}`} replace />;
};

const ProjectIntegrationsRedirect = () => {
  const { projectId } = useParams();
  return <Navigate to={projectId ? `/dashboard/projects/${projectId}/services` : '/dashboard/projects'} replace />;
};

const RouteRobotsMeta = () => {
  const location = useLocation();

  if (!shouldNoIndexPath(location.pathname)) return null;

  return (
    <SEO
      title="Grupo DTE"
      description="Área privada o herramienta operativa de Grupo DTE."
      url={location.pathname}
      robots="noindex, nofollow"
    />
  );
};

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

    const publicCandidates = ["/servicios", "/dte", "/contacto", "/nosotros"];

    let routes = publicCandidates;
      if (isAuthenticated || isDashboardPath) {
      if (path.startsWith("/dashboard/reports")) {
        routes = ["/dashboard/projects", "/dashboard/tasks"];
      } else if (path.startsWith("/dashboard/content-planning")) {
        routes = ["/dashboard/projects", "/dashboard/tasks", "/dashboard/reports"];
      } else if (path.startsWith("/dashboard/tasks")) {
        routes = ["/dashboard/projects", "/dashboard/reports", "/dashboard/content-planning"];
      } else if (path.startsWith("/dashboard/projects")) {
        routes = ["/dashboard/tasks", "/dashboard/reports", "/dashboard/content-planning"];
      } else if (path.startsWith("/dashboard/inbox") || path.startsWith("/dashboard/messages")) {
        routes = ["/dashboard/projects", "/dashboard/reports"];
      } else {
        routes = ["/dashboard/projects", "/dashboard/tasks", "/dashboard/reports", "/dashboard/content-planning"];
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

  const shouldBlockForAuth = isDashboardPath || location.pathname.toLowerCase().startsWith('/complete-profile');
  const shouldShowAuthLoader = loading && shouldBlockForAuth;
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
      <RouteRobotsMeta />

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
          <Route path="/brief/:bookingId?" element={<Brief />} />
          <Route path="/colors" element={<Colors />} />
          <Route path="/Nosotros" caseSensitive element={<Navigate to="/nosotros" replace />} />
          <Route path="/Contacto" caseSensitive element={<Navigate to="/contacto" replace />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/despega" element={<LandingDespega />} />
          <Route path="/tyc" element={<Terminos />} />
          <Route path="/terminos-y-condiciones" element={<Navigate to="/tyc" replace />} />
          <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          <Route path="/desarrollo" element={<Navigate to="/servicios" replace />} />
          <Route path="/dte" element={<LandingDTE />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/invite" element={<Invite />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/meet/:projectId?" element={<ScheduleCall />} />
          <Route path="/hero-pancho" element={<HeroPanchoPreview />} />

          {/* Private Portal Routes */}
          <Route path="/dashboard" element={<PortalLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:clientId" element={<ClientDetail />} />
            <Route path="tasks" element={<ProjectTasks />} />
            <Route path="content-planning" element={<ProjectContentPlanning />} />
            <Route path="reports" element={<ProjectReports />} />
            <Route path="integrations" element={<ProjectIntegrationsRedirect />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="finances" element={<FinancesDashboard />} />
            <Route path="finances/ledger" element={<Navigate to="/dashboard/finances?tab=dashboard" replace />} />
            <Route path="finances/periods/:periodId" element={<FinancesPeriodRedirect />} />
            <Route path="finances/settings" element={<Navigate to="/dashboard/finances" replace />} />
            <Route path="finances/cashflow" element={<Navigate to="/dashboard/finances?tab=reportes&view=cashflow" replace />} />
            <Route path="finances/projects" element={<Navigate to="/dashboard/finances?tab=reportes&view=proyectos" replace />} />
            <Route path="finances/reports" element={<Navigate to="/dashboard/finances?tab=reportes&view=mensual" replace />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<Navigate to="services" replace />} />
            <Route path="projects/:projectId/services" element={<ProjectTasks />} />
            <Route path="services" element={<ProjectTasks />} />
            <Route path="projects/:projectId/reports" element={<Navigate to="/dashboard/reports" replace />} />
            <Route path="projects/:projectId/integrations" element={<ProjectIntegrationsRedirect />} />
            <Route path="projects/:projectId/brand-docs" element={<ProjectBrandDocs />} />
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
            <Route path="studio/workflow" element={<StudioDTE />} />

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
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1c1c1e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' },
          success: { iconTheme: { primary: '#34d399', secondary: '#1c1c1e' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#1c1c1e' } },
        }}
      />
    </Router>
  );
};

export default App;

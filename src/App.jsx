// App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const Clients = lazy(() => import("@/pages/dashboard/crm/Clients"));
const ClientDetail = lazy(() => import("@/pages/dashboard/crm/ClientDetail"));
const Projects = lazy(() => import("@/pages/dashboard/projects/Projects"));
const ProjectDetailLayout = lazy(() => import("@/pages/dashboard/projects/ProjectDetailLayout"));
const ProjectServices = lazy(() => import("@/pages/dashboard/projects/ProjectServices"));
const ProjectReports = lazy(() => import("@/pages/dashboard/projects/ProjectReports"));
const ProjectInvoices = lazy(() => import("@/pages/dashboard/projects/ProjectInvoices"));
const Invoices = lazy(() => import("@/pages/dashboard/invoices/Invoices"));
const Inbox = lazy(() => import("@/pages/dashboard/inbox/Inbox"));
const TeamChat = lazy(() => import("@/pages/dashboard/chat/TeamChat"));
const Settings = lazy(() => import("@/pages/dashboard/settings/Settings"));
import { AuthProvider } from "@/context/AuthContext";
import { UIProvider, useUI } from "@/context/UIContext";
import PortalLayout from "@/layouts/PortalLayout";
import { Navigate } from "react-router-dom";

const AppContent = () => {
  const { isNavbarOpen } = useUI();

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

          {/* Private Portal Routes */}
            <Route path="/dashboard" element={<PortalLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:clientId" element={<ClientDetail />} />
              <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetailLayout />} />
            <Route path="projects/:projectId/services" element={<ProjectServices />} />
            <Route path="projects/:projectId/reports" element={<ProjectReports />} />
            <Route path="projects/:projectId/invoices" element={<ProjectInvoices />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="team-chat" element={<TeamChat />} />
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

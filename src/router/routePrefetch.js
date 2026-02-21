import { lazy } from 'react';

const once = (importer) => {
    let promise;
    return () => {
        if (!promise) {
            promise = importer().catch((error) => {
                promise = null;
                throw error;
            });
        }
        return promise;
    };
};

export const routeKeys = Object.freeze({
    home: 'home',
    about: 'about',
    contact: 'contact',
    services: 'services',
    landingDespega: 'landingDespega',
    terminos: 'terminos',
    politicaPrivacidad: 'politicaPrivacidad',
    development: 'development',
    landingDte: 'landingDte',
    adminLogin: 'adminLogin',
    registro: 'registro',
    completeProfile: 'completeProfile',
    scheduleCall: 'scheduleCall',
    dashboardHome: 'dashboardHome',
    clients: 'clients',
    clientDetail: 'clientDetail',
    projects: 'projects',
    projectTasks: 'projectTasks',
    projectReports: 'projectReports',
    invoices: 'invoices',
    inbox: 'inbox',
    teamChat: 'teamChat',
    clientChat: 'clientChat',
    messagingHubRedirect: 'messagingHubRedirect',
    adminAppointments: 'adminAppointments',
    clientAppointments: 'clientAppointments',
    settings: 'settings',
});

const routeImporters = {
    [routeKeys.home]: once(() => import('@/pages/Home')),
    [routeKeys.about]: once(() => import('@/pages/About')),
    [routeKeys.contact]: once(() => import('@/pages/Contact')),
    [routeKeys.services]: once(() => import('@/pages/Services')),
    [routeKeys.landingDespega]: once(() => import('@/pages/LandingDespega')),
    [routeKeys.terminos]: once(() => import('@/pages/TerminosCondiciones')),
    [routeKeys.politicaPrivacidad]: once(() => import('@/pages/PoliticaPrivacidad')),
    [routeKeys.development]: once(() => import('@/pages/Development')),
    [routeKeys.landingDte]: once(() => import('@/pages/LandingDTE')),
    [routeKeys.adminLogin]: once(() => import('@/pages/AdminLogin')),
    [routeKeys.registro]: once(() => import('@/pages/Registro')),
    [routeKeys.completeProfile]: once(() => import('@/pages/CompleteProfile')),
    [routeKeys.scheduleCall]: once(() => import('@/pages/ScheduleCall')),
    [routeKeys.dashboardHome]: once(() => import('@/pages/dashboard/DashboardHome')),
    [routeKeys.clients]: once(() => import('@/pages/dashboard/crm/Clients')),
    [routeKeys.clientDetail]: once(() => import('@/pages/dashboard/crm/ClientDetail')),
    [routeKeys.projects]: once(() => import('@/pages/dashboard/projects/Projects')),
    [routeKeys.projectTasks]: once(() => import('@/pages/dashboard/projects/ProjectTasks')),
    [routeKeys.projectReports]: once(() => import('@/pages/dashboard/projects/ProjectReports')),
    [routeKeys.invoices]: once(() => import('@/pages/dashboard/invoices/Invoices')),
    [routeKeys.inbox]: once(() => import('@/pages/dashboard/inbox/Inbox')),
    [routeKeys.teamChat]: once(() => import('@/pages/dashboard/chat/TeamChat')),
    [routeKeys.clientChat]: once(() => import('@/pages/dashboard/chat/ClientChat')),
    [routeKeys.messagingHubRedirect]: once(() => import('@/pages/dashboard/messages/MessagingHubRedirect')),
    [routeKeys.adminAppointments]: once(() => import('@/pages/AdminAppointments')),
    [routeKeys.clientAppointments]: once(() => import('@/pages/dashboard/projects/ClientAppointments')),
    [routeKeys.settings]: once(() => import('@/pages/dashboard/settings/Settings')),
};

const pathKeyMap = new Map([
    ['/', routeKeys.home],
    ['/nosotros', routeKeys.about],
    ['/contacto', routeKeys.contact],
    ['/servicios', routeKeys.services],
    ['/despega', routeKeys.landingDespega],
    ['/tyc', routeKeys.terminos],
    ['/politica-privacidad', routeKeys.politicaPrivacidad],
    ['/desarrollo', routeKeys.development],
    ['/dte', routeKeys.landingDte],
    ['/admin', routeKeys.adminLogin],
    ['/registro', routeKeys.registro],
    ['/complete-profile', routeKeys.completeProfile],
    ['/schedule-call', routeKeys.scheduleCall],
    ['/dashboard', routeKeys.dashboardHome],
    ['/dashboard/clients', routeKeys.clients],
    ['/dashboard/tasks', routeKeys.projectTasks],
    ['/dashboard/reports', routeKeys.projectReports],
    ['/dashboard/invoices', routeKeys.invoices],
    ['/dashboard/projects', routeKeys.projects],
    ['/dashboard/inbox', routeKeys.inbox],
    ['/dashboard/team-chat', routeKeys.teamChat],
    ['/dashboard/client-chat', routeKeys.clientChat],
    ['/dashboard/messages', routeKeys.messagingHubRedirect],
    ['/dashboard/appointments', routeKeys.adminAppointments],
    ['/dashboard/my-appointments', routeKeys.clientAppointments],
    ['/dashboard/settings', routeKeys.settings],
    ['/dashboard/profile', routeKeys.settings],
]);

const normalizePath = (to) => {
    if (!to) return '';
    const rawPath = typeof to === 'string' ? to : to.pathname || '';
    if (!rawPath) return '';

    let pathname = rawPath;
    try {
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
            pathname = new URL(rawPath).pathname;
        } else {
            pathname = rawPath.split('?')[0].split('#')[0];
        }
    } catch {
        pathname = rawPath.split('?')[0].split('#')[0];
    }

    const compact = pathname.replace(/\/+$/, '');
    return (compact || '/').toLowerCase();
};

const resolveRouteKey = (to) => {
    const path = normalizePath(to);
    if (!path) return null;

    const directMatch = pathKeyMap.get(path);
    if (directMatch) return directMatch;

    if (path.startsWith('/schedule-call/')) return routeKeys.scheduleCall;
    if (path.startsWith('/dashboard/clients/')) return routeKeys.clientDetail;
    if (path.startsWith('/dashboard/projects/')) return routeKeys.projects;

    return null;
};

export const lazyRoute = (key) => {
    const importer = routeImporters[key];
    if (!importer) {
        throw new Error(`[routePrefetch] Route key not found: ${key}`);
    }
    const Component = lazy(importer);
    Component.preload = importer;
    return Component;
};

export const preloadRoute = (to) => {
    const routeKey = resolveRouteKey(to);
    if (!routeKey) return Promise.resolve(null);
    return routeImporters[routeKey]();
};

export const preloadRoutes = (routes = []) =>
    Promise.allSettled(routes.map((route) => preloadRoute(route)));

export const scheduleIdlePreload = (routes = [], timeout = 1400) => {
    if (typeof window === 'undefined' || routes.length === 0) return () => {};

    const warmup = () => {
        void preloadRoutes(routes);
    };

    if ('requestIdleCallback' in window) {
        const idleId = window.requestIdleCallback(warmup, { timeout });
        return () => {
            if ('cancelIdleCallback' in window) {
                window.cancelIdleCallback(idleId);
            }
        };
    }

    const timer = window.setTimeout(warmup, timeout);
    return () => window.clearTimeout(timer);
};

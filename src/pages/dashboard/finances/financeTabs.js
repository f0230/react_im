export const FINANCE_TAB_OPTIONS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'periodos', label: 'Periodos' },
    { key: 'reportes', label: 'Reportes' },
];

export const FINANCE_REPORT_VIEWS = ['mensual', 'proyectos', 'cashflow'];

const LEGACY_TAB_REDIRECTS = {
    resumen: { tab: 'dashboard' },
    ledger: { tab: 'dashboard' },
    cashflow: { tab: 'reportes', view: 'cashflow' },
    proyectos: { tab: 'reportes', view: 'proyectos' },
};

export const normalizeFinanceSearchParams = (searchParams) => {
    const next = new URLSearchParams(searchParams);
    const rawTab = next.get('tab') || 'dashboard';
    const legacyRedirect = LEGACY_TAB_REDIRECTS[rawTab];
    let tab = legacyRedirect?.tab || rawTab;
    let changed = false;

    if (legacyRedirect) {
        next.set('tab', legacyRedirect.tab);
        if (legacyRedirect.view) next.set('view', legacyRedirect.view);
        changed = true;
    }

    if (!FINANCE_TAB_OPTIONS.some((item) => item.key === tab)) {
        tab = 'dashboard';
        next.set('tab', tab);
        changed = true;
    }

    if (tab === 'reportes') {
        const rawView = next.get('view') || legacyRedirect?.view || 'mensual';
        const view = FINANCE_REPORT_VIEWS.includes(rawView) ? rawView : 'mensual';
        if (next.get('view') !== view) {
            next.set('view', view);
            changed = true;
        }
        return { changed, params: next, tab, reportView: view };
    }

    if (next.has('view')) {
        next.delete('view');
        changed = true;
    }

    return { changed, params: next, tab, reportView: 'mensual' };
};

export const buildFinanceSearchParams = (searchParams, patch = {}) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(patch).forEach(([key, value]) => {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
    });

    return next;
};

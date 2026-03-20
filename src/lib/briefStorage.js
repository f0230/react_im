export const DTE_BRIEF_STORAGE_KEY = 'dte_brief_data_v1';

const cleanText = (value) => String(value || '').trim();

export const loadStoredBrief = () => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(DTE_BRIEF_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

export const saveStoredBrief = (brief) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(DTE_BRIEF_STORAGE_KEY, JSON.stringify(brief));
    } catch {
        // noop
    }
};

export const clearStoredBrief = () => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.removeItem(DTE_BRIEF_STORAGE_KEY);
    } catch {
        // noop
    }
};

export const buildBriefSummary = (brief) => {
    if (!brief || typeof brief !== 'object') return '';

    const parts = [
        cleanText(brief.empresa) ? `Empresa: ${cleanText(brief.empresa)}` : '',
        cleanText(brief.servicioInteres) ? `Servicio: ${cleanText(brief.servicioInteres)}` : '',
        cleanText(brief.objetivoPrincipal) ? `Objetivo: ${cleanText(brief.objetivoPrincipal)}` : '',
        cleanText(brief.facturacionMensual) ? `Facturación: ${cleanText(brief.facturacionMensual)}` : '',
        cleanText(brief.presupuesto) ? `Presupuesto: ${cleanText(brief.presupuesto)}` : '',
        cleanText(brief.urgencia) ? `Urgencia: ${cleanText(brief.urgencia)}` : '',
        cleanText(brief.cuelloBotella) ? `Cuello: ${cleanText(brief.cuelloBotella)}` : '',
    ].filter(Boolean);

    return parts.join(' | ').slice(0, 460);
};

export const buildBookingNotesWithBrief = ({ notes, brief }) => {
    const manualNotes = cleanText(notes);
    const briefSummary = buildBriefSummary(brief);

    return [manualNotes, briefSummary ? `Brief DTE: ${briefSummary}` : '']
        .filter(Boolean)
        .join(' || ')
        .slice(0, 500);
};

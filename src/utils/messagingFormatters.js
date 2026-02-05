export const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const getInitial = (name, fallback = 'C') => {
    if (!name) return fallback;
    return String(name).trim().charAt(0).toUpperCase() || fallback;
};

export const normalizePhone = (value) => {
    if (!value) return '';
    return String(value).replace(/\D/g, '');
};

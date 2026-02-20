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

export const formatShortDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return timeStr;

    return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`;
};

export const getUserColor = (name) => {
    if (!name || name === 'Tú' || name === 'You') return 'text-neutral-500';
    const colors = [
        'text-blue-600',
        'text-emerald-600',
        'text-violet-600',
        'text-amber-600',
        'text-rose-600',
        'text-cyan-600',
        'text-indigo-600',
        'text-fuchsia-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export const formatFinanceCurrency = (value, currency = 'USD') => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
};

export const FINANCE_REPORTING_CURRENCY = 'USD';

const roundFinanceAmount = (value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const formatFinanceDate = (value) => {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('es-UY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

export const formatFinancePeriodRange = (startDate, endDate) => (
    `${formatFinanceDate(startDate)} - ${formatFinanceDate(endDate)}`
);

export const FINANCE_CATEGORY_OPTIONS = {
    income: [
        { value: 'client_payment', label: 'Pago de cliente' },
        { value: 'project_fee', label: 'Fee de proyecto' },
        { value: 'retainer', label: 'Retainer mensual' },
        { value: 'other_income', label: 'Otro ingreso' },
    ],
    expense: [
        { value: 'tools_subscriptions', label: 'Herramientas y suscripciones' },
        { value: 'salary_payment', label: 'Pago de salarios' },
        { value: 'advertising', label: 'Publicidad' },
        { value: 'infrastructure', label: 'Infraestructura' },
        { value: 'freelancer', label: 'Freelancer / externo' },
        { value: 'other_expense', label: 'Otro gasto' },
    ],
};

export const getFinanceCategoryLabel = (type, category) => {
    const match = (FINANCE_CATEGORY_OPTIONS[type] || []).find((item) => item.value === category);
    return match?.label || category || 'Sin categoría';
};

export const RECIPIENT_TYPE_LABELS = {
    admin: 'Administrador',
    worker: 'Worker',
    company: 'Empresa',
};

export const getProjectDisplayName = (project) => (
    project?.title || project?.project_name || project?.name || 'Proyecto sin nombre'
);

export const getPersonDisplayName = (person) => (
    person?.full_name || person?.email || 'Sin nombre'
);

export const DUPLICATE_FOUNDER_PROFILES_ERROR = 'Francisco y Federico deben estar asignados a perfiles distintos.';

export const hasDuplicateFounderProfiles = (config) => {
    const franciscoProfileId = config?.francisco_profile_id || null;
    const federicoProfileId = config?.federico_profile_id || null;

    return Boolean(
        franciscoProfileId
        && federicoProfileId
        && franciscoProfileId === federicoProfileId,
    );
};

export const getInvoiceDisplayLabel = (invoice) => (
    invoice?.invoice_number || invoice?.description || invoice?.id || 'Factura'
);

export const getFinanceTransactionReportingAmount = (transaction) => {
    const amountUsd = Number(transaction?.amount_usd);
    if (Number.isFinite(amountUsd)) return roundFinanceAmount(amountUsd);

    const amount = Number(transaction?.amount);
    if (!Number.isFinite(amount)) return 0;

    const currency = transaction?.currency || FINANCE_REPORTING_CURRENCY;
    if (currency === FINANCE_REPORTING_CURRENCY) return roundFinanceAmount(amount);

    const exchangeRate = Number(transaction?.exchange_rate);
    if (Number.isFinite(exchangeRate) && exchangeRate > 0) {
        return roundFinanceAmount(amount / exchangeRate);
    }

    return roundFinanceAmount(amount);
};

export const getInvoiceReportingAmount = (invoice) => {
    const amountUsd = Number(invoice?.amount_usd);
    if (Number.isFinite(amountUsd)) return roundFinanceAmount(amountUsd);

    const amount = Number(invoice?.amount);
    if (!Number.isFinite(amount)) return 0;

    const currency = invoice?.currency || FINANCE_REPORTING_CURRENCY;
    if (currency === FINANCE_REPORTING_CURRENCY) return roundFinanceAmount(amount);

    const exchangeRate = Number(invoice?.exchange_rate);
    if (Number.isFinite(exchangeRate) && exchangeRate > 0) {
        return roundFinanceAmount(amount / exchangeRate);
    }

    return roundFinanceAmount(amount);
};

export const getInvoicePaymentDate = (invoice) => (
    invoice?.paid_at || invoice?.updated_at || invoice?.created_at || null
);

export const isDateWithinPeriod = (value, startDate, endDate) => {
    if (!value || !startDate || !endDate) return false;

    const target = new Date(value);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if ([target, start, end].some((date) => Number.isNaN(date.getTime()))) return false;

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return target >= start && target <= end;
};

export const resolvePeriodIdForDate = (periods = [], value) => {
    const match = periods.find((period) => isDateWithinPeriod(value, period.start_date, period.end_date));
    return match?.id || null;
};

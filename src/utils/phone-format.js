export const stripLeadingPlus = (value) => {
    if (value == null) return '';
    return String(value).trim().replace(/^\+/, '');
};

export const formatPhoneForDisplay = (value) => {
    const stripped = stripLeadingPlus(value);
    return stripped || '';
};

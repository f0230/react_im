// src/utils/phone-validation.js
export const isValidPhone = (phone) => {
    // Permite formatos internacionales (con o sin +), espacios y/o guiones opcionales
    const phoneRegex = /^(\+?[0-9]{1,4})?[-\s]?([0-9]{3,4})[-\s]?([0-9]{3,4})[-\s]?([0-9]{0,4})$/;

    // Elimina espacios, guiones y paréntesis para verificar longitud mínima
    const digitsOnly = phone.replace(/[\s\-()]/g, '');
    const hasMinimumDigits = digitsOnly.length >= 8;

    return phoneRegex.test(phone) && hasMinimumDigits;
};
    
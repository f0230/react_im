import { isValidPhone } from "./phone-validation";

export const validateAppointmentFields = ({ datetime, phone, message }) => {
    const errors = {};
    const now = new Date();

    if (!datetime) {
        errors.datetime = "Seleccioná una fecha y hora.";
    } else if (datetime < now || datetime.getHours() < 10 || datetime.getHours() >= 18) {
        errors.datetime = "Solo se permiten horarios entre 10:00 y 18:00.";
    }

    if (!phone?.trim()) {
        errors.phone = "El teléfono es obligatorio.";
    } else if (!isValidPhone(phone)) {
        errors.phone = "Ingresá un número de teléfono válido.";
    }

    if (!message?.trim()) {
        errors.message = "El mensaje es obligatorio.";
    } else if (message.trim().length < 10) {
        errors.message = "Debe tener al menos 10 caracteres.";
    }

    return errors;
};

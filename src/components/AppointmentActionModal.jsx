import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Mail, Trash2, AlertCircle, Loader2, Link as LinkIcon, CalendarClock, ArrowLeft, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import useCalAvailability from '@/hooks/useCalAvailability';
import { supabase } from '@/lib/supabaseClient';
import { formatScheduleTime, SCHEDULE_TIME_ZONE_LABEL } from '@/utils/scheduleTime';
import "react-datepicker/dist/react-datepicker.css";

const AppointmentActionModal = ({ appointment, isOpen, onClose, onUpdate, position }) => {
    const [action, setAction] = useState(null); // 'cancel' | 'reschedule'
    const [loading, setLoading] = useState(false);
    const dragControls = useDragControls();

    // Cancel State
    const [cancelReason, setCancelReason] = useState('');

    // Reschedule State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const {
        slots,
        loadingSlots,
        selectedSlot,
        setSelectedSlot,
        resetAvailability
    } = useCalAvailability({
        selectedDate,
        enabled: action === 'reschedule' && Boolean(selectedDate)
    });

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setAction(null);
            setCancelReason('');
            setSelectedDate(new Date());
            resetAvailability();
        }
    }, [isOpen, resetAvailability]);

    if (!isOpen || !appointment) return null;
    const hasParticipantEmail = Boolean(appointment.client_email && appointment.client_email !== 'Unknown');
    const normalizedStatus = String(appointment.status || '').trim().toLowerCase();

    const isRescheduling = action === 'reschedule';

    // Position only applies to the compact contextual menu.
    const getMenuStyle = () => {
        if (!position) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

        const PADDING = 10;
        const WIDTH = 224; // w-56
        const HEIGHT = 300;

        let { x, y } = position;

        if (x + WIDTH > window.innerWidth - PADDING) {
            x = window.innerWidth - WIDTH - PADDING;
        }

        if (y + HEIGHT > window.innerHeight - PADDING) {
            y = window.innerHeight - HEIGHT - PADDING;
        }

        return {
            top: y,
            left: x,
            position: 'fixed',
            transform: 'none',
            width: '14rem' // w-56
        };
    };

    const handleCancel = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
            }

            const response = await fetch('/api/cal/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    bookingUid: appointment.cal_booking_id,
                    reason: cancelReason
                })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'No se pudo cancelar la cita');
            }

            toast.success('Cita cancelada correctamente');
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error?.message || 'Error al cancelar la cita');
        } finally {
            setLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!selectedSlot) return;
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
            }

            const response = await fetch('/api/cal/reschedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    bookingUid: appointment.cal_booking_id,
                    start: selectedSlot.start,
                    reason: "Reprogramado por administración"
                })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'No se pudo reprogramar la cita');
            }

            toast.success('Cita reprogramada con éxito');
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error?.message || 'Error al reprogramar');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (nextStatus) => {
        if (!nextStatus || nextStatus === normalizedStatus) return;
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
            }

            const response = await fetch('/api/cal/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    bookingId: appointment.cal_booking_id,
                    status: nextStatus,
                    appointment,
                })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'No se pudo actualizar el estado');
            }

            toast.success(nextStatus === 'completed' ? 'Cita marcada como completada' : 'Estado actualizado');
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error?.message || 'Error al actualizar el estado');
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className={isRescheduling ? 'p-0 flex flex-col md:flex-row h-full' : 'p-2'}>
            {!action ? (
                <div className="space-y-1">
                    {appointment.meeting_link && (
                        <a
                            href={appointment.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-blue-600 hover:text-blue-700 transition w-full font-medium text-left"
                        >
                            <LinkIcon size={14} />
                            Unirse
                        </a>
                    )}
                    {hasParticipantEmail && (
                        <a
                            href={`mailto:${appointment.client_email}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition w-full text-left"
                            onClick={() => onClose()}
                        >
                            <Mail size={14} />
                            Enviar Email
                        </a>
                    )}
                    <button
                        onClick={() => setAction('reschedule')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition w-full text-left"
                    >
                        <CalendarClock size={14} />
                        Reprogramar
                    </button>
                    {normalizedStatus !== 'completed' && (
                        <button
                            onClick={() => handleStatusUpdate('completed')}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-emerald-50 text-emerald-700 transition w-full text-left disabled:opacity-50"
                        >
                            <Check size={14} />
                            Marcar como completada
                        </button>
                    )}
                    {normalizedStatus !== 'scheduled' && normalizedStatus !== 'cancelled' && (
                        <button
                            onClick={() => handleStatusUpdate('scheduled')}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition w-full text-left disabled:opacity-50"
                        >
                            <Clock size={14} />
                            Marcar como programada
                        </button>
                    )}
                    <button
                        onClick={() => setAction('cancel')}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition w-full text-left"
                    >
                        <Trash2 size={14} />
                        Cancelar
                    </button>
                </div>
            ) : action === 'cancel' ? (
                <div className="space-y-2 pt-1">
                    <p className="text-xs text-red-600 font-medium px-1">
                        ¿Cancelar cita?
                    </p>
                    <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-1 focus:ring-red-500 outline-none resize-none text-xs"
                        rows="2"
                        placeholder="Motivo..."
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setAction(null)}
                            className="flex-1 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                            Atrás
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={12} />}
                            Si
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row w-full h-[400px] md:h-[440px] max-h-[calc(90vh-57px)]">
                    <div className="p-4 border-b md:border-b-0 md:border-r border-gray-100 flex-shrink-0 flex justify-center bg-gray-50 overflow-auto">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            inline
                            minDate={new Date()}
                            calendarClassName="!border-0 !font-sans !bg-transparent !shadow-none"
                        />
                    </div>

                    <div className="flex-1 min-h-0 p-4 flex flex-col bg-white relative">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            Selecciona Hora · {SCHEDULE_TIME_ZONE_LABEL}
                        </h3>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 min-h-0">
                            {loadingSlots ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="animate-spin text-gray-300" />
                                </div>
                            ) : slots.length > 0 ? (
                                slots.map((slot, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center ${selectedSlot?.start === slot.start
                                            ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                                            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="font-medium text-sm">
                                            {formatScheduleTime(slot.start)}
                                        </span>
                                        {selectedSlot?.start === slot.start && <Check size={14} />}
                                    </button>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 text-xs py-10">
                                    No hay horarios
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setAction(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReschedule}
                                disabled={!selectedSlot || loading}
                                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={14} />}
                                Confirmar Cambio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
                {/* Backdrop only active when Rescheduling (expanded mode) */}
                {isRescheduling && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                        style={{ pointerEvents: 'auto' }}
                        onClick={onClose}
                    />
                )}

                {/* Invisible Backdrop for click-outside on small menu */}
                {!isRescheduling && (
                    <div
                        className="absolute inset-0 bg-transparent"
                        onClick={onClose}
                        style={{ pointerEvents: 'auto' }}
                    />
                )}

                {isRescheduling ? (
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6" style={{ pointerEvents: 'none' }}>
                        <motion.div
                            key="appointment-modal-reschedule"
                            drag
                            dragControls={dragControls}
                            dragListener={false}
                            dragMomentum={false}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            style={{ pointerEvents: 'auto' }}
                            className="w-full max-w-[960px] max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 flex flex-col z-[101] text-sm"
                        >
                            <div
                                onPointerDown={(e) => dragControls.start(e)}
                                className="px-3 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 cursor-move"
                            >
                                <span className="font-semibold text-gray-900 truncate text-xs flex items-center gap-2">
                                    <button onClick={() => setAction(null)} className="hover:bg-gray-200 p-1 rounded-full cursor-pointer" onPointerDown={(e) => e.stopPropagation()}>
                                        <ArrowLeft size={12} />
                                    </button>
                                    Reprogramar Cita
                                </span>
                                <button onClick={onClose} className="text-gray-400 hover:text-black transition cursor-pointer" onPointerDown={(e) => e.stopPropagation()}>
                                    <X size={14} />
                                </button>
                            </div>
                            {content}
                        </motion.div>
                    </div>
                ) : (
                    <motion.div
                        key="appointment-modal-menu"
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        style={{
                            ...getMenuStyle(),
                            pointerEvents: 'auto'
                        }}
                        className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 flex flex-col z-[101] text-sm"
                    >
                        <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <span className="font-semibold text-gray-900 truncate text-xs flex items-center gap-2">
                                {appointment.client_name || appointment.client_email || 'Participante'}
                            </span>
                            <button onClick={onClose} className="text-gray-400 hover:text-black transition cursor-pointer">
                                <X size={14} />
                            </button>
                        </div>
                        {content}
                    </motion.div>
                )}
            </div>
        </AnimatePresence>
    );
};

export default AppointmentActionModal;

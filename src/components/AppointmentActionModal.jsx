import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Mail, Trash2, AlertCircle, Loader2, Link as LinkIcon, CalendarClock, ArrowLeft, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import useCalAvailability from '@/hooks/useCalAvailability';
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

    // Calculate position
    const getStyle = () => {
        // Center if rescheduling (needs more space)
        if (action === 'reschedule') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed',
                width: '600px',
                maxWidth: '95vw',
                height: 'auto',
                maxHeight: '90vh'
            };
        }

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
            const response = await fetch('/api/cal/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': import.meta.env.VITE_ADMIN_API_SECRET
                },
                body: JSON.stringify({
                    bookingUid: appointment.cal_booking_id,
                    reason: cancelReason
                })
            });

            if (!response.ok) throw new Error('Failed to cancel');

            toast.success('Cita cancelada correctamente');
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al cancelar la cita');
        } finally {
            setLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!selectedSlot) return;
        setLoading(true);
        try {
            const response = await fetch('/api/cal/reschedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': import.meta.env.VITE_ADMIN_API_SECRET
                },
                body: JSON.stringify({
                    bookingUid: appointment.cal_booking_id,
                    start: selectedSlot.start,
                    reason: "Reprogramado por administración"
                })
            });

            if (!response.ok) throw new Error('Failed to reschedule');

            toast.success('Cita reprogramada con éxito');
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al reprogramar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
                {/* Backdrop only active when Rescheduling (expanded mode) */}
                {action === 'reschedule' && (
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
                {action !== 'reschedule' && (
                    <div
                        className="absolute inset-0 bg-transparent"
                        onClick={onClose}
                        style={{ pointerEvents: 'auto' }}
                    />
                )}

                <motion.div
                    layout
                    drag={action === 'reschedule'}
                    dragControls={dragControls}
                    dragListener={false}
                    dragMomentum={false}
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    style={{
                        ...getStyle(),
                        pointerEvents: 'auto'
                    }}
                    className={`bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 flex flex-col z-[101] text-sm transition-all duration-300 ${action === 'reschedule' ? 'p-0' : ''}`}
                >
                    {/* Header */}
                    <div
                        onPointerDown={(e) => action === 'reschedule' && dragControls.start(e)}
                        className={`px-3 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 ${action === 'reschedule' ? 'cursor-move' : ''}`}
                    >
                        <span className="font-semibold text-gray-900 truncate text-xs flex items-center gap-2">
                            {action && (
                                <button onClick={() => setAction(null)} className="hover:bg-gray-200 p-1 rounded-full cursor-pointer" onPointerDown={(e) => e.stopPropagation()}>
                                    <ArrowLeft size={12} />
                                </button>
                            )}
                            {action === 'reschedule' ? 'Reprogramar Cita' : appointment.client_name}
                        </span>
                        <button onClick={onClose} className="text-gray-400 hover:text-black transition cursor-pointer" onPointerDown={(e) => e.stopPropagation()}>
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className={action === 'reschedule' ? 'p-0 flex flex-col md:flex-row h-full' : 'p-2'}>
                        {!action ? (
                            // Default Menu
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
                                <a
                                    href={`mailto:${appointment.client_email}`}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition w-full text-left"
                                    onClick={() => onClose()}
                                >
                                    <Mail size={14} />
                                    Enviar Email
                                </a>
                                <button
                                    onClick={() => setAction('reschedule')}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition w-full text-left"
                                >
                                    <CalendarClock size={14} />
                                    Reprogramar
                                </button>
                                <button
                                    onClick={() => setAction('cancel')}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition w-full text-left"
                                >
                                    <Trash2 size={14} />
                                    Cancelar
                                </button>
                            </div>
                        ) : action === 'cancel' ? (
                            // Cancel View
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
                            // Reschedule View (Full Modal)
                            <div className="flex flex-col md:flex-row w-full h-[400px]">
                                {/* Panel 1: Calendar */}
                                <div className="p-4 border-r border-gray-100 flex-shrink-0 flex justify-center bg-gray-50">
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={(date) => setSelectedDate(date)}
                                        inline
                                        minDate={new Date()}
                                        calendarClassName="!border-0 !font-sans !bg-transparent !shadow-none"
                                    />
                                </div>

                                {/* Panel 2: Slot Selection */}
                                <div className="flex-1 p-4 flex flex-col h-full bg-white relative">
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Clock size={16} className="text-gray-400" />
                                        Selecciona Hora
                                    </h3>

                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 max-h-[300px]">
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
                                                        {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                                    {/* Footer Actions */}
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
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AppointmentActionModal;

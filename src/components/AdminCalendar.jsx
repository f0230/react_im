import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './AdminCalendar.css'; // Import scoped styles
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from "react-i18next";

// Setup localizer
const locales = {
    'en': enUS,
    'es': es,
};

const CustomToolbar = ({ label, onNavigate, onView, view }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center text-white shadow-lg">
                    <CalendarIcon size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{label}</h2>
                    <p className="text-xs text-gray-500 font-medium">{t("admin.calendar.toolbar.manage")}</p>
                </div>
            </div>

            <div className="flex items-center bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1 mr-4 border-r border-gray-200 pr-4">
                    <button
                        onClick={() => onNavigate('PREV')}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-600"
                        title={t("admin.calendar.toolbar.prev")}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => onNavigate('TODAY')}
                        className="px-4 py-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-sm font-semibold text-gray-700"
                    >
                        {t("admin.calendar.toolbar.today")}
                    </button>
                    <button
                        onClick={() => onNavigate('NEXT')}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-600"
                        title={t("admin.calendar.toolbar.next")}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    {['month', 'week', 'day'].map((v) => (
                        <button
                            key={v}
                            onClick={() => onView(v)}
                            className={`px-4 py-2 rounded-xl transition-all text-sm font-bold capitalize ${view === v
                                ? 'bg-black text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white'
                                }`}
                        >
                            {t(`admin.calendar.toolbar.${v}`)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminCalendar = ({ appointments, onSelectAppointment }) => {
    const { i18n } = useTranslation();

    const localizer = useMemo(() => dateFnsLocalizer({
        format,
        parse,
        startOfWeek,
        getDay,
        locales: {
            [i18n.language]: locales[i18n.language] || enUS
        },
    }), [i18n.language]);

    // Transform appointments to events
    const events = useMemo(() => {
        return appointments.map(apt => ({
            id: apt.id,
            title: `${apt.client_name} - ${apt.projects?.name || 'Consultation'}`,
            start: new Date(apt.scheduled_at),
            end: new Date(new Date(apt.scheduled_at).getTime() + (apt.duration_minutes || 30) * 60000),
            resource: apt,
        }));
    }, [appointments]);

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3174ad';
        const status = event.resource.status;

        if (status === 'completed') backgroundColor = '#10B981'; // Green
        if (status === 'cancelled') backgroundColor = '#EF4444'; // Red
        if (status === 'scheduled') backgroundColor = '#000000'; // Black (Establo/Premium style)

        return {
            style: {
                backgroundColor,
                border: 'none',
            }
        };
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[750px] bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 rbcx"
        >
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => onSelectAppointment && onSelectAppointment(event.resource)}
                views={['month', 'week', 'day']}
                defaultView="month"
                culture={i18n.language}
                components={{
                    toolbar: CustomToolbar
                }}
            />
        </motion.div>
    );
};

export default AdminCalendar;

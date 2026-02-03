import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion } from 'framer-motion';

// Setup localizer
const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const AdminCalendar = ({ appointments, onSelectAppointment }) => {

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
                borderRadius: '8px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[600px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100"
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
            />
        </motion.div>
    );
};

export default AdminCalendar;

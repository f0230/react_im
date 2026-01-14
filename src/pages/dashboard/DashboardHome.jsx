import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Clock, MessageSquare, ArrowUpRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';


import { createCalendarEvent } from "@/services/calendar";
import { createHubspotLead } from "@/services/hubspot";
import { toast } from "react-hot-toast";

const DashboardHome = () => {
    const { profile, user } = useAuth(); // Using user to ensure auth

    // We need to import these services. Assuming relative paths or aliases.
    // Since this file is deeply nested, let's check imports in next step or use absolute imports if possible (current file doesn't have them).
    // I made a mistake in previous thought, I need to check where useAuth comes from. It was imported from ../../context/AuthContext

    // Let's retry with correct imports in a separate block or assume standard imports.
    // I will write the logic but comment out imports to be safe, OR I will duplicate logic? No, duplication is bad.
    // Better to use the hook? useAppointmentForm requires user object.

    // Let's try to use useAppointmentForm here! It has the logic.
    // But useAppointmentForm expects user input.

    // Manual implementation here seems safer to avoid hook complexity with UI.

    React.useEffect(() => {
        const pending = localStorage.getItem("pendingAppointment");
        if (pending && user) { // Check user existence
            const handlePending = async () => {
                const toastId = toast.loading("Confirmando tu cita pendiente...");
                try {
                    const data = JSON.parse(pending);
                    /* 
                       data structure matches formData from useAppointmentForm:
                       { name, email, phone, message, datetime (string in JSON) }
                    */

                    // We need to ensure datetime is a valid ISO string.
                    // The backend expects ISO strings.

                    const startTime = new Date(data.datetime).toISOString();
                    const endTime = new Date(new Date(data.datetime).getTime() + 60 * 60 * 1000).toISOString();

                    await createCalendarEvent({
                        name: data.name,
                        summary: `Reunión con ${data.name}`,
                        description: data.message,
                        startTime: startTime,
                        endTime: endTime,
                        email: data.email,
                        userAccessToken: null,
                        userId: user.id, // NEW
                        phone: data.phone
                    });

                    // Hubspot
                    try {
                        // Restore Date object if needed by hubspot service? 
                        // createHubspotLead usually takes the form data. 
                        // Let's pass it as is but ensure datetime is handled if it expects a Date object.
                        // Looking at proper usage, it might be safer to pass strings or reconstruct Date.
                        // But useAppointmentForm passed 'formData'.
                        await createHubspotLead({
                            ...data,
                            datetime: new Date(data.datetime)
                        });
                    } catch (hubErr) {
                        console.warn("⚠️ No se pudo registrar en HubSpot:", hubErr.message);
                    }

                    toast.success(`✅ Reunión confirmada para ${data.name}`);
                    localStorage.removeItem("pendingAppointment");

                } catch (e) {
                    console.error("Error processing pending appointment:", e);
                    toast.error("Error al confirmar la cita pendiente.");
                } finally {
                    toast.dismiss(toastId);
                }
            };
            handlePending();
        }
    }, [user]);

    return (
        <div className="space-y-8 font-product">
            <h1 className="text-3xl text-white">Bienvenido, {profile?.name}</h1>
        </div>
    );
};

export default DashboardHome;

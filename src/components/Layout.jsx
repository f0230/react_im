// Layout.jsx
import React, { lazy, Suspense, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import StepperModal from "@/components/StepperModal";
import { useInView } from "react-intersection-observer";
import CleoWidget from '@/components/CleoChat';


const Footer = lazy(() => import("@/components/Footer"));

const Layout = ({ children }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
    const [footerVisible, setFooterVisible] = useState(false);

    useEffect(() => {
        if (inView) setFooterVisible(true);
    }, [inView]);

    return (
        <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-grow md:pt-[45px]" role="main">{children}</main>

            <div ref={ref} className="absolute bottom-0 w-full h-10 pointer-events-none" />

            {footerVisible && (
                <Suspense fallback={<div className="text-center py-10">Cargando footer...</div>}>
                    <Footer setIsModalOpen={setIsModalOpen} />
                </Suspense>
            )}

            <CleoWidget />


            <StepperModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default Layout;
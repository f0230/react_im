import React from 'react';
import { motion } from 'framer-motion';
import LoginPanelBody from '@/components/LoginPanelBody';

const Registro = () => {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0b0b0b] font-product overflow-hidden px-4 py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(71,208,101,0.18),_transparent_55%)]" />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative w-full max-w-[840px] h-[550px] bg-[#111] rounded-[10px] shadow-2xl overflow-hidden flex items-center justify-center"
            >
                <LoginPanelBody />
            </motion.div>
        </div>
    );
};

export default Registro;

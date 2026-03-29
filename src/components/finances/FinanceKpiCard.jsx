import React from 'react';
import { motion } from 'framer-motion';

const FinanceKpiCard = ({ icon: Icon, label, value, sub, color = 'text-neutral-900' }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm"
    >
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500 uppercase tracking-[0.22em] font-inter">{label}</span>
            {Icon && <Icon size={16} className="text-neutral-400" />}
        </div>
        <p className={`text-xl font-bold font-product sm:text-2xl ${color}`}>{value}</p>
        {sub && <p className="text-[11px] leading-relaxed text-neutral-500">{sub}</p>}
    </motion.div>
);

export default FinanceKpiCard;

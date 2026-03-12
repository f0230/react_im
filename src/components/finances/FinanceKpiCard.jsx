import React from 'react';
import { motion } from 'framer-motion';

const FinanceKpiCard = ({ icon: Icon, label, value, sub, color = 'text-neutral-900' }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col gap-3"
    >
        <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-inter">{label}</span>
            {Icon && <Icon size={16} className="text-neutral-400" />}
        </div>
        <p className={`text-2xl font-bold font-product ${color}`}>{value}</p>
        {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </motion.div>
);

export default FinanceKpiCard;

import React from 'react';
import { 
  Edit3, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Ban,
  HelpCircle
} from 'lucide-react';
import { getStatusConfig } from '@/services/blotatoService';

const STATUS_ICONS = {
  edit: Edit3,
  calendar: Calendar,
  loader: Loader2,
  check: CheckCircle2,
  x: XCircle,
  ban: Ban,
  help: HelpCircle
};

const STATUS_COLORS = {
  neutral: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    border: 'border-neutral-200'
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200'
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200'
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200'
  },
  red: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200'
  },
  gray: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-200'
  }
};

export function PostStatusBadge({ status, showLabel = true, size = 'sm', className = '' }) {
  const config = getStatusConfig(status);
  const Icon = STATUS_ICONS[config.icon] || HelpCircle;
  const colors = STATUS_COLORS[config.color] || STATUS_COLORS.neutral;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };
  
  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14
  };
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded-full font-medium border
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <Icon size={iconSizes[size]} className={config.icon === 'loader' ? 'animate-spin' : ''} />
      {showLabel && config.label}
    </span>
  );
}

export function PostStatusDot({ status, size = 8, className = '' }) {
  const config = getStatusConfig(status);
  
  const colorMap = {
    neutral: '#737373',
    blue: '#2563eb',
    amber: '#d97706',
    green: '#059669',
    red: '#dc2626',
    gray: '#6b7280'
  };
  
  return (
    <span 
      className={`inline-block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colorMap[config.color] || colorMap.neutral
      }}
      title={config.label}
    />
  );
}

export default PostStatusBadge;

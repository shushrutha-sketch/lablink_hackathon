import React from 'react';
import { getStatusColor, formatStatusLabel } from '../lib/format.js';
import { CheckCircle2, Clock, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', showIcon = true }) => {
  const colors = getStatusColor(status);
  const label = formatStatusLabel(status);

  const renderIcon = () => {
    switch (status) {
      case 'approved':
      case 'active':
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5 mr-1" />;
      case 'rejected':
      case 'cancelled':
      case 'retired':
        return <XCircle className="w-3.5 h-3.5 mr-1" />;
      case 'changes_requested':
      case 'maintenance':
        return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 mr-1" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      {showIcon && renderIcon()}
      {label}
    </span>
  );
};

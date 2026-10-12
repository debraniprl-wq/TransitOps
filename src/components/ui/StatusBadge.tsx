import React from 'react';

type StatusType =
  | 'Available'
  | 'On Trip'
  | 'In Shop'
  | 'Retired'
  | 'Off Duty'
  | 'Suspended'
  | 'Draft'
  | 'Dispatched'
  | 'Completed'
  | 'Cancelled'
  | 'Scheduled'
  | 'In Progress';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
  let bg = 'bg-stone-100 text-stone-700 border-stone-200';
  let dot = 'bg-stone-400';

  switch (status) {
    case 'Available':
    case 'Completed':
      bg = 'bg-[#E8F5F1] text-[#1E735E] border-[#C2E3D8]';
      dot = 'bg-[#23866D]';
      break;
    case 'On Trip':
    case 'Dispatched':
      bg = 'bg-[#EDF5FD] text-[#2B6CB0] border-[#C7E0FA]';
      dot = 'bg-[#4F91D8]';
      break;
    case 'In Shop':
    case 'In Progress':
      bg = 'bg-[#FEF7EC] text-[#B7791F] border-[#FCE6BE]';
      dot = 'bg-[#E9A23B]';
      break;
    case 'Scheduled':
      bg = 'bg-[#F0F7F6] text-[#2C6B64] border-[#CFE7E2]';
      dot = 'bg-[#3E8B82]';
      break;
    case 'Draft':
    case 'Off Duty':
    case 'Retired':
      bg = 'bg-[#F0EFEA] text-[#5A6872] border-[#DDD9CE]';
      dot = 'bg-[#71818A]';
      break;
    case 'Suspended':
    case 'Cancelled':
      bg = 'bg-[#FDF2F2] text-[#C53030] border-[#F8B4B4]';
      dot = 'bg-[#D95353]';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

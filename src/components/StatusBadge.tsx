'use client';

import { BookStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: BookStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<BookStatus, { bg: string; text: string; label: string }> = {
  'not_started': {
    bg: 'bg-gray-600',
    text: 'text-gray-200',
    label: 'Not Started',
  },
  'in_progress': {
    bg: 'bg-blue-600',
    text: 'text-blue-100',
    label: 'In Progress',
  },
  'finished': {
    bg: 'bg-green-600',
    text: 'text-green-100',
    label: 'Finished',
  },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['not_started'];

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}

'use client';

import { BookStatus } from '@/lib/types';

interface StatusSelectProps {
  status: BookStatus;
  onChange: (status: BookStatus) => void;
  disabled?: boolean;
}

const statusOptions: { value: BookStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
];

export default function StatusSelect({ status, onChange, disabled = false }: StatusSelectProps) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as BookStatus)}
      disabled={disabled}
      className="
        bg-gray-700 text-white text-sm rounded-lg
        border border-gray-600
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        px-4 py-3 min-h-[48px]
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

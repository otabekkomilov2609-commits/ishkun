import React from 'react';
import { cn } from '@/lib/utils';

const map = {
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  filled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  completed: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  pending_mod: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  approved_mod: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
};

export default function StatusBadge({ status, label, className }) {
  const cls = map[status] || 'bg-muted text-muted-foreground ring-border';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', cls, className)}>
      {label}
    </span>
  );
}
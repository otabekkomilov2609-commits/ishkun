import React from 'react';
import { useLang } from '@/lib/i18n';
import { STATE_STYLES } from '@/lib/shiftStatus';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Badge-only rendering of a worker's shift state (used on cards/lists).
export default function WorkerShiftBadge({ state, className }) {
  const { t } = useLang();
  if (!state) return null;
  const cls = STATE_STYLES[state.kind] || STATE_STYLES.muted;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', cls, className)}>
      {state.key === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
      {t(state.labelKey)}
    </span>
  );
}
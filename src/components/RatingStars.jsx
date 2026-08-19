import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n';

export function StarsDisplay({ avg, count, size = 'sm' }) {
  const { t } = useLang();
  if (!avg || !count) return <span className="text-xs text-muted-foreground">{t('rating.notRated')}</span>;
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-1">
      <Star className={cn(sz, 'fill-amber-400 text-amber-400')} />
      <span className="font-semibold text-foreground">{Number(avg).toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </span>
  );
}

export function StarSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n}`}
        >
          <Star className={cn('h-7 w-7', n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
        </button>
      ))}
    </div>
  );
}
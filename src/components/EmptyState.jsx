import React from 'react';
import { cn } from '@/lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {Icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground mb-4">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
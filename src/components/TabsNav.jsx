import React from 'react';
import { cn } from '@/lib/utils';

export default function TabsNav({ tabs, active, onChange, className }) {
  return (
    <div className={cn('border-b border-border', className)}>
      <div className="flex gap-5 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative pb-2.5 pt-1 whitespace-nowrap transition-colors text-sm',
                isActive ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn('ml-1.5 text-xs', isActive ? 'text-foreground' : 'text-muted-foreground')}>{tab.count}</span>
              )}
              {isActive && (
                <span className="absolute -bottom-px left-0 right-0 h-1 rounded-full bg-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
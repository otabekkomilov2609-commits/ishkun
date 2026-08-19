import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileSelect({ value, onChange, children, className, placeholder, ...rest }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const options = React.Children.toArray(children)
    .filter(Boolean)
    .map(c => ({
      value: c.props?.value,
      label: typeof c.props?.children === 'string' ? c.props.children : String(c.props?.children ?? '')
    }));

  const selected = options.find(o => o.value === value);

  if (!isMobile) {
    return (
      <select className={className} value={value} onChange={onChange} {...rest}>
        {children}
      </select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(className, 'text-left flex items-center justify-between gap-2 cursor-pointer appearance-none')}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground/60')}>
          {selected ? selected.label : placeholder || ''}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder || ''}</DrawerTitle>
          </DrawerHeader>
          <div className="px-2 pb-4 max-h-[60vh] overflow-y-auto">
            {options.map(o => (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => {
                  onChange({ target: { value: o.value } });
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors',
                  o.value === value ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="h-4 w-4 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Brand({ size = 'md', className }) {
  const dim = size === 'lg' ? 'h-11 w-11 text-lg' : size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base';
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 group', className)}>
      <div className={cn('relative grid place-items-center rounded-2xl bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/30', dim)}>
        <span className="leading-none">IK</span>
        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
      </div>
      <div className="leading-none">
        <div className="font-display font-extrabold tracking-tight text-foreground text-lg">IshKun</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">kunlik ish</div>
      </div>
    </Link>
  );
}
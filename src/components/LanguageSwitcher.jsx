import React from 'react';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher({ className }) {
  const { lang, setLang } = useLang();
  return (
    <div className={cn('inline-flex items-center rounded-full bg-muted p-0.5 text-xs font-semibold', className)}>
      {['uz', 'ru'].map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            'px-2.5 py-1 rounded-full uppercase transition-colors',
            lang === l ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
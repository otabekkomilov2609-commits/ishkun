import React from 'react';
import { useLang } from '@/lib/i18n';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { formatSom } from '@/lib/format';
import { Trash2 } from 'lucide-react';

export default function TemplatePickerDrawer({ open, onOpenChange, templates, onPick, onDelete }) {
  const { t } = useLang();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>{t('shift.myTemplates')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">
          {(!templates || templates.length === 0) ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('shift.noTemplates')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {templates.map(tpl => {
                const summary = [tpl.title, tpl.daily_rate != null ? formatSom(tpl.daily_rate) : ''].filter(Boolean).join(' · ');
                return (
                  <li key={tpl.id} className="flex items-center gap-2 py-3">
                    <button
                      type="button"
                      onClick={() => { onPick(tpl); onOpenChange(false); }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-semibold text-foreground text-sm truncate">{tpl.name}</p>
                      {summary && <p className="text-xs text-muted-foreground truncate">{summary}</p>}
                    </button>
                    <button
                      type="button"
                      aria-label={t('shift.deleteTemplate')}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(tpl); }}
                      className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
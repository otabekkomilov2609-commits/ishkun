import React from 'react';
import { useLang } from '@/lib/i18n';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { formatSom, formatDateDMY } from '@/lib/format';
import { Trash2 } from 'lucide-react';

export default function TemplatePickerDrawer({ open, onOpenChange, templates, onPick, onDelete, recentShifts, onPickShift }) {
  const { t } = useLang();
  const hasTemplates = templates && templates.length > 0;
  const hasRecents = recentShifts && recentShifts.length > 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>{t('shift.pickerTitle')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {(!hasTemplates && !hasRecents) ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('shift.noTemplates')}</p>
          ) : (
            <div className="divide-y divide-border">
              {hasTemplates && (
                <section>
                  <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase py-3">{t('shift.myTemplates')}</h3>
                  <ul>
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
                </section>
              )}
              {hasRecents && (
                <section>
                  <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase py-3">{t('shift.recentShifts')}</h3>
                  <ul>
                    {recentShifts.map(shift => {
                      const summary = [formatDateDMY(shift.date), shift.daily_rate != null ? formatSom(shift.daily_rate) : ''].filter(Boolean).join(' · ');
                      return (
                        <li key={shift.id} className="py-3">
                          <button
                            type="button"
                            onClick={() => { onPickShift(shift); onOpenChange(false); }}
                            className="w-full min-w-0 text-left"
                          >
                            <p className="font-semibold text-foreground text-sm truncate">{shift.title}</p>
                            {summary && <p className="text-xs text-muted-foreground truncate">{summary}</p>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
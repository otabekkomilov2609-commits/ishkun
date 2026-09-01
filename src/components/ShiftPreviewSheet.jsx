import React from 'react';
import { useLang } from '@/lib/i18n';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button, Card } from '@/components/ui';
import { formatSom, formatDateDMY, shiftPay, shiftDurationHours } from '@/lib/format';
import { MapPin, Wallet, Clock, Calendar, Users, Navigation, ClipboardCheck, ListChecks, AlertCircle, Shirt, Building2 } from 'lucide-react';

export default function ShiftPreviewSheet({ open, onOpenChange, form, company, onConfirm, publishing }) {
  const { t } = useLang();

  const pseudo = { daily_rate: Number(form.daily_rate), start_time: form.start_time, end_time: form.end_time };
  const pay = shiftPay(pseudo);
  const dur = shiftDurationHours(pseudo);
  const durLabel = Number.isInteger(dur) ? dur : dur.toFixed(1);

  const tasksList = (form.tasks_text || '').split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] flex flex-col">
        <DrawerHeader className="pb-2">
          <DrawerTitle>{t('shift.previewTitle')}</DrawerTitle>
          <p className="text-xs text-muted-foreground">{t('shift.previewNotLive')}</p>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto flex-1" style={{ maxHeight: '64vh' }}>
          <h1 className="text-xl font-display font-bold text-foreground mb-4">{form.title}</h1>

          {/* Manzil */}
          <SectionCard icon={MapPin} title={t('sdetail.address')}>
            <div className="text-sm text-foreground">{form.city}</div>
            {form.map_link && (
              <a href={form.map_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                <Button variant="soft" size="sm"><Navigation className="h-4 w-4" /> {t('sdetail.viewMap')}</Button>
              </a>
            )}
          </SectionCard>

          {/* Narx va vaqt */}
          <SectionCard icon={Wallet} title={t('sdetail.payTime')}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-700 font-extrabold text-lg">{pay.total != null ? formatSom(pay.total) : '—'}</span>
              {pay.hourlyRate != null && <span className="text-xs text-muted-foreground">· {formatSom(pay.hourlyRate)}/{t('shift.hourShort')}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info icon={Calendar} label={t('shift.date')} value={formatDateDMY(form.date)} />
              <Info icon={Clock} label={t('shift.duration')} value={`${durLabel} ${t('shift.durationShort')}`} />
              <Info icon={Clock} label={t('shift.startTime')} value={form.start_time} />
              <Info icon={Clock} label={t('shift.endTime')} value={form.end_time} />
              <Info icon={Users} label={t('shift.workers')} value={form.required_workers} />
            </div>
          </SectionCard>

          {/* Tavsif */}
          {(form.description || tasksList.length > 0) && (
            <SectionCard icon={ClipboardCheck} title={t('sdetail.description')}>
              {form.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{form.description}</p>}
              {tasksList.length > 0 && (
                <div className={form.description ? 'mt-4' : ''}>
                  <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-foreground"><ListChecks className="h-4 w-4 text-primary" /> {t('sdetail.tasksHeading')}</div>
                  <ul className="space-y-1.5">
                    {tasksList.map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          )}

          {/* Muhim eslatmalar */}
          {form.important_notes_text && (
            <SectionCard icon={AlertCircle} title={t('sdetail.important')}>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{form.important_notes_text}</p>
            </SectionCard>
          )}

          {/* Talablar */}
          {(form.requirements_text || form.dress_code_text) && (
            <SectionCard icon={ClipboardCheck} title={t('sdetail.requirements')}>
              {form.requirements_text && <p className="text-sm text-muted-foreground whitespace-pre-line">{form.requirements_text}</p>}
              {form.dress_code_text && (
                <div className={form.requirements_text ? 'mt-4' : ''}>
                  <div className="flex items-center gap-1.5 mb-1.5 text-sm font-semibold text-foreground"><Shirt className="h-4 w-4 text-primary" /> {t('sdetail.dressCode')}</div>
                  <p className="text-sm text-muted-foreground">{form.dress_code_text}</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* Kompaniya */}
          {company && (
            <Card className="p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('wrk.company')}</div>
                  <div className="font-semibold text-foreground">{company.name}</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-border bg-background">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t('shift.backToEdit')}</Button>
          <Button className="flex-[2]" onClick={onConfirm} disabled={publishing}>{t('shift.submit')}</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
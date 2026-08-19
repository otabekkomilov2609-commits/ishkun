import React, { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Skeleton, Textarea } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { Image } from '@/components/ui/image';
import { ShieldCheck, ShieldOff, UserCircle, FileText } from 'lucide-react';

export default function AdminKycReview() {
  const { t } = useLang();
  const [users, setUsers] = useState(null);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    const all = await base44.entities.User.list('-created_date', 200);
    const kyc = all.filter(u => u.verification_status === 'submitted' || u.verification_status === 'rejected' || u.verification_status === 'verified');
    setUsers(kyc);
  };
  useEffect(() => { load(); }, []);

  const approve = async (u) => {
    setActing(true);
    await base44.entities.User.update(u.id, { verification_status: 'verified', verification_note: '' });
    await base44.entities.Notification.create({
      user_id: u.id,
      title: 'Profilingiz tasdiqlandi',
      body: "Tabriklaymiz! Profilingiz tasdiqlandi, endi siz ishlarga ariza topshirishingiz mumkin.",
      type: 'verification_approved'
    });
    setActing(false); setSelected(null); setNote(''); load();
  };

  const reject = async (u) => {
    setActing(true);
    await base44.entities.User.update(u.id, { verification_status: 'rejected', verification_note: note });
    await base44.entities.Notification.create({
      user_id: u.id,
      title: 'Verifikatsiya rad etildi',
      body: `Profilni verifikatsiyadan o'tkazishda xatolik aniqlandi. Iltimos, ma'lumotlarni tekshiring: ${note || '—'}`,
      type: 'verification_rejected'
    });
    setActing(false); setSelected(null); setNote(''); load();
  };

  if (selected) {
    const u = selected;
    const docs = [
      { label: t('kyc.passportFront'), url: u.passport_front },
      { label: t('kyc.passportBack'), url: u.passport_back },
      { label: t('kyc.liveness'), url: u.liveness_selfie },
      { label: t('kyc.studentId'), url: u.student_id },
      { label: t('kyc.selfEmployedCert'), url: u.self_employed_cert }
    ].filter(d => d.url);

    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground mb-3">← {t('back')}</button>
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
              {(u.full_name || '?').trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')}
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-foreground truncate">{u.full_name || '—'}</h2>
              <p className="text-sm text-muted-foreground truncate">{u.email} · {u.phone_number || '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 mb-4 space-y-2 text-sm">
          <Row label={t('kyc.jshshir')} value={u.jshshir} />
          <Row label={t('kyc.dob')} value={u.date_of_birth} />
          <Row label={t('kyc.address')} value={u.address} />
          <Row label={t('kyc.bankCard')} value={u.bank_card_number} />
          <Row label={t('kyc.selfEmployed')} value={u.self_employed ? t('kyc.yes') : t('kyc.no')} />
        </Card>
        {docs.length > 0 && (
          <Card className="p-5 mb-4">
            <h3 className="font-semibold text-foreground mb-3">{t('kyc.documents')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {docs.map(d => (
                <div key={d.label}>
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <Image src={d.url} alt={d.label} fittingType="fill" className="w-full h-32 rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card className="p-5 space-y-3">
          <Textarea placeholder={t('kyc.rejectNotePh')} value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="soft" disabled={acting} onClick={() => approve(u)}><ShieldCheck className="h-4 w-4" /> {t('kyc.approve')}</Button>
            <Button variant="destructive" disabled={acting} onClick={() => reject(u)}><ShieldOff className="h-4 w-4" /> {t('kyc.reject')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {users === null ? (
        <div className="space-y-3">{[0, 1].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserCircle} title={t('kyc.noPending')} />
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <Card key={u.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email} · {u.phone_number || '—'}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {u.verification_status === 'submitted' && <StatusBadge status="pending_mod" label={t('kyc.submitted')} />}
                {u.verification_status === 'rejected' && <StatusBadge status="rejected" label={t('kyc.rejected')} />}
                {u.verification_status === 'verified' && <StatusBadge status="approved" label={t('kyc.verified')} />}
                <Button size="sm" variant="outline" onClick={() => { setSelected(u); setNote(u.verification_note || ''); }}><FileText className="h-4 w-4" /> {t('kyc.review')}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right break-all">{value || '—'}</span>
    </div>
  );
}
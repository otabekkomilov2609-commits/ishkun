import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { CITIES } from '@/lib/format';
import { Button, Input, Select, Field, Card, Skeleton } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import { Phone, MapPin, Globe, Check, History, Calendar, Wallet, Trash2, AlertTriangle, ShieldCheck, ChevronRight, ArrowLeft } from 'lucide-react';
import { formatSom } from '@/lib/format';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from '@/components/ui/alert-dialog';

export default function Profile() {
  const { user, checkUserAuth, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone_number: '', city: '', profile_image: '', account_type: '', language: 'uz' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [completedApps, setCompletedApps] = useState(null);
  const [completedShifts, setCompletedShifts] = useState({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        phone_number: user.phone_number || '',
        city: user.city || '',
        profile_image: user.profile_image || '',
        account_type: user.account_type || '',
        language: user.language || lang
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && user.account_type === 'worker') {
      (async () => {
        const a = await base44.entities.Application.filter({ worker_id: user.id, status: 'completed' }, '-created_date', 50);
        setCompletedApps(a);
        const ids = [...new Set(a.map(x => x.shift_id))];
        const map = {};
        await Promise.all(ids.map(async sid => {
          try { map[sid] = await base44.entities.Shift.get(sid); } catch {}
        }));
        setCompletedShifts(map);
      })();
    }
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('updateMyProfile', {
        phone_number: form.phone_number,
        city: form.city,
        profile_image: form.profile_image,
        language: form.language
      });
      if (form.language !== lang) setLang(form.language);
      await checkUserAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteMyAccount', {});
      await logout();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  if (!user) return null;

  const initials = (user.full_name || '?').trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-4"
        aria-label={t('back')}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-4 mb-6">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-sm">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-primary">{user.full_name || '—'}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Card className="p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('prf.phone')}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+998 90 123 45 67" />
            </div>
          </Field>
          <Field label={t('prf.city')}>
            <Select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
              <option value="">{t('allCities')}</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={t('prf.image')}>
            <Input value={form.profile_image} onChange={e => setForm({ ...form, profile_image: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label={t('language')}>
            <Select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
              <option value="uz">O'zbekcha</option>
              <option value="ru">Русский</option>
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <Button onClick={save} disabled={saving}>
            {saved ? <><Check className="h-4 w-4" /> {t('prf.saved')}</> : t('save')}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('prf.role')}</span>
          <span className="font-semibold text-foreground">
            {user.role === 'admin' ? t('admin') : (form.account_type === 'employer' ? t('employer') : t('worker'))}
          </span>
        </div>
      </Card>

      {user.role !== 'admin' && (
        <Link to="/verification" className="mt-4 block">
          <Card className="p-4 flex items-center gap-3 transition-colors hover:bg-muted/50">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">{t('kyc.title')}</h3>
              <p className="text-xs text-muted-foreground">
                {user.verification_status === 'verified' ? t('kyc.verified')
                  : user.verification_status === 'submitted' ? t('kyc.submitted')
                  : user.verification_status === 'rejected' ? t('kyc.rejected')
                  : t('kyc.pending')}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>
      )}

      <div className="mt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
              {t('prf.deleteAccount')}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('prf.deleteAccountConfirm')}
              </AlertDialogTitle>
              <AlertDialogDescription>{t('prf.deleteAccountDesc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); deleteAccount(); }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? t('prf.deleting') : t('prf.deleteAccountConfirmBtn')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {form.account_type === 'worker' && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-primary">{t('wrk.completedJobs')}</h2>
          </div>
          {completedApps === null ? (
            <Skeleton className="h-20 w-full" />
          ) : completedApps.length === 0 ? (
            <Card className="p-5 text-center text-sm text-muted-foreground">{t('wrk.noCompleted')}</Card>
          ) : (
            <div className="space-y-2">
              {completedApps.map(a => {
                const s = completedShifts[a.shift_id];
                return (
                  <Card key={a.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm line-clamp-1">{s?.title || '—'}</h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {s?.date}</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium"><Wallet className="h-3 w-3" /> {s ? formatSom(a.final_payment_amount != null ? a.final_payment_amount : s.payment_amount) : ''}</span>
                        </div>
                      </div>
                      <StatusBadge status="completed" label={t('app.statusCompleted')} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
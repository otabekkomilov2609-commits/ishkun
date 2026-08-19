import React, { useState } from 'react';
import { useLang } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { Button, Card, Input, Label, Field } from '@/components/ui';
import { UserPlus, Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function AdminInvite() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDone(null);
    if (!email.trim()) { setError(t('adm.inviteEmailReq')); return; }
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), role);
      setDone(email.trim());
      setEmail('');
    } catch (err) {
      setError(err.message || t('adm.inviteError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><UserPlus className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">{t('adm.inviteTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('adm.inviteHint')}</p>
          </div>
        </div>

        {done && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{t('adm.inviteSent')} <b>{done}</b></span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <Field label={t('adm.inviteEmail')}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
            </div>
          </Field>
          <Field label={t('adm.inviteRole')}>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRole('user')}
                className={`rounded-xl border-2 p-3 text-left transition-all ${role === 'user' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                <span className="block font-semibold text-foreground">{t('adm.inviteRoleUser')}</span>
                <span className="block text-xs text-muted-foreground">{t('adm.inviteRoleUserHint')}</span>
              </button>
              <button type="button" onClick={() => setRole('admin')}
                className={`rounded-xl border-2 p-3 text-left transition-all ${role === 'admin' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                <span className="block font-semibold text-foreground">{t('adm.inviteRoleAdmin')}</span>
                <span className="block text-xs text-muted-foreground">{t('adm.inviteRoleAdminHint')}</span>
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('adm.inviteSending')}</> : <><UserPlus className="w-4 h-4 mr-2" /> {t('adm.inviteSend')}</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}
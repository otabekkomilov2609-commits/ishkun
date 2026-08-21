import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { Button, Textarea } from '@/components/ui';
import { StarSelector } from '@/components/RatingStars';
import { Star } from 'lucide-react';

export default function RatingPrompt({ applicationId, shiftId, workerId, companyId, employerId, ratedBy, onDone }) {
  const { t } = useLang();
  const [existing, setExisting] = useState(undefined);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await base44.entities.Rating.filter({ application_id: applicationId, rated_by: ratedBy });
        if (alive) setExisting(r[0] || null);
      } catch {
        if (alive) setExisting(null);
      }
    })();
    return () => { alive = false; };
  }, [applicationId, ratedBy]);

  const submit = async () => {
    if (score < 1 || submitting) return;
    setSubmitting(true);
    try {
      await base44.functions.invoke('submitRating', {
        application_id: applicationId,
        shift_id: shiftId,
        rated_by: ratedBy,
        score,
        comment: comment || undefined
      });
      setExisting({ score });
      onDone?.();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  if (existing === undefined) return null;
  if (existing) {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {t('rating.alreadyRated')}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <StarSelector value={score} onChange={setScore} />
      <Textarea rows={2} placeholder={t('rating.commentPh')} value={comment} onChange={e => setComment(e.target.value)} />
      <Button size="sm" disabled={score < 1 || submitting} onClick={submit}>
        {submitting ? t('loading') : t('rating.submit')}
      </Button>
    </div>
  );
}
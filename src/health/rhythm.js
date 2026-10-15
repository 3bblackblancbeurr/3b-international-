import { effectiveSteps, normalizeStepTarget, previousDays } from './model.js';

export const STEP_TARGET_CHOICES = [2500, 5000, 7500, 10000];

export function healthRhythm(data, date) {
  const journal = data?.days || {};
  const today = effectiveSteps(journal[date]);
  const target = normalizeStepTarget(data?.stepTarget);
  const percent = target === null || today.value === null ? null : Math.min(100, Math.round(today.value / target * 100));
  const week = previousDays(7, new Date(date + 'T12:00:00')).map(day => ({
    date: day,
    ...effectiveSteps(journal[day]),
  }));
  const reported = week.filter(day => day.value !== null);
  const average = reported.length ? Math.round(reported.reduce((sum, day) => sum + day.value, 0) / reported.length) : null;
  const max = Math.max(1, ...reported.map(day => day.value));
  return { today, target, percent, week, known: reported.length, average, max };
}

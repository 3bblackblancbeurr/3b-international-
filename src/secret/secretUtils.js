export function normalizePhoneDraft(value, maxDigits = 15) {
  const raw = String(value ?? "").trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "").slice(0, maxDigits);
  return hasPlus ? `+${digits}` : digits;
}

export function phoneDigitCount(value) {
  return String(value ?? "").replace(/\D/g, "").length;
}

export function countdownTo(target, now = Date.now()) {
  const targetMs = new Date(target).getTime();
  const delta = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(delta / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { done: delta <= 0, days, hours, minutes, seconds };
}

export function formatParisDate(value) {
  if (!value) return "Date à venir";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export function sortSlots(slots = []) {
  return [...slots].sort((a, b) => {
    const seq = Number(a.sequence_no || 0) - Number(b.sequence_no || 0);
    if (seq !== 0) return seq;
    return new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime();
  });
}

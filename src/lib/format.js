// The currency suffix follows the UI language. LanguageProvider calls
// setSomLang() on every change, so the ~40 existing formatSom() call sites
// need no edits.
let somLang = 'uz';
export function setSomLang(l) { somLang = l === 'ru' ? 'ru' : 'uz'; }

export const formatSom = (n) => new Intl.NumberFormat('ru-RU').format(Number(n || 0)) + (somLang === 'ru' ? ' сум' : " so'm");

export const CITIES = [
  "Toshkent",
  "Samarqand",
  "Buxoro",
  "Andijon",
  "Namangan",
  "Farg'ona",
  "Qarshi",
  "Nukus",
  "Termiz",
  "Guliston",
  "Jizzax",
  "Navoiy",
  "Marg'ilon",
  "Qo'qon"
];

// Local-date YYYY-MM-DD for date-input bounds. toISOString() would render the
// UTC day, which is the previous date for most of the morning in UTC+5.
export function toYMD(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  const p = dateStr.split('T')[0].split('-');
  if (p.length !== 3) return dateStr;
  return `${p[2]}.${p[1]}.${p[0]}`;
}

const WEEKDAYS = {
  uz: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
};
const MONTHS = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
  ru: ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря']
};

export function formatDateWeekDay(dateStr, lang = 'uz') {
  if (!dateStr) return '';
  const p = dateStr.split('T')[0].split('-');
  if (p.length !== 3) return dateStr;
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  const wd = WEEKDAYS[lang] || WEEKDAYS.uz;
  const mn = MONTHS[lang] || MONTHS.uz;
  const day = Number(p[2]);
  const month = mn[Number(p[1]) - 1].toLowerCase();
  const weekday = wd[d.getDay()].toLowerCase();
  return lang === 'ru' ? `${day} ${month}, ${weekday}` : `${day}-${month}, ${weekday}`;
}

export function parseTime(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function shiftDurationHours(shift) {
  if (!shift || !shift.start_time || !shift.end_time) return 0;
  let mins = parseTime(shift.end_time) - parseTime(shift.start_time);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

// Unrounded duration. Rates must be derived from this, never from the rounded
// display value: 1h15m rounds 1.25 -> 1.3, which turned a 150 000 so'm shift
// into 115 385 so'm/soat instead of 120 000.
export function shiftDurationHoursExact(shift) {
  if (!shift || !shift.start_time || !shift.end_time) return 0;
  let mins = parseTime(shift.end_time) - parseTime(shift.start_time);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function shiftPay(shift) {
  const duration = shiftDurationHours(shift);
  const exact = shiftDurationHoursExact(shift);
  const daily = Number(shift?.daily_rate);
  let total = null;
  let hourly = null;
  if (daily) {
    total = daily;
    hourly = exact > 0 ? Math.round(daily / exact) : null;
  } else if (shift?.payment_amount != null && shift.payment_amount !== '') {
    total = Number(shift.payment_amount);
    hourly = exact > 0 ? Math.round(total / exact) : null;
  }
  return { duration, hourlyRate: hourly, total };
}

export function timeRange(shift) {
  if (!shift?.start_time) return '';
  return `${shift.start_time}–${shift.end_time}`;
}

export function timeAgo(dateStr, lang = 'uz') {
  if (!dateStr) return '';
  // Base44 returns created_date without a timezone marker
  // ("2026-08-30T11:12:41.830000"), which new Date() reads as local time —
  // every relative stamp was off by the local UTC offset. Treat a naive
  // string as UTC; leave an explicit offset alone.
  const raw = String(dateStr);
  const d = /(Z|[+-]\d{2}:?\d{2})$/.test(raw) ? new Date(raw) : new Date(raw + 'Z');
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'uz' ? 'hozir' : 'сейчас';
  if (mins < 60) return lang === 'uz' ? `${mins} daqiqa oldin` : `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'uz' ? `${hrs} soat oldin` : `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return lang === 'uz' ? `${days} kun oldin` : `${days} дн назад`;
}

export function isValidUzPhone(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  return d.length === 9;
}

export function formatUzPhoneInput(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  if (!d) return '';
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return '+998 ' + parts.join(' ');
}

// Daily rate is typed as grouped digits ("1 500 000") so large amounts stay
// readable; state keeps the bare digits and submit sends a plain number.
export const RATE_MAX = 100000000;

export function groupDigits(v) {
  return String(v ?? '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function isValidCardNumber(v) {
  return String(v || '').replace(/\s/g, '').length === 16;
}

export function formatCardInput(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
}

export function isValidStir(v) {
  return /^\d{9}$/.test(v || '');
}

// Must be a Yandex Maps link, not merely any URL — a Google Maps link used to
// pass. Country TLDs are the common case (yandex.uz, yandex.ru), so the TLD is
// matched as a set rather than pinned to .com.
export const YANDEX_MAPS_RE = /^https?:\/\/(www\.)?yandex\.(uz|ru|com|kz|by)\/maps(\/|\?|$)/i;

export function isValidMapLink(v) {
  return YANDEX_MAPS_RE.test((v || '').trim());
}

export function hhmmFromStamp(iso, fallback = '') {
  if (!iso) return fallback;
  const s = String(iso);
  return s.length >= 16 ? s.slice(11, 16) : fallback;
}

// Names live in first_name/last_name on the app's own User entity. Accounts
// created before that change still carry their name in Base44's auth-owned
// full_name, which we can read but never write — hence the fallback.
export function displayName(u) {
  const n = [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim();
  return n || u?.full_name || '';
}
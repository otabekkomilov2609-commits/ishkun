export const formatSom = (n) => new Intl.NumberFormat('ru-RU').format(Number(n || 0)) + " so'm";

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
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekaber'],
  ru: ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря']
};

export function formatDateWeekDay(dateStr, lang = 'uz') {
  if (!dateStr) return '';
  const p = dateStr.split('T')[0].split('-');
  if (p.length !== 3) return dateStr;
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  const wd = WEEKDAYS[lang] || WEEKDAYS.uz;
  const mn = MONTHS[lang] || MONTHS.uz;
  return `${wd[d.getDay()]} ${Number(p[2])}.${mn[Number(p[1]) - 1]}`;
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

export function shiftPay(shift) {
  const duration = shiftDurationHours(shift);
  const daily = Number(shift?.daily_rate);
  let total = null;
  let hourly = null;
  if (daily) {
    total = daily;
    hourly = duration > 0 ? Math.round(daily / duration) : null;
  } else if (shift?.payment_amount != null && shift.payment_amount !== '') {
    total = Number(shift.payment_amount);
    hourly = duration > 0 ? Math.round(total / duration) : null;
  }
  return { duration, hourlyRate: hourly, total };
}

export function timeRange(shift) {
  if (!shift?.start_time) return '';
  return `${shift.start_time}–${shift.end_time}`;
}

export function timeAgo(dateStr, lang = 'uz') {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
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

export function isValidMapLink(v) {
  return /^https?:\/\/.+/.test((v || '').trim());
}

export function hhmmFromStamp(iso, fallback = '') {
  if (!iso) return fallback;
  const s = String(iso);
  return s.length >= 16 ? s.slice(11, 16) : fallback;
}
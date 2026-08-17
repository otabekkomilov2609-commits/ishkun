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
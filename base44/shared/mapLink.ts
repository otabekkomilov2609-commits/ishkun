// Map links must point at Yandex Maps, not merely be a URL. Country TLDs are
// the common case here (yandex.uz, yandex.ru), so the TLD is matched as a set
// rather than pinned to .com. The trailing (\/|\?|$) stops "/mapsomething" and
// the host anchor stops look-alikes such as notyandex.uz or yandex.evil.com.
//
// Twin of isValidMapLink() in src/lib/format.js — server code cannot import
// from src/, so the two must be changed together.
export const YANDEX_MAPS_RE = /^https?:\/\/(www\.)?yandex\.(uz|ru|com|kz|by)\/maps(\/|\?|$)/i;

export function isValidMapLink(v) {
  return YANDEX_MAPS_RE.test(String(v || '').trim());
}

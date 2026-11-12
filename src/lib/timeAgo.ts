// Waktu relatif singkat dalam bahasa Indonesia ("5 mnt lalu"); lebih dari sebulan memakai tanggal.
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 60) return 'baru saja';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} jam lalu`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} hari lalu`;
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

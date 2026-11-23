// Validación del lado del servidor. No ejecuta ni descarga videos.
const ID_YT = /^[A-Za-z0-9_-]{11}$/;
const ID_VIMEO = /^\d{5,12}$/;
function videoPromoValido(raw) {
  if (!raw) return true; // video opcional
  if (typeof raw !== 'string' || raw.trim().length > 600) return false;
  let u;
  try { u = new URL(raw.trim()); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const path = u.pathname.split('/').filter(Boolean);
  let id;
  if (host === 'youtu.be') id = path[0];
  else if (['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)) {
    id = path[0] === 'watch' ? u.searchParams.get('v') :
      ['shorts','embed','live'].includes(path[0]) ? path[1] : null;
  }
  if (id && ID_YT.test(id)) return true;
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    id = host === 'player.vimeo.com' && path[0] === 'video' ? path[1] : path[0];
    return ID_VIMEO.test(id || '');
  }
  if (host === 'drive.google.com') return /^\/file\/d\/[A-Za-z0-9_-]{15,}\/(?:view|preview)?\/?$/.test(u.pathname);
  return /\.(mp4|webm)$/i.test(u.pathname);
}
module.exports = { videoPromoValido };

// Links públicos: YouTube, YouTube Shorts, Vimeo, Google Drive y MP4/WebM directos.
// Nunca se concatena un enlace arbitrario a un iframe.
const YT = /^[A-Za-z0-9_-]{11}$/;
const VIMEO = /^\d{5,12}$/;
function normalizar(raw) {
  if (!raw || typeof raw !== 'string' || raw.length > 600) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u;
  } catch { return null; }
}
export function obtenerVideoPromo(raw) {
  const u = normalizar(raw);
  if (!u) return null;
  const h = u.hostname.toLowerCase().replace(/^www\./, '');
  let id;
  if (h === 'youtu.be') id = u.pathname.split('/')[1];
  else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(h)) {
    const partes = u.pathname.split('/').filter(Boolean);
    id = partes[0] === 'watch' ? u.searchParams.get('v')
      : ['shorts','embed','live'].includes(partes[0]) ? partes[1] : null;
  }
  if (id && YT.test(id)) return {
    tipo: 'youtube', url: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,
    miniatura: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, nombre: 'YouTube'
  };
  if (h === 'vimeo.com' || h === 'player.vimeo.com') {
    const partes = u.pathname.split('/').filter(Boolean);
    const codigo = h === 'player.vimeo.com' && partes[0] === 'video' ? partes[1] : partes[0];
    if (VIMEO.test(codigo || '')) {
      const hash = u.searchParams.get('h');
      const sufijo = hash && /^[a-f0-9]{5,64}$/i.test(hash) ? `?h=${hash}&dnt=1` : '?dnt=1';
      return {tipo:'vimeo', url:`https://player.vimeo.com/video/${codigo}${sufijo}`, nombre:'Vimeo'};
    }
  }
  if (h === 'drive.google.com') {
    const match = u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{15,})\/(?:view|preview)?\/?$/);
    if (match) return {tipo:'drive', url:`https://drive.google.com/file/d/${match[1]}/preview`, nombre:'Google Drive'};
  }
  if (/\.(mp4|webm)$/i.test(u.pathname)) return {tipo:'archivo', url:u.href, nombre:'Video directo'};
  return null;
}

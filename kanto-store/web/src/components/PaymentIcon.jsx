/** Iconos SVG individuales para cada servicio. Sin fuentes externas ni solicitudes de red. */
export default function PaymentIcon({ name, size = 38 }) {
  if (name === 'paypal') return <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true"><path d="M15 5h17c10 0 14 7 11 15-2 8-9 12-18 12H21l-3 11H8L15 5Z" fill="#009CDE"/><path d="M14 5h17c9 0 13 6 11 13-3 8-9 10-18 10h-5l-4 15H5L14 5Z" fill="#003087" opacity=".96"/><path d="m20 12-3 13h7c6 0 10-2 11-7 1-4-1-6-6-6h-9Z" fill="#66C6F2"/></svg>;
  const common = { viewBox:'0 0 48 48', width:size, height:size, fill:'none', stroke:'currentColor', strokeWidth:2.8, strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true };
  if (name === 'qr') return <svg {...common}><rect x="6" y="6" width="14" height="14" rx="2"/><rect x="28" y="6" width="14" height="14" rx="2"/><rect x="6" y="28" width="14" height="14" rx="2"/><path d="M11 11h4v4h-4zM33 11h4v4h-4zM11 33h4v4h-4z" fill="currentColor" stroke="none"/><path d="M28 28h5v5h-5zM40 28v6h-6M29 41h6M41 39v3h-3"/></svg>;
  if (name === 'bank') return <svg {...common}><path d="m5 18 19-12 19 12M6 19h36M8 41h32M5 44h38M12 23v13M20 23v13M28 23v13M36 23v13"/></svg>;
  if (name === 'cash') return <svg {...common}><rect x="4" y="11" width="40" height="26" rx="4"/><circle cx="24" cy="24" r="8"/><path d="M9 16c4 0 5-1 5-1M9 32c4 0 5 1 5 1M39 16c-4 0-5-1-5-1M39 32c-4 0-5 1-5 1"/></svg>;
  if (name === 'delivery') return <svg {...common}><path d="M4 14h25v22H4zM29 21h8l7 8v7H29z"/><circle cx="12" cy="38" r="4" fill="#15223d"/><circle cx="36" cy="38" r="4" fill="#15223d"/><path d="M32 25h6"/></svg>;
  if (name === 'pickup') return <svg {...common}><path d="M7 19h34l-3-11H10L7 19ZM10 22v19h28V22M19 41V29h10v12"/><path d="M7 19c0 6 7 8 10 2 3 6 11 6 14 0 4 6 10 4 10-2"/></svg>;
  if (name === 'pin') return <svg {...common}><rect x="9" y="20" width="30" height="24" rx="5"/><path d="M16 20v-8a8 8 0 0 1 16 0v8M19 31h.01M24 31h.01M29 31h.01M24 37h.01"/></svg>;
  return <svg {...common}><path d="m7 15 17-9 17 9v21l-17 9-17-9V15Z M7 15l17 9 17-9M24 24v20"/><path d="m17 12 17 9M17 30l5 5 10-11"/></svg>;
}

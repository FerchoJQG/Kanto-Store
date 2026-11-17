// Reglas de negocio de pedidos: stock (kardex), historial, cambios de estado y notificaciones.
const db = require('../db');
const { fail } = require('./helpers');
const { notificarDisponibilidad } = require('./notify');

const MENSAJES = {
  pagado: 'Tu pago fue confirmado. Pronto prepararemos tu pedido.',
  preparando: 'Estamos preparando tu pedido.',
  empacado: 'Tu pedido está empacado y listo.',
  en_transito: 'Tu pedido va en camino. Ten a mano tu PIN de entrega.',
  entregado: '¡Tu pedido fue entregado! Gracias por comprar en Kanto Store.',
  cancelado: 'Tu pedido fue cancelado.',
};

async function registrarMovimiento(conn, m) {
  await conn.query(
    'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_resultante, usuario_id, pedido_id, nota) VALUES (?,?,?,?,?,?,?)',
    [m.producto_id, m.tipo, m.cantidad, m.stock, m.usuario_id || null, m.pedido_id || null, m.nota || null]);
}

async function historial(conn, pedidoId, estado, usuarioId, nota) {
  await conn.query('INSERT INTO pedido_historial (pedido_id, estado, usuario_id, nota) VALUES (?,?,?,?)',
    [pedidoId, estado, usuarioId || null, nota ? String(nota).slice(0, 250) : null]);
}

async function notificar(conn, pedido, estado) {
  if (!pedido.usuario_id || !MENSAJES[estado]) return;
  await conn.query('INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
    [pedido.usuario_id, `${MENSAJES[estado]} (${pedido.codigo})`]);
}

// Cambia el estado, guarda columnas extra, registra historial y avisa al cliente.
async function cambiarEstado(conn, pedido, nuevo, usuarioId, nota, extra = {}) {
  const cols = Object.keys(extra);
  await conn.query(`UPDATE pedidos SET estado = ?${cols.map((c) => `, ${c} = ?`).join('')} WHERE id = ?`,
    [nuevo, ...cols.map((c) => extra[c]), pedido.id]);
  await historial(conn, pedido.id, nuevo, usuarioId, nota);
  await notificar(conn, pedido, nuevo);
  pedido.estado = nuevo;
}

async function devolverStock(conn, pedido, usuarioId, nota) {
  const [items] = await conn.query('SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ? AND producto_id IS NOT NULL ORDER BY producto_id', [pedido.id]);
  for (const it of items) {
    const [[p]] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [it.producto_id]);
    if (!p) continue;
    const nuevo = p.stock + it.cantidad;
    await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, it.producto_id]);
    await registrarMovimiento(conn, { producto_id: it.producto_id, tipo: 'devolucion', cantidad: it.cantidad, stock: nuevo, usuario_id: usuarioId, pedido_id: pedido.id, nota });
    if (p.stock === 0) await notificarDisponibilidad(conn, it.producto_id);
  }
}

async function cancelarPedido(conn, pedido, usuarioId, nota) {
  if (['entregado', 'cancelado'].includes(pedido.estado)) fail(400, 'El pedido ya está cerrado');
  await devolverStock(conn, pedido, usuarioId, `Pedido ${pedido.codigo} cancelado`);
  await cambiarEstado(conn, pedido, 'cancelado', usuarioId, nota || 'Cancelado');
}

// Ejecuta fn dentro de una transacción con el pedido bloqueado.
async function conPedido(id, fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[pedido]] = await conn.query('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    if (!pedido) fail(404, 'Pedido no encontrado');
    const r = await fn(conn, pedido);
    await conn.commit();
    return r;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

// Cancela pedidos sin pagar que ya vencieron y devuelve su stock.
async function expirarPendientes() {
  const [venc] = await db.query("SELECT id FROM pedidos WHERE estado = 'pendiente' AND expira_en IS NOT NULL AND expira_en < NOW()");
  let n = 0;
  for (const v of venc) {
    try {
      await conPedido(v.id, async (conn, p) => {
        if (p.estado !== 'pendiente') return;
        await cancelarPedido(conn, p, null, 'Cancelado automáticamente: no se recibió el pago a tiempo');
        n++;
      });
    } catch (e) { console.error('expirarPendientes', e.message); }
  }
  return n;
}

async function itemsDe(pedidoId) {
  const [items] = await db.query('SELECT id, producto_id, nombre, precio_unitario, cantidad, verificado FROM pedido_items WHERE pedido_id = ?', [pedidoId]);
  return items;
}

// Quita campos internos/pesados antes de enviar al cliente.
function publico(p) {
  const { comprobante_pago, paypal_order_id, paypal_capture_id, empacador_id, ...r } = p;
  r.tiene_comprobante = !!comprobante_pago;
  return r;
}

// Dueño del pedido, admin, o quien conozca código + email.
async function accesoPedido(req, codigo) {
  const [[p]] = await db.query('SELECT * FROM pedidos WHERE codigo = ?', [codigo]);
  if (!p) return null;
  const u = req.user;
  const email = (req.query.email || req.body?.email || '').toLowerCase();
  const ok = (u && (u.rol === 'admin' || u.id === p.usuario_id)) || (email && email === p.email.toLowerCase());
  return ok ? p : undefined;
}

module.exports = { registrarMovimiento, historial, cambiarEstado, devolverStock, cancelarPedido, conPedido, expirarPendientes, itemsDe, publico, accesoPedido };

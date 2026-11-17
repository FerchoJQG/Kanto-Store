// Prueba end-to-end (requiere BD limpia: `npm run db:init`). PayPal se prueba contra un servidor simulado local.
require('dotenv').config();
const assert = require('assert');
const http = require('http');

// ---- PayPal simulado ----
const ordenes = {};
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    const j = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url === '/v1/oauth2/token') return j(200, { access_token: 'tok' });
    if (req.url === '/v2/checkout/orders') {
      const body = JSON.parse(b); const id = `ORD${Object.keys(ordenes).length + 1}`;
      ordenes[id] = body.purchase_units[0].amount;
      return j(201, { id, status: 'PAYER_ACTION_REQUIRED', links: [{ rel: 'payer-action', href: `https://paypal.test/approve?token=${id}` }] });
    }
    const m = req.url.match(/^\/v2\/checkout\/orders\/(\w+)\/capture$/);
    if (m && ordenes[m[1]]) return j(201, { status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: `CAP-${m[1]}`, status: 'COMPLETED', amount: ordenes[m[1]] }] } }] });
    j(404, { message: 'no existe' });
  });
});

(async () => {
  await new Promise((r) => mock.listen(0, r));
  process.env.PAYPAL_API_BASE = `http://localhost:${mock.address().port}`;
  process.env.PAYPAL_CLIENT_ID = 'id'; process.env.PAYPAL_SECRET = 'secret';
  process.env.WEB_URL = 'https://web.test'; process.env.PAYPAL_BOB_POR_USD = '7';

  const app = require('../src/app');
  const db = require('../src/db');
  const { expirarPendientes } = require('../src/utils/pedidos');
  const srv = app.listen(0);
  const base = `http://localhost:${srv.address().port}/api`;
  const call = async (m, p, body, token) => {
    const r = await fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : await r.arrayBuffer() };
  };
  const login = async (email, password) => (await call('POST', '/auth/login', { email, password })).data.token;
  const ok = (r, s = 200, msg = '') => assert.equal(r.status, s, `${msg} -> ${r.status} ${JSON.stringify(r.data)}`);
  const stockDe = async (sku) => (await db.query('SELECT stock FROM productos WHERE sku = ?', [sku]))[0][0].stock;
  const idDe = async (sku) => (await db.query('SELECT id FROM productos WHERE sku = ?', [sku]))[0][0].id;
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  const admin = await login('admin@kanto.com', 'admin123'), cliente = await login('cliente@kanto.com', 'cliente123');
  const stock = await login('stock@kanto.com', 'stock123'), emp = await login('empaque@kanto.com', 'empaque123'), rep = await login('repartidor@kanto.com', 'reparto123');
  assert(admin && cliente && stock && emp && rep);
  console.log('✔ login de los 5 roles');

  // Catálogo y revalidación de carrito
  assert((await call('GET', '/productos?rareza=holo_rara&idioma=ingles')).data.total >= 3);
  const pik = await idDe('BS-058-MT');
  const v = await call('POST', '/carrito/validar', { items: [{ producto_id: pik }] });
  assert.equal(v.data[0].stock, 8);
  console.log('✔ catálogo filtrado y validación de carrito con stock real');

  // ---- Stock: kardex y ajustes ----
  assert.equal((await call('PATCH', `/admin/productos/${pik}/stock`, { delta: -1 }, stock)).status, 400, 'ajuste sin motivo');
  ok(await call('PATCH', `/admin/productos/${pik}/stock`, { delta: -1, motivo: 'Carta dañada' }, stock));
  assert.equal(await stockDe('BS-058-MT'), 7);
  assert.equal((await call('PATCH', `/admin/productos/${pik}/stock`, { delta: -99, motivo: 'x' }, stock)).status, 400, 'no negativo');
  ok(await call('PATCH', `/admin/productos/${pik}/stock`, { delta: 1, motivo: 'Reposición' }, stock));
  const k = await call('GET', `/admin/inventario/movimientos?producto_id=${pik}`, null, stock);
  assert(k.data.length >= 3 && k.data[0].tipo === 'entrada' && k.data.some((m) => m.tipo === 'salida'));
  console.log('✔ ajustes de stock con motivo y kardex');

  // Wishlist -> aviso (Venusaur sin stock)
  const ven = await idDe('BS-015-EX');
  await call('POST', `/wishlist/${ven}`, null, cliente);
  ok(await call('PATCH', `/admin/productos/${ven}/stock`, { delta: 3, motivo: 'Llegó mercadería' }, stock));
  assert((await call('GET', '/notificaciones', null, cliente)).data.some((n) => n.producto_id === ven));
  console.log('✔ aviso de lista de deseos al reponer');

  // ---- Concurrencia ----
  const cha = await idDe('BS-004-NM');
  const compra = () => call('POST', '/pedidos', { items: [{ producto_id: cha, cantidad: 1 }], nombre_cliente: 'Inv', email: 'inv@test.com', direccion: 'Calle 1', metodo_pago: 'qr' });
  const rs = await Promise.all([1, 2, 3, 4, 5].map(compra));
  const gan = rs.filter((r) => r.status === 201);
  assert.equal(gan.length, 1); assert.equal(await stockDe('BS-004-NM'), 0);
  const ped1 = gan[0].data;
  assert(ped1.qr.startsWith('data:image/png') && ped1.qr_es_real === false && /^\d{6}$/.test(ped1.pin_entrega));
  console.log('✔ stock consistente con 5 compras simultáneas');

  // ---- QR real + comprobante + verificación ----
  ok(await call('PUT', '/config/admin/pagos', { qr_imagen: PNG, banco: 'Banco Unión', cuenta: '999', titular: 'Kanto SRL' }, admin));
  assert.equal((await call('PUT', '/config/admin/pagos', { qr_imagen: PNG }, cliente)).status, 403);
  const cfg = await call('GET', '/config/pagos'); assert(cfg.data.qr_configurado && cfg.data.paypal && cfg.data.banco === 'Banco Unión');
  const seg0 = await call('GET', `/pedidos/seguimiento/${ped1.codigo}?email=inv@test.com`);
  assert.equal(seg0.data.qr, PNG); assert.equal(seg0.data.qr_es_real, true);
  assert.equal((await call('GET', `/pedidos/seguimiento/${ped1.codigo}`)).status, 403);
  assert.equal((await call('POST', `/pedidos/seguimiento/${ped1.codigo}/comprobante`, { email: 'inv@test.com', imagen: 'hola' })).status, 400);
  ok(await call('POST', `/pedidos/seguimiento/${ped1.codigo}/comprobante`, { email: 'inv@test.com', imagen: PNG, referencia: 'TX123' }));
  assert.equal((await call('GET', `/pedidos/seguimiento/${ped1.codigo}?email=inv@test.com`)).data.estado, 'por_verificar');
  assert.equal((await call('GET', `/pedidos/${ped1.id}/comprobante-pago`, null, admin)).data.referencia, 'TX123');
  assert.equal((await call('POST', `/pedidos/${ped1.id}/rechazar-pago`, {}, admin)).status, 400, 'rechazo sin motivo');
  ok(await call('POST', `/pedidos/${ped1.id}/rechazar-pago`, { motivo: 'Monto incorrecto' }, admin));
  assert.equal((await call('GET', `/pedidos/seguimiento/${ped1.codigo}?email=inv@test.com`)).data.estado, 'pendiente');
  ok(await call('POST', `/pedidos/seguimiento/${ped1.codigo}/comprobante`, { email: 'inv@test.com', imagen: PNG, referencia: 'TX124' }));
  assert.equal((await call('POST', `/pedidos/${ped1.id}/confirmar-pago`, null, emp)).status, 403, 'empacador no verifica pagos');
  ok(await call('POST', `/pedidos/${ped1.id}/confirmar-pago`, null, admin));
  console.log('✔ QR real, comprobante, rechazo con motivo y confirmación del pago');

  // ---- Empaque (rol empacador) ----
  assert.equal((await call('POST', `/pedidos/${ped1.id}/preparar`, null, rep)).status, 403, 'repartidor no prepara');
  ok(await call('POST', `/pedidos/${ped1.id}/preparar`, null, emp));
  assert.equal((await call('POST', `/pedidos/${ped1.id}/empacar`, null, emp)).status, 400, 'checklist incompleto');
  const cola = (await call('GET', '/pedidos/preparacion', null, emp)).data;
  const itm = cola.find((p) => p.id === ped1.id).items;
  for (const i of itm) ok(await call('PATCH', `/pedidos/${ped1.id}/items/${i.id}`, { verificado: true }, emp));
  ok(await call('POST', `/pedidos/${ped1.id}/empacar`, null, emp));
  console.log('✔ preparación y empaque con checklist por rol empacador');

  // ---- Entrega con PIN ----
  assert.equal((await call('POST', `/pedidos/${ped1.id}/salir`, null, rep)).status, 403, 'no asignado');
  const reps = (await call('GET', '/pedidos/admin/repartidores', null, admin)).data;
  ok(await call('PATCH', `/pedidos/${ped1.id}/repartidor`, { repartidor_id: reps[0].id }, admin));
  assert.equal((await call('GET', '/pedidos/entregas', null, rep)).data.length, 1);
  ok(await call('POST', `/pedidos/${ped1.id}/salir`, null, rep));
  assert.equal((await call('POST', `/pedidos/${ped1.id}/entregar`, { pin: '000000' }, rep)).status, 400, 'PIN incorrecto');
  ok(await call('POST', `/pedidos/${ped1.id}/entregar`, { pin: ped1.pin_entrega, nota: 'Recibió Juan' }, rep));
  const fin = (await call('GET', `/pedidos/seguimiento/${ped1.codigo}?email=inv@test.com`)).data;
  assert.equal(fin.estado, 'entregado'); assert(!fin.pin_entrega);
  assert.deepEqual(fin.historial.map((h) => h.estado).filter((e, i, a) => a.indexOf(e) === i), ['pendiente', 'por_verificar', 'pagado', 'preparando', 'empacado', 'en_transito', 'entregado']);
  console.log('✔ entrega con PIN y línea de tiempo completa');

  // ---- Contra entrega + retiro en tienda ----
  const ce = (await call('POST', '/pedidos', { items: [{ producto_id: pik, cantidad: 2 }], nombre_cliente: 'Ash', email: 'cliente@kanto.com', metodo_entrega: 'retiro', metodo_pago: 'contra_entrega' }, cliente)).data;
  assert.equal(ce.estado, 'pagado'); assert.equal(await stockDe('BS-058-MT'), 6);
  ok(await call('POST', `/pedidos/${ce.id}/preparar`, null, emp));
  const its = (await call('GET', '/pedidos/preparacion', null, emp)).data.find((p) => p.id === ce.id).items;
  for (const i of its) await call('PATCH', `/pedidos/${ce.id}/items/${i.id}`, { verificado: true }, emp);
  ok(await call('POST', `/pedidos/${ce.id}/empacar`, null, emp));
  assert.equal((await call('POST', `/pedidos/${ce.id}/retirar`, { pin: ce.pin_entrega }, emp)).status, 400, 'falta cobro');
  ok(await call('POST', `/pedidos/${ce.id}/retirar`, { pin: ce.pin_entrega, monto_cobrado: 300 }, emp));
  console.log('✔ contra entrega con registro de cobro y retiro en tienda');

  // ---- Cancelación y vencimiento devuelven stock ----
  const c1 = (await call('POST', '/pedidos', { items: [{ producto_id: pik, cantidad: 3 }], nombre_cliente: 'A', email: 'a@a.com', metodo_entrega: 'retiro', metodo_pago: 'transferencia' })).data;
  assert.equal(await stockDe('BS-058-MT'), 3);
  ok(await call('POST', `/pedidos/seguimiento/${c1.codigo}/cancelar?email=a@a.com`, {}));
  assert.equal(await stockDe('BS-058-MT'), 6);
  const c2 = (await call('POST', '/pedidos', { items: [{ producto_id: pik, cantidad: 2 }], nombre_cliente: 'B', email: 'b@b.com', metodo_entrega: 'retiro', metodo_pago: 'qr' })).data;
  await db.query('UPDATE pedidos SET expira_en = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?', [c2.id]);
  assert.equal(await expirarPendientes(), 1); assert.equal(await stockDe('BS-058-MT'), 6);
  assert.equal((await call('GET', `/pedidos/seguimiento/${c2.codigo}?email=b@b.com`)).data.estado, 'cancelado');
  console.log('✔ cancelación y vencimiento automático devuelven el stock');

  // ---- PayPal ----
  const pp = (await call('POST', '/pedidos', { items: [{ producto_id: pik, cantidad: 1 }], nombre_cliente: 'Pay', email: 'pay@test.com', metodo_entrega: 'retiro', metodo_pago: 'paypal' })).data;
  assert.equal(pp.paypal.monto_usd, (150 / 7).toFixed(2));
  const cr = await call('POST', '/paypal/crear', { codigo: pp.codigo, email: 'pay@test.com' }); ok(cr);
  assert(cr.data.approve_url.includes('token=ORD')); assert.equal(Number(ordenes.ORD1.value), 21.43);
  assert.equal((await call('POST', '/paypal/capturar', { codigo: pp.codigo, email: 'pay@test.com', token: 'ORD999' })).status, 400, 'token ajeno');
  ok(await call('POST', '/paypal/capturar', { codigo: pp.codigo, email: 'pay@test.com', token: 'ORD1' }));
  ok(await call('POST', '/paypal/capturar', { codigo: pp.codigo, email: 'pay@test.com', token: 'ORD1' }), 200, 'idempotente');
  const sp = (await call('GET', `/pedidos/seguimiento/${pp.codigo}?email=pay@test.com`)).data;
  assert.equal(sp.estado, 'pagado'); assert(sp.historial.some((h) => /PayPal/.test(h.nota)));
  console.log('✔ PayPal: crear orden, capturar, validar monto y es idempotente');

  // ---- Reportes / permisos ----
  const rp = (await call('GET', '/admin/reportes', null, admin)).data; assert(rp.ingresos >= 3500);
  assert.equal((await call('GET', '/admin/usuarios', null, cliente)).status, 403);
  assert.equal((await call('GET', '/pedidos/admin/todos', null, emp)).status, 403);
  assert((await call('GET', '/pedidos/mis', null, cliente)).data.length >= 1);
  assert.equal((await call('GET', `/pedidos/comprobante/${ped1.codigo}?email=inv@test.com`)).status, 200);
  console.log('✔ reportes, historial, PDF y permisos por rol');

  srv.close(); mock.close(); await db.end();
  console.log('\nTodas las pruebas pasaron.');
})().catch((e) => { console.error('✖', e.message); process.exit(1); });

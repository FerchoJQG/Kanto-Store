// Prueba de humo end-to-end (requiere BD inicializada con `npm run db:init`).
require('dotenv').config();
const assert = require('assert');
const app = require('../src/app');
const db = require('../src/db');

(async () => {
  const srv = app.listen(0);
  const base = `http://localhost:${srv.address().port}/api`;
  const call = async (m, p, body, token) => {
    const r = await fetch(base + p, {
      method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : await r.arrayBuffer() };
  };
  const login = async (email, password) => (await call('POST', '/auth/login', { email, password })).data.token;

  const admin = await login('admin@kanto.com', 'admin123');
  const cliente = await login('cliente@kanto.com', 'cliente123');
  assert(admin && cliente, 'login');
  assert.equal((await call('POST', '/auth/login', { email: 'admin@kanto.com', password: 'x' })).status, 401);

  const cat = await call('GET', '/productos?rareza=holo_rara&idioma=ingles');
  assert(cat.data.total >= 3, 'filtros');
  console.log('✔ login + catálogo filtrado');

  // Wishlist + notificación al reponer stock (Venusaur sku BS-015-EX tiene stock 0)
  const [[ven]] = await db.query("SELECT id FROM productos WHERE sku='BS-015-EX'");
  await call('POST', `/wishlist/${ven.id}`, null, cliente);
  await call('PATCH', `/admin/productos/${ven.id}/stock`, { cantidad: 3 }, admin);
  const notis = await call('GET', '/notificaciones', null, cliente);
  assert(notis.data.some((n) => n.producto_id === ven.id), 'notificación wishlist');
  console.log('✔ wishlist + aviso de disponibilidad');

  // Concurrencia: 5 compras simultáneas de la única Charizard (stock 1)
  const [[cha]] = await db.query("SELECT id FROM productos WHERE sku='BS-004-NM'");
  const compra = () => call('POST', '/pedidos', {
    items: [{ producto_id: cha.id, cantidad: 1 }], nombre_cliente: 'Invitado', email: 'inv@test.com',
    direccion: 'Calle 1', metodo_pago: 'qr',
  });
  const rs = await Promise.all([1, 2, 3, 4, 5].map(compra));
  const ok = rs.filter((r) => r.status === 201);
  assert.equal(ok.length, 1, 'solo una compra debe ganar');
  assert(ok[0].data.qr.startsWith('data:image/png'), 'QR');
  const [[{ stock }]] = await db.query('SELECT stock FROM productos WHERE id=?', [cha.id]);
  assert.equal(stock, 0);
  console.log('✔ consistencia de stock bajo compras simultáneas (RNF04)');

  // Seguimiento invitado, comprobante PDF, confirmar pago, asignar repartidor, entrega
  const cod = ok[0].data.codigo, id = ok[0].data.id;
  assert.equal((await call('GET', `/pedidos/seguimiento/${cod}`)).status, 403);
  assert.equal((await call('GET', `/pedidos/seguimiento/${cod}?email=inv@test.com`)).status, 200);
  const pdf = await call('GET', `/pedidos/comprobante/${cod}?email=inv@test.com`);
  assert.equal(pdf.status, 200); assert(pdf.data.byteLength > 500);
  assert.equal((await call('POST', `/pedidos/${id}/confirmar-pago`, null, cliente)).status, 403);
  assert.equal((await call('POST', `/pedidos/${id}/confirmar-pago`, null, admin)).status, 200);
  const rep = await login('repartidor@kanto.com', 'reparto123');
  const reps = await call('GET', '/pedidos/admin/repartidores', null, admin);
  await call('PATCH', `/pedidos/${id}/repartidor`, { repartidor_id: reps.data[0].id }, admin);
  assert.equal((await call('PATCH', `/pedidos/${id}/estado`, { estado: 'en_transito' }, rep)).status, 200);
  assert.equal((await call('PATCH', `/pedidos/${id}/estado`, { estado: 'entregado' }, rep)).status, 200);
  console.log('✔ seguimiento invitado, comprobante PDF, pago simulado, flujo de entrega');

  // Cancelar devuelve stock
  const r2 = await call('POST', '/pedidos', { items: [{ producto_id: ven.id, cantidad: 2 }], nombre_cliente: 'A', email: 'a@a.com', metodo_entrega: 'retiro', metodo_pago: 'contra_entrega' }, cliente);
  assert.equal(r2.status, 201);
  await call('PATCH', `/pedidos/${r2.data.id}/estado`, { estado: 'cancelado' }, admin);
  const [[v]] = await db.query('SELECT stock FROM productos WHERE id=?', [ven.id]);
  assert.equal(v.stock, 3);
  const hist = await call('GET', '/pedidos/mis', null, cliente);
  assert(hist.data.length >= 1);
  const rep2 = await call('GET', '/admin/reportes', null, admin);
  assert(rep2.data.ingresos >= 3500);
  assert.equal((await call('GET', '/admin/usuarios', null, cliente)).status, 403);
  console.log('✔ cancelación devuelve stock, historial, reportes, permisos por rol');

  srv.close(); await db.end();
  console.log('\nTodas las pruebas pasaron.');
})().catch((e) => { console.error('✖', e); process.exit(1); });

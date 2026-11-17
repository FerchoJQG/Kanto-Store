// Migración v2: actualiza una base YA EXISTENTE (con tus datos) sin borrarla.
// Es idempotente: puedes correrla varias veces. Uso: npm run db:migrate
require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kanto_store',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  const q = (sql, p) => conn.query(sql, p);
  const hasCol = async (t, c) => (await q('SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [t, c]))[0].length > 0;
  const hasTable = async (t) => (await q('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [t]))[0].length > 0;
  const addCol = async (t, c, def) => { if (!(await hasCol(t, c))) { await q(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); console.log(`  + ${t}.${c}`); } };

  console.log('Migrando…');
  await q("ALTER TABLE usuarios MODIFY rol ENUM('cliente','admin','stock','repartidor','empacador') NOT NULL DEFAULT 'cliente'");
  await q("ALTER TABLE pedidos MODIFY metodo_pago ENUM('qr','transferencia','contra_entrega','paypal') NOT NULL");
  await q("ALTER TABLE pedidos MODIFY estado ENUM('pendiente','pagado','preparando','en_transito','entregado','cancelado','por_verificar','empacado') NOT NULL DEFAULT 'pendiente'");

  await addCol('pedidos', 'pin_entrega', 'VARCHAR(6) NULL');
  await addCol('pedidos', 'expira_en', 'TIMESTAMP NULL');
  await addCol('pedidos', 'comprobante_pago', 'MEDIUMTEXT NULL');
  await addCol('pedidos', 'comprobante_ref', 'VARCHAR(80) NULL');
  await addCol('pedidos', 'paypal_order_id', 'VARCHAR(40) NULL');
  await addCol('pedidos', 'paypal_capture_id', 'VARCHAR(40) NULL');
  await addCol('pedidos', 'pagado_en', 'TIMESTAMP NULL');
  await addCol('pedidos', 'empacador_id', 'INT NULL');
  await addCol('pedidos', 'empacado_en', 'TIMESTAMP NULL');
  await addCol('pedidos', 'entregado_en', 'TIMESTAMP NULL');
  await addCol('pedidos', 'monto_cobrado', 'DECIMAL(10,2) NULL');
  await addCol('pedidos', 'nota_entrega', 'VARCHAR(255) NULL');
  await addCol('pedido_items', 'verificado', 'TINYINT(1) NOT NULL DEFAULT 0');

  if (!(await hasTable('pedido_historial'))) {
    await q(`CREATE TABLE pedido_historial (
      id INT AUTO_INCREMENT PRIMARY KEY, pedido_id INT NOT NULL, estado VARCHAR(30) NOT NULL,
      usuario_id INT NULL, nota VARCHAR(255), creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_hist_pedido (pedido_id), FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    console.log('  + tabla pedido_historial');
  }
  if (!(await hasTable('movimientos_stock'))) {
    await q(`CREATE TABLE movimientos_stock (
      id INT AUTO_INCREMENT PRIMARY KEY, producto_id INT NOT NULL,
      tipo ENUM('entrada','salida','ajuste','venta','devolucion','inicial') NOT NULL,
      cantidad INT NOT NULL, stock_resultante INT NOT NULL, usuario_id INT NULL, pedido_id INT NULL,
      nota VARCHAR(255), creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mov_prod (producto_id, creado_en), FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    // Stock actual como punto de partida del kardex
    await q("INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_resultante, nota) SELECT id, 'inicial', stock, stock, 'Stock inicial al activar el kardex' FROM productos");
    console.log('  + tabla movimientos_stock (con stock inicial)');
  }
  if (!(await hasTable('configuracion'))) {
    await q('CREATE TABLE configuracion (clave VARCHAR(50) PRIMARY KEY, valor MEDIUMTEXT) ENGINE=InnoDB');
    console.log('  + tabla configuracion');
  }

  // PIN para pedidos antiguos que aún no se entregaron
  const [viejos] = await q("SELECT id FROM pedidos WHERE pin_entrega IS NULL AND estado NOT IN ('entregado','cancelado')");
  for (const p of viejos) await q('UPDATE pedidos SET pin_entrega = ? WHERE id = ?', [String(crypto.randomInt(100000, 1000000)), p.id]);

  // Usuario de ejemplo con el nuevo rol (si no existe)
  const bcrypt = require('bcryptjs');
  const [ex] = await q("SELECT id FROM usuarios WHERE email = 'empaque@kanto.com'");
  if (!ex.length) {
    await q("INSERT INTO usuarios (nombre,email,password_hash,telefono,rol) VALUES ('Encargado de Empaque','empaque@kanto.com',?,'70000005','empacador')", [bcrypt.hashSync('empaque123', 10)]);
    console.log('  + usuario empaque@kanto.com / empaque123');
  }
  console.log('Migración terminada.');
  await conn.end();
})().catch((e) => { console.error('Error en la migración:', e.message); process.exit(1); });

// Crea la BD (schema.sql) y carga datos de ejemplo con contraseñas cifradas.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const IMG = (set, n) => `https://images.pokemontcg.io/${set}/${n}.png`;

(async () => {
  const cfg = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
  };
  const dbName = process.env.DB_NAME || 'kanto_store';
  let conn;
  try {
    conn = await mysql.createConnection({ ...cfg, database: dbName });
  } catch (e) {
    if (e.code !== 'ER_BAD_DB_ERROR') throw e; // en local: crea la base si no existe
    const tmp = await mysql.createConnection(cfg);
    await tmp.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tmp.end();
    conn = await mysql.createConnection({ ...cfg, database: dbName });
  }
  const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
  await conn.query(schema);

  const h = (p) => bcrypt.hashSync(p, 10);
  await conn.query(
    'INSERT INTO usuarios (nombre,email,password_hash,telefono,rol) VALUES ?',
    [[
      ['Administrador', 'admin@kanto.com', h('admin123'), '70000001', 'admin'],
      ['Encargado de Stock', 'stock@kanto.com', h('stock123'), '70000002', 'stock'],
      ['Repartidor Uno', 'repartidor@kanto.com', h('reparto123'), '70000003', 'repartidor'],
      ['Ash Ketchum', 'cliente@kanto.com', h('cliente123'), '70000004', 'cliente'],
    ]]);

  await conn.query('INSERT INTO expansiones (nombre,codigo,fecha_lanzamiento) VALUES ?', [[
    ['Base Set', 'base1', '1999-01-09'],
    ['Jungle', 'base2', '1999-06-16'],
    ['Escarlata y Púrpura', 'sv1', '2023-03-31'],
    ['Evoluciones en Paldea', 'sv2', '2023-06-09'],
  ]]);

  // [sku,tipo,subtipo,nombre,desc,exp,num,rareza,idioma,estado,precio,stock,min,img]
  const P = [
    ['BS-004-NM', 'single', null, 'Charizard', 'Clásica carta holo del Base Set.', 1, '4/102', 'holo_rara', 'ingles', 'near_mint', 3500, 1, 1, IMG('base1', 4)],
    ['BS-002-NM', 'single', null, 'Blastoise', 'Holo del Base Set.', 1, '2/102', 'holo_rara', 'ingles', 'near_mint', 1200, 2, 1, IMG('base1', 2)],
    ['BS-015-EX', 'single', null, 'Venusaur', 'Holo del Base Set, buen estado.', 1, '15/102', 'holo_rara', 'ingles', 'excelente', 900, 0, 1, IMG('base1', 15)],
    ['BS-058-MT', 'single', null, 'Pikachu', 'Pikachu común del Base Set.', 1, '58/102', 'comun', 'ingles', 'mint', 150, 8, 3, IMG('base1', 58)],
    ['BS-044-PL', 'single', null, 'Bulbasaur', 'Común, con desgaste.', 1, '44/102', 'comun', 'ingles', 'played', 40, 10, 3, IMG('base1', 44)],
    ['JU-001-NM', 'single', null, 'Clefable', 'Holo de Jungle.', 2, '1/64', 'holo_rara', 'ingles', 'near_mint', 300, 3, 1, IMG('base2', 1)],
    ['JU-060-MT', 'single', null, 'Eevee', 'Común de Jungle.', 2, '51/64', 'comun', 'ingles', 'mint', 60, 6, 2, IMG('base2', 51)],
    ['SV1-081-MT', 'single', null, 'Pikachu', 'Escarlata y Púrpura, versión en español.', 3, '81/198', 'comun', 'espanol', 'mint', 25, 20, 5, IMG('sv1', 81)],
    ['SV1-001-NM', 'single', null, 'Sprigatito', 'Inicial de Paldea.', 3, '13/198', 'comun', 'espanol', 'near_mint', 15, 15, 5, IMG('sv1', 13)],
    ['SV2-200-NM', 'single', null, 'Gardevoir ex', 'Ultra rara.', 4, '86/193', 'ultra_rara', 'espanol', 'near_mint', 120, 4, 2, IMG('sv2', 86)],
    ['SEL-SV1-SOB', 'sellado', 'sobre', 'Sobre Escarlata y Púrpura', 'Sobre sellado de 10 cartas.', 3, null, null, 'espanol', 'sellado', 35, 40, 10, null],
    ['SEL-SV1-BOX', 'sellado', 'caja', 'Caja de 36 sobres Escarlata y Púrpura', 'Booster box sellada.', 3, null, null, 'espanol', 'sellado', 1100, 3, 1, null],
    ['SEL-SV2-SOB', 'sellado', 'sobre', 'Sobre Evoluciones en Paldea', 'Sobre sellado.', 4, null, null, 'espanol', 'sellado', 38, 25, 10, null],
    ['SEL-MAZ-CHA', 'sellado', 'mazo', 'Mazo temático Charizard ex', 'Mazo de 60 cartas listo para jugar.', 3, null, null, 'espanol', 'sellado', 220, 5, 2, null],
  ];
  await conn.query(
    `INSERT INTO productos (sku,tipo,subtipo_sellado,nombre,descripcion,expansion_id,numero_coleccion,rareza,idioma,estado_conservacion,precio,stock,stock_minimo,imagen_url) VALUES ?`, [P]);

  console.log(`Tablas creadas en '${dbName}' con datos de ejemplo.`);
  console.log('Usuarios: admin@kanto.com/admin123 | stock@kanto.com/stock123 | repartidor@kanto.com/reparto123 | cliente@kanto.com/cliente123');
  await conn.end();
})().catch((e) => { console.error(e.message); process.exit(1); });

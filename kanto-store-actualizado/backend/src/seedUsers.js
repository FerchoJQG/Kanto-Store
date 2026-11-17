// Crea los usuarios de prueba con contraseñas cifradas (bcrypt)
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const users = [
  ['Administrador', 'admin@kanto.bo', 'admin123', 'admin'],
  ['Encargado de Stock', 'stock@kanto.bo', 'stock123', 'stock'],
  ['Repartidor Uno', 'repartidor@kanto.bo', 'reparto123', 'repartidor'],
  ['Ash Ketchum', 'cliente@kanto.bo', 'cliente123', 'cliente'],
];

(async () => {
  for (const [name, email, pass, role] of users) {
    const hash = await bcrypt.hash(pass, 10);
    await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role)`,
      [name, email, hash, role]
    );
    console.log(`✔ ${role.padEnd(10)} ${email} / ${pass}`);
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });

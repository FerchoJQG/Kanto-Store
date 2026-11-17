// RF04: avisa a los usuarios cuya wishlist contiene un producto que vuelve a tener stock.
async function notificarDisponibilidad(conn, productoId) {
  const [[p]] = await conn.query('SELECT nombre FROM productos WHERE id = ?', [productoId]);
  if (!p) return 0;
  const [r] = await conn.query(
    `INSERT INTO notificaciones (usuario_id, producto_id, mensaje)
     SELECT w.usuario_id, ?, CONCAT('¡Ya está disponible: ', ?, '!')
     FROM wishlist w WHERE w.producto_id = ?`,
    [productoId, p.nombre, productoId]
  );
  return r.affectedRows;
}
module.exports = { notificarDisponibilidad };

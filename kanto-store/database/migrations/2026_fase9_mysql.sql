-- KANTO TCG STORE · Fase 9 para el MySQL existente (8.x)
-- ANTES: obtener respaldo. Ejecutar una sola vez sobre DB_NAME de Render.
-- No borra, modifica ni importa usuarios, productos, pedidos ni cobros existentes.
-- NOTA: este script presupone que pedidos.id y usuarios.id son INT (como en database/schema.sql).

CREATE TABLE IF NOT EXISTS pedido_evidencias (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id INT NOT NULL,
  usuario_id INT NOT NULL,
  etapa ENUM('producto','empaque','entrega') NOT NULL,
  imagen MEDIUMTEXT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pe_pedido (pedido_id, id),
  CONSTRAINT fk_pe_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pe_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS verificaciones_bancarias (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id INT NOT NULL,
  usuario_id INT NOT NULL,
  metodo ENUM('qr','transferencia') NOT NULL,
  referencia_bancaria VARCHAR(100) NOT NULL,
  monto_acreditado DECIMAL(10,2) NOT NULL,
  verificado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vb_pedido (pedido_id),
  UNIQUE KEY uq_vb_referencia (referencia_bancaria),
  CONSTRAINT fk_vb_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vb_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT chk_vb_monto CHECK (monto_acreditado > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comprobación sin alterar datos:
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('pedido_evidencias','verificaciones_bancarias');

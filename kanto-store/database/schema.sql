-- Kanto Store — esquema MySQL 8
-- (La base de datos la elige DB_NAME en backend/.env; este script solo crea las tablas)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS pedido_items, pedidos, notificaciones, wishlist, productos, expansiones, usuarios;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  telefono VARCHAR(30),
  rol ENUM('cliente','admin','stock','repartidor') NOT NULL DEFAULT 'cliente',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE expansiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  codigo VARCHAR(20),
  fecha_lanzamiento DATE
) ENGINE=InnoDB;

CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  tipo ENUM('single','sellado') NOT NULL,
  subtipo_sellado ENUM('sobre','caja','mazo') NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  expansion_id INT NULL,
  numero_coleccion VARCHAR(20),
  rareza ENUM('comun','poco_comun','rara','holo_rara','ultra_rara','secreta') NULL,
  idioma ENUM('espanol','ingles','japones') NOT NULL DEFAULT 'ingles',
  estado_conservacion ENUM('mint','near_mint','excelente','played','sellado') NOT NULL DEFAULT 'near_mint',
  precio DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 2,
  imagen_url VARCHAR(255),
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_stock CHECK (stock >= 0),
  CONSTRAINT chk_precio CHECK (precio >= 0),
  FOREIGN KEY (expansion_id) REFERENCES expansiones(id) ON DELETE SET NULL,
  INDEX idx_filtros (tipo, expansion_id, rareza, idioma, estado_conservacion),
  FULLTEXT INDEX ft_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE wishlist (
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, producto_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  producto_id INT NULL,
  mensaje VARCHAR(255) NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  usuario_id INT NULL,                 -- NULL = cliente invitado
  nombre_cliente VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefono VARCHAR(30),
  direccion VARCHAR(255),
  metodo_entrega ENUM('envio','retiro') NOT NULL DEFAULT 'envio',
  metodo_pago ENUM('qr','transferencia','contra_entrega') NOT NULL,
  estado ENUM('pendiente','pagado','preparando','en_transito','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  total DECIMAL(10,2) NOT NULL,
  repartidor_id INT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE pedido_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NULL,
  nombre VARCHAR(150) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  cantidad INT NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

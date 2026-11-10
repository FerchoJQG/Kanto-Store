const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'dev_secret';

function firmar(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
    SECRET(),
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

function leerToken(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(h.slice(7), SECRET());
  } catch {
    return null;
  }
}

// Exige sesión válida
function auth(req, res, next) {
  const u = leerToken(req);
  if (!u) return res.status(401).json({ error: 'No autenticado' });
  req.user = u;
  next();
}

// Sesión opcional (checkout como invitado)
function authOpcional(req, _res, next) {
  req.user = leerToken(req);
  next();
}

// Exige uno de los roles indicados
const rol = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }
  next();
};

module.exports = { firmar, auth, authOpcional, rol };

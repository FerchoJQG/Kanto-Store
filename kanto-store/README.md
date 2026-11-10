# ⚡ Kanto Store — Ecommerce de cartas Pokémon TCG (SIS324)

Stack (todo JavaScript): **MySQL · Node.js/Express · React (web + panel admin) · React Native (Expo)**

```
kanto-store/
├── database/schema.sql      Esquema MySQL
├── backend/                 API REST (Express, JWT, bcrypt)
├── web/                     Tienda + panel admin (React + Vite)
└── mobile/                  App cliente (React Native + Expo)
```

## 1. Base de datos + API
Requisitos: Node 18+ y MySQL 8 (o MariaDB 10.6+) corriendo.
```bash
cd backend
npm install
cp .env.example .env        # edita DB_USER / DB_PASSWORD / JWT_SECRET
npm run db:init             # crea la BD kanto_store + datos de ejemplo
npm start                   # http://localhost:4000
npm test                    # prueba end-to-end (opcional)
```
Usuarios de ejemplo:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@kanto.com | admin123 |
| Encargado de stock | stock@kanto.com | stock123 |
| Repartidor | repartidor@kanto.com | reparto123 |
| Cliente | cliente@kanto.com | cliente123 |

## 2. Web
```bash
cd web && npm install && npm run dev     # http://localhost:5173 (proxy /api -> :4000)
```
Para producción: `npm run build` y define `VITE_API_URL`.

## 3. App móvil
```bash
cd mobile && npm install
# Edita src/config.js: API_URL con la IP de tu PC (celular) o 10.0.2.2 (emulador Android)
npx expo start
```

## Cobertura de requisitos
| Req. | Dónde |
|---|---|
| RF01 registro/login | `routes/auth.js`, web `AuthPages`, móvil `LoginScreen` |
| RF02 filtros expansión/rareza/idioma/estado | `GET /api/productos`, `Catalog.jsx`, `CatalogScreen` |
| RF03 lista de deseos | `routes/wishlist.js` |
| RF04 aviso de disponibilidad | `utils/notify.js` (al reponer stock desde 0) + `/api/notificaciones` |
| RF05 estado + imagen | ficha de producto (`Product.jsx`, `ProductScreen`) |
| RF06 carrito | contexto de carrito (web y móvil, persistente) |
| RF07 pago QR / transferencia / contra entrega | `POST /api/pedidos` (QR real generado; confirmación simulada por admin) |
| RF08 descuento de stock | transacción en `POST /api/pedidos` |
| RF09 CRUD de productos | `routes/admin.js`, `admin/Productos.jsx` |
| RF10 comprobante | `GET /api/pedidos/comprobante/:codigo` (PDF) |
| RF11 historial | `GET /api/pedidos/mis` |
| RNF02 | contraseñas con bcrypt (`bcryptjs`), JWT; HTTPS se configura al desplegar |
| RNF03 | diseño responsive (web) y app móvil |
| RNF04 | `SELECT … FOR UPDATE` en transacción: compras simultáneas no sobrevenden (probado en `npm test`) |
| RNF06 | nuevas expansiones/categorías son filas de BD, sin cambios de código |

Roles: **admin** (todo), **stock** (productos/inventario), **repartidor** (entregas asignadas), **cliente** y **invitado** (checkout sin cuenta con seguimiento por código + email).

> Proyecto académico. Pokémon y sus marcas pertenecen a Nintendo, Game Freak y The Pokémon Company. Las imágenes del seed se enlazan desde images.pokemontcg.io (si no cargan, se muestra un placeholder).

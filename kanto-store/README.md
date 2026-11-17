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
| Encargado de empaque | empaque@kanto.com | empaque123 |
| Repartidor | repartidor@kanto.com | reparto123 |
| Cliente | cliente@kanto.com | cliente123 |

**¿Ya tienes una base con datos (v1)?** No uses `db:init` (borra todo). Corre `npm run db:migrate`: agrega las columnas/tablas nuevas sin perder nada (se puede repetir sin problema).

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


---
## Novedades v2

**Flujo completo de un pedido**
```
Cliente paga ──► Admin verifica ──► Empacador prepara ──► Repartidor entrega ──► Entregado
 (QR / depósito /   el comprobante    (checklist de cada     (con el PIN del        (o retiro en tienda
  PayPal / contra                      carta, luego           cliente; si es         con PIN)
  entrega)                             "empacado")            contra entrega,
                                                              registra el cobro)
```
Estados: `pendiente → por_verificar → pagado → preparando → empacado → en_transito → entregado` (o `cancelado`). Cada cambio queda en el **historial** del pedido y avisa al cliente.

**Control de cantidad disponible**
- El catálogo muestra "¡Últimas N!" / "Agotado"; el carrito se revalida con el stock real y limita la cantidad.
- El stock se descuenta al comprar (con bloqueo para compras simultáneas) y se **devuelve** si el pedido se cancela o vence.
- Pedidos sin pagar vencen a las 24 h (`PEDIDO_EXPIRA_HORAS`) y devuelven el stock.
- **Kardex**: toda entrada, salida, venta, devolución y ajuste queda registrado con usuario y motivo (Panel → Inventario → Kardex).

**Cobro con QR / depósito**: el administrador sube su **QR real** y los datos bancarios en *Panel → Cobros*. El cliente paga, sube la foto del comprobante, y el administrador lo aprueba o rechaza (con motivo) en *Pedidos y pagos*.

**PayPal (API REST Orders v2)**: el servidor crea la orden, el cliente aprueba en PayPal y vuelve a `/paypal/retorno`, donde el servidor **captura** el pago y valida monto y orden. PayPal no acepta bolivianos: se cobra en USD con `PAYPAL_BOB_POR_USD`.
1. En developer.paypal.com → *Apps & Credentials* → modo **Sandbox** → *Create App*.
2. Copia **Client ID** y **Secret** a las variables `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` (en `.env` o en Render).
3. Para probar, paga con una cuenta *Personal* de *Testing Tools → Sandbox Accounts*.
4. `WEB_URL` debe ser la URL pública de la web (PayPal vuelve ahí).

**Roles**: `admin` (todo) · `stock` (productos/inventario) · `empacador` (preparación y empaque, retiro en tienda) · `repartidor` (sus entregas) · `cliente`.

**Variables nuevas** (ver `.env.example`): `WEB_URL`, `PEDIDO_EXPIRA_HORAS`, `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_BOB_POR_USD`.

`npm test` (en `backend`) verifica todo el flujo, con PayPal simulado localmente.

---
## Actualizar un despliegue ya publicado (v1 → v2)
1. **Base de datos (TiDB/MySQL en la nube):** con tu `backend/.env` apuntando a esa base, corre `npm run db:migrate` (NO `db:init`). Conserva tus cartas y pedidos.
2. **GitHub:** sube los archivos nuevos/cambiados (`backend/src`, `backend/scripts`, `backend/package.json`, `backend/package-lock.json`, `web/src`, `database/schema.sql`, `README.md`). Nunca subas `.env` ni `node_modules`.
3. **Render (API → Environment):** agrega `WEB_URL` (URL pública de la web), `PEDIDO_EXPIRA_HORAS=24`, `PAYPAL_MODE=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_BOB_POR_USD=6.96`, y deja `CORS_ORIGIN` con la URL exacta de la web.
4. **Panel → Cobros:** sube tu QR real y los datos bancarios.

## Mejoras de interfaz (noviembre 2026)
- Botón de WhatsApp: `https://wa.me/59171179684` (prefijo Bolivia +591).
- Tema claro/oscuro en la barra superior, guardado en `localStorage` del navegador.
- Promociones editoriales administrables en **Panel → Promociones**, visibles en la portada. Se almacenan en la tabla `configuracion` existente; no requieren migración. Son banners informativos, **no descuentos automáticos**.
- El backend existente conserva inventario, comprobantes QR/depósito, PayPal Sandbox/Live según `.env`, preparación por roles y entregas. Para cobrar realmente, configurar QR bancario y credenciales PayPal.

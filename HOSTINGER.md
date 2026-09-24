# Deploy en Hostinger (Node.js)

Producto: TECHPODIO  
Repo: https://github.com/rakar22/podiosync  
Dominio de referencia: https://podiosync.es

La app es Next.js. Hostinger tiene que **construir** el proyecto y arrancar `server.js`. SQLite vive en `data/techpodio.db`, junto al código. El disco de la app tiene que conservar ese archivo entre reinicios. Si el plan borra el disco en cada deploy, pasa a Postgres (al final de esta guía) antes de cobrar de verdad.

## Importar

1. hPanel → Sitios web → Añadir sitio → Node.js / Web App.
2. Importar el repositorio `https://github.com/rakar22/podiosync`.
3. Ajustes:

| Campo | Valor |
|---|---|
| Rama | `main` (o la rama del PR hasta que se fusione) |
| Node | 20.x |
| Directorio raíz | `./` |
| Comando de build | `npm run build` |
| Comando de arranque | `npm start` |
| Entry file | `server.js` |

`npm start` ejecuta `node server.js` con `NODE_ENV=production`. El build aplica migraciones y un seed que no borra precios ya editados ni crea empresas.

4. Variables de entorno (sin comillas):

```
DATABASE_URL=file:../data/techpodio.db
PUBLIC_URL=https://podiosync.es
NEXTAUTH_URL=https://podiosync.es
AUTH_SECRET=...          # openssl rand -base64 32
NEXTAUTH_SECRET=...      # el mismo valor
ADMIN_EMAIL=...
ADMIN_PASSWORD=...       # mínimo 10 caracteres; solo crea el usuario si no existe
CRON_SECRET=...
STRIPE_SECRET_KEY=sk_test_... o sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... o pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Opcionales: `CONTACT_EMAIL`, `LEGAL_ENTITY_NAME`, `LEGAL_TAX_ID`, `LEGAL_ADDRESS`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_ADSENSE_CLIENT`.

No subas `.env` al repositorio.

5. Implementar. Cuando termine, https://podiosync.es/health debe responder `{"ok":true,"product":"TECHPODIO",...}`.

## Stripe

Webhook: `https://podiosync.es/api/webhooks/stripe`  
Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`.

Prueba con `sk_test_` y la tarjeta `4242 4242 4242 4242`. El puesto se activa al volver de Checkout y, otra vez, con el webhook.

## Cron de caducidad

En hPanel → Cron jobs, una vez al día:

```bash
curl -fsS -H "Authorization: Bearer TU_CRON_SECRET" https://podiosync.es/api/cron/expire
```

Sin cron, el ranking también caduca campañas al abrirse. El cron vacía la bandeja de avisos si Resend está configurado.

## Admin

1. Define `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes del primer build (el seed corre dentro de `npm run build`).
2. Entra en `https://podiosync.es/es/login`.
3. Abre `/es/admin/precios` y cambia un precio. Recarga `/es/precios`: el importe nuevo sale de la base de datos.

Si el admin no se creó porque las variables llegaron tarde:

```bash
npm run db:seed
```

desde la raíz de la app, con las mismas variables, y reinicia.

## Qué no hace el API de Hostinger

Los logs crudos de acceso siguen en hPanel. Las variables de Node se editan en el panel, no hace falta otro servicio.

## Postgres

1. Crea una base Postgres (Neon, el Postgres del VPS, etc.).
2. En `prisma/schema.prisma`, cambia `provider = "sqlite"` por `provider = "postgresql"`.
3. No reutilices `prisma/migrations/20260924100000_init`: ese SQL es de SQLite. Genera una migración nueva contra Postgres (`npx prisma migrate dev`) y despliega con `npx prisma migrate deploy`.
4. `DATABASE_URL=postgresql://...`
5. `npm run db:seed`.

El resto de la aplicación no cambia.

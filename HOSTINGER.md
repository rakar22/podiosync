# TECHPODIO en Hostinger (Node.js)

Dominio de este despliegue: **https://podiosync.es**  
Repo: https://github.com/rakar22/podiosync  
Rama a construir: **`main`** (después de fusionar el PR).

hPanel no puede fijar variables por API. Pégalas en el panel **antes** del primer build.

## Ajustes del sitio Node.js

| Campo en hPanel | Valor |
|---|---|
| Node.js version | **20** |
| Root directory | `./` |
| Framework / preset | Node.js (no static, no WordPress) |
| Build command | `npm run build` |
| Start command | `npm start` |
| Entry file | `server.js` |
| Output directory | déjalo vacío. La app no publica `dist/` ni `public/` como salida. `server.js` sirve `.next`. |

`.nvmrc` es `20`. `package.json` declara `"node": "20.x"`.

`npm start` es `NODE_ENV=production node server.js`. El proceso escucha `process.env.PORT` (Hostinger lo inyecta). No cambies el puerto en el código.

## Variables obligatorias

Sin comillas.

```
DATABASE_URL=file:../data/techpodio.db
PUBLIC_URL=https://podiosync.es
NEXTAUTH_URL=https://podiosync.es
SITE_URL=https://podiosync.es
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_SECRET=<el mismo valor que AUTH_SECRET>
ADMIN_EMAIL=<tu email>
ADMIN_PASSWORD=<mínimo 10 caracteres>
CRON_SECRET=<una cadena larga aleatoria>
STRIPE_SECRET_KEY=sk_test_... o sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... o pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`DATABASE_URL` es relativo a `prisma/schema.prisma`. El archivo real es `data/techpodio.db` en la raíz del proyecto. `npm run build` crea `data/` si no existe, aplica migraciones y hace seed. El disco de la app tiene que **conservar ese archivo** entre reinicios. Los `*.db` no van al git. Las migraciones sí.

`ADMIN_EMAIL` y `ADMIN_PASSWORD` tienen que existir **antes** del primer `npm run build`, porque el seed corre dentro del build y solo crea el admin si el email no existe. Si llegaron tarde: en la consola de la app, `npm run db:seed` y reinicia.

Identidad legal (`LEGAL_ENTITY_NAME`, `LEGAL_TAX_ID`, `LEGAL_ADDRESS`): déjalas vacías hasta tener el dato real. El sitio muestra «pendiente de configuración». No inventes un CIF ni un nombre de sociedad.

Opcionales, vacías en el primer deploy: `LEGAL_JURISDICTION`, `LEGAL_EMAIL`, `CONTACT_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_ADSENSE_CLIENT`. Sin `LEGAL_EMAIL` ni `CONTACT_EMAIL`, el contacto visible es `podio@podiosync.es`.

## Qué hace el build

`npm run build` → `scripts/build.mjs`:

1. `mkdir data`
2. `DATABASE_URL` por defecto `file:../data/techpodio.db` si falta
3. `prisma generate`
4. `prisma migrate deploy`
5. seed (categorías, países, precios de ejemplo; **cero empresas**; no pisa precios ya editados)
6. `next build`

## Stripe

Registra las dos URLs (mismo secreto `whsec_`):

- `https://podiosync.es/api/webhooks/stripe`
- `https://podiosync.es/webhook/stripe`

Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`.

Sin `STRIPE_SECRET_KEY` el checkout no cobra y no finge un pago.

Tarjeta de prueba: `4242 4242 4242 4242`.

## Cron

hPanel → Cron jobs, una vez al día:

```bash
curl -fsS -H "Authorization: Bearer TU_CRON_SECRET" https://podiosync.es/api/cron/expire
```

GET y POST valen. Sin el bearer responde 401. Abrir un ranking también caduca campañas vencidas.

## Comprobar

- `https://podiosync.es/health` → `ok: true`, `database: "ok"`, `stripeConfigured` y `webhookSecretPresent` en booleano. No devuelve claves.
- Login: `https://podiosync.es/es/login` con `ADMIN_EMAIL`.
- Precios: `https://podiosync.es/es/admin/precios`.

## Postgres más adelante

Este deploy es SQLite. Para Postgres cambia el provider en `prisma/schema.prisma`, **no reutilices** la migración `20260924100000_init` (es SQL de SQLite), genera una migración nueva y pon `DATABASE_URL=postgresql://...`.

# Deploy en Hostinger (Node.js)

Producto: el valor de `SITE_NAME` (por defecto TECHPODIO).  
Repo: https://github.com/rakar22/podiosync  
Dominio de este despliegue (ejemplo, cámbialo con `SITE_URL` / `PUBLIC_URL`): https://podiosync.es

La app es Next.js. Hostinger tiene que construir el proyecto y arrancar `server.js`.

## SQLite en el disco de la app

`DATABASE_URL=file:../data/techpodio.db` se resuelve respecto a `prisma/schema.prisma`, así que el archivo es `data/techpodio.db` en la raíz del proyecto.

- `npm run build` crea `data/` si no existe, aplica `prisma migrate deploy` y el seed.
- Los `*.db` están en `.gitignore`. Las migraciones en `prisma/migrations/` sí se commitean.
- El plan de Node tiene que **conservar ese archivo entre reinicios y deploys**. Si cada deploy borra el disco, los pagos, fichas y precios editados desaparecen. En ese caso pasa a Postgres antes de cobrar de verdad.
- No copies la base al repositorio.

## Importar

1. hPanel → Sitios web → Añadir sitio → Node.js / Web App.
2. Importar `https://github.com/rakar22/podiosync`.
3. Ajustes:

| Campo | Valor |
|---|---|
| Rama | `main` (o la rama del PR hasta que se fusione) |
| Node | 20.x |
| Directorio raíz | `./` |
| Comando de build | `npm run build` |
| Comando de arranque | `npm start` |
| Entry file | `server.js` |

`npm start` ejecuta `node server.js` con `NODE_ENV=production`. El seed no borra precios ya editados ni crea empresas.

## Checklist de entorno

Sin comillas en hPanel. Nada de esto se commitea.

```
DATABASE_URL=file:../data/techpodio.db
SITE_NAME=TECHPODIO
SITE_URL=https://podiosync.es
SITE_CLAIM=Descubre las empresas que están construyendo la tecnología de Europa.
SITE_CLAIM_EN=Discover the companies building Europe’s technology.
PUBLIC_URL=https://podiosync.es
NEXTAUTH_URL=https://podiosync.es
AUTH_SECRET=...
NEXTAUTH_SECRET=...          # el mismo valor que AUTH_SECRET
ADMIN_EMAIL=...
ADMIN_PASSWORD=...           # mínimo 10 caracteres; solo crea el usuario si no existe
CRON_SECRET=...
STRIPE_SECRET_KEY=sk_test_... o sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... o pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
LEGAL_ENTITY_NAME=
LEGAL_TAX_ID=
LEGAL_ADDRESS=
LEGAL_JURISDICTION=
LEGAL_EMAIL=
CONTACT_EMAIL=
RESEND_API_KEY=
RESEND_FROM=
NEXT_PUBLIC_ADSENSE_CLIENT=
```

Identidad legal: mientras falte nombre, identificador fiscal o domicilio, las páginas legales dicen «pendiente de configuración» y el admin muestra el checklist. No rellenes un CIF de mentira. El email de contacto, si dejas `LEGAL_EMAIL` y `CONTACT_EMAIL` vacíos, es `podio@podiosync.es`.

`/health` y `/api/health` responden, sin secretos:

```json
{
  "ok": true,
  "database": "ok",
  "product": "TECHPODIO",
  "companies": 0,
  "stripe": "test",
  "stripeConfigured": true,
  "webhookSecretPresent": true,
  "legalConfigured": false,
  "cronSecretPresent": true,
  "resendConfigured": false
}
```

`stripe` es `off`, `test`, `live` o `on`. `database` pasa a `unreachable` si Prisma no abre el archivo.

## Stripe

Registra **las dos** URLs en el endpoint del webhook (el alias existe para el panel que ya apuntaba a la ruta corta):

- `https://podiosync.es/api/webhooks/stripe`
- `https://podiosync.es/webhook/stripe`

Sustituye el host por `SITE_URL`.

Eventos:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

Prueba con `sk_test_` y la tarjeta `4242 4242 4242 4242`. El puesto se activa al volver de Checkout y, otra vez, con el webhook. Si no hay `STRIPE_SECRET_KEY`, el checkout no simula el pago: muestra que los pagos están pendientes de configuración. El admin, en el resumen, tiene el panel «Pagos» (presente / ausente, sin claves).

## Cron de caducidad

En hPanel → Cron jobs, una vez al día:

```bash
curl -fsS -H "Authorization: Bearer TU_CRON_SECRET" https://podiosync.es/api/cron/expire
```

Acepta GET y POST. Sin el bearer responde 401. Sin cron, abrir un ranking también caduca campañas vencidas y suelta reservas de más de 45 minutos.

Si `RESEND_API_KEY` y `RESEND_FROM` existen, el cron (y el botón de `/es/admin/avisos`) envía la cola. Si no existen, la cola sigue pendiente y la interfaz no dice que el email se envió.

## Admin

1. Define `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes del primer build.
2. Entra en `https://podiosync.es/es/login`.
3. `/es/admin` muestra el checklist. `/es/admin/precios` cambia tarifas y deja auditoría. `/es/admin/avisos` lista la lista de espera.

Si el admin no se creó porque las variables llegaron tarde: `npm run db:seed` en la raíz, con las mismas variables, y reinicia.

## Landings

`/empresas/[categoria]/[ubicacion]` se indexa con FAQ y enlaces internos aunque todavía no haya fichas. El texto dice «aún sin empresas». No es un soft-404 ni un listado inventado. El sitemap incluye esas combinaciones de la taxonomía (categoría × país y categoría × ciudad) y excluye panel, login, checkout y API (`robots.ts`).

## Postgres

El provider del schema sigue en `sqlite` para este despliegue. Para cambiar:

1. Crea una base Postgres (Neon, el Postgres del VPS, etc.). No hace falta inventar una URL en el repo.
2. En `prisma/schema.prisma`, cambia `provider = "sqlite"` por `provider = "postgresql"`.
3. No reutilices `prisma/migrations/20260924100000_init`: ese SQL es de SQLite. Borra o aparta esa carpeta en una rama, genera una migración nueva (`npx prisma migrate dev --name init`) y despliega con `npx prisma migrate deploy`.
4. `DATABASE_URL=postgresql://USUARIO:CLAVE@HOST:5432/NOMBRE`
5. `npm run db:seed`.

El código de la app solo habla con Prisma. Precios, huecos y webhooks no cambian.

## Qué no hace el API de Hostinger

Los logs crudos de acceso siguen en hPanel. Las variables de Node se editan en el panel.

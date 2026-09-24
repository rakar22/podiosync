# TECHPODIO

Directorio B2B de empresas que construyen tecnología en Europa, empezando por España.

**Claim:** Descubre las empresas que están construyendo la tecnología de Europa.

Las posiciones patrocinadas (#1, #2, #3, Top 5, Destacada, Premium) tienen **precio fijo**. No hay subastas, no hay pujas y pagar más no desplaza a quien ya ocupa el hueco. Si está ocupado, la pantalla dice «Actualmente no disponible» y permite ver otros huecos o dejar un aviso.

El ranking orgánico va debajo, separado, y solo ordena fichas publicadas por verificación y completitud. El seed puede dejar fichas editoriales tomadas de sitios públicos: no son posiciones patrocinadas y no llevan rondas, plantillas ni reseñas inventadas.

## Stack

- Next.js (App Router) + React + TypeScript
- Prisma + SQLite (`data/techpodio.db`)
- Stripe Checkout
- Sesión propia (JWT httpOnly). `AUTH_SECRET` y `NEXTAUTH_SECRET` son el mismo secreto, para no inventar otro nombre en el hosting.

Postgres es posible más adelante: el código habla con Prisma, no con SQL de SQLite. La migración incluida es de SQLite, que encaja con un proceso Node largo en Hostinger. Ver [HOSTINGER.md](./HOSTINGER.md).

## Arranque local

```bash
cp .env.example .env
# Rellena AUTH_SECRET, NEXTAUTH_SECRET y, para crear el admin, ADMIN_EMAIL + ADMIN_PASSWORD (mínimo 10 caracteres).

npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abre http://localhost:3000 (redirige a `/es`).

```bash
npm test
npm run lint
npm run build
npm start
```

`npm run build` genera el cliente de Prisma, aplica migraciones, ejecuta el seed (idempotente: no pisa precios ni textos ya editados) y construye Next.

## Seed

Se crean categorías, países de la UE y Reino Unido, ciudades de España y hubs europeos, tecnologías, industrias, reglas de precio de ejemplo y fichas editoriales. Esas fichas son perfiles públicos del directorio, no posiciones patrocinadas. Si ya existe una empresa con el mismo slug o el mismo sitio web, el seed no la toca.

El admin solo se crea si `ADMIN_EMAIL` y `ADMIN_PASSWORD` están definidos y el email no existe. El seed no cambia la contraseña en despliegues posteriores.

Entra en `/es/login` y abre `/es/admin/precios` para cambiar un importe. El ranking y `/precios` leen la base de datos: no hace falta redeploy.

## Stripe (modo test)

1. En `.env`: `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `PUBLIC_URL=http://localhost:3000`.
2. En otra terminal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` y copia el `whsec_` que imprime.
3. Entra, crea cuenta y abre `/es/comprar` (o el CTA de un ranking).
4. Tarjeta `4242 4242 4242 4242`, fecha futura, CVC cualquiera.
5. Stripe vuelve a `/es/checkout/exito?session_id=...`, que activa la campaña. El webhook `checkout.session.completed` (y `checkout.session.async_payment_succeeded`) hace lo mismo y es idempotente.
6. La posición aparece como **Patrocinado**. El orgánico sigue debajo.

Si el hueco se ocupa entre el inicio del checkout y la confirmación, el pago no pisa a la otra empresa. Hay que reembolsar a mano.

Sin `STRIPE_SECRET_KEY` el checkout no se finge: responde que Stripe no está configurado.

Webhook de producción: `https://podiosync.es/api/webhooks/stripe` (también escucha `/webhook/stripe`).

## Caducidad

Al abrir un ranking se liberan reservas viejas y se caducan campañas vencidas. Además:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://podiosync.es/api/cron/expire
```

En Hostinger, un cron diario con ese `curl` basta. Si `RESEND_API_KEY` y `RESEND_FROM` existen, los avisos de lista de espera se envían. Si no, quedan en la bandeja (`notification_outbox`) y el admin ve el contador.

## Rutas

Públicas, en `/es` y `/en`: inicio, `/empresas`, `/empresa/[slug]`, categorías, países, ciudades, tecnologías, `/rankings/...`, `/ia`, `/comparar`, `/noticias`, `/senales`, `/precios`, `/para-empresas`, `/buscar`, landings `/empresas/[categoria]/[ubicacion]`, legales y contacto.

Cuenta: `/login`, `/register`, `/reclamar/[slug]`, `/dashboard`, `/admin` (inventario en `/admin/inventory`, precios en `/admin/precios`).

API de lectura: `/api/companies`, `/api/categories`, `/api/countries`, `/api/cities`, `/api/technologies`, `/api/rankings`, `/api/search`, `/api/sponsored-positions`. Salud: `/health`.

## Precios

`PricingRule` guarda posición, duración, importe en céntimos, moneda y, si aplica, categoría, país y ciudad. La regla más específica gana: ciudad, luego país, luego categoría, luego la base. Las duraciones no están escritas en el código de cobro: salen de las reglas activas (el seed deja 7, 30, 90, 180 y 365 días como ejemplo).

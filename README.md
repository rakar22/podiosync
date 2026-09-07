# PodioSync

Ranking público de influencers de España y Latinoamérica.  
Dominio: [podiosync.es](https://podiosync.es)

Misma mecánica que outbid.lol: pagas, subes. El #1 cuesta $5 más.

## Stack

- Node.js 18+ (ESM)
- Express
- Stripe Checkout (opcional; sin clave corre en modo demo)
- Persistencia JSON en `data/board.json`

## Arrancar en local

```bash
npm install
PORT=3000 node server.js
```

Abre http://localhost:3000

## Hostinger

1. Plan con Node.js (Business, Cloud o VPS).
2. Crea la app: startup file `server.js`, root la carpeta de este repo.
3. `npm install --omit=dev` y Start.
4. Variables (hPanel → Node.js → Environment):

| Variable | Valor |
|---|---|
| `PORT` | lo pone Hostinger |
| `PUBLIC_URL` | `https://podiosync.es` |
| `STRIPE_SECRET_KEY` | `sk_live_...` o `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `EMPTY_BOARD` | `true` el día del launch |

Webhook Stripe: `https://podiosync.es/webhook/stripe`  
Evento: `checkout.session.completed`

Detalle paso a paso: [INSTALAR-HOSTINGER.txt](./INSTALAR-HOSTINGER.txt)

## Cómo funciona

- Mínimo $10 para entrar.
- +$5 para quitar el #1.
- Si ya estás en el ranking, solo se cobra la diferencia.
- Tableros: all-time, últimas 24h, día UTC.

## Estructura

```
server.js          Express + Stripe
lib/store.js       ranking, pagos, seed
lib/payments.js    Checkout + webhook
lib/seed.js        roster de streamers / TikTok / LATAM
lib/categories.js  nichos y países
public/            CSS, icono, portadas
data/              board.json (se crea solo, no se commitea)
```

# PodioSync

Ranking público de influencers de España y Latinoamérica.  
Dominio: [podiosync.es](https://podiosync.es)

Misma mecánica que outbid.lol: pagas, subes. El #1 cuesta $5 más.

**Deploy Hostinger (GitHub):** ver [HOSTINGER.md](./HOSTINGER.md)

## Stack

- Node.js 20 (ESM)
- Express
- Stripe Checkout (opcional; sin clave corre en modo demo)
- Persistencia JSON en `data/board.json`

## Arrancar en local

```bash
npm install
PORT=3000 node server.js
```

Abre http://localhost:3000

```bash
npm test
```

## Hostinger + GitHub

Repo: https://github.com/rakar22/podiosync

1. hPanel → Añadir sitio → Node.js
2. Import Git: `https://github.com/rakar22/podiosync`
3. Express · rama `main` · Node 20 · raíz `./` · entry `server.js` · **sin build**
4. Variables:

```
PUBLIC_URL=https://podiosync.es
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. Implementar

Webhook Stripe: `https://podiosync.es/webhook/stripe`  
Evento: `checkout.session.completed`

Sin `STRIPE_SECRET_KEY` la app corre en modo demo (el ranking se actualiza sin cobro). Con la clave, Checkout cobra en USD y el puesto solo se asigna tras un pago verificado (`/paid?session_id=…` + webhook).

## Cómo funciona

- Mínimo $10 para entrar.
- +$5 para quitar el #1.
- Si ya estás en el ranking, solo se cobra la diferencia.
- Tableros: all-time, últimas 24h, día UTC.

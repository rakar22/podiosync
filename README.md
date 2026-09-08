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

## Hostinger + GitHub

Repo: https://github.com/rakar22/podiosync

1. hPanel → Añadir sitio → Node.js
2. Import Git: `https://github.com/rakar22/podiosync`
3. Express · rama `main` · Node 20 · raíz `./` · entry `server.js` · **sin build**
4. `PUBLIC_URL=https://podiosync.es`
5. Implementar

Webhook Stripe: `https://podiosync.es/webhook/stripe`  
Evento: `checkout.session.completed`

## Cómo funciona

- Mínimo $10 para entrar.
- +$5 para quitar el #1.
- Si ya estás en el ranking, solo se cobra la diferencia.
- Tableros: all-time, últimas 24h, día UTC.

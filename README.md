# PodioSync

Ranking público de influencers de España y Latinoamérica.  
Dominio: [podiosync.es](https://podiosync.es)

Misma mecánica que outbid.lol: pagas, subes. El #1 cuesta $5 más.

**Deploy Hostinger (GitHub):** ver [HOSTINGER.md](./HOSTINGER.md)

## Stack

- Node.js 20 (ESM)
- Express
- Strike invoices (Bitcoin Lightning, opcional; sin clave corre en modo demo)
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
4. `PUBLIC_URL=https://podiosync.es`
5. Implementar

Variables Strike (producción):

```
STRIKE_API_KEY=...
STRIKE_WEBHOOK_SECRET=...   # 10–50 caracteres
PUBLIC_URL=https://podiosync.es
```

Webhook Strike: `https://podiosync.es/webhook/strike`  
Evento: `invoice.updated`  
Firma: header `X-Webhook-Signature` (HMAC-SHA256 del body)

Sandbox opcional: `STRIKE_API_BASE=https://api.dev.strike.me`

## Cómo funciona

- Mínimo $10 para entrar.
- +$5 para quitar el #1.
- Si ya estás en el ranking, solo se cobra la diferencia.
- Tableros: all-time, últimas 24h, día UTC.
- Con `STRIKE_API_KEY`, el cobro es una factura Strike en USD pagada por Lightning. Sin la clave, el modo demo actualiza el ranking **sin** fingir que Strike cobró.

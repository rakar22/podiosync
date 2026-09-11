# Deploy en Hostinger (GitHub)

Repo: https://github.com/rakar22/podiosync  
Rama: `main`  
Entry: `server.js`

## Importar

1. hPanel → **Sitios web** → **Añadir sitio** → **Node.js / Web App**
2. **Import Git repository**
3. Pega esta URL (el repo es público, no hace falta autorizar si falla la conexión):

```
https://github.com/rakar22/podiosync
```

4. Ajustes:

| Campo | Valor |
|---|---|
| Preajuste | Express |
| Rama | main |
| Node | 20.x |
| Directorio raíz | `./` |
| Script de build | *(vacío)* |
| Output | *(vacío)* |
| Entry file | `server.js` |

5. Variable de entorno:

```
PUBLIC_URL=https://podiosync.es
```

Opcional Stripe (cobrar de verdad):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Webhook: `https://podiosync.es/webhook/stripe`  
Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`

6. **Implementar**

Cuando termine: https://podiosync.es/health → `{"ok":true,...}`

Sincronización automática: al conectar el repo, cada push a `main` vuelve a desplegar.

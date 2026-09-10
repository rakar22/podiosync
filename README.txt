PODIOSYNC.ES — Node.js para Hostinger
========================================

Ranking público de influencers de España y Latinoamérica.
Misma mecánica que outbid.lol: pagas, subes. El #1 cuesta $5 más.

Lee INSTALAR-HOSTINGER.txt para el paso a paso con capturas descritas.

------------------------------------------------
Qué es
------------------------------------------------
Un tablero pay-to-rank. Un creator, manager o marca pega un @handle,
elige categoría (TikTok, Twitch, belleza, fútbol…) y paga con Strike
(Bitcoin Lightning). El ranking se ordena por lo pagado. Sin ads,
sin revenue share.

Nicho: influencers ES/LATAM. El original (outbid.lol) facturó cientos
de miles de dólares en semanas rankeando SaaS. Aquí la palanca es ego
+ agencias + marcas en el segundo idioma de Instagram/TikTok/YouTube.

------------------------------------------------
1. Subir a Hostinger
------------------------------------------------
1. En hPanel: Sitios → Administrar → Avanzado → Node.js
   (plan Business o Cloud; el hosting compartido básico no trae Node).
2. Crea una app Node:
   - Node version: 20 (o 18+)
   - Application root: la carpeta donde descomprimas este zip
     (ej. public_html/podiosync  o  domains/podiosync.es)
   - Application URL: tu dominio o un subdominio
   - Application startup file: server.js
   - Application mode: Production
3. Sube este zip por el Administrador de archivos y descomprímelo
   en esa carpeta. Debe quedar así:

     server.js
     package.json
     INSTALAR-HOSTINGER.txt
     README.txt
     ENV.txt
     lib/
     public/
     data/

4. En la app Node pulsa NPM Install (o SSH: npm install --omit=dev)
5. Arranca la app (Start / Restart).

La app escucha process.env.PORT (Hostinger lo inyecta) en 0.0.0.0.

------------------------------------------------
2. Variables (panel Node.js → Environment)
------------------------------------------------
PORT                  lo pone Hostinger
PUBLIC_URL            https://podiosync.es
STRIKE_API_KEY        clave de dashboard.strike.me  (opcional)
STRIKE_WEBHOOK_SECRET 10–50 caracteres              (opcional)
EMPTY_BOARD           true                          (lanza el ranking vacío)

SIN Strike la app corre en MODO DEMO: el ranking se actualiza sin cobro
real. No se finge un pago de Strike. Perfecto para probar.

CON STRIKE_API_KEY el checkout crea una factura Strike en USD y abre
/pay/<invoiceId> (QR Lightning). El puesto se reclama al volver a
/paid?invoice_id=... (y otra vez, sin duplicar, cuando llega el webhook).
PUBLIC_URL es recomendable; si falta, se toma del host de la petición.

Webhook de Strike:
  URL:  https://podiosync.es/webhook/strike
  Evento: invoice.updated
  Firma: X-Webhook-Signature (HMAC-SHA256)

------------------------------------------------
3. Datos
------------------------------------------------
Los rankings se guardan en data/board.json (se crea solo).
Haz backup de esa carpeta. El primer arranque carga 45 creators de
ejemplo (ficticios) para que el tablero no salga vacío.

Para LANZAR DE VERDAD: EMPTY_BOARD=true y borra data/board.json
si ya se había generado.

------------------------------------------------
4. Dominio
------------------------------------------------
Apunta tu dominio al Node app. Cambia PUBLIC_URL.
El nicho (influencers ES/LATAM) ya está cableado: categorías, países
y plataformas. Edita lib/categories.js y lib/seed.js si quieres
otro vertical.

------------------------------------------------
5. Cómo ganas dinero
------------------------------------------------
Misma palanca que outbid.lol (~$250k en 18 días en el original):
- Mínimo $10 para entrar
- +$5 para quitar el #1
- Los bids no caducan (all-time)
- Hoy / Diario dan recurrencia
- Cero ads, cero revenue share, cero cuentas

Empieza en X/Instagram/TikTok con el #1 barato. El precio solo sube.

Arranca: node server.js
Dev:     PORT=3000 node server.js

# shared

Types en constanten die `server/` en `web/` allebei nodig hebben:
classificaties, de lijst met OpenAI-stemmen, en de vorm van een run, call en
persoon.

`web/` importeert hieruit via de alias `@shared` (zie `web/vite.config.ts` en
`web/tsconfig.json`). `server/` is CommonJS JavaScript en consumeert deze
bestanden nog niet — `server/src/db.js` en `server/src/realtime-bridge.js`
blijven daar de bron van waarheid. Wijzigt daar een kolom of een stem, dan moet
dit pakket mee.

Bestaat om te voorkomen dat de frontend die vormen opnieuw declareert en stil
uit de pas gaat lopen met de server — dat gebeurde in de Retool-app, waar
`frontend/pages/types.ts` een eigen kopie hield.

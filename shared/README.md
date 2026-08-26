# shared

Types en constanten die `server/` en `web/` allebei nodig hebben:
classificaties, de lijst met OpenAI-stemmen, en de vorm van een run, call en
persoon.

Nog leeg. Bestaat om te voorkomen dat de frontend die vormen opnieuw declareert
en stil uit de pas gaat lopen met de server — dat gebeurde in de Retool-app,
waar `frontend/pages/types.ts` een eigen kopie hield.

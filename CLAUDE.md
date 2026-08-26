# Logiville — Sixth Generation Demo

Demo-omgeving voor Sixth Generation. Een launcher met meerdere demo's, waarvan de
Workforce Call Agent de enige is met een echte backend: die belt werknemers op,
voert in het Nederlands een gesprek over shift-beschikbaarheid, en classificeert
het antwoord.

## Structuur

```
server/    Node/Express + WebSocket. Live op Railway. Draait in productie.
web/       Vite + React frontend. Migratie uit Retool — nog leeg.
shared/    Types en constanten die server en web delen — nog leeg.
```

`server/` draaide tot 26 augustus 2026 als losse repo met de servercode in de
root, onder de naam `Workforce_Call_Trackers`. De repo is nu
`tobesx/logiville-sixth-generation-demo`. GitHub redirect de oude URL, maar
reken daar niet op — en maak nooit een nieuwe repo met de oude naam, want dat
breekt de redirect.

## Server

Vier externe partijen, en het is nooit meteen duidelijk wie een probleem
veroorzaakt. Bij twijfel: eerst de Railway-logs, die zijn uitgebreid.

| Bestand | Rol |
|---|---|
| `src/server.js` | Express, REST-routes, Twilio-webhooks, WebSocket-upgrade |
| `src/orchestrator.js` | Start één uitgaande call via Twilio |
| `src/realtime-bridge.js` | Twilio ↔ OpenAI Realtime. Het zwaarste bestand |
| `src/call-handler.js` | Twilio statuswebhook + machinedetectie |
| `src/db.js` | Postgres-pool, schema, CRUD |
| `src/sessions.js` | In-memory `Map` van callSid naar persoon |

### Belflow

1. `POST /api/outbound/call` zet de persoon in de sessiestore, vraagt Twilio te bellen
2. Twilio belt; bij opnemen `POST /voice/start` → TwiML met `<Connect><Stream>`
3. WebSocket op `/media-stream`; audio stroomt als `pcmu` naar OpenAI en terug
4. Het model roept `classify_response` aan — zonder daarbij te spreken
5. De server schrijft naar Postgres en vraagt een **losse** audio-response voor de afsluiting
6. Pas als die is uitgesproken gaat er een Twilio `mark` genaamd `hangup` de stream in
7. Twilio echoot die mark terug wanneer de audio écht is afgespeeld → ophangen

Stap 5 en 6 zijn niet willekeurig. Een Realtime-response die een function call
bevat, bevat géén audio. Wie de afsluiting in dezelfde response probeert te
krijgen, krijgt stilte en hangt op voordat er iets gezegd is.

### Regels die je niet moet omkeren

- **Het model classificeert zonder te spreken.** De afsluiting komt uit een
  aparte `response.create` met `tool_choice: 'none'`. Laat het model beide doen
  en je krijgt twee afsluitingen over elkaar.
- **Ophangen gebeurt op `response.output_audio.done`**, en alleen als het
  `response_id` verschilt van dat van de function call. Anders knipt de
  audio-loze function-call-response het gesprek af.
- **Voicemail wordt in code herkend, niet door het model.** Het model komt pas
  aan zet als de VAD de beurt afsluit, en een voicemail praat gewoon door. De
  patronen in `VOICEMAIL_PATTERNS` staan bewust smal: `"ik ben niet
  beschikbaar"` is een werknemer die NEE zegt, geen antwoordapparaat.
- **Twilio's eigen machinedetectie is onbetrouwbaar gebleken** — die meldde
  `human` op een echte voicemail. Blijft aan voor klassieke antwoordapparaten,
  maar vertrouw er niets kritisch op.
- **`rawResponse` is een letterlijk citaat.** Stond dat ooit als "samenvatting"
  omschreven, en toen verzon het model antwoorden die nooit gegeven waren.

### Sessiestore

`src/sessions.js` is een `Map` in het procesgeheugen. Gevolgen:

- Een deploy midden in een belronde breekt lopende calls af
- De service kan **niet** naar meerdere replica's schalen — Twilio levert de
  WebSocket dan mogelijk bij de verkeerde instantie af

## Railway

Twee dingen die al een keer productie hebben platgelegd:

**Root Directory.** Sinds de herstructurering staat de servercode in `server/`.
De Railway-service moet Root Directory op `server` hebben staan. Anders vindt
de build geen `package.json`.

**Poort.** Zet `PORT` **niet** als variabele. Railway injecteert 8080, en de
doelpoort van het domein moet daarmee overeenkomen. Een mismatch geeft 502 met
header `x-railway-fallback: true`, terwijl de container prima draait. De
opstartlog verraadt de echte poort.

**`BASE_URL`** moet de publieke domeinnaam zijn, mét `https://`, zonder slash op
het eind. De `wss://`-URL voor de audiobrug wordt eruit afgeleid, dus een fout
hier laat calls wel starten maar de audio stilvallen.

`DATABASE_URL` hoort een referentie naar de Postgres-service te zijn
(`${{Postgres.DATABASE_URL}}`), geen gekopieerde string.

## Frontend-migratie

De bron is de Retool R2-app `Sixth Generation - Logiville Demo Launcher - Toby`
(`5ec46a2a-9fab-11f1-854a-e74093bef73e`), uit te lezen via de Retool MCP-tools.
Ongeveer 9.000 regels over 52 bestanden.

Wat er speelt:

- De hele Retool-koppeling is één regel in `/backend/ico/apiClient.ts`. De vier
  functies eronder zijn samen 130 regels en worden een `fetch`-client.
- `App.tsx` gebruikt al React Router; routing verhuist ongewijzigd.
- Van de vier demo's in `demos.ts` zijn er twee echt gebouwd: Workforce Call
  Agent en Demand Forecasting.
- `Planning.tsx`, `People.tsx` en `ico.css` zitten niet in de routes en zijn
  vermoedelijk vervangen door `WorkforceCallAgent.tsx`. Verifiëren voor je ze
  weggooit.
- De Base URL van de backend staat in de Retool resource-config, niet in code.
  Die moet naar `VITE_API_BASE_URL`.
- `PasswordGateModal.tsx` is een demo-poort, geen authenticatie.

Multi-tenant is buiten scope. Er bestaan drie andere gebrande varianten in
Retool (Get Driven, Port Of Antwerp, en een losse Sixth Generation Call Agent);
die blijven waar ze zijn.

## Openstaand

- **De API heeft geen authenticatie** en `cors()` draait zonder opties. Wie de
  Railway-URL kent kan telefoongesprekken starten naar willekeurige nummers.
  Dit moet gedicht zijn voordat de Retool-app uitgaat, want Retool levert nu de
  enige toegangscontrole die er is.
- Twilio-webhooks worden niet geverifieerd; de SDK heeft `validateRequest`.
- De werknemerslijst zit als seed-data in de frontend. Er komt een `people`-tabel.
- Het Twilio-nummer wijst voor inkomende calls nog naar een dode host.

## Werkwijze

- Schrijf in het Nederlands tegen de gebruiker; code en commits in het Engels.
- Push niet zonder dat erom gevraagd is. Railway deployt automatisch vanaf `main`.
- Test wijzigingen aan de belflow met een echte call — de logs zijn de enige
  betrouwbare bron. Unit tests bestaan niet.

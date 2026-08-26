# web

Vite + React frontend, gemigreerd uit de Retool R2-app
`Sixth Generation - Logiville Demo Launcher - Toby`
(`5ec46a2a-9fab-11f1-854a-e74093bef73e`).

## Draaien

```bash
npm install
cp .env.example .env.local   # vul VITE_API_BASE_URL in
npm run dev
```

`VITE_API_BASE_URL` is de basis-URL van `server/`, zonder slash op het eind.
Lokaal `http://localhost:3001`, anders de Railway-URL. Zonder die variabele
gooit `src/lib/api.ts` een fout zodra er een echte call gestart wordt; de
gesimuleerde demo blijft wel werken.

`npm run build` draait eerst `tsc --noEmit` en dan `vite build`.

## Structuur

```
src/App.tsx           React Router-routes (Launcher + twee gebouwde demo's)
src/lib/api.ts        fetch-client voor server/ — verving de Retool REST-resource
src/lib/shadcn/       shadcn/ui-componenten — Retool leverde deze zelf aan
src/pages/            Launcher, WorkforceCallAgent, ForecastDetail, Planning, People
src/pages/ui/         Losse componenten van de Workforce Call Agent
src/pages/forecast/   Demand Forecasting
```

De gedeelde types komen uit `../shared` via de alias `@shared`; die staat in
`vite.config.ts` én `tsconfig.json` en heeft `server.fs.allow: ['..']` nodig
omdat `shared/` buiten de Vite-root ligt.

## Wat waar zit

- **`ENABLE_LIVE_CALLS`** staat boven in `src/pages/WorkforceCallAgent.tsx`.
  Staat die op `true`, dan gaan de personen met een aangevinkte *live call* door
  de echte backend; de rest blijft gesimuleerd.
- **De demo-poort** is `PasswordGateModal` met wachtwoord `admin`. Dat is een
  drempel voor op de beursvloer, geen authenticatie.
- **De werknemerslijst** is seed-data in `src/pages/workers.ts` en
  `src/pages/mockPeople.ts`, met een localStorage-overlay. Er komt een
  `people`-tabel.
- **`Planning.tsx`, `People.tsx` en `components/StarterCanvas.tsx`** zitten niet
  in de routes. Ze zijn bewust meegemigreerd zodat de Retool-app compleet
  overkomt; opruimen is een aparte stap.

## Railway

Nog niet gedeployed. Als het zover is: eigen service met Root Directory `web`,
build `npm run build`, start `npm run preview -- --port $PORT`. Zet `PORT` niet
zelf als variabele — Railway injecteert die, en een mismatch geeft 502 met
header `x-railway-fallback: true`. Zie `CLAUDE.md` in de root.

**Let op:** `server/` heeft nog geen authenticatie. Zolang dat zo is, mag `web/`
niet publiek staan — Retool leverde tot nu toe de enige toegangscontrole.

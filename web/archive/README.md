# Archief

Twee demo's die uit de app zijn gehaald en teruggezet op het "coming soon"-scherm
(`DemoPlaceholder`), samen met de gedeelde rondleidingsschil die alleen zij
gebruikten. De code is niet weggegooid — dit is waar hij wacht op de echte
implementatie.

| Map | Was |
|---|---|
| `pages/ForecastDetail.tsx` + `pages/forecast/` | Demand Forecasting |
| `pages/ProductionPlanning.tsx` + `pages/planning/` | Smart Production Planning |
| `pages/ui/TourOverlay.tsx` | rondleidingsschil; had alleen die twee als gebruiker |

De Workforce Call Agent gebruikt een eigen rondleiding (`src/pages/ui/PlanningTour.tsx`)
en staat hier los van.

## Terugzetten

De mappenstructuur is een spiegel van `src/`, dus terugzetten is een verhuizing
zonder importwijzigingen:

```bash
git mv web/archive/pages/ForecastDetail.tsx web/src/pages/ForecastDetail.tsx
git mv web/archive/pages/forecast web/src/pages/forecast
git mv web/archive/pages/ProductionPlanning.tsx web/src/pages/ProductionPlanning.tsx
git mv web/archive/pages/planning web/src/pages/planning
git mv web/archive/pages/ui/TourOverlay.tsx web/src/pages/ui/TourOverlay.tsx
```

Daarna in `src/App.tsx` de twee routes terugzetten die nu in `demo/:slug` vallen:

```tsx
<Route path="demo/demand-forecasting" element={<ForecastDetail />} />
<Route path="demo/smart-production-planning" element={<ProductionPlanning />} />
```

## Waarom buiten `src/`

`tsconfig.json` compileert alleen `src`, `../shared` en `vite.config.ts`. Hier
staat de code dus buiten het bereik van de typecheck en de bundel. Dat betekent
ook: **wijzigingen in gedeelde code worden hier niet gecontroleerd.** Verandert er
iets aan `@shared`, `lib/shadcn/utils` of `pages/ico.css`, dan merk je dat pas bij
het terugzetten.

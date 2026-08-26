# Logiville — Sixth Generation Demo

Demo-omgeving voor Sixth Generation: een launcher met meerdere demo's, waarvan
de Workforce Call Agent een echte backend heeft die werknemers opbelt om
shift-beschikbaarheid te bevestigen.

```
server/   Node/Express + WebSocket — Twilio, OpenAI Realtime, Postgres
web/      Vite + React frontend
shared/   Gedeelde types en constanten
```

`server/` draait live op Railway en is in productie. `web/` is uit Retool
gehaald en draait lokaal; deployen kan pas als de API authenticatie heeft.

Zie [CLAUDE.md](CLAUDE.md) voor de architectuur, de belflow, en de
Railway-instellingen die niet vanzelf spreken.

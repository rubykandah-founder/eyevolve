# EYEVOLVE

EYEVOLVE is a lightweight prototype for **"The App that Builds Itself"**: a
simulated satellite-monitoring interface where user judgment creates the
automation.

The core product claim is:

> The user does not configure the automation. Their use of EYEVOLVE creates it.

## What It Demonstrates

EYEVOLVE implements an autocatalytic loop:

1. **Observe** a before/after satellite-style scene.
2. **Analyze** the scene with OpenAI, when available, to populate change events.
3. **Measure** human ranking, intervention choices, or AI judgment.
4. **Plan** simulated next steps with OpenAI for calls, tickets, watch states, or verification.
5. **Learn** separate attention and actionability policies.
6. **Evolve** with bounded OpenAI policy proposals and AI-written generation summaries.
7. **Rewrite** one whitelisted generated source file with learned behavior rules.
8. **Persist** the evolved state in browser `localStorage`.

For the “Evolve” requirement, EYEVOLVE’s designated self-changing subsystem is
its policy layer: attention weights, action weights, uncertainty, trust,
autonomy, scenario choice, and interface mode change from use. It also has a
literal source-evolution lane: after generations complete, the server may update
only `src/generated/eyevolve-learned-rules.ts` with validated learned rules.

The app remains demo-safe: if OpenAI is unavailable, it automatically continues
with its deterministic local evolution engine.

## Quick Start

Install dependencies:

```txt
npm install
```

Create `.env.local` in the repo root:

```txt
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-terra
```

`OPENAI_MODEL` is optional. If omitted, the server route defaults to
`gpt-5.6-terra`.

Start the app:

```txt
npm run dev
```

Open the printed local URL, usually:

```txt
http://localhost:3000
```

## OpenAI Key Safety

The API key is used only by server routes:

```txt
src/app/api/analyze-scene/route.ts
src/app/api/action-plan/route.ts
src/app/api/evolve/route.ts
src/app/api/generation-summary/route.ts
src/app/api/source-evolution/route.ts
```

Do **not** use `NEXT_PUBLIC_OPENAI_API_KEY`. Public environment variables are
exposed to the browser.

`.env.local` is ignored by git. A safe template is provided in `.env.example`.

## Persistence

No database is used. The full evolving session is stored in the browser under:

```txt
localStorage["eyevolve.state.v1"]
```

Use **Reset evolution** in the UI to delete that state and return to Generation 1.

## Useful Docs

- [Vision](./VISION.md): product thesis and design rationale.
- [Architecture](./docs/ARCHITECTURE.md): state model, learning loop, OpenAI route, and file map.
- [Demo Guide](./docs/DEMO.md): 60-90 second walkthrough and reset instructions.
- [Implementation Notes](./docs/IMPLEMENTATION_NOTES.md): scope, tradeoffs, and known limitations.
- [Production Readiness](./docs/PRODUCTION_READINESS.md): public demo checklist and API-key safety.

## Scripts

```txt
npm run dev
npm run test
npm run build
npm run start
```

## Demo Path

1. Start fresh or click **Reset evolution**.
2. Generation 1: rank the road obstruction and swerving traffic above cloud/shadow noise.
3. Select an intervention for the roadway obstruction.
4. Continue through the evolution transition and point out policy diffs.
5. Generation 2: rank the unattended fire highest and select intervention.
6. Continue into AI review, exception management, and autonomous behavior as autonomy is earned.

The important moment is not that AI appears once. It is that every interaction
changes what EYEVOLVE surfaces, recommends, trusts, and observes next.

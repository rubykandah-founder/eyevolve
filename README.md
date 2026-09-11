# EYEVOLVE

EYEVOLVE is a lightweight prototype for "The App that Builds Itself": a
simulated satellite-monitoring interface where user judgment creates the
automation.

The app demonstrates an autocatalytic loop:

1. Observe a before/after satellite-style scene.
2. Measure human ranking and intervention choices.
3. Learn separate attention and actionability policies.
4. Ask OpenAI for bounded policy-delta proposals when available.
5. Update confidence, uncertainty, autonomy, and UI mode.
6. Persist the evolved state in `localStorage`.

## Setup

```txt
npm install
```

Create `.env.local` if you want OpenAI-assisted evolution:

```txt
OPENAI_API_KEY=your_key_here
```

Optionally choose a model:

```txt
OPENAI_MODEL=gpt-5-mini
```

Then run:

```txt
npm run dev
```

Open the printed local URL. If no OpenAI key is present, EYEVOLVE continues with
its deterministic local evolution engine.

## Persistence

No database is used. The full evolving session is stored in the browser under:

```txt
localStorage["eyevolve.state.v1"]
```

Use `Reset evolution` in the UI to return to Generation 1.

## What to Demo

Start fresh, rank the road obstruction above visual noise, select an
intervention, and continue. Repeat with the unattended fire. After the training
scenes, EYEVOLVE starts ranking, filtering, and selecting scenarios from learned
policy and uncertainty.

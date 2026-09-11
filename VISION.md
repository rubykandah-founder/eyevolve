# EYEVOLVE Vision

EYEVOLVE exists to make one product idea obvious:

> The user does not configure the automation. Their use of the product creates it.

## Product Premise

EYEVOLVE is a simulated satellite intelligence application. It compares a
location at two moments, `T0 / BEFORE` and `T1 / AFTER`, detects semantic
changes, and learns which changes humans care about.

The experience progresses from:

```txt
Observation -> Decision Support -> Recommendation -> Exception Management -> Autonomous Agent
```

## Autocatalytic Loop

The application loop is:

```txt
Satellite observation
-> OpenAI scene analysis
-> Change data
-> Current policy scores changes
-> Human or AI judgment
-> Interaction measured
-> OpenAI action planning when action is needed
-> Local policy learns
-> OpenAI interprets bounded evolution
-> Bounded deltas validated and applied
-> OpenAI summarizes practical learning
-> Confidence and uncertainty update
-> Autonomy updates
-> UI mode changes
-> Next learning scenario selected
-> State persists
```

Every generation becomes the baseline for the next generation.

## What Evolves

EYEVOLVE does not rewrite its source code. For this prototype, evolution means:

- Attention weights change what the system surfaces.
- Action weights change what it recommends doing.
- Confidence and human agreement change autonomy.
- Corrections can lower trust and autonomy.
- Uncertainty changes which observation EYEVOLVE selects next.
- Autonomy changes the interface itself.
- High autonomy enables simulated action.

This was chosen instead of source-code rewriting because it is more legible,
more stable for a take-home demo, and easier for a reviewer to inspect.

## Attention vs. Action

EYEVOLVE deliberately learns two different questions:

- **Attention:** should this change matter?
- **Actionability:** should EYEVOLVE do something?

That distinction is the heart of the product. Cloud movement can be detectable
but ignorable. Wildlife proximity can deserve attention without immediate
intervention. A blocked road can be both attention-worthy and actionable.

## OpenAI's Role

The deterministic learner keeps the app stable and debuggable. OpenAI
participates materially by analyzing scene changes, deciding which events to
suppress or highlight, planning simulated actions, writing generation summaries,
and proposing small bounded policy deltas, learned rules, and next-learning
objectives.

The application remains authoritative:

- It validates the response.
- It clamps each delta.
- It applies state changes locally.
- It recalculates autonomy and uncertainty.
- It persists the result in the browser.

If OpenAI is unavailable, the local evolution engine continues the same loop.

## Design Direction

The visual language is light mission-control minimalism: bright surfaces, thin
borders, subtle map grid, compact telemetry, restrained animation, and clear
hazard colors. The interface should feel like a serious future geospatial
product rather than a game.

## What Comes Next

With more time, EYEVOLVE could add richer scene libraries, deeper policy
inspection, exportable incident reports, team review, and real geospatial
ingestion. The core idea should stay the same: meaningful use changes what the
system becomes.

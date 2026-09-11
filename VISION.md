# EYEVOLVE Vision

EYEVOLVE exists to make one product idea obvious: the user does not configure
automation; their use of the product creates it.

## Autocatalytic Loop

EYEVOLVE simulates a satellite intelligence workflow. Each observation contains
known semantic changes. The user initially ranks those changes and decides which
ones deserve intervention. Those choices update persisted policy state.

The loop is:

```txt
Satellite observation
-> Change data
-> Current policy scores changes
-> Human or AI judgment
-> Interaction measured
-> Local policy learns
-> OpenAI interprets bounded evolution
-> Confidence and uncertainty update
-> Autonomy updates
-> UI mode changes
-> Next learning scenario selected
-> State persists
```

## What Evolves

EYEVOLVE does not rewrite its source code. For this prototype, evolution means:

- Attention weights change what the system surfaces.
- Action weights change what it recommends doing.
- Confidence and human agreement change autonomy.
- Uncertainty changes which scene EYEVOLVE chooses next.
- Autonomy changes the interface from manual ranking to exception management to
  simulated autonomous action.

## Why This Architecture

The prototype intentionally avoids databases, auth, real satellite APIs, real
computer vision, and phone integrations. Those would obscure the product loop.

The deterministic learner makes the demo stable and inspectable. The OpenAI
Responses API participates materially by proposing bounded policy deltas and
learned rules, but the application remains authoritative: it validates, clamps,
applies, and persists every change.

## Learning Mechanics

EYEVOLVE separates two questions:

- Attention: should this change matter?
- Actionability: should EYEVOLVE do something?

Human ranking trains attention through a small online update. Human intervention
choices train actionability. Corrections reduce trust and can lower autonomy.
Accepted AI judgments increase trust and reduce uncertainty.

## What Comes Next

With more time, EYEVOLVE could add richer scene libraries, team-review mode,
exportable incident reports, deeper policy inspection, and real geospatial
ingestion. The core idea would stay the same: meaningful use should change what
the system becomes.

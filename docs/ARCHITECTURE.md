# Architecture

EYEVOLVE is a small Next.js App Router application. It intentionally avoids
databases, auth, real satellite imagery, real maps, real computer vision, and
real telephony.

## Runtime Shape

```txt
Browser React app
-> localStorage persistence
-> /api/analyze-scene
-> /api/action-plan
-> /api/evolve
-> /api/generation-summary
-> OpenAI Responses API, when OPENAI_API_KEY exists
```

The browser is authoritative for the evolving session. Server memory is never
used as persistence.

## Important Files

- `src/app/page.tsx`: main client app, state transitions, evolution loop.
- `src/app/api/analyze-scene/route.ts`: AI scene-delta interpretation and fallback.
- `src/app/api/action-plan/route.ts`: AI simulated action planning and fallback.
- `src/app/api/evolve/route.ts`: bounded policy proposal integration and fallback.
- `src/app/api/generation-summary/route.ts`: AI generation-complete narrative and fallback.
- `src/prompts/*.md`: editable prompts for the four AI flows.
- `src/lib/server/openai-json.ts`: shared server-only structured JSON helper.
- `src/lib/types.ts`: shared state, scene, policy, and API types.
- `src/lib/scenes.ts`: predefined satellite observation library.
- `src/lib/scoring.ts`: attention, action, and ignore scoring.
- `src/lib/learning.ts`: online learning, bounded proposal application, uncertainty updates.
- `src/lib/autonomy.ts`: confidence/agreement/autonomy mode calculations.
- `src/lib/scenario-selector.ts`: uncertainty-driven next-scene selection.
- `src/lib/storage.ts`: `localStorage` load/save/reset.

## Persisted State

The app stores one object:

```ts
type EyevolveState = {
  version: number
  policy: EyevolvePolicy
  currentSceneId: string
  seenSceneIds: string[]
  interactionHistory: InteractionEvent[]
  evolutionHistory: EvolutionEvent[]
  currentMode: "human" | "ai-review" | "exception-management" | "autonomous"
}
```

Storage key:

```txt
localStorage["eyevolve.state.v1"]
```

## Policy Model

EYEVOLVE separates attention from actionability:

```ts
type EyevolvePolicy = {
  generation: number
  attentionWeights: FeatureWeights
  actionWeights: FeatureWeights
  actionThreshold: number
  ignoreThreshold: number
  confidence: number
  autonomy: number
  observationsSeen: number
  judgmentsObserved: number
  aiAgreements: number
  aiCorrections: number
  uncertaintyByDimension: FeatureWeights
  learnedRules: LearnedRule[]
}
```

Feature dimensions:

```txt
humanSafety
urgency
infrastructure
environmental
behavioral
visualNoise
wildlifeProximity
```

## Scoring

Each detected change carries semantic features. The current policy scores those
features:

```txt
attentionScore = dot(change.features, policy.attentionWeights)
actionScore    = dot(change.features, policy.actionWeights)
```

Visual noise reduces attention. Ignore behavior uses:

```txt
ignoreScore = visualNoiseWeight * features.visualNoise - attentionScore * 0.5
ignored     = ignoreScore >= ignoreThreshold
```

## Learning

Human ranking trains attention with a tiny online learner:

```txt
targetImportance = rank position mapped from 1.0 to 0.0
error = targetImportance - attentionScore(change)
attentionWeights[d] += learningRate * error * change.features[d]
```

Human intervention choices train actionability:

```txt
targetActionability = 1 if selected for intervention, otherwise 0
error = targetActionability - actionScore(change)
actionWeights[d] += learningRate * error * change.features[d]
```

Weights are always clamped to `0-1`.

## OpenAI Flows

The browser never calls OpenAI directly. Server routes call the Responses API
only when `OPENAI_API_KEY` exists.

OpenAI participates in four places:

- Scene analysis: after both satellite mosaics load, the model selects and
  labels detected changes, primary event, and suppressed events from the
  predefined scene candidates.
- Action planning: the model chooses a safe simulated next step, such as watch,
  verify, ticket, notify, or escalate, and writes the animated steps/transcript.
- Policy evolution: the model proposes bounded attention/action deltas.
- Generation summary: the model writes the popup explanation in practical terms.

The policy-evolution route does not return full app state. It returns bounded
proposals:

```ts
type EvolutionProposal = {
  proposedPolicyDeltas: {
    attention?: Partial<FeatureWeights>
    action?: Partial<FeatureWeights>
  }
  learnedRule?: string
  nextLearningObjective?: string
  nextScenarioType?: string
  reasoningSummary: string
}
```

Every delta is validated and clamped to `[-0.08, 0.08]` before being applied.
Scene analysis, action planning, and generation summaries are also validated
server-side. If any request fails, the app uses deterministic local output.

## Autonomy

Autonomy is earned through evidence and agreement:

```txt
autonomy =
  0.10
  + 0.20 * evidence
  + 0.35 * agreementRate
  + 0.35 * confidence
  - 0.20 * correctionRate
```

Repeated correction can lower autonomy.

## UI Modes

The UI mode comes from autonomy, not generation number:

```txt
0.00-0.35  Human learning
0.35-0.70  AI review
0.70-0.90  Exception management
0.90-1.00  Autonomous
```

This means the app can fail to earn more autonomy if the user keeps correcting
it, which is an important part of the demo.

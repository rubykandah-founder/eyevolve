# EYEVOLVE Submission Summary

EYEVOLVE is a simulated satellite-monitoring application built to demonstrate
the take-home prompt: **"The App that Builds Itself."**

## One-Sentence Pitch

EYEVOLVE learns automation from use: as a human ranks satellite changes and
chooses interventions, the app evolves its policy, interface, autonomy, and next
observation.

## Testable Link

[https://eyevolve.vercel.app/](https://eyevolve.vercel.app/)

## What to Look For

- The user starts in manual training mode.
- Human ranking updates learned attention weights.
- Human intervention choices update learned actionability weights.
- OpenAI proposes bounded evolution deltas through `/api/evolve`.
- The app validates and clamps those deltas before applying them.
- Confidence, agreement, uncertainty, and autonomy visibly change.
- Higher autonomy changes the UI from manual controls to exception management.
- At high autonomy, EYEVOLVE performs a clearly simulated dispatch action.
- The transition screens and compact evolution log make the loop inspectable.
- The evolved session persists in browser `localStorage`.

## Why This Counts as Evolution

EYEVOLVE does not simply move through hard-coded levels. Scene order begins with
two training examples, then future observations are selected from learned
uncertainty. The same interaction history changes:

- What the app ranks highly.
- What the app suppresses as noise.
- What the app considers actionable.
- How much autonomy the app is allowed to exercise.
- Which interface mode the user sees.
- Which learning problem the app selects next.

## Setup

```txt
npm install
```

Create `.env.local`:

```txt
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-terra
```

Then run:

```txt
npm run dev
```

If no API key is present, the app still runs with its local deterministic
evolution engine.

## Recommended Demo

1. Click **Reset evolution**.
2. Rank roadway obstruction and swerving traffic above visual noise.
3. Mark the roadway hazard as actionable.
4. Show the policy transition.
5. Rank unattended forest fire highest and select intervention.
6. Let EYEVOLVE enter AI review.
7. Accept or correct the AI judgment.
8. Show trust/autonomy changing.
9. Continue to exception management and autonomous simulated dispatch.

## Intentional Non-Goals

No database, auth, real satellite imagery, maps, computer vision, Twilio,
emergency integrations, source-code rewriting, LangChain, or multi-agent
frameworks. The prototype focuses on making the learning/evolution loop obvious.

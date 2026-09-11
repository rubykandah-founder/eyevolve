# Implementation Notes

## Scope

EYEVOLVE is optimized for a polished take-home prototype, not production
geospatial operations.

Implemented:

- Next.js App Router app.
- SVG satellite-style scene renderer.
- Ten predefined data-driven scenes.
- Tile acquisition animation.
- AI scene analysis after both mosaics finish loading.
- Human ranking and intervention controls.
- Attention and action learning.
- OpenAI Responses API routes with structured JSON.
- Bounded policy deltas and deterministic fallback.
- AI action plans for simulated calls, tickets, watch states, and verification.
- AI generation-complete summaries.
- Uncertainty-driven next-scene selection.
- Autonomy-driven UI modes.
- Evolution transition, activity trace, compact evolution log, and history.
- Simulated dispatch call.

Intentionally not implemented:

- Database.
- Authentication.
- Real satellite imagery.
- Real map provider.
- Computer vision.
- Real emergency calls or Twilio.
- Source-code rewriting.
- LangChain or multi-agent frameworks.

## OpenAI Behavior

OpenAI is used during the normal demo path for scene analysis, action planning,
bounded policy evolution, and generation summaries.

Every OpenAI call is deliberately bounded. The model can interpret scene changes,
choose simulated next steps, write a transcript/ticket log, and propose small
policy deltas, but it cannot replace `EyevolveState`.

If OpenAI fails for any reason, the server returns local analysis, planning,
evolution, or summary output so the demo continues without a visible error.

## Current Model Recommendation

Use:

```txt
OPENAI_MODEL=gpt-5.6-terra
```

That model is a good fit for this prototype because the task needs reliable
structured JSON and concise judgment, not maximal reasoning.

## Known Limitations

- SVG scenes are intentionally symbolic, not realistic.
- There is no visual regression test suite.
- The online learner is intentionally simple and demo-oriented.
- The OpenAI schema expects every feature delta field to be present.
- Autonomy thresholds are tuned for a short demo path.

## Validation

Run:

```txt
npm run build
```

Then manually walk through:

1. Reset state.
2. Submit road training judgment.
3. Submit campsite fire judgment.
4. Accept or correct AI review.
5. Confirm exception-management behavior.
6. Confirm autonomous simulated action.

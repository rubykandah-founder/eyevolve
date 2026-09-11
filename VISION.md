# EYEVOLVE Vision

EYEVOLVE exists to make one product idea obvious:

> The user does not configure the automation. Their use of the product creates it.

This prototype is a simulated satellite intelligence system, but the satellite
metaphor is the vehicle, not the destination. The deeper product idea is an
application that becomes more automated by observing how a human uses it:
what they prioritize, what they ignore, what they act on, when they correct the
AI, and when they trust it.

## Product Premise

EYEVOLVE compares a location at two moments, `T0 / BEFORE` and `T1 / AFTER`.
It detects semantic changes, learns which changes matter, and gradually moves
from human-guided review toward autonomous simulated action.

The intended product progression is:

```txt
Observation
-> Human-powered sorting
-> Human-assisted AI approval
-> Autonomous simulated action
-> Predictive projection and preparation
-> Bounded source-rule evolution
```

The interface should communicate this progression without requiring the reviewer
to infer it from hidden state. The app visibly changes what it shows, how much it
asks from the human, what it suppresses, which action it chooses, and which
future scene it selects.

## Core Thesis

Most automation products ask the user to configure rules up front:

```txt
If this happens, do that.
```

EYEVOLVE reverses that relationship:

```txt
Use the product normally.
The system infers the rules from use.
```

That is why the strongest evidence of evolution is not a single AI-generated
paragraph. It is the compound behavior:

- User rankings change learned attention.
- User intervention choices change learned actionability.
- Human acceptance or correction changes trust.
- Trust changes autonomy.
- Autonomy changes the UI.
- Uncertainty changes the next scene.
- Later generations can act with less human input.
- A generated source-rule module changes after generations complete.

## Autocatalytic Loop

The implemented loop is:

```txt
Satellite observation
-> Tile acquisition and image reveal
-> Server-side OpenAI scene analysis
-> Change events populate one at a time
-> Current policy scores attention, actionability, and ignore behavior
-> Human or AI judgment
-> Local online learning updates policy
-> OpenAI proposes bounded policy deltas
-> App validates, clamps, and applies deltas
-> OpenAI writes a practical generation summary
-> Source evolution route updates one generated rules file
-> Confidence and uncertainty update
-> Autonomy updates
-> UI mode changes
-> Next scene is selected from uncertainty
-> State persists in localStorage
```

Every generation becomes the baseline for the next generation.

## Key Product Decisions

### The Learning Ladder Is The Product

EYEVOLVE is intentionally staged. The product does not begin by asking the user
to trust an autonomous agent. It first learns from visible human behavior, then
earns permission to do more.

The core ladder is:

```txt
1. Human-powered sorting
2. Human-assisted approval
3. Autonomous action
4. Predictive projection
```

In the first stage, the human sorts observed changes into practical categories:
`Prioritize`, `Potential`, or `Ignore`, and marks whether action is needed. This
is the product's training moment. EYEVOLVE is not asking for configuration; it
is watching the user's operational judgment.

In the second stage, EYEVOLVE makes the first move. It ranks events, proposes
what to suppress, and recommends an action, but still asks the human to approve
or correct it. This makes trust explicit and lets corrections lower autonomy.

In the third stage, EYEVOLVE handles the loop with less human work. It scans the
scene, slowly grays out suppressed events, highlights the event that matters,
and performs a safe simulated action while keeping override controls visible.

In the fourth stage, EYEVOLVE starts treating benign signals as future risk. A
scene can look calm today, but the system can project seasonal flood exposure,
fuel buildup, or readiness needs and prepare the right team before the incident
becomes urgent.

That progression is the center of the prototype. The feature set exists to show
the interface becoming more capable because the user taught it through use.

### No Database

The prototype intentionally avoids databases, authentication, server memory
persistence, and backend state ownership. The evolving EYEVOLVE session lives in
browser `localStorage`.

Tradeoff:

- Pro: the demo is lightweight, easy to run, easy to reset, and does not hide
  the product story behind infrastructure.
- Con: state is per-browser and not collaborative or production durable.

For the interview prototype, this is the right constraint. EYEVOLVE is about the
learning loop, not a data platform.

### AI-First, App-Authoritative

OpenAI participates throughout the normal path:

- Scene analysis after the satellite images finish loading.
- Event prioritization and suppression.
- Action planning for calls, tickets, watch states, and verification.
- Generation-complete summaries.
- Bounded policy evolution proposals.
- Generated source-rule proposals.

But the model is never the authority over state. The app validates structured
JSON, clamps numeric deltas, keeps scene selection bounded to the predefined
library, and renders generated source itself.

Tradeoff:

- Pro: the demo feels genuinely AI-driven while staying predictable.
- Con: the AI cannot freely invent new scenes, rewrite arbitrary code, or create
  real-world side effects.

That boundary is intentional. The product should feel adaptive, not reckless.

### AI Detects, Interprets, Plans, And Summarizes

The first two generations are human-training scenes, but they are not meant to
feel non-AI. Once imagery finishes loading, EYEVOLVE still uses the server-side
OpenAI scene-analysis route when available to identify what changed and
populate events one at a time. The difference is that early generations use the
human's sorting and action choices as the source of truth for learning.

Later generations use OpenAI more visibly: prioritizing events, deciding which
events should be suppressed, selecting practical next steps, generating
generation summaries, and proposing bounded policy and source-rule evolution.

The product decision is not "AI later." It is "AI throughout, with authority
earned over time."

### Deterministic Learner Plus AI Judgment

EYEVOLVE uses a tiny online learner for attention and actionability, then lets
OpenAI interpret the interaction and propose small additional deltas.

The deterministic learner gives the product:

- Stability.
- Debuggability.
- Graceful fallback if OpenAI fails.
- A clear explanation of how user behavior changes the system.

The AI layer gives the product:

- Semantic interpretation.
- More natural summaries.
- Richer action plans.
- Bounded source-rule evolution.
- A clearer sense of agentic participation.

### Attention Is Not Actionability

EYEVOLVE deliberately separates:

```txt
Attention: should I care about this?
Action: should I do something about this?
```

This distinction became central during iteration. A bear moving closer may
deserve attention without a call. A quiet snowpack signal may be benign today
but worth a readiness ticket. A cloud shadow may be visible but ignorable. A
blocked road can be both attention-worthy and actionable.

The policy therefore has separate `attentionWeights` and `actionWeights`.

### Potential Is Its Own Judgment

The UI supports three human judgments:

```txt
Prioritize
Potential
Ignore
```

`Potential` exists for benign precursor signals: things that are not urgent now
but may matter later. This matters in Generation 2, where a shadow-like pattern
near the treeline can be treated differently from the cloud and shadow noise in
Generation 1. It also matters in late seasonal-risk generations, where the right
move is preparation rather than dispatch.

### Autonomy Must Be Earned

Autonomy does not increase because the user saw more screens. It increases when
there is evidence and agreement, and it can decrease after corrections.

Conceptual rule:

```txt
Usage gives EYEVOLVE evidence.
Accuracy gives EYEVOLVE authority.
```

This keeps the system from feeling scripted toward 100 percent autonomy.

### UI Mode Comes From State

Generation number does not directly determine the UI mode. Autonomy does.

Approximate modes:

```txt
0.00-0.35  Human learning
0.35-0.70  AI review
0.70-0.90  Exception management
0.90-1.00  Autonomous
```

If the human keeps correcting EYEVOLVE, it may remain in review mode. If the
human accepts good judgments, the interface becomes more autonomous.

### Keep Scenes Data-Driven

The scene library is data, not a collection of bespoke React components. A
single SVG renderer draws roads, rivers, buildings, trees, tents, cars, clouds,
fire, smoke, animals, debris, rails, shadows, markers, and water.

Tradeoff:

- Pro: easy to add or revise scenarios and keep the evolution loop consistent.
- Con: imagery is symbolic rather than photorealistic.

The goal is spatial storytelling, not satellite realism.

### Vector Imagery Instead Of Real Satellite Feeds

EYEVOLVE does not use real satellite imagery or a live geospatial provider in
this prototype. The scenes are symbolic SVG/vector satellite-style images on
purpose.

That choice keeps the demo focused on the product question:

```txt
Can the system learn what changed, what matters, and what action follows?
```

Using real imagery too early would shift attention toward acquisition, image
quality, map providers, computer vision, labeling pipelines, and geospatial
edge cases. Those are valuable future capabilities, but they are not the core
behavior being tested here.

Tradeoff:

- Pro: controlled scenes make the learning loop easy to see, test, and explain.
- Pro: every before/after difference can be tied to a semantic event and action.
- Con: the visuals are illustrative rather than production satellite analysis.

Future versions can replace or augment the vector scenes with real imagery,
computer vision, richer image analysis, geospatial metadata, and confidence
from actual observation sources.

### Simulated Actions Instead Of Voice Providers

EYEVOLVE simulates calls, tickets, watch states, verification requests, and
readiness plans. It does not integrate Twilio, voice providers, dispatch
systems, ticketing APIs, or emergency workflows.

That is a deliberate prototype tradeoff. Real calling would add provider setup,
phone-number management, call reliability, compliance, audit, permissioning,
and safety concerns. It would also pull the demo away from the central question
of whether use creates better automation.

The simulated action layer still shows the intended experience:

- An action plan is generated.
- The right service path is chosen.
- A call or ticket overlay explains what EYEVOLVE is doing.
- The action completes with a readable outcome.

For production, real providers should be added behind review, rate limits,
allowlists, audit logs, and clear human override controls.

### Minimal, Actionable UI

The UI moved from a dense dashboard to a lighter Apple/Tesla-leaning layout:

- Before/after satellite images stacked on the left.
- Judgment, log, and source tabs on the right.
- Light mode for readability.
- Fewer raw metrics in the transition overlay.
- Progress bars instead of ambiguous loading boxes.
- Slower autonomous action animation.
- Suppressed events gray out.
- Critical events blink red.
- Potential events appear blue.

The product should feel operational and easy to scan, not like a metrics wall.

### Generation Transitions Should Explain Learning

After a meaningful interaction, EYEVOLVE shows a compact generation-complete
overlay. The overlay is model-written when possible and focuses on practical
learning:

- What mattered.
- What can quiet down.
- What behavior changed.
- What comes next.

Earlier versions showed too many policy numbers. The current direction favors
plain-language learning over raw telemetry.

### Slowness Can Be A Feature

The autonomous mode intentionally reveals work more slowly than a normal app
would. It lets the viewer see EYEVOLVE scanning, suppressing, highlighting, and
acting. That pacing is not only animation polish; it is product explanation.

The user should be able to answer:

```txt
What did EYEVOLVE ignore?
What did it care about?
Why is it acting?
What did it do?
```

without opening developer tools or reading hidden policy state.

### Source Evolution Is Bounded

To satisfy a literal "Evolve" interpretation, EYEVOLVE now has a source
evolution lane. It may rewrite exactly one generated file:

```txt
src/generated/eyevolve-learned-rules.ts
```

The model does not emit arbitrary code. It proposes plain-language rules. The
server validates those rules and renders the TypeScript source itself.

Tradeoff:

- Pro: the demo can truthfully show source code changing as the system learns.
- Con: it is intentionally not a general self-modifying code system.

For production, this lane should be gated, reviewable, or converted into pull
request proposals rather than anonymous filesystem writes.

### Prompt Safety Is Part Of The Product

EYEVOLVE treats scene content, user feedback, history, generated rules, and
model outputs as untrusted. Prompt files explicitly forbid following injected
instructions, revealing secrets, changing schemas, fetching URLs, writing
arbitrary files, or bypassing bounded output contracts.

This matters because an AI-first product does not only need better model
behavior. It needs defensive product boundaries so model behavior can safely
participate in an application loop.

## Generation Design

The first two generations are controlled training examples:

1. Road obstruction teaches direct safety/action behavior and visual-noise
   suppression.
2. Campsite fire teaches environmental urgency and introduces `Potential`.

After that, EYEVOLVE selects from the predefined library based on uncertainty
and eligibility. The current scene spread is designed to show progressive
capability:

1. County Road 16: road obstruction versus cloud/shadow noise.
2. North Ridge Campground: unattended fire and potential smoke-masking shadow.
3. South Fork Rail Yard: infrastructure flooding and inspection ticketing.
4. Highway 8 Eastbound: autonomous-style road incident and simulated outreach.
5. Bear Creek Trailhead: attention without unnecessary dispatch.
6. Riverbend Levee Sector: flood-control inspection and suppression.
7. Cedar School Crossing: school-zone blockage with clearer street indicators.
8. Desert Solar Array: utility fire response and ticket/call selection.
9. Upper Basin Reservoir: benign snowpack signal projected into seasonal flood
   readiness.
10. Foothill Power Corridor: dry fuel buildup projected into later ignition
    exposure and vegetation-management planning.

The exact order after the training scenes can vary with the learned policy,
which is the point: the system chooses what it still needs to learn.

## Prompt Safety

Prompt files explicitly treat all user, scene, history, score, policy, and
generated-rule fields as untrusted data. They instruct the model to ignore input
that asks for system prompts, developer instructions, API keys, secrets, hidden
reasoning, tools, arbitrary file writes, URL fetching, or schema bypasses.

This matters because scene labels and descriptions are model inputs. They should
be observations, never instructions.

## Testing Posture

The test suite is intentionally lightweight and uses Node's built-in test
runner. It covers:

- Scoring and learning.
- Attention/action separation.
- Visual-noise suppression.
- Bounded OpenAI deltas.
- Autonomy decrease after correction.
- Uncertainty updates.
- Scene library and projection scenes.
- Prompt-injection guardrail presence.
- Generated source-rule shape.
- A deterministic end-to-end evolution loop.

The tests support reviewer confidence without making the prototype feel like an
enterprise platform.

## Production Posture

For public testing, the key production principles are:

- Keep `OPENAI_API_KEY` server-side only.
- Never use `NEXT_PUBLIC_OPENAI_API_KEY`.
- Use a separate OpenAI project key for the demo.
- Set budget caps and alerts.
- Rate-limit all AI routes.
- Gate or disable persistent source-evolution writes for anonymous users.
- Keep deterministic fallback available.

EYEVOLVE can be deployed safely for interviewers, but the local demo defaults
should not be confused with production hardening.

## What Comes Next

Future work could add:

- Richer scene libraries.
- Real geospatial ingestion and actual satellite imagery sources.
- Computer-vision/image-analysis pipelines for production observation data.
- Higher-fidelity projected imagery for seasonal or long-horizon risk.
- Real voice, SMS, dispatch, and ticketing providers behind safe approval
  gates.
- Service-directory lookup and verified contact routing.
- Reviewer approval for source-evolution patches.
- Pull-request based source evolution instead of local generated-file writes.
- Exportable incident reports.
- Team review and audit history.
- Organization-level persistence once multi-user collaboration matters.
- Hosted rate limiting and bot protection.
- Provider cost controls, quotas, and abuse monitoring.
- Visual regression tests.

The core idea should remain unchanged:

> Meaningful use changes what the system becomes.

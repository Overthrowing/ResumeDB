# Frame packet: 08-extension-autofill

## Project inputs

- Project: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo
- Design tokens: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo/frame.md
- RULES_DIR: /Users/nathanye/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 8 - Autofill, then stop

- scene: Extension preflight maps eleven fields, then the empty synthetic ATS fills in before the cursor deliberately stops above Submit.
- voiceover: "After approval, the extension scans the application, previews each mapping, uploads the tailored resume, and fills the ATS. It stops before Submit."
- duration: 8.8s
- poster: 9s
- transition_in: blur-crossfade
- status: built
- src: compositions/frames/08-extension-autofill.html
- type: feature_showcase
- persuasion: Friction reduction plus risk reversal
- beat: momentum with control
- blueprint: cursor-ui-demo - preflight, fill, and deliberate stop shown as one continuous interaction
- asset_candidates: assets/13-extension-preflight-live.png - extension with eleven mapped fields and zero blockers; assets/09-ats-empty.png - empty synthetic ATS; assets/10-ats-filled.png - ATS after approved fields are filled; assets/11-ats-profile-answers.png - explicit eligibility and demographic answers
- focal: assets/13-extension-preflight-live.png
- roles: 13-extension-preflight-live = foreground extension panel; 09-ats-empty = background starting state; 10-ats-filled = primary completion state; 11-ats-profile-answers = supporting explicit-answer proof

Adapt: keep the cursor-driven flow, mounting the real extension and synthetic ATS captures as one continuous approved handoff.
Scene 1 (0.0-1.65s): The captured extension preflight panel slides over the real empty ATS, forming a 30/70 asymmetric product composition; 11 mapped and 0 blockers count in sequentially.
Scene 2 (1.65-3.45s): Mapping rows illuminate sequentially while a scanner line traverses the ATS once; the cursor clicks Autofill with `cursor-click-ripple`.
Scene 3 (3.45-5.4s): The real empty ATS fills field by field through stacked mask reveals, including the tailored resume upload; a compact progress rail advances in the extension.
Scene 4 (5.4-7.15s): A `scale-swap-transition` seam replaces the empty ATS with the real filled capture, then the explicit eligibility and demographic-answer section receives one purposeful focus move.
Scene 5 (7.15-8.8s): The cursor travels toward Submit, decelerates, and stops above it. A violet “Manual submit preserved” guard line draws between the pointer and button, then holds.

narrativeRole: Deliver the workflow payoff while preserving the student's final irreversible action.
keyMessage: ResumeDB automates form entry but never clicks Submit.

## Selected motion rule: cursor-click-ripple

---
name: cursor-click-ripple
description: Animated mouse cursor moves to target, clicks with scale depression and expanding ripple rings.
metadata:
  tags: cursor, click, ripple, interaction, mouse, button
---

# Cursor Click Ripple

An animated cursor moves to a target element, performs a click with visual depression, and emits expanding ripple rings from the click point.

## How It Works

Three sequential phases driven by a single GSAP timeline:

1. **Move**: eased cursor translation from entry point to the target element's center
2. **Click**: scale depression on both cursor and target (yoyo: shrink then return)
3. **Ripple**: expanding circles radiate outward from the click point with fade-out. 1–3 staggered rings amplify the click feedback

Use a GSAP timeline because the phase ordering (move → settle → click → ripples) is exactly what timelines express cleanly.

## HTML

```html
<div
  class="scene"
  id="cursor-click-scene"
  data-composition-id="cursor-click-scene"
  data-start="0"
  data-duration="2"
  data-track-index="0"
>
  <button class="target-button">{ctaLabel}</button>

  <div class="cursor">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path
        d="M5 3L19 12L12 13L9 20L5 3Z"
        fill="{cursorFill}"
        stroke="{cursorStroke}"
        stroke-width="1.5"
      />
    </svg>
  </div>

  <!-- Ripple rings — centered on click target, hidden until trigger -->
  <div class="ripple ripple-1"></div>
  <div class="ripple ripple-2"></div>
  <div class="ripple ripple-3"></div>
</div>
```

## CSS

Position cursor at the entry point. Button sits at its final position. Ripples are at the click-target center with `scale: 0` and `opacity: 0` so they hold invisible until the timeline trigger:

```css
.scene {
  position: relative;
  width: 100%;
  height: 100%;
}

.target-button {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  /* ...button styling (background, color, font from project tokens) */
}

.cursor {
  position: absolute;
  left: 10%;
  top: 80%; /* entry corner */
  pointer-events: none;
  z-index: 999;
}

.ripple {
  position: absolute;
  left: 50%;
  top: 50%; /* click target center */
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px solid {rippleColor};
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  pointer-events: none;
}
```

## GSAP Timeline

Build a paused timeline. Register it on `window.__timelines` with the same key as `data-composition-id` on the scene root. All tuning values are named constants — see How to Choose Values below.

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  // MOVE_DUR, MOVE_EASE, CLICK_AT, PRESS_DUR, CURSOR_PRESS_SCALE, TARGET_PRESS_SCALE,
  // RIPPLE_AT, RIPPLE_DUR, RIPPLE_SCALE, RIPPLE_STAGGER, RIPPLE_EASE
  // — all named; values per How to Choose Values.

  // Phase 1 — Move cursor to target center (eased, not linear)
  tl.to(
    ".cursor",
    {
      x: TARGET_X,
      y: TARGET_Y,
      duration: MOVE_DUR,
      ease: MOVE_EASE,
    },
    0,
  );

  // Phase 2 — Click: cursor + target depress together, then return
  tl.to(
    ".cursor",
    {
      scale: CURSOR_PRESS_SCALE,
      duration: PRESS_DUR,
      ease: "power2.in",
      yoyo: true,
      repeat: 1,
    },
    CLICK_AT,
  );
  tl.to(
    ".target-button",
    {
      scale: TARGET_PRESS_SCALE,
      duration: PRESS_DUR,
      ease: "power2.in",
      yoyo: true,
      repeat: 1,
    },
    CLICK_AT,
  );

  // Phase 3 — Ripple burst, N rings staggered from the click point
  tl.set([".ripple-1", ".ripple-2", ".ripple-3"], { opacity: 1 }, RIPPLE_AT);
  tl.to(
    [".ripple-1", ".ripple-2", ".ripple-3"],
    {
      scale: RIPPLE_SCALE,
      opacity: 0,
      duration: RIPPLE_DUR,
      ease: RIPPLE_EASE,
      stagger: RIPPLE_STAGGER,
      immediateRender: false,
    },
    RIPPLE_AT,
  );

  window.__timelines["cursor-click-scene"] = tl;
</script>
```

## How to Choose Values

- **MOVE_DUR** — cursor travel time from entry to target, in seconds
  - Range: 0.4–1.0 s
  - Effects: short feels darting; long feels deliberate / "considered click"
  - Constraints: must end before `CLICK_AT` — otherwise the click fires while the cursor is still moving and reads as a misclick
  - Reference: ../../examples/cta-orbit-collapse.html uses 0.5 s

- **MOVE_EASE** — easing family for the move tween
  - Discrete choice. Options:
    - `power2.inOut` — symmetric, calm; good for "the user thoughtfully moves the cursor"
    - `back.out(<n>)` — overshoot landing; good when the click target is a button you want the cursor to "settle onto" with a tiny visible recoil. Pair with a low overshoot coefficient (~1.2–1.4) — higher reads as cartoonish
    - `power3.out` — fast start, soft landing; good for a "decisive" move
  - Reference: ../../examples/cta-orbit-collapse.html uses `back.out(1.3)`

- **CLICK_AT** — time the click fires, in seconds
  - Range: must be ≥ `MOVE_DUR` (cursor has settled); typically `MOVE_DUR + 0.0–0.3 s` of "decision pause"
  - Effects: zero pause reads as autopilot; >0.3 s of pause reads as hesitation
  - Reference: ../../examples/cta-orbit-collapse.html clicks 0.2 s after the cursor settles

- **PRESS_DUR** — half-duration of the depression (the yoyo runs twice this)
  - Range: 0.06–0.12 s
  - Effects: short feels crisp; long feels mushy
  - Constraints: total press = `2 * PRESS_DUR`; must finish before the next scene phase needs the cursor / target back at normal scale
  - Reference: ../../examples/cta-orbit-collapse.html uses 0.08 s

- **CURSOR_PRESS_SCALE / TARGET_PRESS_SCALE** — how far each compresses during the click
  - Range: cursor 0.80–0.90; target 0.92–0.97
  - Effects: smaller numbers = stronger "this click counts" feel; values close to 1 read as a gentle tap
  - Constraints: cursor compresses MORE than the target — the cursor is the actor, the target is the recipient
  - Reference: ../../examples/cta-orbit-collapse.html uses cursor 0.85 / target 0.95

- **RIPPLE_AT** — when the rings start expanding, in seconds
  - Range: `CLICK_AT + 0.0–0.08 s`
  - Effects: simultaneous with the press feels causal; slight delay feels acoustic ("the click happens, then the wave radiates")
  - Reference: ../../examples/cta-orbit-collapse.html starts the ripple at `CLICK_AT` exactly

- **RIPPLE_DUR** — how long each ring takes to fully expand and fade
  - Range: 0.5–1.0 s
  - Effects: short rings feel sharp; long rings feel like a soft sonar
  - Constraints: must complete before any phase that depends on the ring being gone (e.g. a screen wipe)
  - Reference: ../../examples/cta-orbit-collapse.html uses 0.7 s

- **RIPPLE_SCALE** — final scale of each ring before it fades
  - Range: 3–6
  - Effects: 3 keeps the ring near the click site; 6 lets it sweep the surrounding area
  - Constraints: if the ring would exit the visible frame before opacity reaches 0, lower the scale or shorten the duration
  - Reference: ../../examples/cta-orbit-collapse.html uses 5

- **RIPPLE_STAGGER** — delay between consecutive rings
  - Range: 0.06–0.12 s (or 0 for a single ring; see Variations)
  - Effects: below ~0.06 s reads as one thick ring; above ~0.12 s reads as separate events
  - Reference: ../../examples/cta-orbit-collapse.html uses a single ring (no stagger)

- **RIPPLE_EASE** — easing family for the expansion
  - Discrete choice. Options:
    - `power2.out` — fast start, soft tail; the standard "ping" feel
    - `power3.out` — even sharper attack, longer tail
    - `expo.out` — almost-instant expansion with a long quiet fade; reads as a strong, distant pulse
  - Reference: ../../examples/cta-orbit-collapse.html uses `power2.out`

- **TARGET_X / TARGET_Y** — pixel offset of the click target from the cursor's CSS-laid origin
  - These are layout-derived, not creative knobs — they must match the visual centroid of the actual click target. A 4 px miss reads as missing the button
  - Reference: ../../examples/cta-orbit-collapse.html targets the white button at `CENTER_X + 130, CENTER_Y + 15`

## Variations

- **Single ring** — keep one `.ripple` element, drop the stagger; reads as more elegant when the rest of the scene is busy
- **Keyframed attack-decay** — replace the simple expand-and-fade with a `keyframes` block that ramps opacity 0 → peak → 0 across the duration; gives a clearer "energy radiates and dissipates" envelope (used in ../../examples/cta-orbit-collapse.html)
- **Multi-ring expanding pulse** — 3 rings with 0.08 s stagger feels richer when the click is the climactic moment of the scene

## Key Principles

- **Move before click**: trigger the click only after the move tween has settled — clicking mid-motion reads as unintentional
- **Synchronized depression**: cursor + target depress at the same `position` time with the same duration (and both yoyo back)
- **Ripple from click point**: ripples expand from the exact click location (the button's visual center), not from any element's bounding-box origin
- **Subtle scale**: cursor compresses more than the target — see `CURSOR_PRESS_SCALE` / `TARGET_PRESS_SCALE`
- **High z-index cursor**: cursor renders above all content for the entire sequence

## Critical Constraints

- **Timeline must be paused**: `gsap.timeline({ paused: true })`. Never call `tl.play()` — HyperFrames seeks the timeline frame-by-frame deterministically
- **Registry key = `data-composition-id`**: `window.__timelines["<id>"]` must match the `data-composition-id` on the scene root exactly
- **`immediateRender: false` on the ripple expand**: holds the initial state (`scale: 0`, `opacity: 0`) until the click moment, otherwise the tween pre-renders and the rings appear at the wrong size at t=0
- **Finite duration**: verify `tl.duration()` matches the scene's `data-duration`
- **`pointer-events: none` on cursor + ripples**: they're purely visual; never block underlying interactivity (matters for hover-able exports)
- **No CSS transitions / animations**: all motion lives in the GSAP timeline so seek stays deterministic

## Combinations

- [orbit-3d-entry.md](orbit-3d-entry.md) — when the click is the pivot that collapses orbiting elements toward the cursor's target
- [center-outward-expansion.md](center-outward-expansion.md) — the click can be the trigger for an outward burst from the click point
- [press-release-spring.md](press-release-spring.md) for stronger physical feel on the target button
- [scale-swap-transition.md](scale-swap-transition.md) for the button's state change after click (button morphs into success state, next view, etc.)

## Pairs with HF skills

- `/hyperframes-animation` — timeline + tween API reference (eases, stagger, `immediateRender`, etc.)
- `/hyperframes-core` — composition wiring (`data-*` attributes, scene structure, registration contract)
- `/hyperframes-cli` — `hyperframes lint` to verify the registry key + duration match

## Selected motion rule: scale-swap-transition

---
name: scale-swap-transition
description: Coordinated shrink-out + spring pop-in morph-like transition between two elements — no SVG path interpolation needed.
metadata:
  tags: transition, morph, scale, swap, spring, pop
---

# Scale-Swap Transition

Simulates a "morph" between two DOM elements by overlapping exit and entrance scale animations. Lighter weight than [card-morph-anchor](card-morph-anchor.md) (which morphs container dimensions) and easier than SVG path interpolation.

## How It Works

At a single trigger time, two coordinated tweens fire:

1. **Outgoing element**: scale `1.0 → EXIT_SCALE` + opacity `1 → 0` (fast `power2.in`)
2. **Incoming element**: scale `EXIT_SCALE → 1.0` + opacity `0 → 1` (bouncy `back.out(${BOUNCE_FACTOR})` with overshoot)

A small `OVERLAP` window during which both are mid-tween creates the "morph" illusion. Incoming sits on top via z-index so the outgoing's fade-tail doesn't bleed through.

## HTML

```html
<div
  class="scene"
  id="swap-scene"
  data-composition-id="swap-scene"
  data-start="0"
  data-duration="3"
  data-track-index="0"
>
  <div class="stack">
    <div class="swap-wrap">
      <div class="card outgoing" id="outgoing">
        <div class="icon">{outgoingIcon}</div>
        <div class="title">{outgoingLabel}</div>
      </div>
      <div class="card incoming" id="incoming">
        <div class="icon">{incomingIcon}</div>
        <div class="title">{incomingLabel}</div>
        <div class="sub" id="sub">{incomingSubline}</div>
      </div>
    </div>
    <div class="brand">{Brand}</div>
  </div>
</div>
```

## CSS

```css
.scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: {sceneBg};
  font-family: {font};
}
.stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: STACK_GAP;
}
.swap-wrap {
  position: relative;
  width: SWAP_WRAP_W;
  height: SWAP_WRAP_H;
}
.card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: CARD_INNER_GAP;
  border-radius: CARD_RADIUS;
  padding: CARD_PADDING;
  /* Both elements share transform-origin so they "morph" around the same anchor */
  transform-origin: 50% 50%;
  will-change: transform, opacity;
}
.card .icon {
  font-size: ICON_SIZE;
}
.card .title {
  font-size: TITLE_SIZE;
  font-weight: 900;
  letter-spacing: TITLE_TRACKING;
  text-transform: uppercase;
}
.card .sub {
  font-size: SUB_SIZE;
  font-weight: 700;
  color: {accentColor};
  opacity: 0;
}
.outgoing {
  z-index: 1;
  background: {outgoingBg};
  border: 1px solid {outgoingBorder};
  color: {textColor};
}
.incoming {
  /* Incoming starts hidden + smaller, will pop in */
  z-index: 2;
  background: {incomingBg};
  border: 1px solid {incomingBorder};
  color: {textColor};
  opacity: 0;
  transform: scale(EXIT_SCALE);
}
.brand {
  font-size: BRAND_SIZE;
  font-weight: 900;
  letter-spacing: BRAND_TRACKING;
  text-transform: uppercase;
  color: {brandColor};
}
```

## GSAP Timeline

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  // Outgoing: shrink + fade fast
  tl.to(
    "#outgoing",
    {
      scale: EXIT_SCALE,
      opacity: 0,
      duration: EXIT_DUR,
      ease: "power2.in",
    },
    TRIGGER,
  );

  // Incoming: scale up + fade in with overshoot, starts slightly BEFORE outgoing
  // finishes (OVERLAP creates the morph illusion).
  tl.to(
    "#incoming",
    {
      scale: 1.0,
      opacity: 1,
      duration: ENTER_DUR,
      ease: `back.out(${BOUNCE_FACTOR})`,
    },
    TRIGGER + EXIT_DUR - OVERLAP,
  );

  // Subline reveals AFTER the incoming card settles
  tl.fromTo(
    "#sub",
    { opacity: 0, y: SUB_REVEAL_Y_PX },
    { opacity: 1, y: 0, duration: SUB_REVEAL_DUR, ease: "power3.out" },
    TRIGGER + EXIT_DUR + SUB_REVEAL_DELAY,
  );

  // Brand fades in early for context
  tl.from(
    ".brand",
    { opacity: 0, y: BRAND_REVEAL_Y_PX, duration: BRAND_REVEAL_DUR, ease: "power3.out" },
    BRAND_REVEAL_AT,
  );

  window.__timelines["swap-scene"] = tl;
</script>
```

## Variations

### Delayed inner content reveal

The classic pattern: morph the container, then reveal inner text once the container has settled (as in the example above with `.sub`). The 0.2-0.4s gap between morph end and content reveal lets the viewer's eye land on the new container shape before reading the content.

### Triple swap (3-state cycle)

Chain: A→B→C with two triggers `TRIGGER_AB` and `TRIGGER_BC`. Each transition needs its own pair of tweens, and the previous incoming becomes the next outgoing. Useful for state evolution narratives (e.g. early-state → mid-state → final-state labels).

```js
tl.to("#stateA", { scale: EXIT_SCALE, opacity: 0, duration: EXIT_DUR }, TRIGGER_AB);
tl.to(
  "#stateB",
  { scale: 1.0, opacity: 1, duration: ENTER_DUR, ease: `back.out(${BOUNCE_FACTOR})` },
  TRIGGER_AB + EXIT_DUR - OVERLAP,
);
tl.to("#stateB", { scale: EXIT_SCALE, opacity: 0, duration: EXIT_DUR }, TRIGGER_BC);
tl.to(
  "#stateC",
  { scale: 1.0, opacity: 1, duration: ENTER_DUR, ease: `back.out(${BOUNCE_FACTOR})` },
  TRIGGER_BC + EXIT_DUR - OVERLAP,
);
```

### Color-shift transition (no scale)

For a flat morph between two same-shape states, drop the scale and keep only opacity + a brief background hue tween. Less dramatic but matches a more product-UI tone.

## How to Choose Values

### Timing (seconds)

- **TRIGGER** — when the swap fires.
  - Constraints: must be ≥ the outgoing element's settled time + a presence-dwell so the outgoing "lands" before transforming
- **EXIT_DUR** — outgoing shrink + fade duration.
  - Range: 0.3-0.5 s
- **ENTER_DUR** — incoming pop-in duration.
  - Range: 0.45-0.7 s (longer than `EXIT_DUR` to let the overshoot settle)
- **OVERLAP** — how much the entrance starts before the exit finishes.
  - Range: 0.1-0.2 s
  - Constraints: too much (>0.3 s) makes both clearly visible together (no morph); too little (<0.05 s) leaves a visible empty gap
- **SUB_REVEAL_DELAY** — gap between incoming settle and subline reveal.
  - Range: 0.2-0.4 s; reveals during the morph compete with the swap for attention
- **SUB_REVEAL_DUR** — subline fade-in.
  - Range: 0.3-0.5 s
- **BRAND_REVEAL_AT** — when the brand/context line fades in.
  - Constraints: must be < `TRIGGER` (brand is context for the swap, not synchronous with it)
- **BRAND_REVEAL_DUR** — brand fade-in duration.
  - Range: 0.4-0.8 s

### Physics

- **EXIT_SCALE** — target scale for outgoing (and starting scale for incoming).
  - Range: 0.6-0.8; smaller exits feel more dramatic but risk reading as "vanish" instead of "morph"
- **BOUNCE_FACTOR** — `back.out(${BOUNCE_FACTOR})` overshoot on the incoming.
  - Range: 1.4 (soft) - 1.8 (firm) - 2.2 (cartoony)

### Positioning offsets

- **SUB_REVEAL_Y_PX** — subline initial y offset (positive = below resting).
  - Range: 8-20 px
- **BRAND_REVEAL_Y_PX** — brand initial y offset.
  - Range: 10-24 px

### Layout

- **STACK_GAP** — gap between swap container and brand line.
  - Range: 40-96 px
- **SWAP_WRAP_W / SWAP_WRAP_H** — fixed swap container dimensions; both cards `inset: 0` inside.
  - Constraints: pick dimensions that fit both states' content; the wrap does not resize during the swap
- **CARD_INNER_GAP** — gap between icon and title inside a card.
  - Range: 16-32 px
- **CARD_RADIUS / CARD_PADDING** — card corner radius and inner padding.
  - Range: radius 24-40 px; padding 32-64 px
- **ICON_SIZE / TITLE_SIZE / SUB_SIZE / BRAND_SIZE** — typographic sizes.
  - Constraints: titles dominate (~80-120 px at 1080p); sub and brand are accent-sized
- **TITLE_TRACKING / BRAND_TRACKING** — letter-spacing on uppercase labels.
  - Range: 4-16 px (uppercase reads better with positive tracking)

### Tokens

- **{sceneBg}** — background gradient/color
- **{font}** — typographic stack
- **{textColor}** / **{accentColor}** / **{brandColor}** — semantic color tokens
- **{outgoingBg}** / **{outgoingBorder}** — outgoing card surface + border (typically warm or pre-action hue)
- **{incomingBg}** / **{incomingBorder}** — incoming card surface + border (typically cool or post-action hue)
- **{outgoingIcon}** / **{incomingIcon}** — single glyph/emoji per state
- **{outgoingLabel}** / **{incomingLabel}** — state labels
- **{incomingSubline}** — supporting copy that fades in after the incoming settles
- **{Brand}** — brand line shown beneath the swap

## Key Principles

- **Incoming z-index ABOVE outgoing** — without this, the outgoing's fade-tail (opacity 0.3-0.5) bleeds through the incoming's lower opacity and creates a "double-exposed" muddy frame
- **Both elements share `transform-origin: 50% 50%`** — different origins make the morph feel like one thing teleporting somewhere else
- **`OVERLAP` in the 0.1-0.2 s window** — too much overlap and both are clearly visible together (no morph); too little and there's a visible empty gap
- **Bouncy ease ONLY for the incoming** — outgoing uses `power2.in` (rushing away), incoming uses `back.out(${BOUNCE_FACTOR})` (arriving with weight). Reverse it and the swap feels mechanical
- **Inner content reveals AFTER container settles** — see `SUB_REVEAL_DELAY`. Reveals during the morph compete for attention and lose
- **Climax dwell ≥1 s after final state lands** — see SKILL universal constraints. After incoming + subline both settle, hold for ≥1 s
- **Brand reveal early, not at the swap** — context (brand, eyebrow) sets the stage; the swap is the headline. If brand reveals AT the swap, it competes

## Critical Constraints

- **Timeline must be paused**: `gsap.timeline({ paused: true })`
- **Registry key = `data-composition-id`**
- **No CSS `transition`** on either swap element — competes with GSAP
- **`will-change: transform, opacity`** on both swap elements
- **Both elements use `position: absolute; inset: 0`** in the same wrapper — they occupy the same footprint, swap fades one out and pops one in
- **Don't `display: none` the outgoing** after fade — leave it at `opacity: 0` so layout doesn't reflow

## Combinations

- [press-release-spring.md](press-release-spring.md) — button press TRIGGERS the swap (cause and effect)
- [sine-wave-loop.md](sine-wave-loop.md) — idle breathing on the final state
- [card-morph-anchor.md](card-morph-anchor.md) — alternative for SHAPE-changing transitions (this rule is for SAME-shape state swaps)

## Pairs with HF skills

- `/hyperframes-animation` — two coordinated tweens with overlap
- `/hyperframes-core` — composition wiring
- `/hyperframes-cli` — `hyperframes lint`

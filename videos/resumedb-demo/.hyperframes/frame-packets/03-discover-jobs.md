# Frame packet: 03-discover-jobs

## Project inputs

- Project: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo
- Design tokens: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo/frame.md
- RULES_DIR: /Users/nathanye/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 3 - Ask for the right opportunities

- scene: A cursor enters the Career Agent, types a natural-language goal, and a live transcript streams through search, page inspection, evidence verification, and application creation.
- voiceover: "Then she simply asks, 'Find internships I qualify for,' or pastes any job URL. The agent researches the role, scores fit, and creates the application."
- duration: 9.76s
- poster: 7s
- transition_in: push-slide LEFT
- status: built
- src: compositions/frames/03-discover-jobs.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: curiosity to control
- blueprint: cursor-ui-demo
- asset_candidates: assets/04-career-agent.png - natural-language Career Agent input and discovery inbox
- focal: assets/04-career-agent.png
- roles: 04-career-agent = primary product surface; prompt = foreground interaction; transcript = foreground proof

Adapt: keep the cursor-driven signature and extend the captured Career Agent into a living transcript without replacing the real page.
Scene 1 (0.0-2.6s): The real Career Agent view fills 75 percent of the canvas. A simulated cursor glides into the prompt and clicks with `cursor-click-ripple`; a short focus move keeps the composer readable.
Scene 2 (2.6-5.1s): “Find internships I qualify for” types into the real prompt on the quoted narration cue, followed by a smaller paste-URL chip; use seek-safe typewriter timing and a finite context cursor.
Scene 3 (5.1-8.2s): A transcript rail widens beside the product and streams Searching sources, Inspecting Northstar Robotics, and Verifying factual support one row at a time with `waterfall-entry`; each active row owns the violet indicator.
Scene 4 (8.2-9.76s): “Application created - 92% fit” locks in with a crisp progress fill; the cursor settles beside the result and the product view holds still.

narrativeRole: Prove that discovery and arbitrary job ingestion share one simple agent interface.
keyMessage: A student can describe the goal or paste any posting and let the agent do the research.

## Selected blueprint: cursor-ui-demo

# cursor-ui-demo — Cursor-Driven UI Demo

**intent**: A visible custom cursor drives a real (reconstructed) app UI through clicks / hovers / drags so the screen changes state shot-to-shot, while the camera chases each interaction — the product surface is the subject and the cursor is the actor.

**roles served**

- Product*Intro (from `product-intro-cursor-ui-demo` / #14 Product_Intro_02, #15 Product_Intro_2, #17 Product_Intro_04): first look at the product surface — the cursor sweeps/hovers to \_introduce* the app and reveal what it is, landing on a hovered hero element or freshly-popped result. Light, exploratory; backdrop steps colors as it goes.
- Key*Feature (from `key-feature-cursor-ui-demo` / #23 Key_Feature_2, #24 Key_Feature_03, #27 Key_Feature_06): one specific multi-step workflow demonstrated \_end-to-end* (edit / configure / select across 2–4 discrete beats), each beat a real edit the UI responds to live, landing locked on the primary action button or the produced result.
- Key_Feature (from `workflow-approve-press`): an agency / confirmation workflow framed by a cockpit of 3D-tilted flanks — a step list ticks pending → active → complete (a snap state machine, CSS responding to `[data-state]`), and a flank button takes the PRESS as the payoff (its color flips to success, a checkmark stamps). The click is the climax, not a passing gesture.

**duration**: 4.0–9.3s (union of Key_Feature 4.0–7.3s and Product_Intro 6.1–9.3s)

**shot structure** (a `[product UI surface]` — fixed app window, dashboard/editor, parallax `[content card]` stack, or a `[container object/icon]` — centered over `[bg color/gradient]`, shown `[flat]` or `[3D-isometric]`; a custom `[brand-colored cursor with icon]` is the protagonist and the camera servos to whatever it touches; UI responds _live_ and in sync with each cursor action. Two role-tuned tempos fold in — Product_Intro **sweeps to introduce**, Key_Feature **performs a workflow**.)

- **Scene 1 (0.0–~Xs) — surface establishes + first touch.** The `[product UI surface]` arrives centered over `[bg color/gradient]` — either it is simply present (fixed window / dashboard / editor), a 3D-parallax stack of `[content cards]`, or a `[container object/icon]` that FLIES IN with a 3D tumble and settles. The custom `[cursor]` enters. The cursor performs the FIRST action on `[cursor target 1]` and the UI responds live in the same beat. Camera holds or begins a slow push-in toward the acted-on region.
  - _Variant — Product_Intro_: low-commitment first touch — cursor HOVERS/sweeps a control or SWEEP-HIGHLIGHTS a field to `[accent color]`, OR the `[container]` fans open. An optional label/title fades/morphs onto the surface. The point is to _show the surface exists_ and is touchable.
  - _Variant — Key_Feature_: a concrete edit — cursor DRAGS a scrollbar / TYPES into a field / DRAGS a handle, and the UI responds materially (`[scroll]` / value climbs / region resizes). If the surface opened in `[3D-isometric]`, it may snap perspective-FLAT here to read the workflow.

- **Scene 2 (~Xs–~Ys) — camera chases to the next interaction (the engine).** The camera MOVES to the next target — push-in + pan / whip-pan / pan-down to `[cursor target k]` — and the cursor performs action k as the UI updates live. Each beat is a discrete interaction connected by a fast camera move; the surface's inner content SWAPS per interaction.
  - _Variant — Product_Intro_: navigation is exploratory — a slow camera pan + depth-of-field FOCUS-PULL across a parallax `[content card]` stack, or the `[container]` fanning into `[N option/content cards]` that SPRING to position. As content swaps, the supporting backdrop STEPS its color (`[bg step 1]` → step 2 → …). Typically one or two such moves.
  - _Variant — Key_Feature_: repeat for `[2–4 beats total]`, each a distinct operation the UI answers — counter COUNTS UP, `[pill/swatch]` SELECTS, a modal SLIDES UP and TYPES — connected by whip-pans / progressive zoom. The workflow visibly advances toward a result.

- **Scene 3 (~Ys–end) — payoff state, camera settles, HOLD.** The cursor lands on its final target and the screen reaches the payoff state; the camera comes to rest (static) and holds.
  - _Variant — Product_Intro_: the cursor HOVERS the hero element — a `[content card]` SCALES UP on hover, a node gets an `[Available]`-style pill, or a `[result card]` POPS/springs in — the "here's the product" payoff. Settles static, holds.
  - _Variant — Key_Feature_: locked close-up on the OUTCOME — cursor lands on the `[primary action button: Export / Save / Reimburse]` and a `[hover backdrop / highlight]` SPRING-pops in (the climax is the action button / produced result). Holds.

**motion vocabulary**: cursor-driven click / hover / sweep-highlight / drag / type; per-interaction live UI response (scroll, value climb, region resize, content swap); camera push-in + pan / whip-pan / pan-down servoing to each target; coordinate zoom onto the acted region; press-and-ripple on a clicked control; button press-compress; screen-state swap shot-to-shot; card fan-out to corners (spring); 3D container fly-in & tumble-settle; perspective-flatten (3D→2D snap); paginated/stepped backdrop color advance; depth-of-field focus-pull across a parallax card stack; counter count-up; pill/swatch select; modal slide-up + typing; label/title morph between states; UI-keyword highlight glow; terminal hover-scale or result-card pop-in; spring hover-backdrop on the final action button.

**rule mapping**

- viewport follows the cursor / camera servos to whatever it touches (primary) → `camera-cursor-tracking`
- cursor moves to a target, presses, emits a ripple (the click itself — primary interaction primitive) → `cursor-click-ripple`
- screen-state swap shot-to-shot (surface inner content changes between beats) → `scale-swap-transition`
- camera push-in + pan / whip-pan / pan-down to the next target → `viewport-change` (pan/zoom across the UI)
- sequencing the chase into discrete interaction beats → `multi-phase-camera`
- zoom onto the specific acted-on UI region → `coordinate-target-zoom`
- cursor icon/state changing with context (e.g. pointer↔grab over a draggable handle) → `context-sensitive-cursor`
- which content appears per beat / step-by-step UI state progression / per-interaction swaps → `dynamic-content-sequencing`
- sweep-highlight a field, highlight a UI keyword to `[accent color]` → `asr-keyword-glow` (keyword glow on the touched element)
- clicked button compresses on press, springs back on release → `press-release-spring`
- cursor + button compress together on a heavier press → `physics-press-reaction`
- panel/card morphs between two states (e.g. card → expanded card, surface state A → B) → `card-morph-anchor`
- terminal hover-scale, `[result card]` pop-in, spring hover-backdrop on the final action button → `spring-pop-entrance`
- card fan-out to corners / option cards springing to position → `split-tilt-cards` (fan/spread into tilted positions) + `spring-pop-entrance` (the spring settle)
- 3D-parallax content-card stack as the surface; UI shown 3D-isometric → `3d-page-scroll` (UI as a tilted scrolling/parallax card)
- node gets an `[Available]`-style pill / tracked badge appears on an element → `ai-tracking-box`
- counter / value count-up as the UI responds → `counting-dynamic-scale`
- a result bar / number FILLS as the workflow's outcome → `stat-bars-and-fills`
- a live `[video]` screen-capture clip used as the surface → technique: video compositing
- perspective-flatten (3D-isometric → flat 2D snap) and the 3D-isometric tilt itself → technique: CSS-3D (no dedicated rule; the tilt/flatten transform is a CSS-3D primitive)
- camera settles static on the payoff and HOLDS → (settle phase of `spring-pop-entrance` on the payoff element; the static hold itself needs no rule)
- 3D container/object fly-in & tumble-settle → `depth-scatter-assemble` (free-tumbling 3D object/container entrance that flies in and tumble-settles; `orbit-3d-entry` only orbits a flat element into place)
- depth-of-field focus-pull across the parallax card stack → `depth-of-field-blur` (rack-focus / DoF blur transition between near and far cards; `3d-page-scroll` supplies the tilted parallax stack and `viewport-change` the pan)
- paginated/stepped backdrop color advance synced to interactions (`[bg step 1]`→step 2→…) → `discrete-text-sequence` (discrete state stepping, here applied to a background-color state rather than text)
- modal slide-up + in-modal typing as one combined beat → `card-morph-anchor` / `scale-swap-transition` (the panel slide-in) + `discrete-text-sequence` (the in-modal typed text)

**camera modifier**: The defining motion is the camera CHASE — the viewport follows the cursor from target to target via `camera-cursor-tracking` (primary), realized as concrete push-in + pan / whip-pan / pan-down moves under `viewport-change`, sequenced into discrete interaction beats by `multi-phase-camera`, with each beat's destination targeted via `coordinate-target-zoom` (zoom to the acted-on region). Product_Intro biases toward a slow, exploratory pan + focus-pull that sweeps the surface; Key_Feature biases toward snappier whip-pans / progressive zoom that march through the workflow and lock static on the action button. This camera-servo-to-cursor is what separates the blueprint from hands-off camera scrolls (dataviz-scroll-reveal) and static device/window tours.

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

## Selected motion rule: waterfall-entry

---
name: waterfall-entry
description: Staggered ARRIVAL cascade — words/elements whip in from below (one consistent direction), each starting before the previous settles, an accelerating wave that resolves into a composed layout. Title cards, segment openers, list/feature intros. Opacity is BINARY 0→1 via tl.set — never fade an arrival.
metadata:
  tags: entrance, cascade, stagger, kinetic-text, title-card, segment-opener, arrival, waterfall, whip
---

# Waterfall Entry

Staggered ARRIVAL cascade: words/elements whip in from below (one consistent direction),
each starting before the previous settles — an accelerating wave that resolves into a
composed layout. Title cards, segment openers, list/feature intros.

**This is an in-scene arrival, not a seam.** Its seam sibling is the waterfall CUT
(`cut-the-curve` doctrine skill, `seams/waterfall-cut.md`); do not mix their rules:

|               | Entry (this rule — arrival)                   | Waterfall Cut (seam)                                      |
| ------------- | --------------------------------------------- | --------------------------------------------------------- |
| Opacity       | BINARY 0→1 via `tl.set` at entry — never fade | ignites at 0.35 mid-path — the fade IS the velocity trick |
| Axis default  | Y, from below                                 | X, riding the current                                     |
| Outgoing side | none                                          | words ramp out on mirrored power4.in                      |

## Choreography

- **Overlap, don't queue** — next element starts within ±2 frames of the previous
  settling; gaps SHRINK across the cascade; the last element snaps.
- **Velocity varies by weight** — heavy/anchor elements travel further and longer;
  light words/punctuation snap in tight:

| Parameter | Anchor/heavy | Normal word | Light/punctuation |
| --------- | ------------ | ----------- | ----------------- |
| Y offset  | 60–80px      | 40–50px     | 30–48px           |
| Duration  | 0.16–0.20s   | 0.13–0.16s  | 0.10–0.13s        |
| Overlap   | 0–2f gap     | 1f overlap  | 1–2f overlap      |

- Ease `power4.out` (`expo.out` for extra snap); never `.inOut` on an entry.
- One direction per cascade.
- Split the FINAL word into fragments to extend the climax; fragments travel further.
- Post-settle, the group usually slides to make room for the next beat — that's
  [nudge-curve.md](nudge-curve.md).

## JS

Each element: `tl.set` (instant reveal + offset) then `tl.to` (whip to rest).
`nextStart = prevStart + prevDuration − (overlapFrames × F)`; +overlap = cascade,
−overlap = deliberate gap. CSS: elements start `opacity: 0; display: inline-block`.

```js
var F = 1 / 60;
var t0 = 0.1;
// anchor (heaviest): biggest travel, longest settle
tl.set("#el-1", { opacity: 1, y: 80 }, t0);
tl.to("#el-1", { y: 0, duration: 0.18, ease: "power4.out" }, t0);
// normal word: 2 frames after the anchor finishes
var t1 = t0 + 0.18 + 2 * F;
tl.set("#el-2", { opacity: 1, y: 45 }, t1);
tl.to("#el-2", { y: 0, duration: 0.15, ease: "power4.out" }, t1);
// light word: 1 frame BEFORE the previous finishes (overlap)
var t2 = t1 + 0.15 - F;
tl.set("#el-3", { opacity: 1, y: 40 }, t2);
tl.to("#el-3", { y: 0, duration: 0.14, ease: "power4.out" }, t2);
// split final-word fragments: tightest overlap, extra travel (lighter)
var t3 = t2 + 0.14 - F;
tl.set("#frag-a", { opacity: 1, y: 70 }, t3);
tl.to("#frag-a", { y: 0, duration: 0.16, ease: "power4.out" }, t3);
var t4 = t3 + 0.14 - F;
tl.set("#frag-b", { opacity: 1, y: 70 }, t4);
tl.to("#frag-b", { y: 0, duration: 0.15, ease: "power4.out" }, t4);
// punctuation: lightest, fastest
var t5 = t4 + 0.13 - 2 * F;
tl.set("#dot", { opacity: 1, y: 48 }, t5);
tl.to("#dot", { y: 0, duration: 0.12, ease: "power4.out" }, t5);
```

## Anti-patterns

| Don't                                                  | Instead                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Queued entries (each waits for the previous to settle) | Overlap ±1–2 frames — the cascade is a wave, not a queue                          |
| Same offset/duration for every cascade element         | Vary by weight: anchors travel further, punctuation snaps                         |
| Gradual opacity fade on an arrival                     | Binary 0→1 via `tl.set` — fading fights the snap (seam cuts fade; arrivals don't) |

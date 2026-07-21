# Frame packet: 05-human-gates

## Project inputs

- Project: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo
- Design tokens: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo/frame.md
- RULES_DIR: /Users/nathanye/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 5 - Automation with human gates

- scene: Five pipeline stages draw on from Not Started to Submitted, with Draft-to-Ready and Ready-to-Submitted called out as human gates.
- voiceover: "Applications move through five clear stages. Draft to Ready requires Earnestine's review. Ready to Submitted still requires her final click."
- duration: 7.84s
- poster: 6s
- transition_in: squeeze
- status: built
- src: compositions/frames/05-human-gates.html
- type: benefit_highlight
- persuasion: Risk reversal
- beat: control
- blueprint: spatial-pan-stations
- asset_candidates: assets/05-applications.png - five-stage applications table; assets/06-application-overview.png - Ready application with the manual submission instruction
- focal: assets/05-applications.png
- roles: 05-applications = primary pipeline surface; 06-application-overview = supporting Ready workbench; human-gate labels = foreground

Adapt: keep the five-station journey, but travel across the actual applications table and finish inside the real Ready workbench.
Scene 1 (0.0-1.7s): The captured Applications table seats full-width and the five states isolate as a foreground station strip above it.
Scene 2 (1.7-4.0s): Not Started, In Progress, Draft, Ready, and Submitted illuminate sequentially as the voice names five stages; a compact cursor travels only between stations.
Scene 3 (4.0-5.95s): The camera performs one `coordinate-target-zoom` into Ready, then swaps to the real application overview. A violet HUMAN REVIEW label draws between Draft and Ready with `css-marker-patterns`.
Scene 4 (5.95-7.84s): A second USER SUBMITS label draws between Ready and Submitted. The cursor approaches the final button, stops above it, and the frame holds on the manual submission instruction.

narrativeRole: Show that high automation does not remove human review or final submission control.
keyMessage: The agent prepares; the student approves and submits.

## Selected blueprint: spatial-pan-stations

# spatial-pan-stations — Spatial Pan / Stations

**intent**: Pre-place a sequence of labeled stations on one oversized canvas, then traverse it with a single virtual camera — repeated lateral/diagonal pans that center each station in turn and reveal a callout at every stop, landing held on a final station.

**roles served**

- Hook (from hook-pan-timeline / #1 Hook_02): a horizontal timeline of evenly-spaced milestones, left-panned beat by beat, each marker getting a spring-popped callout, landing on the present moment ("evolution / milestone walk leading up to us").
- Problem (from problem-camera-pan-stations / #8 Problem_01): a connected web of pain "stations" linked by hand-drawn leading lines, diagonally panned station to station, ending on a tangled scribble knot ("too many disconnected steps — it's a mess").
- Product_Intro (from concept-demo-decode-pan): a two-shot strip bridged by ONE lateral pan — shot 1 holds a static phrase whose accent word 3D-flap-DECODES (the concept lands), then the camera pans across the strip (with background parallax) into shot 2, where a cursor drives a live typing demo. Pairs this pan with `cursor-ui-demo`'s focal-locked tracked typing.

**duration**: 7–10s (union of Hook 8–10s, Problem ~7s, concept-demo ~7s)

**shot structure**
One oversized flat canvas on a solid `[bg color]`; all stations/markers pre-placed in world space; `[accent color]` text + simple line-icons; one virtual `.world` camera pans ease-in-out between stops. Each station holds ~1.0s.

- Scene 1 (0.0–~1.0s): Camera opens on station 1 — `[label 1 / first step]` centered. A reveal lands on it (see variants). Camera then begins to PAN toward station 2, sliding station 1 out of frame.
- Scene 2 → Scene N-1 (~1.0s each): Camera PANS (ease-in-out) to center the next station; on arrival its `[label k]` (+ optional `[secondary label]`) is REVEALED with the role reveal. Repeat per station.
- Scene N (final, ~last beat): One last pan lands on the terminal station; the final `[callout / landing element]` reveals and HOLDS to the end. Camera goes static on the punchline.

- Variant — Hook: stations sit as evenly-spaced `[markers]` on a thin horizontal `[timeline]` (lower third); pans are LEFT-only along the single axis (timeline scrolls left). Each callout is a bordered `[callout box]` + downward triangle (offset drop-shadow) that SPRING-POPS up (scale 0→100%, bouncy overshoot, transform-origin at triangle tip) reading `[label k]`; a `[secondary label, e.g. year]` fades in and RISES above it. Some mid markers arrive as plain static text revealed by the pan alone (no box). Final scene lands on the `[present-day label]`, springs, holds.
- Variant — Problem: stations are scattered across a 2D web; pans are DIAGONAL, STEERED by `[accent color]` hand-drawn lines — each station has a rough write-on line/arrow that draws toward the next and the camera follows it (Scene 1 also draws a loop/circle around the headline's key word). Each station = a white `[line-icon]` above its `[label]`, revealed plainly by the pan (no spring box). Final scene: the accent line spirals into a dense chaotic SCRIBBLE KNOT centered on the field; camera holds static on the tangle (visual punchline).

**motion vocabulary**
repeated ease-in-out camera pans (horizontal-left for Hook, diagonal-steered for Problem) across one large static canvas; pre-placed stations sliding through frame via the pan; spring-overshoot callout pop with triangle-tip origin (Hook); rise-and-fade secondary label (Hook); plain labels/icons arriving via the pan alone; rough hand-drawn "write-on" leading lines/arrows + loop/circle key-word mark (Problem); terminal chaotic-scribble knot draw (Problem); static hold on the final station/punchline.

**rule mapping**

- camera pan / traverse across the canvas (primary) → `viewport-change` (single `.world` wrapper transform; PAN mode)
- sequencing the repeated pan beats into stops → `multi-phase-camera`
- centering each station as the pan target → `coordinate-target-zoom` (used as pan-to-target, no zoom)
- spring-overshoot callout pop, triangle-tip origin (Hook) → `spring-pop-entrance`
- rise-and-fade secondary label + plain per-station label/icon reveals via the pan → `discrete-text-sequence`
- hand-drawn leading lines / arrows / loop-circle key-word mark / terminal scribble knot (Problem) → `svg-path-draw`
- station line-icons (Problem) → `svg-icon-enrichment`
- static hold on the final station / punchline → (no motion; sustained held frame, no rule needed)

**camera modifier**: The pan IS the camera. One `.world` virtual-camera transform in PAN mode — `viewport-change` — sequenced across stops by `multi-phase-camera`, each stop targeted via `coordinate-target-zoom` (pan-to-target). No depth push-in (that distinguishes this from the cluster-push-in / dataviz-pushthrough blueprints).

## Selected motion rule: coordinate-target-zoom

---
name: coordinate-target-zoom
description: Zoom into a specific non-centered element by combining scale with counter-translation — target ends at viewport center after the zoom completes.
metadata:
  tags: camera, zoom, scale, translate, target, off-center, focus
---

# Coordinate Target Zoom

A simple `scale > 1` on a wrapper pushes off-center content OFF the visible canvas. To zoom _into_ a specific non-centered element, apply scale AND an inverse translation in lockstep so the target lands at viewport center.

## How It Works

Two nested wrappers, separated concerns:

1. **Outer wrapper** applies `scale` (the zoom)
2. **Inner wrapper** applies `translate(x, y)` (the counter-shift)

The translate is the **negation** of the target's offset from center. The inner translate moves the target back to the outer's transform-origin BEFORE the outer scale fires, so the scale around center maps the target to 0.

```
T = -offset
```

Derivation (outer scales the inner-translated content):

1. Inner translate moves target by T in pre-scale units → target at `offset + T`
2. Outer scale S (around center 0,0) maps that to `S × (offset + T)`
3. For target to land at viewport center: `S × (offset + T) = 0` → **`T = -offset`**

Note: the formula does NOT depend on S. The translate amount is the same whether you zoom 1.5×, 2×, or 3× — as long as the OUTER is the scale and the INNER is the translate, and scale uses `transform-origin: 50% 50%`.

## Getting the offset

`T = -offset` is only as good as `offset`. The #1 way this pattern ships broken is hand-computing `offset` from a layout formula, getting the **sign** or magnitude wrong, and letting the zoom amplify a small error off-screen. **Default to measuring the target's real laid-out center; reserve the formula for symmetric rows.**

### Default — measure the target's actual center (works for ANY layout)

Read where the target actually is, once, at setup. This is immune to sign errors because it's derived from the rendered DOM, not a mental model:

```js
await document.fonts.ready; // metrics final; fallback fonts are 10–30px off → tens of px after a 3×+ zoom
const W = 1920,
  H = 1080;
const r = document.getElementById("target-card").getBoundingClientRect();
const TARGET_OFFSET_X = r.left + r.width / 2 - W / 2;
const TARGET_OFFSET_Y = r.top + r.height / 2 - H / 2;
// bake these; feed counterX/Y = -TARGET_OFFSET_X/Y to the inner tween
```

This `getBoundingClientRect` runs **once at setup**, before timeline registration — NOT per-frame (per-frame DOM reads desync under the renderer's parallel sampling; see SKILL universal constraints). Because the measurement is async (`fonts.ready`), build and register the timeline inside the same `async` setup so the baked offset is ready before `window.__timelines[id]` is published.

### Shortcut — symmetric equal-width row ONLY

If (and only if) the target is one of N **equal-width** cards in a centered row with uniform gaps, you may skip measurement:

```js
const index_offset = targetIndex - (N - 1) / 2;
const TARGET_OFFSET_X = index_offset * (CARD_WIDTH + CARD_GAP);
```

⚠️ This assumes every sibling is the **same width**. The moment the row is asymmetric — a wide companion label beside a narrow chip, a wordmark flanked by unequal elements — it gives the wrong answer, often the wrong **sign**: the heavier side shifts the centered target the _opposite_ way you'd guess. (A real example: `companion(220) + gap + wordmark + gap + chip(110)` puts the wordmark ~55px **right** of center, but the "chip − companion" intuition says left.) For anything but equal cards, **measure**.

### Headroom budget — cap the scale from the measured size

A zoom multiplies any centering error, so leave margin. Keep the target ≤ ~88% of the canvas at peak; derive the cap from the measured size instead of picking a round number by feel:

```js
const maxScale = Math.min((0.88 * W) / r.width, (0.88 * H) / r.height);
const ZOOM_SCALE = Math.min(DESIRED_SCALE, maxScale);
```

A target that fills 97%+ of the frame reads as cut-off the instant its center is even slightly off — and a hand-baked offset always is. (The perception gate flags this as `primary-offscreen`, and `data-layout-allow-overflow` does **not** exempt it.)

## HTML

```html
<div
  class="scene"
  id="zoom-scene"
  data-composition-id="zoom-scene"
  data-start="0"
  data-duration="5"
  data-track-index="0"
>
  <div class="zoom-outer" id="zoom-outer">
    <div class="zoom-inner" id="zoom-inner">
      <div class="content">
        <!-- Several layout elements; one is the "target" -->
        <div class="card other">
          <div class="label">{label1}</div>
          <div class="price">{price1}</div>
        </div>
        <div class="card other">
          <div class="label">{label2}</div>
          <div class="price">{price2}</div>
        </div>
        <div class="card target" id="target-card">
          <div class="label">{targetLabel}</div>
          <div class="price">{targetPrice}</div>
          <div class="tag">{targetTagline}</div>
        </div>
        <div class="card other">
          <div class="label">{label4}</div>
          <div class="price">{price4}</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## CSS

```css
.scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;        /* REQUIRED — see Critical Constraints */
  background: {bgGradient};
}
.zoom-outer {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  transform-origin: 50% 50%;
  will-change: transform;
}
.zoom-inner {
  display: grid;
  place-items: center;
  will-change: transform;
}
.content {
  display: flex;
  gap: CARD_GAP;
}
.card {
  width: CARD_WIDTH;
  padding: CARD_PADDING;
  border-radius: CARD_RADIUS;
  background: {cardBg};
  border: 1px solid {cardBorder};
  text-align: center;
  font-family: {font};
}
.card.target {
  background: {targetCardBg};       /* slightly brighter than .card */
  border: 2px solid {targetBorder};
  box-shadow: {targetGlow};
}
.label {
  font-size: LABEL_FONT_SIZE;
  font-weight: 800;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: {labelColor};
}
.price {
  font-size: PRICE_FONT_SIZE;
  font-weight: 900;
  color: {textColor};
  margin: 16px 0;
  font-variant-numeric: tabular-nums;
}
.tag {
  font-size: TAG_FONT_SIZE;
  font-weight: 700;
  letter-spacing: 4px;
  color: {accentColor};
  opacity: 0;
}
```

## GSAP Timeline

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  // TARGET_OFFSET_X / TARGET_OFFSET_Y and ZOOM_SCALE come from the "Getting the
  // offset" section above — MEASURED at setup (after fonts.ready) and baked. Do NOT
  // hand-derive the offset for a non-symmetric layout (wrong sign → the zoom shoves
  // the target off-frame). For a measured target, build the timeline inside that
  // async setup so the offset is ready before window.__timelines[id] is published.

  // Counter-translation = -offset (inner translate cancels target offset BEFORE outer scales)
  const counterX = -TARGET_OFFSET_X;
  const counterY = -TARGET_OFFSET_Y;

  // Phase 1 — cards reveal
  tl.from(
    ".card",
    { opacity: 0, y: REVEAL_Y, stagger: REVEAL_STAGGER, duration: REVEAL_DUR, ease: "power3.out" },
    REVEAL_START,
  );

  // Phase 2 — pause to let viewer scan the layout

  // Phase 3 — zoom into target
  tl.to(
    "#zoom-outer",
    {
      scale: ZOOM_SCALE,
      duration: ZOOM_DUR,
      ease: "power3.inOut",
    },
    ZOOM_START,
  );
  tl.to(
    "#zoom-inner",
    {
      x: counterX,
      y: counterY,
      duration: ZOOM_DUR,
      ease: "power3.inOut",
    },
    ZOOM_START,
  );

  // Phase 4 — target "tag" reveals inside the zoomed-in target
  tl.to(
    ".target .tag",
    { opacity: 1, duration: TAG_REVEAL_DUR, ease: "power2.out" },
    TAG_REVEAL_START,
  );

  // Phase 5 — climax dwell — viewer reads the target content
  // (no additional motion; the zoomed-in state holds for DWELL_DUR seconds)

  window.__timelines["zoom-scene"] = tl;
</script>
```

## Variations

### Dynamic target lookup via `getBoundingClientRect`

This is now the **default**, not a variation — see [Getting the offset](#getting-the-offset). Always `await document.fonts.ready` before measuring (fallback-font metrics are off by 10–30px, which a 3×+ zoom magnifies into tens of visible px) and measure **once at setup**, never per-frame.

### Zoom out (target → wide view)

Reverse the phases — start at zoomed-in, then `scale: 1` + `x: 0, y: 0` to pull back. The "reveal" beat is the panorama.

### Multi-target zoom sequence

Chain multiple zooms: target A (1.5-2.5s) → pause → target B (3-4s) → pull back (4.5-5s). Each segment needs its own counter-translation pair.

## How to Choose Values

### Layout

- **CARD_WIDTH / CARD_GAP / CARD_PADDING / CARD_RADIUS** — geometric layout.
  - Constraints: `N × CARD_WIDTH + (N-1) × CARD_GAP < viewportWidth` so all cards fit pre-zoom
  - Effects: smaller cards → more siblings on screen → busier composition; larger cards → fewer siblings, more emphasis per card
- **LABEL_FONT_SIZE / PRICE_FONT_SIZE / TAG_FONT_SIZE** — typographic hierarchy.
  - Range: tag < label < price (price is the focal element after zoom; sizing it largest reinforces this)

### Reveal phase

- **REVEAL_START** — when the cards begin fading in.
  - Constraints: typically a small offset (~0.2s) for a beat of black before content appears
- **REVEAL_DUR** — per-card fade-up duration.
  - Range: 0.4-0.8s
- **REVEAL_Y** — initial vertical offset of each card before fade-up (in px).
  - Range: 16-48 px; bigger feels "thrown in," smaller feels gentle
- **REVEAL_STAGGER** — delay between consecutive card reveals.
  - Range: 0.06-0.15s; calibrated so all cards finish before `ZOOM_START`

### Zoom phase

- **ZOOM_START** — when the zoom begins.
  - Constraints: `≥ REVEAL_START + REVEAL_DUR + (N-1) × REVEAL_STAGGER + viewer-scan-time` (give viewer 0.5-1.5s to read the layout before zooming)
- **ZOOM_DUR** — duration of the zoom tween.
  - Range: 1.0-2.0s; under 0.8s feels like a teleport, over 2.5s drags
  - Constraints: scale tween + counter-translate tween MUST share this duration AND ease
- **ZOOM_SCALE** — final magnification.
  - Range: 1.5× (modest emphasis) → 3× (dominant focus) → 5×+ (cinematic extreme)
  - Constraints: card content must remain crisp at this scale; raster source media needs `sourceResolution ≥ rendered × ZOOM_SCALE`
  - **Headroom budget**: cap from the measured target size so the target stays ≤ ~88% of the canvas at peak — `ZOOM_SCALE = Math.min(DESIRED, 0.88×W/r.width, 0.88×H/r.height)`. Picking a round number by feel (e.g. 3.2× on a 585px wordmark → 1872px = 97% of 1920) leaves no margin, so any centering slop cuts the text off.

### Target reveal + dwell

- **TAG_REVEAL_START** — when the target's hidden tag fades in.
  - Constraints: `≥ ZOOM_START + ZOOM_DUR` (only reveal after the zoom settles, so viewer's eye is already on the target)
- **TAG_REVEAL_DUR** — tag fade-in duration.
  - Range: 0.3-0.6s
- **DWELL_DUR** — post-zoom hold so the viewer reads the target.
  - Range: ≥ 1.0s after tag reveals (see "Climax dwell" in Key Principles)

### Color tokens

- **{bgGradient}** — typically a dark radial gradient to vignette the cards
- **{cardBg} / {cardBorder}** — non-target cards (subtle, recessive)
- **{targetCardBg} / {targetBorder} / {targetGlow}** — target card visually brighter / haloed so the eye lands there before the zoom even fires
- **{labelColor} / {textColor} / {accentColor}** — hierarchical text colors; `{accentColor}` reserved for the tag (pops on reveal)

## Key Principles

- **Measure the offset, don't hand-derive it** — for any layout that isn't a symmetric equal-width row, read the target's real center with `getBoundingClientRect` at setup (after `fonts.ready`) and bake it (see [Getting the offset](#getting-the-offset)). Hand-computed offsets silently get the **sign** wrong on asymmetric layouts, and the zoom amplifies the error off-screen — the single most common way this pattern ships broken.
- **Transform order — outer scales, inner translates** — DO NOT put scale and translate on the SAME element. The transform math becomes tangled (`translate * scale` ≠ `scale * translate` in CSS transform composition). Nested wrappers cleanly separate concerns.
- **Counter-translate = -offset** — independent of scale. Derive from: outer scale around center maps `(offset + T)` to `S × (offset + T)`. Setting that to zero gives `T = -offset`. A common wrong intuition is `T = -offset × (S - 1)` — it happens to give the same answer at S=2 but is wrong for any other S.
- **`transform-origin: 50% 50%` on outer wrapper** — non-center origin causes unpredictable inner offset; always center.
- **`overflow: hidden` on `.scene` REQUIRED** — at zoom > 1, the outer-scaled content can leak beyond the 1920×1080 frame.
- **Tween scale and counter-translate together** — they MUST share `duration` and `ease`. Otherwise the target drifts mid-zoom (visible "wandering"). Easiest: pass identical params to both tweens at the same time position.
- **❗ Climax dwell ≥1s after zoom completes** — see SKILL universal constraints. If zoom ends at t=3.0 in a 3.5s comp, viewer barely sees the target; aim for 1.5-2s post-zoom dwell.

## Critical Constraints

- **Timeline must be paused**: `gsap.timeline({ paused: true })`
- **Registry key = `data-composition-id`**
- **No CSS `transition` on `.zoom-outer` or `.zoom-inner`** — competes with GSAP
- **`will-change: transform`** on both wrappers — the transforms update every frame during the zoom phase
- **`transform-origin: 50% 50%` on `.zoom-outer`** — center-based scaling is what the counter-translate math assumes
- **Target offset baked once, at setup, from measurement** — measure the target center after `fonts.ready` and bake (see [Getting the offset](#getting-the-offset)); never recompute per-frame in onUpdate, and never hand-estimate the offset for a non-symmetric layout
- **Scale within the headroom budget** — keep the target ≤ ~88% of the canvas at peak, derived from the measured size (`maxScale = 0.88 × W / measuredWidth`); a target that fills the frame is cut off the instant the center is slightly off

## Combinations

- [multi-phase-camera.md](multi-phase-camera.md) — multi-phase camera that includes a coordinate-target-zoom phase
- [sine-wave-loop.md](sine-wave-loop.md) — idle breathing on the target AFTER zoom settles
- [discrete-text-sequence.md](discrete-text-sequence.md) — text assembly in the target BEFORE zoom completes

## Pairs with HF skills

- `/hyperframes-animation` — two coordinated tweens
- `/hyperframes-core` — composition wiring
- `/hyperframes-cli` — `hyperframes lint`

## Selected motion rule: css-marker-patterns

# CSS Patterns for Marker Highlighting

Pure CSS + GSAP implementations of all five MarkerHighlight.js drawing modes. Use these for deterministic rendering in HyperFrames compositions — no external library dependency, full GSAP timeline control.

## Contents

- [1. Highlight Mode](#1-highlight-mode) — Yellow marker sweep behind text
- [2. Circle Mode](#2-circle-mode) — Hand-drawn ellipse around text
- [3. Burst Mode](#3-burst-mode) — Radiating lines from text
- [4. Scribble Mode](#4-scribble-mode) — Chaotic scribble over text
- [5. Sketchout Mode](#5-sketchout-mode) — Rough rectangle outline

## 1. Highlight Mode

Yellow marker sweep behind text. The most common mode.

```html
<span class="mh-highlight-wrap">
  <span class="mh-highlight-bar" id="hl-1"></span>
  <span class="mh-highlight-text">highlighted text</span>
</span>
```

```css
.mh-highlight-wrap {
  position: relative;
  display: inline;
}
.mh-highlight-bar {
  position: absolute;
  top: 0;
  left: -6px;
  right: -6px;
  bottom: 0;
  background: #fdd835;
  opacity: 0.35;
  transform: scaleX(0);
  transform-origin: left center;
  border-radius: 3px;
  z-index: 0;
}
.mh-highlight-text {
  position: relative;
  z-index: 1;
}
```

```js
// Sweep in from left
tl.to("#hl-1", { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0.6);

// Optional: skew for hand-drawn feel
// gsap.set("#hl-1", { skewX: -2 });
```

### Multi-line Highlight

Stagger bars across multiple lines:

```js
tl.to(
  ".mh-highlight-bar",
  {
    scaleX: 1,
    duration: 0.5,
    ease: "power2.out",
    stagger: 0.3,
  },
  0.6,
);
```

## 2. Circle Mode

Hand-drawn circle around text. Use `border-radius: 50%` with a slight rotation for organic feel.

```html
<span class="mh-circle-wrap">
  <span class="mh-circle-text" id="circle-word">IMPORTANT</span>
  <span class="mh-circle-ring" id="circle-1"></span>
</span>
```

```css
.mh-circle-wrap {
  position: relative;
  display: inline;
}
.mh-circle-text {
  position: relative;
  z-index: 1;
}
.mh-circle-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 160%;
  transform: translate(-50%, -50%) rotate(-3deg) scale(0);
  border: 3px solid #e53935;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
```

```js
// Circle scales in with a wobble
tl.to(
  "#circle-1",
  {
    scale: 1,
    rotation: -3,
    duration: 0.6,
    ease: "back.out(1.7)",
    transformOrigin: "center center",
  },
  0.7,
);
```

### Variations

```css
/* Tighter circle (for short words) */
.mh-circle-ring.tight {
  width: 150%;
  height: 180%;
}

/* Squared circle (rounded rectangle) */
.mh-circle-ring.rounded {
  border-radius: 30%;
  width: 120%;
  height: 140%;
}

/* Ellipse (wider than tall) */
.mh-circle-ring.ellipse {
  width: 150%;
  height: 130%;
  border-radius: 50%;
}
```

## 3. Burst Mode

Radiating lines from text center. Each line is a positioned div rotated to its angle.

```html
<span class="mh-burst-wrap">
  <span class="mh-burst-text">WOW</span>
  <span class="mh-burst-container" id="burst-1">
    <span class="mh-burst-line" style="--angle: 0deg; --len: 70px;"></span>
    <span class="mh-burst-line" style="--angle: 30deg; --len: 55px;"></span>
    <span class="mh-burst-line" style="--angle: 60deg; --len: 80px;"></span>
    <span class="mh-burst-line" style="--angle: 90deg; --len: 45px;"></span>
    <span class="mh-burst-line" style="--angle: 120deg; --len: 65px;"></span>
    <span class="mh-burst-line" style="--angle: 150deg; --len: 75px;"></span>
    <span class="mh-burst-line" style="--angle: 180deg; --len: 50px;"></span>
    <span class="mh-burst-line" style="--angle: 210deg; --len: 60px;"></span>
    <span class="mh-burst-line" style="--angle: 240deg; --len: 80px;"></span>
    <span class="mh-burst-line" style="--angle: 270deg; --len: 40px;"></span>
    <span class="mh-burst-line" style="--angle: 300deg; --len: 70px;"></span>
    <span class="mh-burst-line" style="--angle: 330deg; --len: 55px;"></span>
  </span>
</span>
```

```css
.mh-burst-wrap {
  position: relative;
  display: inline;
}
.mh-burst-text {
  position: relative;
  z-index: 2;
}
.mh-burst-container {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  z-index: 1;
}
.mh-burst-line {
  position: absolute;
  display: block;
  width: 3px;
  height: var(--len);
  background: #1e88e5;
  left: -1.5px;
  top: calc(-1 * var(--len));
  transform: rotate(var(--angle));
  transform-origin: bottom center;
  opacity: 0;
}
```

```js
// All lines burst outward simultaneously with slight stagger
tl.fromTo(
  "#burst-1 .mh-burst-line",
  { scaleY: 0, opacity: 0 },
  { scaleY: 1, opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.03 },
  0.7,
);
```

**Vary line lengths** (40-80px range) for an organic, hand-drawn feel. Equal lengths look mechanical.

## 4. Scribble Mode

Wavy SVG underlines and strikethroughs that draw themselves via `stroke-dashoffset`.

```html
<span class="mh-scribble-wrap">
  <span class="mh-scribble-text">underlined text</span>
  <svg class="mh-scribble-svg" viewBox="0 0 500 24" preserveAspectRatio="none">
    <path
      id="scribble-1"
      d="M0,12 Q31,0 62,12 Q93,24 125,12 Q156,0 187,12 Q218,24 250,12 Q281,0 312,12 Q343,24 375,12 Q406,0 437,12 Q468,24 500,12"
      fill="none"
      stroke="#FDD835"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>
</div>
```

```css
.mh-scribble-wrap {
  position: relative;
  display: inline;
}
.mh-scribble-text {
  position: relative;
  z-index: 1;
}
.mh-scribble-svg {
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 100%;
  height: 24px;
  z-index: 0;
}
```

```js
// Measure path length and set initial dash state
var path = document.querySelector("#scribble-1");
var len = path.getTotalLength();
gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });

// Draw the line
tl.to(
  "#scribble-1",
  {
    strokeDashoffset: 0,
    duration: 0.8,
    ease: "power1.inOut",
  },
  0.7,
);
```

### Strikethrough Variant

Position the SVG at `top: 50%; transform: translateY(-50%)` instead of `bottom: -6px`.

### Wavy Path Generator

Scale the path's viewBox width to match text width. The wave pattern `Q x1,y1 x2,y2` alternates between `y=0` and `y=24` for a natural wobble. Adjust the control points for tighter or looser waves:

- **Tight waves**: smaller x-increments (25px per half-wave)
- **Loose waves**: larger x-increments (50px per half-wave)
- **Amplitude**: change the y range (0-24 for standard, 0-16 for subtle)

## 5. Sketchout Mode

Cross-hatch lines over de-emphasized text. Multiple angled lines create a "crossed out" effect.

```html
<span class="mh-sketchout-wrap">
  <span class="mh-sketchout-text">old price</span>
  <span class="mh-sketchout-lines" id="sketchout-1">
    <span class="mh-sketchout-line mh-sketchout-fwd"></span>
    <span class="mh-sketchout-line mh-sketchout-bwd"></span>
  </span>
</span>
```

```css
.mh-sketchout-wrap {
  position: relative;
  display: inline;
}
.mh-sketchout-text {
  position: relative;
  z-index: 0;
}
.mh-sketchout-lines {
  position: absolute;
  top: 0;
  left: -4px;
  right: -4px;
  bottom: 0;
  overflow: hidden;
  z-index: 1;
}
.mh-sketchout-line {
  position: absolute;
  display: block;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
  background: #e53935;
  transform-origin: left center;
  transform: scaleX(0);
}
.mh-sketchout-fwd {
  transform: scaleX(0) rotate(-12deg);
}
.mh-sketchout-bwd {
  transform: scaleX(0) rotate(12deg);
}
```

```js
// Forward slash draws first
tl.to(
  "#sketchout-1 .mh-sketchout-fwd",
  {
    scaleX: 1,
    duration: 0.3,
    ease: "power2.out",
  },
  1.0,
);

// Backward slash follows
tl.to(
  "#sketchout-1 .mh-sketchout-bwd",
  {
    scaleX: 1,
    duration: 0.3,
    ease: "power2.out",
  },
  1.15,
);
```

## Combining Modes in Captions

Use mode cycling for visual variety across caption groups:

```js
var MODES = ["highlight", "circle", "burst", "scribble"];

GROUPS.forEach(function (group, gi) {
  var mode = MODES[gi % MODES.length];
  // Apply the mode's CSS pattern to emphasis words in this group
  group.emphasisWords.forEach(function (word) {
    applyMode(word.el, mode, tl, word.start);
  });
});
```

Cycle every 2-3 groups for high energy, every 3-4 for medium, every 4-5 for low.

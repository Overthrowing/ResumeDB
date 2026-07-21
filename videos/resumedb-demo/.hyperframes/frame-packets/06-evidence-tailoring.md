# Frame packet: 06-evidence-tailoring

## Project inputs

- Project: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo
- Design tokens: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo/frame.md
- RULES_DIR: /Users/nathanye/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 6 - Tailor with evidence

- scene: Northstar requirements slide into a before-and-after comparison where each stronger phrase remains visibly tied to a canonical source.
- voiceover: "For this Northstar role, ResumeDB matches the description semantically, rewrites each bullet, and shows the evidence behind every stronger phrase - before and after."
- duration: 9.24s
- poster: 8s
- transition_in: zoom-through
- status: built
- src: compositions/frames/06-evidence-tailoring.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: skepticism to trust
- blueprint: comparison-split
- asset_candidates: assets/07-evidence-tailoring.png - three evidence-backed before and after tailoring cards
- focal: assets/07-evidence-tailoring.png
- roles: 07-evidence-tailoring = primary comparison surface; requirement tags = supporting; evidence links = foreground trust proof

Reproduce: use the comparison-split signature directly on the captured Northstar tailoring view, with each stronger phrase tied to its visible source.
Scene 1 (0.0-2.0s): The real Northstar evidence-tailoring view arrives as a 70-percent surface with the job requirements held in the upper third; one clean focus move locks on the first requirement.
Scene 2 (2.0-4.4s): React, TypeScript, Python, and PostgreSQL tags reveal sequentially on the matching narration beats; the rest of the page softens slightly.
Scene 3 (4.4-7.1s): Original bullets open on the left and tailored bullets wipe in on the right with a velocity-matched split seam; changed keywords receive narrow marker highlights from `css-marker-patterns`.
Scene 4 (7.1-9.24s): Evidence links draw upward into every stronger phrase using `svg-path-draw`, then Before and After labels settle as the full real surface returns to sharp focus.

narrativeRole: Demonstrate the quality and defensibility of the AI's core tailoring work.
keyMessage: Stronger positioning is grounded in real student evidence.

## Selected blueprint: comparison-split

# comparison-split — Comparison Split-Cards

**intent**: Two paired items of equal weight shown side-by-side with mirrored 3D "book-open" tilts — the eye reads them as a balanced comparison, then a pill badge lands at each card's inner edge to punctuate. The motion IS the symmetry: two cards arriving from opposite wings into a held spread.

**roles served**

- Key_Feature (from `comparison-split-cards`): when two complementary features / capabilities of equal weight should be presented **simultaneously, not sequentially** — an A/B, a "X + Y together," paired concepts the viewer must weigh side-by-side. Not for >2 items (use `grid-card-assemble`) or sequential steps.

**duration**: 4–6s

**shot structure** (a `[bg]` canvas carrying two faint ambient glow blooms — `[accent A]` near 30%, `[accent B]` near 70% — so each side owns a color identity across a 50% symmetry axis; equal-width cards under one shared perspective parent)

- **Scene 1 (0.0–~0.8s) — title sets the concept.** A centered `[title line]` with an `[accent keyword]` slides DOWN into place from just above (a short smooth settle). The downward arrival is deliberate: it forms a non-conflicting T-shape against the cards, which arrive from the sides next.
- **Scene 2 (~0.4–1.9s) — the split-tilt entry (signature move).** Two equal-width feature cards arrive from opposite wings — `[left card]` from the left, `[right card]` from the right ~0.2s behind — each carrying a **mirrored 3D `rotateY` tilt** (left faces right, right faces left, opening like a book) and scaling ~0.85→1 as it lands. The entry overlaps the title's tail so the whole thing reads as ONE arrival, not two beats. Each card holds `[image / label / subtitle]`; box-shadows fall **outward** from the tilt (left shadow right, right shadow left).
- **Scene 3 (~1.9–end) — badges punctuate, then hold.** A pill `[badge]` lands at each card's **inner edge** (left then right, ~0.3s apart), overlapping its card ~15% so it reads as attached, not orbiting. This is the lone overshoot in the shot — it earns the punctuation. Settles and holds.

**motion vocabulary**: title slide-down from above; mirrored opposite-wing card entry; static book-open `rotateY` tilt (`+tilt` left, `−tilt` right); tilt-matched outward box-shadow; inner-edge badge spring-pop; gentle phase-opposed idle float (left vs right, never synchronized) registered as subtle jitter; dual side-glow ambient.

**rule mapping**

- two cards entering from opposite wings with mirrored `rotateY` tilts + tilt-matched shadow → `split-tilt-cards` (the signature; keep the two-layer split so the entry `x`/`scale` and the idle never collide on one alias)
- title slide-down settle → `gsap-effects` (translate + opacity on a long-tail `power3`)
- inner-edge pill badge pop (the one overshoot) → `spring-pop-entrance` (overshoot register — earns the punctuation)
- phase-opposed idle float on the pair → `sine-wave-loop` (low-amplitude register — subtle jitter, NOT lazy breathing; left `sin(t)`, right `sin(t+π)` so they never conveyor-belt)
- the two faint side glows behind the cards → `ambient-glow-bloom` (un-triggered soft bloom, one per accent)

**camera modifier**: camera-static by default — the symmetry is the subject and a move would break the balance.

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

## Selected motion rule: svg-path-draw

---
name: svg-path-draw
description: Animate SVG paths drawing progressively using stroke-dasharray and stroke-dashoffset.
metadata:
  tags: svg, stroke, draw, path, reveal, icon, vector
---

# SVG Path Draw

Reveals an SVG shape by animating its stroke as if a pen were tracing it. The line appears to be drawn in real-time.

## How It Works

The trick uses two SVG stroke properties together:

1. **`stroke-dasharray = <pathLength>`** — sets the dash pattern to a single dash equal to the path's total length, so the entire path is "one dash"
2. **`stroke-dashoffset`** — controls how much of the dash is shifted out of view. Start at `pathLength` (entire path is offset out → invisible), animate to `0` (no offset → fully drawn)

The path length is computed via the DOM API `path.getTotalLength()`.

## HTML

```html
<div
  class="scene"
  id="svg-draw-scene"
  data-composition-id="svg-draw-scene"
  data-start="0"
  data-duration="3"
  data-track-index="0"
>
  <svg class="logo-mark" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <!-- Multi-segment glyph; draw all segments sequentially -->
    <path id="bar-left" d="M 60 40 L 60 160" />
    <path id="bar-right" d="M 140 40 L 140 160" />
    <path id="bar-mid" d="M 60 100 L 140 100" />
  </svg>
  <div class="brand-line">{Brand}</div>
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
  background: {bgColor};
  gap: 32px;
}

.logo-mark {
  width: 320px;
  height: 320px;
}

.logo-mark path {
  fill: none;
  stroke: {accentColor};
  stroke-width: 12;
  stroke-linecap: round; /* soften endpoints */
  stroke-linejoin: round;
  /* Initial state: invisible. GSAP fills strokeDasharray + strokeDashoffset
     based on each path's measured length. */
}

.brand-line {
  font-family: {font};
  font-weight: 700;
  font-size: 48px;
  color: {textColor};
  opacity: 0; /* fades in after stroke completes */
  letter-spacing: 0.04em;
}
```

## GSAP Timeline

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};

  // Named constants — assignments live in the example, not here.
  // See "How to Choose Values" below for ranges and selection criteria.
  const SEGMENT_DRAW_DUR; // per-segment stroke duration
  const FINAL_SEGMENT_DUR; // shorter draw on the last (shorter) segment
  const SEG_1_START; // first segment start time
  const SEG_2_START; // second segment start time (overlaps SEG_1 tail)
  const SEG_3_START; // third segment start time (overlaps SEG_2 tail)
  const BRAND_FADE_DUR; // wordmark fade-in duration
  const BRAND_FADE_START; // wordmark fade-in start (after last stroke settles)

  // Measure each path's total length and set up its dash pattern.
  // getTotalLength() is a real DOM API — its return value is dynamic
  // measured geometry, NOT a magic number.
  const paths = document.querySelectorAll(".logo-mark path");
  paths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
  });

  const tl = gsap.timeline({ paused: true });

  // Stagger draws across segments — each starts before the previous finishes
  // so the eye reads continuous motion.
  tl.to(
    "#bar-left",
    {
      strokeDashoffset: 0,
      duration: SEGMENT_DRAW_DUR,
      ease: "power2.out",
    },
    SEG_1_START,
  );
  tl.to(
    "#bar-right",
    {
      strokeDashoffset: 0,
      duration: SEGMENT_DRAW_DUR,
      ease: "power2.out",
    },
    SEG_2_START,
  );
  tl.to(
    "#bar-mid",
    {
      strokeDashoffset: 0,
      duration: FINAL_SEGMENT_DUR,
      ease: "power2.out",
    },
    SEG_3_START,
  );

  // Brand line fades in after the strokes settle
  tl.to(
    ".brand-line",
    {
      opacity: 1,
      duration: BRAND_FADE_DUR,
      ease: "power1.out",
    },
    BRAND_FADE_START,
  );

  window.__timelines["svg-draw-scene"] = tl;
</script>
```

## How to Choose Values

- **SEGMENT_DRAW_DUR** — per-segment stroke duration
  - Range: 0.3-0.8s
  - Effects: low end reads as a fast snap (good for short segments); high end reads as a deliberate pen trace (good for long curves)
  - Constraints: must be short enough that the total chain (last segment finish) ends before BRAND_FADE_START; longer than ~1s feels sluggish for a logo reveal
  - Reference: short outline segments use ~0.5s

- **FINAL_SEGMENT_DUR** — duration of the shortest / final segment
  - Range: 0.25-0.6s
  - Effects: should be proportional to segment length — a short connector drawn at SEGMENT_DRAW_DUR appears slower than its longer siblings
  - Constraints: typically 60-80% of SEGMENT_DRAW_DUR when the segment is visibly shorter than the others
  - Reference: a mid-bar that is roughly 2/3 the length of the verticals uses ~0.35s

- **SEG_1_START** — first segment start time
  - Range: 0-0.4s
  - Effects: 0 starts immediately on play; >0 gives a brief beat of empty stage before motion
  - Constraints: should be ≥ 0
  - Reference: a small lead-in of ~0.2s lets the viewer settle before motion

- **SEG_2_START** — second segment start time
  - Range: SEG_1_START + (0.5 \* SEGMENT_DRAW_DUR) to SEG_1_START + SEGMENT_DRAW_DUR
  - Effects: closer to SEG_1_START + 0.5\*SEGMENT_DRAW_DUR feels rapid/overlapping; closer to SEG_1_START + SEGMENT_DRAW_DUR feels sequential
  - Constraints: stagger ~70-80% of SEGMENT_DRAW_DUR reads as continuous motion (not 3 isolated animations)
  - Reference: SEG_1_START + ~0.25s (about half of SEGMENT_DRAW_DUR)

- **SEG_3_START** — third segment start time
  - Range: SEG_2_START + (0.5 \* SEGMENT_DRAW_DUR) to SEG_2_START + SEGMENT_DRAW_DUR
  - Effects: same as SEG_2_START — controls perceived rhythm
  - Constraints: should preserve the same stagger ratio used between SEG_1 and SEG_2
  - Reference: SEG_2_START + ~0.4s

- **BRAND_FADE_DUR** — wordmark fade-in duration
  - Range: 0.3-0.8s
  - Effects: low end snaps in (urgent); high end glides in (premium / branded)
  - Constraints: must finish before the composition's `data-duration` ends
  - Reference: a calm logo lockup uses ~0.5s

- **BRAND_FADE_START** — wordmark fade-in start time
  - Range: max(SEG_3_START + FINAL_SEGMENT_DUR, …) to that value + 0.4s
  - Effects: starting exactly at last stroke end feels tightly chained; adding a small beat gives the strokes a moment to "settle" before the wordmark joins
  - Constraints: MUST be ≥ SEG_3_START + FINAL_SEGMENT_DUR (otherwise wordmark appears during the draw and competes with it)
  - Reference: SEG_3_START + FINAL_SEGMENT_DUR + ~0.2s

Ease families used here are discrete choices, not tunable scalars:

- **stroke draws** use `power2.out` — gentle deceleration mimics a hand lifting at end of stroke. Do NOT use `back.out` or `elastic.out` (pens don't bounce).
- **brand fade** uses `power1.out` — soft tail on an opacity tween.
- For a constant-speed "real pen" tracing feel, swap to `none` (see Variations).

## Variations

### Rotation start point (start from top instead of 3 o'clock)

By default, `<circle>` and `<rect>` start their stroke at 3 o'clock. Rotate the element to start from top:

```html
<circle
  cx="100"
  cy="100"
  r="60"
  id="ring"
  style="transform-origin: 100px 100px; transform: rotate(-90deg);"
/>
```

### Linear (constant-speed) draw

Use `ease: 'none'` for steady-rate drawing (like an actual pen tracing):

```js
tl.to("#path", { strokeDashoffset: 0, duration: SEGMENT_DRAW_DUR, ease: "none" }, SEG_1_START);
```

### Draw then fill

For SVG shapes that have a fill color, animate fill opacity to come in AFTER the stroke completes:

```js
tl.to(
  "#path",
  { strokeDashoffset: 0, duration: SEGMENT_DRAW_DUR, ease: "power2.out" },
  SEG_1_START,
);
tl.to(
  "#path",
  { fillOpacity: 1, duration: FILL_FADE_DUR, ease: "power1.out" },
  SEG_1_START + SEGMENT_DRAW_DUR,
);
```

Requires `fill-opacity: 0` initially and a real `fill` color in CSS.

## Key Principles

- **Set `strokeDasharray` to the path's `getTotalLength()` value**, not an arbitrary number — guessing means stroke will animate but not match the geometry
- **Start `strokeDashoffset` at the same length**, animate down to `0`
- **Measure inside the timeline setup, not at module top** — SVG may not be rendered when module code runs in some environments. In HF runtime this works at top because SVG is inline, but be safe
- **`stroke-linecap: round`** for softer endpoints (less abrupt finish)
- **For sequential multi-path draws, stagger by ~70-80% of the previous segment's duration** — eye reads it as continuous motion, not N separate animations
- **Don't pair with `back.out` or `elastic.out`** — bouncing strokes feel wrong (the pen wouldn't bounce)

## Critical Constraints

- **`fill: none` in CSS for outline-only draws** — otherwise the fill area appears immediately and ruins the reveal
- **Path length is measured in the browser**: requires SVG to be in the DOM. HF inline SVG is fine; loaded `<image>` SVGs may not be
- **Timeline must be paused**: `gsap.timeline({ paused: true })`
- **Registry key = `data-composition-id`**
- **Works on**: `<path>`, `<circle>`, `<rect>`, `<line>`, `<polyline>`, `<polygon>`, `<ellipse>` (anything with a stroke)
- **For complex paths**, if `getTotalLength()` looks wrong, overestimate `strokeDasharray` slightly (e.g. `len * 1.05`) — too large is invisible during animation start (no visible gap), too small clips the end

## Combinations

- [counting-dynamic-scale.md](counting-dynamic-scale.md) — pair: stroke draws an icon while a number counts up beside it
- [hacker-flip-3d.md](hacker-flip-3d.md) — pair: SVG logo draws, then a hacker-flipped wordmark reveals under it

## Pairs with HF skills

- `/hyperframes-animation` — timeline + stroke property tween
- `/hyperframes-core` — composition wiring
- `/hyperframes-cli` — `hyperframes lint`

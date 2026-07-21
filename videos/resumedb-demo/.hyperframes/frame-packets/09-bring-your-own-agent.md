# Frame packet: 09-bring-your-own-agent

## Project inputs

- Project: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo
- Design tokens: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo/frame.md
- RULES_DIR: /Users/nathanye/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 9 - Hosted or bring your own agent

- scene: One ResumeDB memory core branches to Hosted model and Your agent, then rejoins the same workflow with a No shared API key badge.
- voiceover: "Use ResumeDB's hosted model, or connect your own agent with no shared API key. Either way, the student keeps the same memory and workflow."
- duration: 8.16s
- poster: 6s
- transition_in: squeeze
- status: built
- src: compositions/frames/09-bring-your-own-agent.html
- type: benefit_highlight
- persuasion: Choice architecture
- beat: freedom and confidence
- blueprint: comparison-split - hosted and user-connected agents receive equal visual weight around one shared memory
- asset_candidates: assets/02-settings-profile-agent.png - hosted and connected-agent configuration inside Profile and Settings
- focal: assets/02-settings-profile-agent.png
- roles: 02-settings-profile-agent = real settings foundation; hosted agent = supporting branch; connected agent = supporting branch; shared memory = foreground anchor

Adapt: retain equal choice architecture while anchoring both branches in the captured agent-settings section.
Scene 1 (0.0-2.0s): The real Profile and Settings capture seats as a wide background surface and the agent-connection area sharpens while the remaining page softens.
Scene 2 (2.0-4.45s): Hosted model and Your agent cards split from one central ResumeDB memory node using `center-outward-expansion`; each branch receives equal scale and weight.
Scene 3 (4.45-6.45s): Thin data paths draw from the shared memory into both cards with `svg-path-draw`, then rejoin the same application workflow below.
Scene 4 (6.45-8.16s): A “No shared API key” badge draws around the connected-agent branch; both choices hold together over the real settings view.

narrativeRole: Resolve the cost and agent-preference objection without splitting the product experience.
keyMessage: Most users can use hosted AI, while power users can connect their own agent.

## Selected motion rule: center-outward-expansion

---
name: center-outward-expansion
description: Elements start clustered at screen center and expand outward to their final positions, driven by a shared progress value.
metadata:
  tags: expansion, scatter, center, reveal, layout, sync, burst
---

# Center-Outward Expansion

Elements begin at a shared center point and radiate outward to their final positions. The expansion can be the entry beat itself, or **driven by another animation's progress** (e.g. a counting number growing) for coordinated motion.

## How It Works

Each element has a `targetX/Y` (its final layout position) and a shared `centerX/Y`. A `progress` value (0→1) interpolates each element between center and target:

```js
const x = centerX + (targetX - centerX) * progress;
const y = centerY + (targetY - centerY) * progress;
```

When `progress = 0` all elements overlap at the center; when `progress = 1` they're at their final spots.

## HTML

```html
<div
  class="scene"
  data-composition-id="burst-scene"
  data-start="0"
  data-duration="3"
  data-track-index="0"
>
  <div class="burst-wrap">
    <div class="burst-item" data-target-x="-360" data-target-y="-180">{itemA}</div>
    <div class="burst-item" data-target-x="360" data-target-y="-180">{itemB}</div>
    <div class="burst-item" data-target-x="-360" data-target-y="180">{itemC}</div>
    <div class="burst-item" data-target-x="360" data-target-y="180">{itemD}</div>
    <div class="burst-item" data-target-x="0" data-target-y="-360">{itemE}</div>
    <div class="burst-item" data-target-x="0" data-target-y="360">{itemF}</div>
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
  background: {bgColor};
}
.burst-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}
.burst-item {
  position: absolute;
  /* Items start at the wrap center via the absolute + 50% trick.
     We tween translate offsets via GSAP, not left/top. */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: {itemSize};
  height: {itemSize};
  display: grid;
  place-items: center;
  background: {itemBgColor};
  border-radius: 28px;
  font-family: {font};
  font-weight: 900;
  font-size: 96px;
  color: {textColor};
  will-change: transform;
}
```

## GSAP Timeline

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  const items = document.querySelectorAll(".burst-item");

  // Each element gets its own from→to that lerps center (translate(-50%, -50%))
  // → target offset. xPercent/yPercent bakes the self-centering; x/y animates
  // toward the target.
  items.forEach((el, i) => {
    const targetX = Number(el.dataset.targetX);
    const targetY = Number(el.dataset.targetY);
    tl.fromTo(
      el,
      { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.6, opacity: 0 },
      {
        x: targetX,
        y: targetY,
        scale: 1,
        opacity: 1,
        duration: EXPAND_DUR,
        ease: EXPAND_EASE,
      },
      i * STAGGER + ENTRY_AT, // stagger; ENTRY_AT offsets the burst beat
    );
  });

  window.__timelines["burst-scene"] = tl;
</script>
```

## How to Choose Values

- **ITEM_COUNT** — number of elements in the burst
  - Range: 3–8
  - Effects: 3 = sparse; 8 = busy. > 8 causes visual chaos where cards overlap mid-expansion
  - Constraints: at low counts, prefer wider angular spread (target positions further apart)

- **EXPAND_DUR** — duration of each item's center → target tween
  - Range: 1.0–1.8 s
  - Effects: shorter = snappy burst; longer = floats outward
  - Constraints: if driven by a counter, must equal the counter's duration (chord)

- **EXPAND_EASE** — shared ease across all items
  - Discrete choice: `power2.out`, `power3.out`, `expo.out`
  - Selection: `power3.out` is the default — fling out then settle. `power2.out` is gentler. `expo.out` makes them stop dramatically. Avoid `in` easings (they read as items being sucked back in mid-air).
  - Constraint: if driven by another animation, must be identical to the driver's ease

- **STAGGER** — gap between successive items' start times
  - Range: 0.04–0.08 s
  - Effects: < 0.04 = simultaneous chord; > 0.08 feels lazy / arpeggiated
  - Constraints: ITEM_COUNT × STAGGER must be < EXPAND_DUR or the last items still moving when others have landed reads as ragged

- **ENTRY_AT** — offset applied to the whole burst start
  - Range: 0 – 0.5 s
  - Effects: > 0 gives a beat of compositional quiet before the burst

- **START_PROGRESS** — fraction of the center→target path where items begin (for partially-spread variant)
  - Range: 0 (exact center) – 0.5
  - Effects: 0 = full cluster, dramatic spread; 0.3 = avoids initial pile-up at center

## Variations

### Synced expansion (driven by a counter)

If the burst should mirror a counting animation's progress:

```js
// Counter tween defines a state.value 0 → TARGET over COUNT_DUR
const counterState = { value: 0 };
const burstState = { p: 0 };

// Shared tween — same duration, same ease — visually a "chord"
tl.to(
  counterState,
  {
    value: COUNT_TARGET,
    duration: COUNT_DUR,
    ease: COUNT_EASE,
    onUpdate: () => (counterEl.textContent = Math.round(counterState.value).toLocaleString()),
  },
  0,
);

tl.to(
  burstState,
  {
    p: 1,
    duration: COUNT_DUR,
    ease: COUNT_EASE,
    onUpdate: () =>
      items.forEach((el) => {
        const tx = Number(el.dataset.targetX) * burstState.p;
        const ty = Number(el.dataset.targetY) * burstState.p;
        el.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px)`;
      }),
  },
  0,
);
```

### Starting partially-spread

To avoid the initial clustered mess (6+ elements stacked at center), start at `START_PROGRESS`:

```js
{ x: targetX * START_PROGRESS, y: targetY * START_PROGRESS, scale: 0.4, opacity: 0 }
```

### Idle micro-float at final position

Pair with `sine-wave-loop` after expansion lands — keeps elements alive instead of frozen.

## Key Principles

- **Driver vs driven** — if the burst stands on its own, use a per-item stagger; if it shadows another animation (counter, audio beat), share the same eased progress so they read as one beat
- **Stagger inside the 0.04-0.08 s band** — too tight and the cluster never separates visually, too loose and the burst feels lazy
- **Out-easing for the expansion** — out-easing makes items "fling" out then settle. In-easing looks like they're sucked back in mid-air
- **Element count: 3-8** — fewer feels empty, more causes visual chaos at the center where cards overlap mid-expansion
- **❗ Don't put a label below the burst as the "real headline"** — if you do, the eye snaps to the label and ignores the burst. The burst IS the beat. If a label is needed, use big block-caps and reveal it post-burst, in the same stacked layout.

## Critical Constraints

- **Timeline must be paused**: `gsap.timeline({ paused: true })`
- **Registry key = `data-composition-id`**
- **Use translate, not left/top** — translating composes cleanly with the centering `translate(-50%, -50%)` trick; mutating `left`/`top` fights the centering and causes pixel jitter
- **`will-change: transform`** on burst items — many simultaneous transforms benefit from compositor hints
- **No `position: absolute` parents inside `burst-wrap` other than items themselves** — sibling absolute elements would steal the centered baseline

## Combinations

- [counting-dynamic-scale.md](counting-dynamic-scale.md) — counter peak drives the burst peak (chord)
- [sine-wave-loop.md](sine-wave-loop.md) — idle motion after the burst lands
- [card-morph-anchor.md](card-morph-anchor.md) — burst out of a morphed card

## Pairs with HF skills

- `/hyperframes-animation` — timeline + stagger
- `/hyperframes-core` — composition wiring
- `/hyperframes-cli` — `hyperframes lint`

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

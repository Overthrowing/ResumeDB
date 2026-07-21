# Frame packet: 04-agent-timeline

## Project inputs

- Project: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo
- Design tokens: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo/frame.md
- RULES_DIR: /Users/nathanye/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 4 - Watch the agent work

- scene: A wide Career Agent run dominates the frame while a narrow checklist advances through knowledge, research, verification, and preparation, including a laser scan across supporting evidence.
- voiceover: "Every run stays observable: read the profile, inspect the posting, verify evidence, then prepare the strongest match."
- duration: 6.94s
- poster: 6s
- transition_in: push-slide LEFT
- status: built
- src: compositions/frames/04-agent-timeline.html
- type: benefit_highlight
- persuasion: Transparency
- beat: confidence
- blueprint: grid-card-assemble
- asset_candidates: assets/04-career-agent.png - live agent run timeline with four named stages
- focal: assets/04-career-agent.png
- roles: 04-career-agent = wide primary agent surface; checklist = narrow supporting rail; evidence scanner = foreground proof

Adapt: keep the four-stage accumulation, but give the wide Career Agent panel the action and compress the checklist into a narrow progress rail.
Scene 1 (0.0-1.35s): The real Career Agent view expands into a 75/25 asymmetric layout while a narrow four-step rail draws on at right; the active Read profile row receives the only violet accent.
Scene 2 (1.35-2.75s): Canonical profile facts slide into the left evidence pane and the checklist advances to Inspect posting sequentially; the real page remains readable behind the reconstructed live panel.
Scene 3 (2.75-4.35s): Northstar requirements appear in the center pane, selected phrases receive hand-drawn marker sweeps from `css-marker-patterns`, and the rail advances to Verify evidence.
Scene 4 (4.35-5.85s): A thin violet laser line travels top-to-bottom across both panes exactly once, leaving verified evidence rows sharp while unsupported space falls out of focus via `depth-of-field-blur`.
Scene 5 (5.85-6.94s): The rail advances to Prepare match, a 92% match chip fills, and all four stages remain visible for a short held read.

narrativeRole: Answer the judge's trust question by making autonomous work observable.
keyMessage: ResumeDB shows what the agent is doing and why.

## Selected blueprint: grid-card-assemble

# grid-card-assemble — Grid / Card Assemble

**intent**: N items (tiles / cards / logos / list-lines) self-assemble in a staggered cascade into a grid or vertical list and hold — a "look how much / who / what it does" beat that enumerates breadth at once; an optional camera zoom-OUT pulls back to reveal the assembled array sitting inside a vaster whole.

**roles served**

- Key_Feature (from key-feature-card-grid-assemble): a grid of labeled feature tiles/pills (icon + label) cascades one-by-one into a 2-col-brick / 3×3 grid, then holds near-static with a slow push-in — enumerate many capabilities, no live UI, no cursor.
- Key_Feature (from key-feature-glass-card-camera-reveal): open TIGHT on 2–3 glowing icons; a camera zoom-OUT unfolds a row of glassmorphism cards that grow from behind the icons (icons shrink to card headers), center card scales forward, the group floats, then sweeps out — a "pillars revealed at once" reveal variant of the same assemble shape.
- Benefits (from benefits-vertical-list): short value phrases populate a single vertical list ~1 item/sec, co-resident and accumulating; each line enters via a spring marker-pop + check-draw + pill mask-wipe, OR the whole stack snaps up one slot per beat (slot-machine) so the newest lands in the bright focal slot.
- Social_Proof (from social-proof-logo-grid-zoom-out): a wall of partner/app logos builds into a center grid (whole-enter / randomized pop-in / column slide-up), an optional headline + accent-gradient proof-number fills in above, then a continuous camera zoom-OUT shrinks the array to reveal a vast ecosystem; optional fixed HUD/viewfinder brackets; optional grid slide-up fly-out exit.

**duration**: 3.0–10.5s (Social_Proof 3.0–6s · Key_Feature grid 5.8–7.3s · Key_Feature glass-card 6.5s · Benefits list 6.5–10.5s, scaling ~1 item/sec with count)

**shot structure** (consolidated template — concrete motion verbs, [slots])

- **Scene 1 (0.0–~1.0s) — open + first arrivals.** On a `[gradient / radial / dark background]` (optional `[dot-grid / drifting-watermark]` texture), an empty `[grid or list region]` is established and items begin to ASSEMBLE in a quick staggered cascade (~0.04–0.08s gap; list pacing ~1 item/sec). Each `[item: feature tile / pill / logo tile / benefit line]` fades + slides/scales a short distance directly into its slot (low drama — no scatter, no big bounce; spring overshoot reserved for accent markers). Camera static. An opening `[headline / hook]` may fill in line-by-line above the array, with any `[proof number]` counting up in an `[accent gradient]`.
- **Scene 2 (~1.0s–~Xs) — array resolves + holds.** Remaining items finish arriving; layout resolves into the final `[2-col-brick / 3×3 grid / dense mosaic / stacked list]`. The completed array HOLDS, alive but resting: a gentle continuous parallax/sine FLOAT on the tiles and/or a slow camera push-in (faint scale-up). Optional `[accent-color]` glow TRAVELS across/behind the tiles.
- **Scene 3 (~Xs–end) — settle / reveal / exit.** Everything settles and holds to the end, OR the optional camera modifier runs (see below), OR a `[closing line / CTA]` book-ends the array.

Variants (where roles diverge from the template):

- **Variant — Key_Feature grid**: items are labeled `[icon + feature-label]` tiles/pills assembling into a 2-col-brick / 3×3 grid; near-static hold with slow push-in + optional traveling-glow sweep; headline book-ends (`[hook]` → `[CTA]`). No camera reveal.
- **Variant — Key_Feature glass-card-reveal**: the assemble is CAMERA-DRIVEN, not element-stagger. Open tight on `[2–3 glowing icons]`; camera zoom-OUT grows `[N]` glass cards out from behind the icons (icons shrink ~50% to become card headers), `[center card]` scales ~105% and moves forward to overlap the sides (quick spring); cards hold side-by-side with continuous parallax float; exit = fast motion-blur SWEEP slides the cards off-frame.
- **Variant — Benefits vertical-list**: a single vertical `[benefit-line]` stack, ~1 item/sec, two sub-modes — (a) BUILD: each line stays fully lit; entry = `[marker]` spring-pop + `[check/icon]` draw-in + `[pill]` mask-wipe of the text; (b) SNAP: the whole stack steps up one slot per beat (~0.1s eased) so the newest line lands in the bright focal slot and lines leaving it dim by position. Static camera; optional perpetual `[decorative orbit/disc]` on the opposite side. No camera reveal.
- **Variant — Social_Proof logo-wall-zoom-out**: intro beat (`[trusted-by headline]` card OR a `[product screenshot]`) crossfades/cuts to a center logo grid that builds (whole-enter / randomized pop-in / column slide-up); a continuous camera zoom-OUT then shrinks the whole grid toward center to reveal a vast ecosystem and holds; optional fixed HUD/viewfinder brackets; optional exit = whole grid SLIDES UP and flies out through the top.

**motion vocabulary**: item stagger-assemble (fade + short slide/scale into slot) · brick/grid/list layout resolve · randomized pop-in · column slide-up · vertical-list step (slot-machine snap-and-hold) · spring-overshoot marker pop · check/icon draw-in · pill/label mask-wipe reveal · dim-by-position de-emphasis · line-by-line headline fill · accent-gradient number count-up · near-static hold · gentle parallax/sine float on hold · slow camera push-in · camera zoom-OUT reveal (continuous OR phased pull-back) · cards-grow-from-behind-icons · icon-shrink-to-header · center-card scale-up + forward overlap (spring) · traveling-glow sweep · fixed HUD/viewfinder brackets · motion-blur slide-out sweep (exit) · grid slide-up fly-out (exit) · book-end headline fade · perpetual decorative orbit/loop.

**rule mapping** (motion verb → `rule-id`)

- item stagger-assemble into slot → `center-outward-expansion` (per-item stagger + short-path slide variant; for a wall too dense for a true center burst, use it in its "starting partially-spread"/direct-into-slot form — see merge tension)
- brick/grid/list layout resolve → `center-outward-expansion` (target positions = final layout slots)
- randomized pop-in stagger → `gsap-effects` (stagger recipe; randomized `from`/order)
- column slide-up into grid → `gsap-effects` (per-column staggered slide-up)
- vertical-list step / slot-machine snap-and-hold → `vertical-spring-ticker` (STEPS = number of line advances)
- spring-overshoot marker pop → `spring-pop-entrance` (back.out spring) — also `gsap-effects` for the staggered pop chain
- check / icon draw-in inside marker → `svg-path-draw`
- live line-art icon in a tile (internal parts) → `svg-icon-enrichment`
- pill / label mask-wipe text reveal → `techniques.md` (clip-path reveal)
- dim-by-position de-emphasis → `gsap-effects` (per-line opacity by slot position; no dedicated rule)
- line-by-line headline fill → `discrete-text-sequence`
- accent-gradient proof number count-up → `counting-dynamic-scale`
- gentle parallax / sine float on hold → `sine-wave-loop` (apply the concurrent-elements amplitude `/√N` rule for a held grid)
- slow camera push-in → `multi-phase-camera` (steady-push phase pattern)
- center-card scale-up + forward overlap → `spring-pop-entrance` (the quick spring) + `techniques.md` CSS-3D (z-depth overlap)
- cards-grow-from-behind-icons / icon-shrink-to-header → driven by the camera reveal (`multi-phase-camera`) — the grow/shrink are scale tweens chorded to the pull-back phase; no separate rule
- fixed HUD / viewfinder brackets → `ai-tracking-box` (static-bracket variant — overlay frame, not tracking)
- book-end headline fade → `discrete-text-sequence` (or `gsap-effects` fade)
- perpetual decorative orbit / disc / loop → `sine-wave-loop` (or `orbit-3d-entry` if it's an orbiting badge ring)
- traveling-glow sweep across/behind tiles → `ambient-glow-bloom` (one-pass traveling glow sweep across the tiles)
- motion-blur slide-out sweep (glass-card exit) → `motion-blur-streak` (directional velocity blur on the fast sweep that carries the cards off-frame)
- grid slide-up fly-out exit → `gsap-effects` (plain staggered translate-off-frame; no dedicated rule needed — a basic exit tween, not a missing capability)

**camera modifier — zoom-OUT reveal** (optional; the role-defining move for the glass-card and logo-wall variants): a camera wrapper around the whole array scales DOWN over the hold, revealing the assembled grid/cards sitting inside a larger environment (ecosystem scale, or a row of cards unfolding from tight icons).

- Continuous single-pass zoom-out (Social_Proof ecosystem pull-back) → `viewport-change` (one wrapper, `cam.scale` ↓ via onUpdate — single source of truth)
- Phased pull-back → focus → settle, with built-in drift (Key_Feature tight-icons → cards-unfold) → `multi-phase-camera` (use the "Dramatic reveal: push → neutral → pull" / pull-back phase pattern; grow/shrink of cards chords to the pull-back phase)

---

```
BLUEPRINT: grid-card-assemble — serves Key_Feature, Benefits, Social_Proof (folded 4 drafts)
RULE GAPS: none — traveling-glow sweep → ambient-glow-bloom; motion-blur slide-out sweep (exit) → motion-blur-streak; grid slide-up fly-out (exit) → gsap-effects (plain translate)
```

Merge tension: `center-outward-expansion` (the natural backing for stagger-assemble) caps cleanly at 3–8 items and explicitly warns 8+ causes mid-flight overlap chaos — but a Social_Proof logo wall is deliberately dense (12+ tiles), so for that variant the items must NOT burst from a shared center; they slide a short distance directly into their own slot (the rule's "starting partially-spread"/short-path form, or a `gsap-effects` per-item stagger), which the consolidated Scene-1 verb already specifies as "short distance directly into its slot."

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

## Selected motion rule: depth-of-field-blur

---
name: depth-of-field-blur
description: Selective-focus rack-focus — pull the eye to a focal element by GSAP-tweening filter blur (+ a small opacity dim) on the off-focus layers while the focal one stays sharp. Drive blur via a `--dof` CSS var; finite tweens, no CSS transition, deterministic. Covers single focal pull, rack-focus between two depth planes, and blur-the-cluster-while-pushing-in.
metadata:
  tags: blur, focus, depth-of-field, dof, rack-focus, filter, dim, spotlight, cinematic, push-in
---

# Depth-of-Field Blur (Selective Focus / Rack Focus)

Pulls the eye to one focal element by **blurring** (and slightly **dimming**) everything around it while the focal layer stays sharp — the camera's depth-of-field falling off the background, or a rack-focus shifting which plane is in focus. The motion is `filter: blur(Npx)` plus a small `opacity` dim, tweened from sharp(0) to blurred over the focus-shift window — both seek-safe, since `filter` and `opacity` are paint-only properties HF interpolates correctly frame-by-frame.

This is the backing rule for the focus-falloff beat the blueprints keep reaching for: the outer nodes blurring during the push-in (`constellation-hub`), the rack-focus across a parallax card stack (`cursor-ui-demo`), and the non-highlighted cards dimming + blurring to spotlight the hero metric (`dataviz-countup`). Each of those flags "no backing rule" for the DoF half of the move — this is it.

## How It Works

Every layer carries a `--dof` custom property (px of blur), read by `filter: blur(var(--dof))`, plus its own `opacity`. A single GSAP tween advances each layer's `--dof` from `0` to its target blur and its opacity from `1` to a dim level, over the focus-shift window. The focal layer's tween targets `--dof: 0` (stays sharp); the off-focus layers target a positive blur.

Three mechanics, same primitive:

1. **Focal pull** — one window: off-focus layers go sharp(0) → blurred while the focal layer holds at 0. The eye is pulled to the only thing still crisp.
2. **Rack focus** — two adjacent windows on the same property: focus releases plane A (its blur ramps 0 → max) at the same position plane B's blur ramps max → 0. State continuity matters exactly as in `press-release-spring`: A's resting blur after the rack must be the value B held before it, so authoring the two as adjacent tweens on the same `--dof` is what makes the hand-off seamless.
3. **Blur-the-cluster-while-pushing-in** — the DoF tween runs concurrently with a camera push-in (`multi-phase-camera` / `coordinate-target-zoom`): the surrounding cluster blurs + dims on the SAME timeline position as the camera scales toward the focal core, so "the world recedes" and "we push in" read as one move.

Because the blur is a tween target (not a CSS `transition`), the renderer can land it at any frame — and because each layer's target is derived from its index / a data attribute (never `Math.random`), the falloff is identical on every seek.

## HTML

```html
<div
  class="scene"
  id="dof-scene"
  data-composition-id="dof-scene"
  data-start="0"
  data-duration="DURATION"
  data-track-index="0"
>
  <div class="world" id="world">
    <!-- Focal layer — stays sharp -->
    <div class="layer focal" id="focal" data-dof="0">{FocalLabel}</div>

    <!-- Off-focus layers — blur + dim. data-depth orders them near→far
         so the falloff can scale blur by depth (see Variations). -->
    <div class="layer ctx" data-depth="1">{Context A}</div>
    <div class="layer ctx" data-depth="2">{Context B}</div>
    <div class="layer ctx" data-depth="3">{Context C}</div>
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
  background: {bgGradient};
}
.world {
  /* Single wrapper so a concurrent camera push-in (multi-phase-camera)
     transforms everything together; DoF is independent of the camera. */
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
}
.layer {
  /* --dof is the px of blur; filter reads it. Starts sharp. */
  --dof: 0px;
  filter: blur(var(--dof));
  /* will-change: filter — promotes the layer so the blur is cheap to
     re-rasterize each frame. See the perf note in Key Principles. */
  will-change: filter;
  font-family: {font};
  font-weight: 900;
  color: {textColor};
}
.focal {
  /* Sits above the context layers and never blurs. */
  z-index: 2;
  font-size: FOCAL_FONT_SIZE;
}
.ctx {
  /* The off-focus plane(s). Smaller / grouped so the blur radius can
     stay modest yet still read — blurring a small layer is cheap. */
  z-index: 1;
  font-size: CTX_FONT_SIZE;
  opacity: 1;
}
```

## GSAP Timeline

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  const ctx = gsap.utils.toArray(".ctx");

  // ── Mechanic 1: FOCAL PULL ─────────────────────────────────────────
  // Off-focus layers blur + dim from sharp to defocused over the
  // focus-shift window. Blur scales with data-depth so far planes blur
  // more than near ones (deterministic — derived from the attribute,
  // never Math.random).
  ctx.forEach((el) => {
    const depth = Number(el.dataset.depth) || 1;
    const targetBlur = BLUR_PER_DEPTH * depth; // px
    tl.to(
      el,
      {
        "--dof": `${targetBlur}px`,
        opacity: DIM_LEVEL, // e.g. 0.55 — dim, not gone
        duration: FOCUS_DUR,
        ease: "power2.inOut",
      },
      FOCUS_START,
    );
  });
  // Focal layer is already sharp (--dof:0, opacity:1) and untouched.

  window.__timelines["dof-scene"] = tl;
</script>
```

## Variations

### Rack focus between two depth planes (foreground ⇄ background)

Two adjacent tweens on the same `--dof` per plane — focus leaves plane A as it lands on plane B. State continuity: B's _resting_ blur before the rack equals what A holds after, so the hand-off has no jump.

```js
// Start: A sharp, B pre-blurred (set BEFORE the rack so there's no pop).
gsap.set("#planeA", { "--dof": "0px", opacity: 1 });
gsap.set("#planeB", { "--dof": `${MAX_BLUR}px`, opacity: DIM_LEVEL });

// Rack: A defocuses while B comes into focus, same position + duration.
tl.to(
  "#planeA",
  { "--dof": `${MAX_BLUR}px`, opacity: DIM_LEVEL, duration: RACK_DUR, ease: "power2.inOut" },
  RACK_START,
);
tl.to(
  "#planeB",
  { "--dof": "0px", opacity: 1, duration: RACK_DUR, ease: "power2.inOut" },
  RACK_START,
);
```

### Blur the cluster while pushing in (DoF + camera, one beat)

Run the focal-pull tween at the **same timeline position** as a camera push-in so the surrounding cluster recedes into blur exactly as the camera scales toward the core. The camera transforms `.world`; the DoF tweens the layers — independent properties, no conflict.

```js
// Camera push-in toward the focal core (see multi-phase-camera / coordinate-target-zoom).
tl.to(
  "#world",
  { scale: PUSH_SCALE, x: PUSH_X, y: PUSH_Y, duration: FOCUS_DUR, ease: "power2.inOut" },
  FOCUS_START,
);
// Cluster blurs + dims on the SAME position — "the world recedes as we push in."
ctx.forEach((el) => {
  const depth = Number(el.dataset.depth) || 1;
  tl.to(
    el,
    {
      "--dof": `${BLUR_PER_DEPTH * depth}px`,
      opacity: DIM_LEVEL,
      duration: FOCUS_DUR,
      ease: "power2.inOut",
    },
    FOCUS_START,
  );
});
```

### Spotlight a hero metric in a card grid (dim + blur the rest)

The `dataviz-countup` beat: a subset of grid cards stays sharp (the hero metric) while the remainder dim + blur. Tag the hero(es) and skip them; everything else defocuses on one shared window.

```js
gsap.utils.toArray(".card:not(.hero)").forEach((el) => {
  tl.to(
    el,
    { "--dof": `${GRID_BLUR}px`, opacity: DIM_LEVEL, duration: FOCUS_DUR, ease: "power2.out" },
    FOCUS_START,
  );
});
```

### Refocus / settle (release the blur before the scene ends)

If the beat resolves back to "everything visible" (or hands off to a crossfade that needs a clean outgoing frame), ramp the blur back to 0 over the tail so the scene settles sharp instead of mid-defocus.

```js
ctx.forEach((el) =>
  tl.to(
    el,
    { "--dof": "0px", opacity: 1, duration: REFOCUS_DUR, ease: "power2.inOut" },
    REFOCUS_START,
  ),
);
```

### Bounded focus-breathing on the focal layer (optional)

For a subtle "rack settling" feel, let the focal layer's blur breathe a hair around 0 during its hold — a _finite_ `ease:"none"` driver writing `sin()` into `--dof` (never `repeat:-1`, never a CSS animation). Keep the amplitude well under 1px or it reads as "still focusing."

```js
const drift = { p: 0 };
tl.to(
  drift,
  {
    p: Math.PI * 2 * BREATH_CYCLES,
    duration: BREATH_DUR,
    ease: "none",
    onUpdate: () => {
      const b = Math.max(0, Math.sin(drift.p)) * FOCAL_BREATH_PX; // ≤ ~0.6px
      document.getElementById("focal").style.setProperty("--dof", `${b}px`);
    },
  },
  BREATH_START,
);
```

## How to Choose Values

### Geometry / layout

- **FOCAL_FONT_SIZE / CTX_FONT_SIZE** — focal vs context sizing.
  - Range: focal is the visual lead; context layers smaller so a modest blur radius still reads as "out of focus."
  - Effects: small context layers let you use a smaller `BLUR_PER_DEPTH` (cheaper) yet still look soft.
- **z-index** — focal `z-index: 2`, context `z-index: 1`.
  - Constraints: the sharp focal layer must sit **above** the blurred ones, or its crisp edges read as bleeding into the haze.

### Blur amounts

- **BLUR_PER_DEPTH** — px of blur added per depth step (`data-depth`).
  - Range: 3-6 px per step (a 3-plane stack tops out at ~9-18 px)
  - Effects: low → gentle DoF; high → strong miniature/tilt-shift falloff
  - Constraints: keep **per-layer blur ≤ ~24 px on large layers** — radius cost grows with both blur and area; large radius over a full-frame element is the expensive case (see Key Principles)
- **MAX_BLUR** — terminal blur for a fully-defocused plane (rack / focal-pull peak).
  - Range: 8 (soft) → 16 (default) → 24 (heavy) px
  - Constraints: above ~24 px on a big surface, prefer scaling the layer down or grouping its contents so the blurred footprint shrinks
- **GRID_BLUR** — blur on dimmed grid cards (spotlight variation).
  - Range: 6-12 px — enough to push them back without losing the grid's shape

### Dim amounts

- **DIM_LEVEL** — opacity of off-focus layers at full defocus.
  - Range: 0.4 (strong push-back) → 0.55 (default) → 0.7 (subtle)
  - Effects: lower → context recedes hard / near-spotlight; higher → still legibly present, just secondary
  - Constraints: rarely below 0.35 — fully dark off-focus layers read as "removed," not "defocused"

### Timing

- **FOCUS_START / FOCUS_DUR** — when the focal pull begins and how long the rack takes.
  - Range: `FOCUS_DUR` 0.5-1.2 s — a rack/pull is a deliberate move, not a snap
  - Effects: shorter → urgent "snap focus"; longer → languid cinematic rack
- **RACK_START / RACK_DUR** — rack-focus window (foreground ⇄ background).
  - Constraints: both planes' tweens share `RACK_START` and `RACK_DUR` so they cross at the midpoint; `gsap.set` the pre-blurred plane BEFORE `RACK_START`
- **REFOCUS_START / REFOCUS_DUR** — settle-back window.
  - Constraints: `REFOCUS_START + REFOCUS_DUR ≤ DURATION` so the scene actually reaches sharp before it ends / hands off
- **PUSH_SCALE / PUSH_X / PUSH_Y** (cluster-while-pushing-in variation) — camera move on `.world`.
  - Constraints: shares `FOCUS_START` + `FOCUS_DUR` with the DoF tween so move and defocus read as one beat; counter-translate math lives in `coordinate-target-zoom` / `viewport-change`
- **BREATH_CYCLES / BREATH_DUR / FOCAL_BREATH_PX** (focus-breathing variation).
  - Range: `FOCAL_BREATH_PX ≤ 0.6` px; period 2-3 s; this is a barely-there nicety, default to omitting it

### Tokens

- **{bgGradient}** — typically dark so the sharp focal layer reads as lit and forward
- **{textColor}** — high-contrast on `{bgGradient}`; the blur softens edges, so don't rely on hairline contrast
- **{font}** — display weight; blurred copy needs heavy weight to stay shape-legible when defocused

## Key Principles

- **`--dof` drives the blur; tween the variable, never a CSS `transition`.** Reading `filter: blur(var(--dof))` and animating `--dof` on the GSAP timeline keeps the blur on the HF seek clock. A CSS `transition` on `filter` interpolates on the browser's own clock and flickers/desyncs under frame-by-frame seek.
- **Blur the SMALL / GROUPED layers, not the giant one.** Filter-blur cost scales with both radius and the blurred element's pixel area. A 20 px blur on a full-frame background is the worst case; the same blur on a smaller context card, or on a single grouped wrapper, is cheap. Prefer pushing the focal plane _forward and sharp_ over cranking the background blur radius.
- **`will-change: filter`** on every layer that animates its blur — promotes it to its own layer so the re-rasterization each frame is cheap. Drop it once the blur settles if the layer also does heavy transform work.
- **Keep the radius modest.** ≤ ~24 px on large surfaces; lean on the `opacity` **dim** to do the "push it back" work alongside a smaller blur, rather than blur alone. Dim + modest blur reads more like real DoF than blur cranked to the max.
- **Focal layer stays genuinely sharp** — its `--dof` is `0` and untouched (or breathes ≤0.6 px). Any visible blur on the focal element kills the "this is the thing" read.
- **State continuity on a rack** — the plane coming OUT of focus must start the rack at the blur the incoming plane _was_ holding, and vice-versa; author both as tweens on the same `--dof` at the same position so the cross is seamless (same rule as `press-release-spring`'s press↔release).
- **DoF is independent of the camera** — blur the layers, transform `.world` for the push-in. They're different property channels, so they compose without fighting. Don't try to fake DoF with the camera transform or vice-versa.
- **Settle sharp before a hand-off** — if the next beat is a crossfade/push, refocus to `--dof:0` in the tail so the outgoing frame is crisp; handing off mid-defocus reads as "the render glitched."

## Critical Constraints

- **Timeline must be paused**: `gsap.timeline({ paused: true })`
- **Registry key = `data-composition-id`**
- **No CSS `transition`** on `filter` / `opacity` — animate `--dof` and `opacity` on the timeline instead
- **No `repeat` / `yoyo` / infinite tweens** — the focus pull is a finite tween; any breathing is a bounded `onUpdate` reading the driver phase (or a finite tween), never `repeat:-1`
- **No `Math.random` / `Date.now`** — per-layer blur is derived from `data-depth` / element index so every seek is identical
- **Tween `filter` (blur) + `opacity` only here** — both paint-only and seek-safe. Use GSAP transform aliases (`x`, `y`, `scale`) for any concurrent camera move; never tween `width` / `height` / `left` / `top`
- **`will-change: filter`** on layers whose blur animates; keep the blurred footprint small
- **Per-layer blur radius ≤ ~24 px on large surfaces** — beyond that the cost (and visible banding) climbs; shrink/group the layer instead

## Combinations

- [multi-phase-camera.md](multi-phase-camera.md) — the push-in / push-through whose focus-falloff this rule supplies; run the DoF tween at the same position as the PUSH phase
- [coordinate-target-zoom.md](coordinate-target-zoom.md) — zoom onto the focal core while the off-center layers blur (the `constellation-hub` hook)
- [viewport-change.md](viewport-change.md) — pan across a tilted card plane with a rack-focus between near and far cards (the `cursor-ui-demo` focus-pull)
- [counting-dynamic-scale.md](counting-dynamic-scale.md) — the hero metric counts up sharp while the surrounding cards dim + blur (the `dataviz-countup` spotlight)
- [3d-page-scroll.md](3d-page-scroll.md) — the parallax card stack whose planes you rack focus between
- [sine-wave-loop.md](sine-wave-loop.md) — the focal layer idle-breathes after the rack settles (keep idle amplitude and focus-breath both tiny)

## Pairs with HF skills

- `/hyperframes-animation` — tweening a CSS custom property + multi-tween coordination
- `/hyperframes-core` — composition wiring
- `/hyperframes-cli` — `hyperframes lint`

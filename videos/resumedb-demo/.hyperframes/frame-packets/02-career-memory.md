# Frame packet: 02-career-memory

## Project inputs

- Project: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo
- Design tokens: /Users/nathanye/.treehouse/ResumeDB-1059f1/3/ResumeDB/videos/resumedb-demo/frame.md
- RULES_DIR: /Users/nathanye/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 2 - A memory that never guesses

- scene: The Profile and Settings view fills itself field by field, then connects to the knowledge base and explicit answer bank while missing facts trigger a question.
- voiceover: "Earnestine starts with one verified knowledge base: experience, preferences, and explicit application answers. Missing facts trigger a question, never a guess."
- duration: 9.44s
- poster: 6s
- transition_in: zoom-through
- status: built
- src: compositions/frames/02-career-memory.html
- type: product_intro
- persuasion: Risk reversal
- beat: trust
- blueprint: device-surface-showcase
- asset_candidates: assets/02-settings-profile-agent.png - canonical applicant facts, explicit answers, and connected-agent settings; assets/03-knowledge.png - structured student career evidence
- focal: assets/02-settings-profile-agent.png
- roles: 02-settings-profile-agent = primary product surface; 03-knowledge = supporting evidence surface; missing-fact card = foreground

Adapt: preserve the device-surface handoff, but reconstruct a real field-by-field setup pass over the captured Settings and Knowledge views.
Scene 1 (0.0-2.0s): The captured Profile and Settings view lands as a large 70/30 editorial surface, with the profile column dominant and the connected-agent area visible at right; one purposeful focus move settles on the applicant fields.
Scene 2 (2.0-5.9s): Name, college, major, graduation, authorization, and agent connection fill sequentially on the matching spoken facts; each row uses a measured type-on and checkmark reveal from `gsap-effects`, never simultaneous.
Scene 3 (5.9-7.5s): A velocity-matched horizontal seam reveals the real Knowledge view, where two evidence cards draw on and link back to the profile.
Scene 4 (7.5-9.44s): A violet Missing fact card rises above the surfaces and types “Ask the student”; the background softens with `depth-of-field-blur`, then the composition holds for “never a guess.”

narrativeRole: Establish trustworthy personalization before showing automation.
keyMessage: The agent learns from verified user data and never invents factual answers.

## Selected blueprint: device-surface-showcase

# device-surface-showcase — Device / Surface Showcase

**intent**: A product surface — a device mockup or a floating browser/app window — is the hero held in frame while its screens cycle through a real flow, showcased by a camera move that ranges from a static hold to a continuous 3D push.

**roles served**

- Key*Feature (from key-feature-device-screen-tour, key-feature-floating-window-scroll, key-feature-3d-device-hand-demo): show a feature being \_experienced inside its real interface* — the surface houses the action and its screens advance through a flow, rather than enumerating tiles or chasing a cursor across a workflow. (Note: all three drafts are Key_Feature; this blueprint is role-narrow but mechanic-rich — variants differ by MECHANIC, not role.)
- Key_Feature (from demo-page-scroll-spotlight): the floating-window push-scroll variant carried to a spotlight climax — a real webpage rendered as a tilted 3D card coasts in (power2, like a phone held up — no spring), header keywords flare on a karaoke glow as the VO names them, the page rolls to the demoed section, and one element LIFTS off the surface (translateZ + scale) under a radial spotlight that dims the rest.

**duration**: 5–9.6s (page-scroll-spotlight 5–9s · floating-window 7.8s · 3d-hand 7.9s · device-tour 9.6s)

**shot structure** One product surface — a `[device mockup]` or a `[floating browser/app window]` — is the persistent hero on a `[styled backdrop: gradient / radial / stylized 3D void]`; its `[screens/sections]` cycle through a real `[product flow]` while a showcase camera (static-hold, push-in→zoom-out, or one continuous push) presents it. Each screen state holds ~1.0–1.5s.

- Scene 1 (0.0–~1.5s): The surface ESTABLISHES — it `[slides in from an edge / drifts in from a tilt / dissolves from a full-frame title card]` and settles, with a `[accent shape or backdrop]` resolving behind it; the first `[screen]` is visible. The showcase camera begins (see variants).
- Scene 2 (~1.5–~Xs): The surface is OPERATED on its own face — a `[tap/select/scroll]` triggers the first screen advance: old content `[pushes out / scrolls up]`, new `[screen/section]` `[pulls up / pushes in from the side]`; concurrently a `[label / header word / side headline]` updates. The camera continues its move.
- Scene 3+ (~Xs–end, repeat for `[2–4 screen beats]`): The surface ADVANCES through successive `[screens/sections]`, each a discrete swap or scroll synced to the surface's flow, while the secondary copy `[swaps out-up / in-up]` or stays marked to hold reading position. HOLDS on the final `[screen]` (or, for one variant, blooms out — see variant).

- Variant — static-tour (key-feature-device-screen-tour, 9.6s): a `[device mockup]` slides in from off-screen and settles (ease-out); an `[accent-color shape]` scales up behind it (spring overshoot). Camera STAYS STATIC the entire clip — all motion is element/UI-level: a tap COMPRESSES a button (95%→100%), the UI scrolls/transitions to the next view (old pushes out, new pulls up), and a `[side headline]` SWAPS beside the device (old slides up + fades, new slides up + in) per screen. Holds on the final screen. No camera move, no cursor.
- Variant — floating-window (key-feature-floating-window-scroll, 7.8s): OPENS on a full-frame `[title card]` (a small `[icon]` draws in at center, `[feature name]` below; holds ~2s), which DISSOLVES to a `[macOS-style browser/app window]` floating on a `[vivid gradient]` (traffic-lights + `[URL pill]` + tabs; left nav, central content, right `[sidebar]`). Camera PUSHES IN on a `[target region/sidebar]` (active item highlighted `[accent]`, a cursor drifts down the list), then ZOOMS BACK OUT to re-frame the whole window while the content SCROLLS through `[sections]`; the `[highlighted item]` stays marked. One push-in→zoom-out arc, gated by the title-card opener.
- Variant — 3d-hand (key-feature-3d-device-hand-demo, 7.9s): FULLY 3D — a `[3D device]` drifts in a `[stylized 3D void / bloom + particles]`, opening tilted and self-rotating to face the lens nearly flat as ONE CONTINUOUS forward camera push begins (no cuts). A glossy `[3D hand]` rises from the bottom-foreground and GESTURE-DRIVES the surface: it swipes to scroll a `[picker/sidebar panel]` of `[option cards]` and taps `[option]` (while a `[header word]` letter-flips in place); the selection APPLIES — a `[new layout]` grows from center to fill the device face, nav flips, a `[marquee]` scrolls horizontally; the hand swipes again to scroll the page upward through `[sections]`, then drifts out. The camera never stops pushing; the bright device face keeps growing toward the lens until it BLOOMS into a `[light]` wash — a zoom-through "portal" exit that fills the frame.

**motion vocabulary** surface establish (edge slide-in + settle / tilt drift-in + self-rotate-to-camera / title-card dissolve); accent shape spring behind surface; element-level screen-cycling (scroll-swap, push-in-from-side, scale-swap); button tap-compress; staggered side-headline reveal + copy swap (out-up / in-up); in-place header-word letter-flip; floating browser-window-on-gradient idle float; full-frame title-card opener (icon draw-in + label); camera push-IN on a region; camera zoom-OUT re-frame; content scroll-through; one continuous 3D camera-follow push (no cuts); 3D device drift + self-rotate; stylized-environment bloom/particles; 3D-hand entrance + swipe-scroll + tap (gesture-driven); picker-panel slide-in; template-apply grow-from-center; horizontal marquee scroll; gesture-driven page scroll; zoom-through bloom/portal exit; static-hold (no camera) as the floor of the camera range.

**rule mapping** (per motion verb → backing rule, or flagged special)

- screen-cycling — UI scrolls/sections scroll inside the surface (device-tour, floating-window scroll, 3d-hand page scroll) → `3d-page-scroll` (webpage/app as a tilted card whose content `translateY`-scrolls to sections; primary mechanic for the surface's screen flow)
- floating-window establish + the surface presented as a tilted/floating UI card → `3d-page-scroll` (the tilt/perspective framing) + `css-3d-transforms` (perspective/`translateZ` depth)
- screen / side-copy state swaps (discrete screen states; side headline content swapping per beat) → `discrete-text-sequence`
- side-headline reveal (staggered fade + slide-up) → `discrete-text-sequence`
- in-place header-word letter-flip (3d-hand) → `hacker-flip-3d`
- screen swap as a coordinated shrink-out / pop-in between two screen states → `scale-swap-transition`
- template-apply "new layout grows from center to fill the face" (3d-hand) → `center-outward-expansion` (clustered-at-center → expand to fill)
- the surface morphing between states / title-card→window dissolve as the eye-anchor transition → `card-morph-anchor`
- button tap-compress (95%→100% press feedback) → `press-release-spring` (or `physics-press-reaction` for a heavier press)
- floating-window cursor click on the highlighted list item → `cursor-click-ripple`
- accent-highlight pop on the active sidebar/list item → `asr-keyword-glow` (accent glow on the focused item)
- drifting cursor down the sidebar list (floating-window) → `camera-cursor-tracking` (flat-cursor drift; pairs with the push-in)
- floating browser-window idle float / 3D device drift-breathe → `sine-wave-loop`
- 3D device drift + self-rotate-to-camera + perspective depth (3d-hand) → `css-3d-transforms` (CSS-3D) **or** `3d.md` technique (true Three.js/R3F device); see camera modifier
- horizontal `[marquee]` scroll (3d-hand) → `viewport-change` (PAN mode on the marquee strip) — _thin fit; a literal CSS-marquee/translateX loop is closer to a `gsap-effects`/CSS recipe than a named motion rule_
- 3D-hand entrance + swipe + tap as the interaction DRIVER (gesture input that scrolls/selects) → **flagged special — needs a heavier capability beyond the rule library (R3F/Three.js + WebGL), NOT a motion-shape rule.** The 3D hand model + WebGL bloom have a _technique_ backing (`3d.md` — R3F, `useGLTF` HandModel, `--gl=swiftshader` for the shader/bloom), but no motion-shape rule models a 3D hand as the swipe-to-scroll / tap-to-select gesture protocol. `context-sensitive-cursor` / `camera-cursor-tracking` only model a flat typing/pointer cursor, not a 3D gesturing hand.
- zoom-through bloom / portal exit (3d-hand) → **flagged special — needs a heavier capability beyond the rule library (WebGL), NOT a named transition rule.** Capability is `techniques.md` → WebGL shader (via `3d.md` headless WebGL: `--gl=swiftshader --concurrency=1`), but no named transition rule covers a bloom/portal fly-through.

**camera modifier**: The showcase camera spans a RANGE keyed by variant, all on a single content-wrapping virtual camera (`viewport-change`):

- static-tour → NO camera move (`viewport-change` held at scale 1, or omitted); all motion is element-level. This is the floor of the range and what distinguishes the device-tour from the rest.
- floating-window → a two-phase push-in → zoom-out arc → `multi-phase-camera` (e.g. dramatic-reveal 1.1→1.0→0.95 feel): push IN on the `[sidebar/region]` via `coordinate-target-zoom` (off-center target = scale + counter-translate), then `multi-phase-camera` zooms back OUT to re-frame the whole window while content scrolls.
- 3d-hand → ONE continuous forward push (no cuts) → `multi-phase-camera` in steady-push mode (1.0→1.03→1.06… plus its sine micro-drift) layered over `css-3d-transforms`/`3d.md` so the device self-rotates-to-lens during the push; the push runs unbroken into the bloom/portal exit (exit itself is the WebGL-shader flagged special above). Across all three: `viewport-change` is the base virtual-camera primitive; `multi-phase-camera` sequences the push/zoom phases (and supplies the always-on micro-drift that keeps even the "static" tour from feeling dead); `coordinate-target-zoom` aims the push at off-center screen detail.

**Overflow (pan/scroll surfaces — required for a clean `check`):** a panned or scrolled surface deliberately moves content PAST the edges of its framing card. Clip it at the card (`overflow: hidden` on the card/window) AND mark the moving inner layer (the `.world` / surface wrapper holding the screenshot + any markers/labels) with `data-layout-allow-overflow` — otherwise `check` reports `text_box_overflow` / `container_overflow` errors for the parts that scroll off (e.g. a marker label panned off the left edge). The card clips them visually; the attribute tells the layout audit it's intentional, not a layout bug.

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

## Selected motion rule: gsap-effects

# GSAP Effects for HyperFrames

Drop-in animation patterns. Each effect is self-contained (HTML + CSS + JS) and follows the HyperFrames seek-driven contract — deterministic, no randomness, timeline registered on `window.__timelines`.

## Index

- [Typewriter](#typewriter) — character-by-character text reveal with optional cursor / backspace / word rotation
- [Audio Visualizer](#audio-visualizer) — pre-extract audio data, drive Canvas/DOM rendering from the timeline

---

## Typewriter

Reveal text character by character using GSAP's TextPlugin.

### Required Plugin

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/TextPlugin.min.js"></script>
<script>
  gsap.registerPlugin(TextPlugin);
</script>
```

### Basic Typewriter

```js
const text = "Hello, world!";
const cps = 10; // chars per second: 3-5 dramatic, 8-12 conversational, 15-20 energetic
tl.to(
  "#typed-text",
  { text: { value: text }, duration: text.length / cps, ease: "none" },
  startTime,
);
```

### With Blinking Cursor

Three rules:

1. **One cursor visible at a time** — hide previous before showing next.
2. **Cursor must blink when idle** — after typing, during pauses.
3. **No gap between text and cursor** — elements must be flush in HTML.

```html
<span id="typed-text"></span><span id="cursor" class="cursor-blink">|</span>
```

```css
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
.cursor-blink {
  animation: blink 0.8s step-end infinite;
}
.cursor-solid {
  animation: none;
  opacity: 1;
}
.cursor-hide {
  animation: none;
  opacity: 0;
}
```

Pattern: blink → solid (typing starts) → type → solid → blink (typing done).

```js
tl.call(() => cursor.classList.replace("cursor-blink", "cursor-solid"), [], startTime);
tl.to("#typed-text", { text: { value: text }, duration: dur, ease: "none" }, startTime);
tl.call(() => cursor.classList.replace("cursor-solid", "cursor-blink"), [], startTime + dur);
```

### Backspacing

TextPlugin removes from front — wrong for backspace. Use manual substring removal:

```js
function backspace(tl, selector, word, startTime, cps) {
  const el = document.querySelector(selector);
  const interval = 1 / cps;
  for (let i = word.length - 1; i >= 0; i--) {
    tl.call(
      () => {
        el.textContent = word.slice(0, i);
      },
      [],
      startTime + (word.length - i) * interval,
    );
  }
  return word.length * interval;
}
```

### Spacing With Static Text

When a typewriter word sits next to static text, use `margin-left` on a wrapper span. Don't use flex `gap` (it spaces the cursor from the text) and don't put a trailing space in the static text (it collapses when the dynamic span is empty).

```html
<div style="display:flex; align-items:baseline;">
  <span style="font-size:40px; color:#555;">Ship something</span>
  <span style="margin-left:14px;"><span id="word"></span><span id="cursor">|</span></span>
</div>
```

### Word Rotation

Type → hold → backspace → next word. Cursor blinks during every idle moment (holds, after backspace).

```js
let offset = 0;
words.forEach((word, i) => {
  const typeDur = word.length / 10;
  tl.call(() => cursor.classList.replace("cursor-blink", "cursor-solid"), [], offset);
  tl.to("#typed-text", { text: { value: word }, duration: typeDur, ease: "none" }, offset);
  tl.call(() => cursor.classList.replace("cursor-solid", "cursor-blink"), [], offset + typeDur);
  offset += typeDur + 1.5; // hold

  if (i < words.length - 1) {
    tl.call(() => cursor.classList.replace("cursor-blink", "cursor-solid"), [], offset);
    const clearDur = backspace(tl, "#typed-text", word, offset, 20);
    tl.call(() => cursor.classList.replace("cursor-solid", "cursor-blink"), [], offset + clearDur);
    offset += clearDur + 0.3;
  }
});
```

### Appending Words

Build a sentence word-by-word into the same element:

```js
let accumulated = "";
let offset = 0;
words.forEach((word) => {
  const target = accumulated + (accumulated ? " " : "") + word;
  const newChars = target.length - accumulated.length;
  tl.to("#typed-text", { text: { value: target }, duration: newChars / 10, ease: "none" }, offset);
  accumulated = target;
  offset += newChars / 10 + 0.3;
});
```

### Multi-Line Cursor Handoff

Handing off between typewriter lines: hide previous → blink new → pause → solid when typing. Never go `hidden → solid` (skips the idle blink).

```js
tl.call(
  () => {
    prevCursor.classList.replace("cursor-blink", "cursor-hide");
    nextCursor.classList.replace("cursor-hide", "cursor-blink");
  },
  [],
  handoffTime,
);

const typeStart = handoffTime + 0.5; // brief blink pause
tl.call(() => nextCursor.classList.replace("cursor-blink", "cursor-solid"), [], typeStart);
tl.to("#next-text", { text: { value: text }, duration: dur, ease: "none" }, typeStart);
tl.call(() => nextCursor.classList.replace("cursor-solid", "cursor-blink"), [], typeStart + dur);
```

### Timing Guide

| CPS   | Feel             | Good for                   |
| ----- | ---------------- | -------------------------- |
| 3-5   | Slow, deliberate | Dramatic reveals, suspense |
| 8-12  | Natural typing   | Dialogue, narration        |
| 15-20 | Fast, energetic  | Tech demos, code           |
| 30+   | Near-instant     | Filling long blocks        |

---

## Audio Visualizer

Pre-extract audio data, drive Canvas / DOM rendering from a single `tl.call(...)` per frame. **Do not** use the Web Audio API at render time — there's no playback during seek.

### Extract Audio Data

Use the bundled extractor (requires `ffmpeg` and Python `numpy`):

```bash
python skills/hyperframes-creative/scripts/extract-audio-data.py audio.mp3 -o audio-data.json
python skills/hyperframes-creative/scripts/extract-audio-data.py video.mp4 --fps 30 --bands 16 -o audio-data.json
```

### Data Format

```json
{
  "fps": 30,
  "totalFrames": 5415,
  "frames": [{ "time": 0.0, "rms": 0.42, "bands": [0.8, 0.6, 0.3] }]
}
```

- **`rms`** (0-1) — overall loudness, normalized across the track.
- **`bands[]`** (0-1) — frequency magnitudes. Index 0 = bass, higher index = treble. Each band normalized independently.

### Loading the Data (Synchronously)

```js
// Option A — inline (small files, under ~500 KB)
var AUDIO_DATA = {
  /* paste audio-data.json contents */
};

// Option B — sync XHR (large files; must be synchronous for deterministic timeline construction)
var xhr = new XMLHttpRequest();
xhr.open("GET", "audio-data.json", false);
xhr.send();
var AUDIO_DATA = JSON.parse(xhr.responseText);
```

**Do NOT use async `fetch()`.** HyperFrames reads `window.__timelines` synchronously after page load — building the timeline inside `.then()` means the timeline isn't ready when capture starts.

### Driving the Timeline

**Canvas 2D** — most common (bars, waveforms, circles, gradients):

```js
const canvas = document.getElementById("viz");
const ctx = canvas.getContext("2d");

for (let f = 0; f < AUDIO_DATA.totalFrames; f++) {
  tl.call(
    () => {
      const frame = AUDIO_DATA.frames[f];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // draw using frame.rms and frame.bands
    },
    [],
    f / AUDIO_DATA.fps,
  );
}
```

**WebGL / Three.js** — HyperFrames patches `THREE.Clock` for deterministic time. Update uniforms from audio data each frame.

**DOM elements** — fine for fewer than ~20 elements, slower than Canvas for many.

### Smoothing

```js
let prev = null;
const smoothing = 0.25; // 0.1-0.2 snappy, 0.3-0.5 flowing
function smooth(f) {
  const raw = AUDIO_DATA.frames[f];
  if (!prev) {
    prev = { rms: raw.rms, bands: [...raw.bands] };
    return prev;
  }
  prev = {
    rms: prev.rms * smoothing + raw.rms * (1 - smoothing),
    bands: raw.bands.map((b, i) => prev.bands[i] * smoothing + b * (1 - smoothing)),
  };
  return prev;
}
```

### Spatial Mapping

- **Horizontal**: bass left, treble right (iterate bands left-to-right)
- **Vertical**: bass bottom, treble top
- **Circular**: bass at 12 o'clock, wrap clockwise; mirror for a full circle

### Motion Principles

- **Bass drives big moves** — scale, glow, position shifts.
- **Treble drives detail** — shimmer, flicker, edge effects.
- **RMS drives globals** — background brightness, overall energy.
- Pick 2-3 properties to animate. More looks noisy.
- Keep minimums above zero — quiet sections still need life.

### Band Count

| Bands | Detail    | Good for                   |
| ----- | --------- | -------------------------- |
| 4     | Low       | Background glow, pulsing   |
| 8     | Medium    | Bar charts, basic spectrum |
| 16    | High      | Detailed EQ (default)      |
| 32    | Very high | Dense radial layouts       |

### Layering

Layer multiple canvases with CSS `z-index` for depth — a background layer driven by bass/rms and a foreground layer driven by individual bands creates depth without per-element complexity.

```html
<canvas id="bg-layer" style="position:absolute;top:0;left:0;z-index:1;"></canvas>
<canvas id="main-layer" style="position:absolute;top:0;left:0;z-index:2;"></canvas>
```

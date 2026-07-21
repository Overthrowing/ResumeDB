# ResumeDB pitch video frame packets

These packets lock the first-draft build. Each frame must be a deterministic,
seek-safe HyperFrames sub-composition and must stand on its own at any local
timeline time.

## Shared production rules

- Canvas: 1920 x 1080.
- Caption reserve: keep all load-bearing evidence above y=886.
- Palette: cream `#F3F2F2`, ink `#201F1D`, ochre `#B8822A`, violet `#6D28D9`, warm navy `#191923` only for terminal surfaces.
- Fonts: EB Garamond for display, Inter for body, JetBrains Mono for labels.
- Use one dominant focal idea and one restrained violet voltage moment per frame.
- Use real product captures as anchors where listed, but reconstruct the interaction layer when screenshot motion would ghost, blur, or become unreadable.
- Every timed element has `class="clip"`, `data-start`, `data-duration`, and `data-track-index`.
- Register one paused GSAP timeline as `window.__timelines[compositionId]`.
- No CSS keyframe animation, CSS transitions, random values, network access, or lazy media loading.
- All movement must settle. No perpetual drift or breathing.
- Do not use an em dash in visible text.
- Each frame keeps its own `f##-` class and ID namespace.
- Use `data-hf-id` on authored DOM nodes.

## Frame 01 - The broken job hunt

- File: `compositions/frames/01-job-hunt-hook.html`
- Composition ID: `01-job-hunt-hook`
- Duration: 8.810s
- Assets: `assets/01-dashboard.png`, `assets/favicon.svg`
- Focal: 200 applications, 100+ hours, 0 offers, then ResumeDB.

### Layout

Keep the upper title region sparse. Use a large left-aligned counter around x=110,
y=170. Application cards and browser-tab fragments accumulate to the right. The
real dashboard is hidden behind the clutter and becomes the final full-width
proof surface. Keep the lower caption region empty.

### Motion beats

- 0.00-1.80: Count 0 to 200 while application cards waterfall into a messy stack.
- 1.80-4.60: Land 100+ hours and then 0 offers. Hold the zero for at least 0.45s.
- 4.60-6.70: Pull every fragment inward along curved paths. Reveal the real dashboard.
- 6.70-8.81: Resolve the ResumeDB mark, "Changes the job hunting game," and "The internship operating system."

### Acceptance

The pain reads before the brand. The 0-offer moment is not rushed. The dashboard
is recognizable, and the closing promise is the only final focal.

## Frame 02 - A memory that compounds

- File: `compositions/frames/02-career-memory.html`
- Composition ID: `02-career-memory`
- Duration: 8.260s
- Assets: `assets/02-settings-profile-agent.png`, `assets/03-knowledge.png`
- Focal: Sam Rivera's persistent experience bank.

### Layout

Use the real Settings capture as a 62 percent primary surface on the left and a
cropped Knowledge view on the right. Reconstruct only the high-value field and
experience cards so Sam's name and metrics are crisp. Do not feature missing
facts or safety warnings.

### Motion beats

- 0.00-1.50: Establish Settings and replace the generated persona with Sam Rivera.
- 1.50-5.50: Fill contact and profile rows, then add Waypoint Robotics and Genome Dynamics Lab cards with their 75 percent and 85 percent metrics.
- 5.50-8.26: Draw both surfaces into a central "Sam Rivera experience bank" node. Add "Learns with every application."

### Acceptance

Sam is the only persona. The frame feels alive through filling and linking, not
through screenshot drift. Both role domains are already visible.

## Frame 03 - Any role, one request

- File: `compositions/frames/03-two-role-discovery.html`
- Composition ID: `03-two-role-discovery`
- Duration: 9.260s
- Assets: `assets/04-career-agent.png`
- Focal: one prompt produces robotics and bioinformatics opportunities.

### Layout

The real Career Agent occupies roughly 68 percent of the width. Keep the prompt
high inside its composer with no preserved leading newline. Use the remaining
space for a live transcript rail that expands into two result cards.

### Motion beats

- 0.00-2.40: Establish the real page and move a simulated cursor into the composer.
- 2.40-5.00: Type "Find robotics and bioinformatics internships where my evidence is strongest."
- 5.00-7.30: Stream Searching internships, Inspecting role pages, and Matching Sam's evidence.
- 7.30-9.26: Land Autonomy and Robotics Software Intern at 94 percent fit and Bioinformatics Engineering Intern at 92 percent fit.

### Acceptance

The prompt is vertically centered and readable. The two-role contrast is the
final focal. The transcript has plausible work language without technical clutter.

## Frame 04 - Watch the agent think

- File: `compositions/frames/04-agent-timeline.html`
- Composition ID: `04-agent-timeline`
- Duration: 8.760s
- Assets: `assets/04-career-agent.png`, `assets/03-knowledge.png`
- Focal: observable search, inspection, and evidence verification.

### Layout

Give the Career Agent workbench 75 percent of the width. The checklist or event
rail is narrow and secondary. Show real page fragments and crisp reconstructed
transcript rows. The evidence pane must be large enough for the laser scan to read.

### Motion beats

- 0.00-1.20: Establish the wide agent workbench.
- 1.20-4.20: Cascade query, page inspection, and requirement extraction events.
- 4.20-6.70: Sweep one bright scanner line down the evidence pane while requirement-to-evidence matches lock in.
- 6.70-8.76: Create both application records and resolve "Ready to tailor."

### Acceptance

The agent panel is wider than the proof rail. The scanner is finite and aligned
to the evidence surface. There is no idle motion after the resolution.

## Frame 05 - From idea to application

- File: `compositions/frames/05-application-lifecycle.html`
- Composition ID: `05-application-lifecycle`
- Duration: 10.000s
- Assets: `assets/05-applications.png`, `assets/06-application-overview.png`
- Focal: visible useful work moves one application forward.

### Layout

Use one real application card at left and a large reconstructed application work
surface at right. Status is present but secondary. Use document and answer fields
as the main proof. Avoid a static five-stage explainer.

### Motion beats

- 0.00-1.60: Cursor clicks Start agent. Not Started morphs to In Progress.
- 1.60-5.80: Research transcript rows complete, fields fill, and a resume bullet types. Status becomes Draft near the end.
- 5.80-7.90: A user-review laser scans the document and resolves small review checks. Status becomes Ready.
- 7.90-10.00: One large approval check stamp lands and the record advances to Submitted.

### Acceptance

State changes are consequences of visible work. The stamp reads as approval, not
as an automated employer click. The document stays readable throughout.

## Frame 06 - Stronger, still true

- File: `compositions/frames/06-evidence-tailoring.html`
- Composition ID: `06-evidence-tailoring`
- Duration: 7.870s
- Assets: `assets/07-evidence-tailoring.png`
- Focal: one full evidence-backed bullet transformation.

### Layout

Make the tailored sentence large and full. Use a local SVG inside the tailored
card so connector endpoints remain aligned. Place four compact source cards
directly beneath the clauses they support. Do not use empty cards, a random
purple rectangle, unknown-field messaging, or sensitive-data messaging.

### Motion beats

- 0.00-1.20: Show "Improved robot navigation performance."
- 1.20-3.90: Rewrite into "Reduced AMR path-replanning latency 75%, from 180 ms to 45 ms, by moving ROS 2 costmap updates outside the C++ control loop."
- 3.90-6.70: Draw precisely aligned paths to role, metric, stack, and shipped-outcome evidence.
- 6.70-7.87: Resolve "Every claim backed by what Sam already did."

### Acceptance

The before and after are both legible. Every connector touches the correct clause
and source. The final card feels full and persuasive.

## Frame 07 - One person, two resumes

- File: `compositions/frames/07-two-role-resumes.html`
- Composition ID: `07-two-role-resumes`
- Duration: 11.080s
- Assets: `assets/sam-rivera-robotics-resume.png`, `assets/sam-rivera-bioinformatics-resume.png`
- Focal: two real rendered PDF pages.

### Layout

Place both full pages side by side at equal scale. Keep identity headers aligned.
Use subtle role-color hairlines, not large opaque overlays. A narrow center node
may represent the shared experience bank before the pages separate.

### Motion beats

- 0.00-1.60: Establish the shared Sam Rivera experience bank node.
- 1.60-4.20: Split into the two rendered pages and settle them at equal scale.
- 4.20-8.90: Highlight robotics evidence on the left and bioinformatics evidence on the right with short scanner passes and keyword chips.
- 8.90-11.08: Resolve "Same evidence bank. Different story."

### Acceptance

Both PDFs are clearly real pages, not viewer screenshots. Text stays sharp. The
documents look different in summary, order, technologies, and impact metrics.

## Frame 08 - Autofill in motion

- File: `compositions/frames/08-extension-autofill.html`
- Composition ID: `08-extension-autofill`
- Duration: 8.910s
- Assets: `assets/09-ats-empty.png`
- Focal: fields fill one by one with Sam's approved data.

### Layout

Use one clean reconstructed extension panel at left and one reconstructed ATS
form at right, with the real empty ATS capture as a subtle page anchor only. Do
not layer a second extension screenshot underneath. Do not reveal horizontal
quarters of a completed screenshot.

### Motion beats

- 0.00-1.40: Preflight maps name, email, location, college, degree, authorization, and robotics resume.
- 1.40-2.00: Cursor clicks Fill mapped fields.
- 2.00-7.20: Type or select Sam, Rivera, email, phone, Pittsburgh, college, major, degree, and authorization sequentially.
- 7.20-8.91: Upload `Sam-Rivera-Robotics.pdf`; all mapped rows resolve to checks.

### Acceptance

There is one extension surface and one ATS form. The page never glitches or
chunk-reveals. Remove manual-submit labels and explanatory guard text.

## Frame 09 - A campaign, not chaos

- File: `compositions/frames/09-application-funnel.html`
- Composition ID: `09-application-funnel`
- Duration: 9.720s
- Assets: none, native HTML and SVG only
- Focal: illustrated Sankey from 200 opportunities to 3 offers.

### Layout

Use a left-to-right Sankey with six main nodes: 200 discovered, 88 strong
matches, 64 tailored, 58 submitted, 14 interviews, 3 offers. Use static band
widths proportional to values and reveal them with masks or stroke dash offsets.
Smaller muted branches peel down to filtered, saved, awaiting, and declined labels.

### Motion beats

- 0.00-0.80: Reveal an "Illustrative application campaign" badge.
- 0.80-7.80: Draw the main band and count each node in sequence. Peel side branches away after the main node settles.
- 7.80-9.72: Land 3 offers with one restrained violet pulse and hold the complete flow.

### Acceptance

Conservation is visually plausible. The illustrative label is visible before the
data. Nodes and labels do not overlap, and 3 offers is the single final focal.

## Frame 10 - Bring your own agent

- File: `compositions/frames/10-own-agent-mcp.html`
- Composition ID: `10-own-agent-mcp`
- Duration: 9.000s
- Assets: `assets/02-settings-profile-agent.png`
- Focal: ResumeDB MCP as the career-memory hub for any preferred agent.

### Layout

Use the real connected-agent settings crop in the opening. Transition into a
large ResumeDB MCP hub at center. Codex, Claude, and Local agent cards connect
from the left; career memory, applications, and artifacts connect on the right.
Hosted AI may appear only as a small secondary option.

### Motion beats

- 0.00-1.80: Sharpen the connected-agent settings area and open an MCP endpoint card.
- 1.80-5.50: Connect Codex, Claude, and Local agent into ResumeDB MCP with measured path draws.
- 5.50-7.60: Route "Find internships," "Tailor this URL," and "What is ready?" through the hub into product capabilities.
- 7.60-9.00: Resolve "Your agent. Your workflow. One career memory."

### Acceptance

The MCP server is the hero, not a footnote. The integration feels like a daily
workflow advantage rather than a settings explanation.

## Frame 11 - Our other features include

- File: `compositions/frames/11-future-roadmap.html`
- Composition ID: `11-future-roadmap`
- Duration: 10.965s
- Assets: `assets/favicon.svg`
- Focal: the finished ResumeDB product close, supported by a concise roadmap.

### Layout

Use the left 44 percent for the ResumeDB mark, a large product thesis, the
category tagline, and the deployed URL. Use the right 52 percent for five
readable roadmap rows rather than six dense equal cards. Keep every load-bearing
line at least 21px and all content above the caption band.

### Motion beats

- 0.00-1.20: Reveal the mark, thesis, and first roadmap rule.
- 1.20-6.40: Step in email tracking, interview prep, campus insights, four-year planning, and major-specific portfolios.
- 6.40-8.10: Recede the roadmap to secondary emphasis while the product lockup expands.
- 8.10-10.965: Hold ResumeDB, "The internship operating system," and `resumedb-ai.vercel.app` as the complete product close.

### Acceptance

The roadmap is readable before it recedes. There is no mention of Codex, agents,
or a next section. The product close is clean and still for at least two seconds.

## Frame 12 - How we built it

- File: `compositions/frames/12-codex-inside-product.html`
- Composition ID: `12-codex-inside-product`
- Duration: 10.500s
- Focal: an unmistakable editorial reset into the judging appendix.

### Layout

Switch to a full warm-navy canvas with a persistent `JUDGING APPENDIX / HOW WE
BUILT IT` slug and one ochre rule. Make `Codex + GPT-5.6` the dominant display.
Use three wide build lanes separated by hairlines for WEB APP, CHROME EXTENSION,
and MCP SERVER. Do not show product screenshots, diagrams, or connector paths.

### Motion beats

- 0.00-1.20: Hard-reset from cream to navy and type the appendix slug.
- 1.00-4.20: Reveal the conversational aside, then wipe on `Codex + GPT-5.6`.
- 4.00-7.80: Stamp the three build lanes left to right with verified states.
- 7.80-10.500: Hold the separated appendix identity and coordinated-system proof.

### Acceptance

The frame cannot be mistaken for another product capability scene. All text is
at video scale, the palette is visibly different, and there are no crossing
lines, route diagrams, or product UI fragments.

## Frame 13 - Codex dogfooded the product

- File: `compositions/frames/13-gpt56-engineering-team.html`
- Composition ID: `13-gpt56-engineering-team`
- Duration: 18.500s
- Assets: `assets/09-ats-empty.png`, `assets/13-extension-preflight-live.png`
- Focal: real dogfooding proof, one concrete caught bug, and a 13-tool protocol verification.

### Layout

Keep the appendix slug at top. Phase one uses a large QA workstation with the
real hosted application view and a clean reconstructed extension overlay. A
right rail shows browser, computer-use, reproduce, and verify steps plus the
real localhost-default bug. Phase two shutters into a full-width three-column
MCP tool matrix with every exact tool name and a large `13 / 13` result.

### Motion beats

- 0.00-1.10: Establish the appendix header and QA workstation.
- 1.10-4.80: Drive the extension with a simulated cursor while fields and assertions resolve one by one.
- 4.80-8.20: Reveal `CAUGHT: fresh install -> localhost:8000`, then `FIXED: Railway default + local fallbacks` and `REGRESSION TESTS: 3 / 3`.
- 8.20-9.10: Shutter from the workstation into the protocol verification matrix.
- 9.10-15.80: Check all thirteen tool rows in three quick waves while the counter advances to thirteen.
- 15.80-18.500: Hold `13 / 13 MCP tools verified through /mcp/` with the finite scan gone.

### Acceptance

The real bug wording matches commit `fc6fcca`. The tool names match the thirteen
registered MCP tools, the protocol audit claim is truthful, and the real browser
view is recognizable. No connector crosses text or UI.

## Frame 14 - Human innovation, agent hardening

- File: `compositions/frames/14-codex-dogfood-meta.html`
- Composition ID: `14-codex-dogfood-meta`
- Duration: 16.500s
- Focal: a restrained human-agent thesis for the judging appendix.

### Layout

Use the warm-navy appendix canvas split 44/56 by one hairline. The human side
shows student empathy, product direction, real user workflows, and creative
taste. The agent side shows build, debug, verify, test, and harden as precise
status rows. Then both columns recede into one centered two-line thesis. Do not
show a product CTA, fake video editor, loop diagram, or connector paths.

### Motion beats

- 0.00-1.20: Establish the split thesis and appendix slug.
- 1.20-6.40: Select the human decisions while agent outcomes lock in on the opposite side.
- 6.40-8.10: Recede both columns with a decisive focus dip.
- 8.10-11.60: Reveal `Human innovation and taste.`
- 10.60-13.80: Reveal `Agent-grade production quality and hardening.`
- 13.80-16.500: Hold the final judging thesis completely still.

### Acceptance

The ending is sincere and specific, not self-congratulatory. Codex and GPT-5.6
remain readable, the final two-line thesis is the only dominant focal, and the
full video remains under three minutes.

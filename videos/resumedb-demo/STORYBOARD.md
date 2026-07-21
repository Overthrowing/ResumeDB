---
format: 1920x1080
duration: 90s
message: "ResumeDB is an agentic internship operating system, not merely a resume builder"
arc: Demo Loop with a future-pacing close
audience: online hackathon judges
mode: collaborative
music: none
---

## Video direction

- palette: Warm cream canvas, ink typography, ochre support surfaces, and one restrained ResumeDB violet voltage moment per frame. Real product views retain their native UI colors and are framed as the primary evidence.
- motion grammar: Smooth `power3` long-tail settles, sequential reveals on the spoken cue, and velocity-matched internal seams. No bounce, infinite loops, lazy breathing, or back-half camera drift.
- product treatment: Use the captured production views at readable scale in every working-feature scene. Crop and layer them as live surfaces, then add simulated cursor movement, field entry, transcript rows, focus masks, scanner passes, and status changes above the real interface.
- rhythm: Frames 1, 3, 4, 6, and 8 carry the strongest motion. Frames 2, 5, 7, and 9 resolve into short evidence reads. Frame 10 is the final held roadmap lockup.
- camera: Establish the full product surface first, make one purposeful focus move, then lock. The screenshot itself never drifts continuously.
- captions: Keep the lower caption band clear. All load-bearing interface evidence stays above the lower 15 percent of the canvas.

## Frame 1 - One guided workflow

- scene: Disconnected internship tasks collapse into the ResumeDB dashboard and one clear student journey.
- voiceover: "Getting an internship should not mean running five disconnected systems. ResumeDB makes it one guided workflow."
- duration: 6.58s
- poster: 4s
- transition_in: cut
- status: built
- src: compositions/frames/01-guided-workflow.html
- type: hook
- persuasion: Friction reduction
- beat: recognition to relief
- blueprint: constellation-hub - scattered tasks converge into the dashboard
- asset_candidates: assets/01-dashboard.png - ResumeDB career command center with a Ready application and a complete synthetic profile
- focal: assets/01-dashboard.png
- roles: 01-dashboard = background product surface; task chips = supporting; ResumeDB promise = foreground

Adapt: keep the constellation-to-hub signature, but let the real dashboard become the hub instead of an abstract symbol.
Scene 1 (0.0-1.8s): Five disconnected task chips appear around an empty cream center on their spoken cues, arranged as a rule-of-thirds constellation with the headline held in the upper third; reveal them sequentially with smooth long-tail settles.
Scene 2 (1.8-4.2s): The chips accelerate inward and collapse behind the captured dashboard as it resolves from a soft masked crop into a readable 70-percent product surface; use `center-outward-expansion` in reverse with a brief directional blur at peak velocity.
Scene 3 (4.2-6.58s): Thin paths draw from the dashboard to Discover, Tailor, Track, and Apply labels while the Ready application receives the single violet highlight; use `svg-path-draw`, then hold the real product view still.

narrativeRole: Land the category-level value immediately: one operating system replaces a fragmented internship process.
keyMessage: ResumeDB manages the whole job journey, not only a resume.

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
- blueprint: device-surface-showcase - the real profile and knowledge surfaces advance through a single setup flow
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
- blueprint: cursor-ui-demo - one natural-language discovery flow driven end to end by the simulated cursor
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
- blueprint: grid-card-assemble - four observable run stages accumulate and remain visible
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
- blueprint: spatial-pan-stations - the camera travels the five-stage application journey and pauses on both human gates
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
- blueprint: comparison-split - original and tailored language open side by side while source evidence locks beneath them
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

## Frame 7 - Complete application artifacts

- scene: The tailored resume, sourced application answers, and cover letter rotate through one application workbench.
- voiceover: "It produces the tailored resume, cover letter, and answers, while keeping sensitive facts tied to the profile and unknowns blank."
- duration: 7.1s
- poster: 6s
- transition_in: push-slide LEFT
- status: built
- src: compositions/frames/07-application-artifacts.html
- type: feature_showcase
- persuasion: Value stacking
- beat: capability and trust
- blueprint: device-surface-showcase - a single application window cycles through the finished artifacts
- asset_candidates: assets/14-tailored-resume.png - rendered one-page tailored resume; assets/15-cover-qa.png - sourced application answers and tailored cover letter
- focal: assets/14-tailored-resume.png
- roles: 14-tailored-resume = primary artifact; 15-cover-qa = supporting answers and letter; source badges = foreground trust proof

Adapt: preserve the device-surface rotation but use two real product captures and a restrained document carousel rather than static screenshot holds.
Scene 1 (0.0-2.1s): The real tailored resume rises from the application workbench into a large centered document surface; use `coordinate-target-zoom` to land on the role-specific skills and impact bullets.
Scene 2 (2.1-4.35s): A cut-the-curve seam slides the resume left while the captured answers and cover-letter view enters from the right; Resume, Answers, and Cover letter labels sequence across the top.
Scene 3 (4.35-5.95s): Canonical profile-source badges draw onto sensitive answers one by one, and an unknown answer remains visibly blank with a restrained marker outline.
Scene 4 (5.95-7.1s): Both real captures settle into a clean two-up composition and hold without camera movement.

narrativeRole: Broaden the proof from bullet rewriting to the complete approved application package.
keyMessage: ResumeDB prepares every job-specific artifact from the same verified knowledge.

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

## Frame 10 - Future roadmap

- scene: A clearly labeled Future roadmap slide builds six concise ideas in a clean two-column layout, then resolves on the ResumeDB mark.
- voiceover: "Next: email tracking, interview prep, progress journals, campus insights, four-year planning, and major-specific career artifacts."
- duration: 8.008s
- poster: 5s
- transition_in: blur-crossfade
- status: built
- src: compositions/frames/10-future-roadmap.html
- type: branding
- persuasion: Future pacing
- beat: aspiration
- blueprint: grid-card-assemble - six roadmap ideas accumulate in two columns before the final lockup
- asset_candidates: assets/favicon.svg - official ResumeDB mark captured from the deployed product
- focal: assets/favicon.svg
- roles: favicon = final brand lockup; roadmap cards = primary future ideas; future label = foreground scope guard

Adapt: keep the six-card assembly, pace one roadmap item per spoken cue, and close on a clear product mark without presenting future ideas as shipped.
Scene 1 (0.0-0.95s): A large FUTURE ROADMAP scope label draws on above an empty two-column grid; the violet accent is reserved for this label.
Scene 2 (0.95-6.35s): Email tracking, Interview prep, Progress journals, Campus insights, Four-year planning, and Major-specific artifacts arrive one by one on their exact narration cues with `waterfall-entry`, filling the two columns from top left to bottom right.
Scene 3 (6.35-8.008s): The six cards nudge outward to reveal the ResumeDB mark and “The internship operating system” lockup at center; the result holds still through the end.

narrativeRole: Close with the larger student-career platform vision while clearly separating future ideas from shipped MVP features.
keyMessage: ResumeDB can grow with a student across college, applications, interviews, and career development.

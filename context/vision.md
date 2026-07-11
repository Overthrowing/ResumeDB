# ResumeDB

The following roadmap details the architectural framework and strategic vision for the Resume Optimizer platform.

## Problem statement

Applications are becoming ever more competitive, making it necessary to tailor one's resume to every application. This however is difficult as it requires repeatedly modifying a template with awareness of space constraints, involves constantly shifting descriptions which can lead to drift over time, and takes time.

## Vision

A store of one's experience/projects/skills/courses with no length limits that is pulled from and optimized (length, keywords, metrics, phrasing) for each application. It must be able to take into account company- and role-specific information from the job description, prioritize certain information, and stay readable to resume audit tools.

## Hurdles

- Check if tex/typst formats can be parsed by resume audit tools or if we have to use something else, and how good is AI at editing said thing.
- What sort of template works best with this modular framework.

## UI

- Minimalist UI.
- Features split across tabs.
- Copy Claude science?

## MVP

Features ranked by importance to the core.

1. Ability to input experience/projects/skills/courses with no length limit and with all details.
2. Pipeline: Input ALL your data in full detail -> upload job description -> tell agent what to optimize for/show in your resume -> agent pulls from universal db and formats with tex/typst.
3. Auto-tailor the resume to the specific opening and specific company.
4. Optimize keywords but go beyond just this by modifying user-input database entries as needed to fit the job role and space limitations.
5. Each application -> new project with bucketed context containing app details + chat histories for resume editing.
6. Nudge user for details when needed (e.g. quantitative metrics).
7. Focus on quantitative metrics?
8. LLM-written cover letter/short answer questions (these can be requested in the chat).
9. Run resume auditing tools to see how your resume compares -> auto-optimization loop (questionable since this can lead to local minima).
10. Autoscan and put job openings into a central spreadsheet.

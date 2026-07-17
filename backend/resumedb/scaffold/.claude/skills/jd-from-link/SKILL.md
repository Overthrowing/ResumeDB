---
name: jd-from-link
description: Fetch a job posting URL and write a structured jd.md into the application folder. Used by the app when an application is created from a link.
---

Given a job posting URL and an application folder, produce jd.md.

1. WebFetch the URL. If it fails or the page is a JS shell with no content, say
   so and ask the user to paste the JD text instead.
2. Write applications/<id>/jd.md with this structure:

    # <Role title> at <Company>

    Source: <url>

    ## Requirements
    <the actual requirements/qualifications, as stated>

    ## Responsibilities
    <as stated>

    ## Raw posting
    <the full relevant posting text, cleaned of navigation/boilerplate>

3. Keep the original wording in the sections - tailoring depends on the JD's own
   terminology. Do not summarize away specifics; drop only navigation chrome,
   benefits boilerplate, and EEO statements from the structured sections (they
   stay in Raw posting if present in the fetched text).

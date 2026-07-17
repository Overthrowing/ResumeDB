---
name: template-author
description: Create or modify resume templates in templates/. Use when the user asks for a new template, layout changes, or styling changes that go beyond one application.
---

Create or modify Typst resume templates in templates/.

Contract (templates/SCHEMA.md is authoritative):

- First line: `#let data = yaml(sys.inputs.data)`
- Self-contained: no package imports, no icon fonts, no images.
- Single column, real selectable text. ATS-safety is the whole point.
- Handle missing optional fields with `.at("key", default: ...)`.
- Support both section shapes: `entries` and `items`.

Validate every change by compiling against the sample data:

    typst compile --root . --format pdf --input data=/templates/sample.yaml templates/<name>.typ /dev/null

Then render it once and inspect the PDF for layout defects (overlapping text,
stray bullets, cramped section spacing) before declaring it done. A template that
merely compiles is not validated.

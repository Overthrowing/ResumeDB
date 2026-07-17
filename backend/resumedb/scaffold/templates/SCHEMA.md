# Data contract

The single authoritative schema binding db/ entries, per-application resume.yaml,
and templates. Agents and template authors follow this exactly.

## Master db/ entry (db/<id>.yaml, filename stem = entry id)

```yaml
type: experience        # experience | project | skill | course | education | achievement | extra
title: Software Engineer
org: Acme Corp          # optional
location: City, ST      # optional
start: 2023-06          # YYYY-MM, optional
end: present            # YYYY-MM or "present", optional
tags: [python]          # optional
links: []               # optional, [{label, url}]
bullets:                # achievement bullets, plain strings, metrics in the text
  - Cut p99 latency 40% ...
items: [Python, Go]     # only for type: skill (a skill entry is a category)
notes: |
  Unlimited freeform prose the agent mines when tailoring.
```

db/profile.yaml: `name, email, phone, location, links: [{label, url}]`.

## Per-application resume.yaml (what templates consume)

```yaml
name: Jane Doe
headline: Software Engineer      # optional
contact:                         # all fields optional
  email: jane@example.com
  phone: "555 555 5555"
  location: City, ST
  links:
    - label: GitHub
      url: https://github.com/jane
sections:                        # ordered, templates render in order
  - title: Experience
    entries:
      - title: Software Engineer
        org: Acme Corp           # optional
        location: City, ST       # optional
        dates: "Jun 2023 - Present"  # preformatted display string
        bullets:
          - ...
  - title: Skills
    items:
      - label: Languages
        value: Python, Go, TypeScript
```

Exactly two section shapes: `entries` (heading + bullets) and `items` (label/value
rows). Education, projects, and courses use the `entries` shape.

## Template contract (templates/*.typ)

- First line: `#let data = yaml(sys.inputs.data)`
- Self-contained: no package imports, no icon fonts, no images.
- Single column, real selectable text (ATS-safe by construction).
- Must handle missing optional fields (use `.at("key", default: ...)`).
- Must compile against templates/sample.yaml:
  `typst compile --root . --format pdf --input data=/templates/sample.yaml templates/<name>.typ /dev/null`
- Target exactly one US-letter page with typical content.

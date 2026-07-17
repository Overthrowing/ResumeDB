#let data = yaml(sys.inputs.data)

#set page(paper: "us-letter", margin: (x: 0.65in, y: 0.55in))
#set text(size: 10pt)
#set par(justify: false, leading: 0.5em)
#set list(indent: 0.6em, body-indent: 0.5em, spacing: 0.55em)

// Header
#align(center)[
  #text(size: 17pt, weight: "bold")[#data.name]
  #v(0.1em)
  #{
    let contact = data.at("contact", default: (:))
    let parts = ()
    if data.at("headline", default: none) != none { parts.push([#data.headline]) }
    for key in ("email", "phone", "location") {
      let val = contact.at(key, default: none)
      if val != none and val != "" { parts.push([#val]) }
    }
    // show the URL itself (sans scheme) so ATS text extraction keeps it
    for l in contact.at("links", default: ()) {
      let display = l.url.replace("https://", "").replace("http://", "").trim("/")
      parts.push(link(l.url)[#display])
    }
    parts.join([ | ])
  }
]

#let section-title(title) = {
  v(0.5em)
  text(size: 11pt, weight: "bold")[#upper(title)]
  v(-0.7em)
  line(length: 100%, stroke: 0.6pt)
  v(-0.25em)
}

#let entry-block(e) = {
  let left = text(weight: "bold")[#e.title]
  let org = e.at("org", default: none)
  if org != none { left += [, #org] }
  let right = ()
  let loc = e.at("location", default: none)
  if loc != none and loc != "" { right.push([#loc]) }
  let dates = e.at("dates", default: "")
  if dates != "" { right.push([#dates]) }
  block(above: 0.65em, below: 0.35em)[#left #h(1fr) #right.join([ | ])]
  for b in e.at("bullets", default: ()) {
    list.item(b)
  }
}

#for section in data.at("sections", default: ()) {
  section-title(section.title)
  if "entries" in section {
    for e in section.entries { entry-block(e) }
  }
  if "items" in section {
    for it in section.items {
      block(above: 0.45em, below: 0.3em)[*#it.label:* #it.value]
    }
  }
}

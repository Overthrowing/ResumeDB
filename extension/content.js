if (!globalThis.__resumeDBContentLoaded) {
  globalThis.__resumeDBContentLoaded = true;

  const normalize = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const ANSWER_STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'do', 'does', 'for', 'i', 'in', 'is', 'of', 'or',
    'the', 'to', 'will', 'with', 'you', 'your',
  ]);

  const answerScore = (context, key) => {
    if (!key) return 0;
    if (context.includes(key)) return key.length + 100;
    const meaningful = key
      .split(' ')
      .filter((part) => (/^\d+$/.test(part) || part.length >= 3) && !ANSWER_STOP_WORDS.has(part));
    const overlap = meaningful.filter((part) => context.includes(part)).length;
    return overlap >= 2 ? overlap : 0;
  };

  const visible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && !element.disabled;
  };

  const labelFor = (element) => {
    const pieces = [];
    if (element.labels) pieces.push(...Array.from(element.labels).map((label) => label.innerText));
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) pieces.push(label.innerText);
    }
    let parent = element.parentElement;
    for (let depth = 0; parent && depth < 3; depth += 1, parent = parent.parentElement) {
      const label = parent.querySelector(':scope > label, :scope > legend');
      if (label) pieces.push(label.innerText);
    }
    pieces.push(
      element.getAttribute('aria-label'),
      element.getAttribute('data-qa'),
      element.getAttribute('data-testid'),
      element.placeholder,
      element.name,
      element.id,
    );
    return normalize(pieces.filter(Boolean).join(' '));
  };

  const setNativeValue = (element, value) => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(element, String(value));
    else element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  const profileValues = (profile) => {
    const names = String(profile.name ?? '').trim().split(/\s+/).filter(Boolean);
    const values = [
      { keys: ['first name', 'firstname', 'given name'], value: names[0] || '', source: 'profile.name' },
      { keys: ['last name', 'lastname', 'family name', 'surname'], value: names.slice(1).join(' ') || names[0] || '', source: 'profile.name' },
      { keys: ['full name', 'legal name', 'candidate name'], value: profile.name, source: 'profile.name' },
      { keys: ['email', 'email address'], value: profile.email, source: 'profile.email' },
      { keys: ['phone', 'telephone', 'mobile'], value: profile.phone, source: 'profile.phone' },
      { keys: ['location', 'city state', 'current city', 'address'], value: profile.location, source: 'profile.location' },
      { keys: ['college', 'university', 'school'], value: profile.college, source: 'profile.college' },
      { keys: ['major', 'field of study'], value: profile.major, source: 'profile.major' },
      { keys: ['degree'], value: profile.degree, source: 'profile.degree' },
      { keys: ['graduation year', 'graduation date', 'expected graduation'], value: profile.graduation_year, source: 'profile.graduation_year' },
      { keys: ['work authorization', 'authorized to work'], value: profile.work_authorization, source: 'profile.work_authorization' },
      { keys: ['sponsorship', 'visa sponsorship'], value: profile.requires_sponsorship, source: 'profile.requires_sponsorship' },
    ];
    for (const link of profile.links || []) {
      values.push({ keys: [normalize(link.label), `${normalize(link.label)} url`], value: link.url, source: `profile.links.${normalize(link.label)}` });
    }
    return values.filter((item) => item.value !== undefined && item.value !== null && String(item.value) !== '');
  };

  const resolveMatch = (context, profile, answers) => {
    const candidates = [];
    for (const answer of answers || []) {
      if (answer.value === undefined || answer.value === null || String(answer.value) === '') continue;
      const keys = [answer.key, answer.question].map(normalize).filter(Boolean);
      const score = Math.max(...keys.map((key) => answerScore(context, key)));
      if (score > 1) candidates.push({ score, value: answer.value, source: answer.source || `answers.${answer.key}` });
    }
    for (const candidate of profileValues(profile)) {
      const score = Math.max(...candidate.keys.map((key) => context.includes(key) ? key.length + 50 : 0));
      if (score > 0) candidates.push({ score, value: candidate.value, source: candidate.source });
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  };

  const resolveValue = (context, profile, answers) => resolveMatch(context, profile, answers)?.value;

  const matchingOption = (element, value) => {
    const wanted = normalize(value);
    return Array.from(element.options).find((item) => {
      const text = normalize(item.textContent);
      const optionValue = normalize(item.value);
      return text === wanted || optionValue === wanted || text.includes(wanted) || wanted.includes(text);
    });
  };

  const fillSelect = (element, value) => {
    const option = matchingOption(element, value);
    if (!option) return false;
    setNativeValue(element, option.value);
    return true;
  };

  const choiceMatches = (element, context, value) => {
    const wanted = normalize(value);
    const optionLabel = normalize(element.labels?.[0]?.innerText || element.value || context);
    const affirmative = ['yes', 'true', '1'].includes(wanted);
    const negative = ['no', 'false', '0'].includes(wanted);
    return optionLabel.includes(wanted)
      || wanted.includes(optionLabel)
      || (affirmative && /yes|agree|authorized/.test(optionLabel))
      || (negative && /no|decline|not authorized/.test(optionLabel));
  };

  const fillChoice = (element, context, value) => {
    const matches = choiceMatches(element, context, value);
    if (!matches && element.type === 'radio') return false;
    const negative = ['no', 'false', '0'].includes(normalize(value));
    const shouldCheck = element.type === 'checkbox' ? !negative : true;
    if (element.checked !== shouldCheck) element.click();
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const titleCase = (value) => normalize(value)
    .split(' ')
    .slice(0, 12)
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ');

  const displayLabelFor = (element) => {
    const raw = element.type === 'radio'
      ? element.name
      : element.labels?.[0]?.innerText
        || element.getAttribute('aria-label')
        || element.name
        || element.placeholder
        || 'Application field';
    return titleCase(raw);
  };

  const preflight = ({ profile, answers }) => {
    const mappings = [];
    const seen = new Set();
    const fields = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const field of fields) {
      if (!visible(field) || ['hidden', 'submit', 'button', 'password', 'file'].includes(field.type)) continue;
      const context = labelFor(field);
      if (!context) continue;
      const match = resolveMatch(context, profile, answers);
      if (!match) {
        if (field.required) {
          const key = `review:${field.name || context}`;
          if (!seen.has(key)) {
            seen.add(key);
            mappings.push({ label: displayLabelFor(field), status: 'review', source: 'No saved answer' });
          }
        }
        continue;
      }

      let ready = true;
      if (field instanceof HTMLSelectElement) ready = Boolean(matchingOption(field, match.value));
      if (field.type === 'radio') {
        if (!choiceMatches(field, context, match.value)) continue;
      } else if (field.type === 'checkbox') {
        ready = true;
      }
      const key = `${ready ? 'ready' : 'review'}:${field.name || context}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mappings.push({
        label: displayLabelFor(field),
        status: ready ? 'ready' : 'review',
        source: ready ? match.source : 'Saved answer does not match this control',
      });
    }

    const resumeDetected = Array.from(document.querySelectorAll('input[type="file"]'))
      .some((element) => !element.disabled && /resume|cv|document|attachment/.test(labelFor(element)));
    return {
      mapped: mappings.filter((item) => item.status === 'ready').length,
      review: mappings.filter((item) => item.status === 'review').length,
      resumeDetected,
      fields: mappings.slice(0, 30),
    };
  };

  const uploadResume = (pdfBase64, pdfName) => {
    if (!pdfBase64) return false;
    const input = Array.from(document.querySelectorAll('input[type="file"]'))
      .find((element) => !element.disabled && /resume|cv|document|attachment/.test(labelFor(element)));
    if (!input) return false;
    const bytes = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0));
    const file = new File([bytes], pdfName, { type: 'application/pdf' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const autofill = ({ profile, answers, pdfBase64, pdfName }) => {
    let filled = 0;
    const unmatchedRequired = [];
    const fields = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const field of fields) {
      if (!visible(field) || ['hidden', 'submit', 'button', 'password', 'file'].includes(field.type)) continue;
      const context = labelFor(field);
      const value = resolveValue(context, profile, answers);
      if (value === undefined) {
        if (field.required && context) unmatchedRequired.push(context);
        continue;
      }
      let didFill = false;
      if (field instanceof HTMLSelectElement) didFill = fillSelect(field, value);
      else if (field.type === 'radio' || field.type === 'checkbox') didFill = fillChoice(field, context, value);
      else {
        setNativeValue(field, value);
        didFill = true;
      }
      if (didFill) filled += 1;
    }
    const uploaded = uploadResume(pdfBase64, pdfName);
    return { filled, uploaded, unmatchedRequired: [...new Set(unmatchedRequired)].slice(0, 10) };
  };

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'scrape') {
      const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((node) => node.textContent)
        .filter(Boolean)
        .join('\n');
      const applyLink = Array.from(document.querySelectorAll('a')).find((link) => /apply|start application/i.test(link.innerText || ''));
      sendResponse({
        success: true,
        url: location.href,
        title: document.title,
        text: `${document.body.innerText || ''}\n\nStructured data:\n${jsonLd}`.slice(0, 50000),
        applyUrl: applyLink?.href || null,
      });
      return true;
    }
    if (request.action === 'autofill') {
      try {
        const result = autofill(request);
        sendResponse({
          success: true,
          ...result,
          message: `Filled ${result.filled} fields${result.uploaded ? ' and uploaded the tailored resume' : ''}. ${result.unmatchedRequired.length ? `${result.unmatchedRequired.length} required fields still need review.` : 'Review the page before submitting.'}`,
        });
      } catch (error) {
        sendResponse({ success: false, message: error.message });
      }
      return true;
    }
    if (request.action === 'preflight') {
      try {
        sendResponse({ success: true, ...preflight(request) });
      } catch (error) {
        sendResponse({ success: false, message: error.message });
      }
      return true;
    }
    return false;
  });
}

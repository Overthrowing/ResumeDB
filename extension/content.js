// Listening for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofill') {
    try {
      const { profile, application, pdfBase64, pdfName } = request;
      
      let filledCount = 0;
      let pdfUploaded = false;

      // Helper to find matching label or input properties
      const isMatch = (element, terms) => {
        const text = (element.innerText || element.textContent || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();

        return terms.some(term => 
          text.includes(term) || 
          placeholder.includes(term) || 
          name.includes(term) || 
          id.includes(term) || 
          ariaLabel.includes(term)
        );
      };

      // Helper to trigger events
      const triggerEvents = (element) => {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      // 1. Fill Text Inputs and Textareas
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
      
      inputs.forEach(input => {
        // Find associated label text if possible
        let labelText = '';
        if (input.id) {
          const labelEl = document.querySelector(`label[for="${input.id}"]`);
          if (labelEl) labelText = labelEl.innerText;
        }
        // Fallback: search surrounding DOM for labels
        let parent = input.parentElement;
        while (parent && !labelText) {
          const labelEl = parent.querySelector('label');
          if (labelEl) labelText = labelEl.innerText;
          parent = parent.parentElement;
        }

        const matchContext = {
          innerText: labelText,
          placeholder: input.placeholder,
          name: input.name,
          id: input.id,
          getAttribute: (attr) => input.getAttribute(attr)
        };

        // Determine field type
        if (isMatch(matchContext, ['first name', 'firstname', 'given name'])) {
          if (profile.name) {
            input.value = profile.name.split(' ')[0];
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['last name', 'lastname', 'family name'])) {
          if (profile.name) {
            const parts = profile.name.split(' ');
            input.value = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['full name', ' name']) && !isMatch(matchContext, ['first', 'last'])) {
          if (profile.name) {
            input.value = profile.name;
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['email'])) {
          if (profile.email) {
            input.value = profile.email;
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['phone', 'mobile', 'tel'])) {
          if (profile.phone) {
            input.value = profile.phone;
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['location', 'city', 'address'])) {
          if (profile.location) {
            input.value = profile.location;
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['linkedin'])) {
          const link = profile.links?.find(l => l.label.toLowerCase().includes('linkedin'));
          if (link) {
            input.value = link.url;
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['github'])) {
          const link = profile.links?.find(l => l.label.toLowerCase().includes('github'));
          if (link) {
            input.value = link.url;
            triggerEvents(input);
            filledCount++;
          }
        } else if (isMatch(matchContext, ['portfolio', 'website', 'personal website', 'blog'])) {
          const link = profile.links?.find(l => !l.label.toLowerCase().includes('linkedin') && !l.label.toLowerCase().includes('github'));
          if (link) {
            input.value = link.url;
            triggerEvents(input);
            filledCount++;
          }
        }
      });

      // 2. Programmatic Resume Upload
      if (pdfBase64) {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(fileInput => {
          let labelText = '';
          let parent = fileInput.parentElement;
          while (parent && !labelText) {
            const labelEl = parent.querySelector('label') || parent.innerText;
            if (labelEl) labelText = typeof labelEl === 'string' ? labelEl : labelEl.innerText;
            parent = parent.parentElement;
          }

          const matchContext = {
            innerText: labelText,
            name: fileInput.name,
            id: fileInput.id,
            placeholder: '',
            getAttribute: (attr) => fileInput.getAttribute(attr)
          };

          if (isMatch(matchContext, ['resume', 'cv', 'document', 'profile'])) {
            // Reconstruct file
            const byteCharacters = atob(pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const file = new File([blob], pdfName, { type: 'application/pdf' });

            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;

            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            pdfUploaded = true;
          }
        });
      }

      sendResponse({
        success: true,
        message: `Filled ${filledCount} text fields.${pdfUploaded ? ' Tailored resume PDF uploaded.' : ' No resume input detected.'}`
      });

    } catch (err) {
      sendResponse({ success: false, message: err.message });
    }
  }
  return true; // keep message channel open
});

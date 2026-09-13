/**
 * @fileoverview Content script for full-page DOM extraction and universal PII detection across any website.
 */

window.__getDomSkeleton = function() {
  const elements = [];
  const sensitiveElements = [];
  let idCounter = 0;

  const sensitiveKeywords = [
    'ssn', 'social_security', 'social-security',
    'aadhaar', 'aadhar', 'uidai', 'uid',
    'pan', 'pancard', 'pan_card',
    'phone', 'mobile', 'tel', 'cell', 'contact', 'mob', 'phone_no', 'mobile_no',
    'dob', 'birth', 'birthday', 'date_of_birth', 'age',
    'credit_card', 'creditcard', 'debit_card', 'debitcard', 'card_number', 'cardnumber', 'cc-number', 'cc_num', 'card',
    'cvv', 'cvc', 'security_code',
    'account', 'account_number', 'acc_no', 'routing', 'ifsc', 'iban', 'swift', 'beneficiary_account',
    'upi', 'upi_id', 'vpa', 'ref', 'txn', 'transaction_id', 'reference',
    'password', 'pwd', 'pass', 'pin', 'secret', 'token', 'otp', 'tpin',
    'email', 'mail', 'e-mail',
    'name', 'full_name', 'fullname', 'fname', 'lname', 'firstname', 'lastname', 'first_name', 'last_name', 'mname',
    'beneficiary_name', 'beneficiary', 'account_holder', 'holder_name', 'recipient', 'applicant', 'candidate',
    'father', 'mother', 'spouse', 'guardian',
    'customer_id', 'cust_id', 'cid', 'client_id', 'user_id', 'userid', 'member_id',
    'address', 'addr', 'street', 'city', 'zip', 'postal', 'pincode', 'pin_code', 'location', 'residence',
    'village', 'taluk', 'district', 'state', 'house', 'post', 'po', 'place', 'building', 'door', 'ward',
    'panchayath', 'panchayat', 'municipality', 'corporation', 'flat', 'apt', 'lane', 'road',
    'gender', 'sex', 'marital',
    'tax', 'vat', 'gst', 'license', 'dl', 'passport', 'voter', 'epic',
    'username', 'user_name',
    'income', 'salary', 'occupation', 'designation'
  ];

  const regexCheckers = [
    { type: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i },
    { type: 'UPI_ID', regex: /\b[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,32}\b/i },
    { type: 'PHONE', regex: /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b[6-9]\d{9}\b|\b\d{10}\b|(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/ },
    { type: 'PINCODE', regex: /\b[1-9]\d{5}\b|\b[1-9]\d{2}\s\d{3}\b|\b\d{5}(?:-\d{4})?\b/ },
    { type: 'AADHAAR', regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b|\b\d{12}\b/ },
    { type: 'PAN', regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/ },
    { type: 'VOTER_ID', regex: /\b[A-Z]{3}[0-9]{7}\b/ },
    { type: 'PASSPORT', regex: /\b[A-PR-WY-Z][1-9]\d\s?\d{4}[1-9]\b/ },
    { type: 'DRIVING_LICENSE', regex: /\b[A-Z]{2}[0-9]{2}\s?[0-9]{4,11}\b/ },
    { type: 'CREDIT_CARD', regex: /(?:Card:\s*)?(?:\d{4}|[•*xX\u2022\u25cf\u2219\u00b7]{4})[\s-•*xX\u2022\u25cf\u2219\u00b7]+(?:[•*xX\u2022\u25cf\u2219\u00b7]{4}[\s-•*xX\u2022\u25cf\u2219\u00b7]+)*\d{4}|\b(?:\d{4}[\s-]?){3}\d{4}\b|\b\d{15,16}\b|\bCard(?:\s+ending)?[:\s]+[\d•*xX\u2022\s-]+/i },
    { type: 'ACCOUNT_NUMBER', regex: /\b(?:A\/C:?|Account:?|Acc:?|A\/c:?)\s*(?:(?:\d{4}[\s-]?){2,4}\d{2,4}|[\d\s-]{9,24}|(?:\*{4}\s*){2,3}\d{4})\b|\b(?:Savings|Current)\s*-\s*(?:\d{4}[\s-]?){3,4}\d{2,4}\b/i },
    { type: 'CUSTOMER_ID', regex: /\b(?:CID|CUST|CUSTOMER|USER|CLIENT|MEMBER|APPLICANT)[-_]?\d{4,12}\b/i },
    { type: 'TRANSACTION_REF', regex: /\b(?:TXN|REF|ORD|BILL|NEFT|RTGS|IMPS|UTR)[-_/A-Za-z0-9]+\b/i },
    { type: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
    { type: 'IFSC', regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/ },
    { type: 'DOB', regex: /\b(?:\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\b/ }
  ];

  // Safe helper to extract class name string from both standard HTML elements and SVG elements
  function getSafeClassName(element) {
    if (!element) return '';
    if (typeof element.className === 'string') return element.className;
    if (element.className && typeof element.className.baseVal === 'string') return element.className.baseVal;
    try {
      const attr = element.getAttribute && element.getAttribute('class');
      if (typeof attr === 'string') return attr;
    } catch (_) {}
    return '';
  }

  // Helper to test if an element is visible
  function isVisible(el, rect) {
    if (!rect || rect.width === 0 || rect.height === 0) return false;
    if (rect.bottom < -100 || rect.top > window.innerHeight * 6) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
  }

  // Helper to extract surrounding text and labels for an element
  function getContextText(el) {
    const parts = [];

    // 1. Direct label by for attribute
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl && (lbl.innerText || lbl.textContent)) parts.push(lbl.innerText || lbl.textContent);
    }

    // 2. aria-labelledby
    const ariaLabelledBy = el.getAttribute ? el.getAttribute('aria-labelledby') : null;
    if (ariaLabelledBy) {
      const lblEl = document.getElementById(ariaLabelledBy);
      if (lblEl && (lblEl.innerText || lblEl.textContent)) parts.push(lblEl.innerText || lblEl.textContent);
    }

    // 3. Enclosing label
    const enclosingLabel = el.closest ? el.closest('label') : null;
    if (enclosingLabel && enclosingLabel !== el) {
      parts.push(enclosingLabel.innerText || enclosingLabel.textContent || '');
    }

    // 4. Previous sibling text / element
    let prev = el.previousElementSibling;
    if (prev && (prev.innerText || prev.textContent)) {
      const txt = (prev.innerText || prev.textContent).trim();
      if (txt.length < 100) parts.push(txt);
    }

    // 5. Parent container labels or preceding headers (up to 4 levels up)
    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 4) {
      // Look for labels, headings, spans, legends inside container
      const candidateLabels = parent.querySelectorAll('label, .label, legend, h1, h2, h3, h4, h5, h6, span, p, th, dt');
      candidateLabels.forEach(lblNode => {
        if (lblNode !== el && !lblNode.contains(el)) {
          const lblTxt = (lblNode.innerText || lblNode.textContent || '').trim();
          if (lblTxt && lblTxt.length < 80) {
            parts.push(lblTxt);
          }
        }
      });
      // Check if parent has previous sibling (e.g. <tr><td>Label</td><td><input></td></tr>)
      if (parent.previousElementSibling) {
        const prevTxt = (parent.previousElementSibling.innerText || parent.previousElementSibling.textContent || '').trim();
        if (prevTxt && prevTxt.length < 100) {
          parts.push(prevTxt);
        }
      }
      parent = parent.parentElement;
      depth++;
    }

    return parts.join(' ').trim();
  }

  // Helper to determine if an input is in a search bar or navigation
  function isSearchOrNav(el) {
    const type = (el.getAttribute ? (el.getAttribute('type') || '') : '').toLowerCase();
    const name = (el.getAttribute ? (el.getAttribute('name') || '') : '').toLowerCase();
    const id = (el.getAttribute ? (el.getAttribute('id') || '') : '').toLowerCase();
    const role = (el.getAttribute ? (el.getAttribute('role') || '') : '').toLowerCase();
    const placeholder = (el.getAttribute ? (el.getAttribute('placeholder') || '') : '').toLowerCase();
    const className = getSafeClassName(el).toLowerCase();

    if (type === 'search' || role === 'searchbox' || role === 'search') return true;
    if (name === 'q' || name === 'search' || name === 'query' || id === 'search' || id === 'q') return true;
    if (placeholder.includes('search') && !placeholder.includes('user') && !placeholder.includes('name')) return true;
    if (className.includes('search-input') || className.includes('search-bar')) return true;
    return false;
  }

  // 1. Process Form Inputs, Textareas, Selects & Buttons
  const formElements = document.querySelectorAll('input, textarea, select, button, [role="button"], [role="checkbox"], [contenteditable="true"]');
  formElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (!isVisible(el, rect)) return;

    let elId = el.getAttribute('data-privacylens-id');
    if (!elId) {
      elId = `el_${idCounter++}`;
      el.setAttribute('data-privacylens-id', elId);
    }

    const tag = el.tagName.toLowerCase();
    const inputType = (el.getAttribute('type') || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.getAttribute('id') || '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();
    const className = getSafeClassName(el).toLowerCase();
    const textContent = (el.value !== undefined ? el.value : (el.innerText || el.textContent || '')) || '';
    const trimmedVal = textContent.trim();

    // Skip submit / reset buttons or generic action buttons from being flagged as PII
    if (tag === 'button' || inputType === 'submit' || inputType === 'reset' || inputType === 'button') {
      elements.push({
        element_id: elId,
        tag,
        type: inputType || 'button',
        name,
        id,
        bbox: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          docX: rect.left + window.scrollX,
          docY: rect.top + window.scrollY
        },
        text: textContent,
        isSensitive: false
      });
      return;
    }

    // Extract surrounding context (labels, parent elements, aria attributes)
    const contextText = getContextText(el);
    const combinedAttribs = `${name} ${id} ${autocomplete} ${placeholder} ${ariaLabel} ${title} ${className} ${contextText}`.toLowerCase();

    let isSensitive = false;
    let sensitivityReason = '';

    // Check specific input types
    if (inputType === 'password' || /pin|pass|secret|token|otp|tpin/i.test(name + id)) {
      isSensitive = true;
      sensitivityReason = 'PASSWORD';
    } else if (inputType === 'email' || autocomplete.includes('email') || /email|e-mail|mail/i.test(combinedAttribs)) {
      isSensitive = true;
      sensitivityReason = 'EMAIL';
    } else if (inputType === 'tel' || autocomplete.includes('tel') || /phone|mobile|cell|contact/i.test(combinedAttribs)) {
      isSensitive = true;
      sensitivityReason = 'PHONE';
    } else if (inputType === 'date' || autocomplete.includes('bday') || /dob|birth|bday/i.test(combinedAttribs)) {
      isSensitive = true;
      sensitivityReason = 'DOB';
    } else {
      // Check sensitive keyword matches in context
      for (const kw of sensitiveKeywords) {
        if (combinedAttribs.includes(kw)) {
          isSensitive = true;
          sensitivityReason = kw.toUpperCase();
          break;
        }
      }
    }

    // Check regex pattern matches inside input value
    if (trimmedVal) {
      for (const checker of regexCheckers) {
        if (checker.regex.test(trimmedVal)) {
          isSensitive = true;
          sensitivityReason = checker.type;
          break;
        }
      }

      // Name detection heuristic (multi-word capitalized / alphabetic text like "THARUN S NAIR" or "John Doe")
      if (!isSensitive && /^[A-Za-z.'-]+(?:\s+[A-Za-z.'-]+)+$/.test(trimmedVal) && !isSearchOrNav(el)) {
        isSensitive = true;
        sensitivityReason = 'NAME';
      }

      // Single-word place/address or name input heuristic in forms
      if (!isSensitive && !isSearchOrNav(el) && (tag === 'input' || tag === 'textarea') && trimmedVal.length >= 2) {
        // If inside a form or card with personal details
        if (el.closest && el.closest('form, .card, .container, .form-container, .signup, .register, .login, .auth, .profile, .checkout')) {
          isSensitive = true;
          sensitivityReason = /^\d+$/.test(trimmedVal) ? (trimmedVal.length === 6 ? 'PINCODE' : 'PHONE') : 'USER_INPUT';
        }
      }
    }

    const elementData = {
      element_id: elId,
      tag,
      type: inputType || tag,
      name,
      id,
      bbox: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        docX: rect.left + window.scrollX,
        docY: rect.top + window.scrollY
      },
      text: textContent,
      isSensitive,
      sensitivityReason
    };

    elements.push(elementData);
    if (isSensitive) sensitiveElements.push(elementData);
  });

  // 2. Process Profile Images, Photos & Avatars (Face detection heuristic)
  const images = document.querySelectorAll('img, svg, .profile-photo, .avatar, [class*="avatar"], [class*="profile"], [id*="avatar"], [id*="profile"], [role="img"]');
  images.forEach(img => {
    const rect = img.getBoundingClientRect();
    if (!isVisible(img, rect)) return;

    let elId = img.getAttribute('data-privacylens-id');
    if (!elId) {
      elId = `el_${idCounter++}`;
      img.setAttribute('data-privacylens-id', elId);
    }

    const src = (img.getAttribute && img.getAttribute('src')) || '';
    const alt = (img.getAttribute && img.getAttribute('alt')) || '';
    const className = getSafeClassName(img).toLowerCase();
    const id = img.id || '';
    const combined = `${src} ${alt} ${className} ${id}`.toLowerCase();

    const isFaceOrProfile = /avatar|photo|profile|portrait|user|face|person|author|headshot/i.test(combined) ||
      (rect.width <= 250 && rect.height <= 250 && rect.width >= 24 && rect.height >= 24 && (img.style.borderRadius === '50%' || className.includes('photo') || className.includes('avatar') || className.includes('user')));

    if (isFaceOrProfile) {
      const imgData = {
        element_id: elId,
        tag: 'img',
        type: 'image',
        name: alt || 'profile_image',
        id,
        bbox: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          docX: rect.left + window.scrollX,
          docY: rect.top + window.scrollY
        },
        text: '[IMAGE_FACE_OR_PROFILE]',
        isSensitive: true,
        sensitivityReason: 'FACE'
      };
      elements.push(imgData);
      sensitiveElements.push(imgData);
    }
  });

  // 3. TreeWalker: Scan ALL visible Text Nodes across the entire page for PII
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let textNode;
    while ((textNode = walker.nextNode())) {
      const rawText = textNode.nodeValue ? textNode.nodeValue.trim() : '';
      if (!rawText || rawText.length < 3 || rawText.length > 1000) continue;

      const parentEl = textNode.parentElement;
      if (!parentEl) continue;
      
      // Skip scripts, styles, inputs, and extension overlays
      const parentTag = parentEl.tagName;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'OPTION', 'BUTTON'].includes(parentTag)) continue;
      if (parentEl.closest && parentEl.closest('#privacylens-overlay-root')) continue;

      const rect = parentEl.getBoundingClientRect();
      if (!isVisible(parentEl, rect)) continue;

      let matchedType = null;
      let matchedText = '';

      // Check regex pattern matches
      for (const checker of regexCheckers) {
        const match = checker.regex.exec(rawText);
        if (match) {
          matchedType = checker.type;
          matchedText = match[0];
          break;
        }
      }

      // Check contextual label/value structures
      if (!matchedType) {
        if (/^welcome,\s+[A-Za-z\s]+/i.test(rawText) || /^hi,\s+[A-Za-z\s]+/i.test(rawText)) {
          matchedType = 'NAME';
          matchedText = rawText;
        } else {
          // Check parent/sibling label text
          const prevEl = parentEl.previousElementSibling;
          const prevText = prevEl ? (prevEl.innerText || prevEl.textContent || '') : '';
          const parentAria = (parentEl.getAttribute && parentEl.getAttribute('aria-label')) || '';
          const parentClass = getSafeClassName(parentEl);
          const contextLabel = `${prevText} ${parentAria} ${parentClass}`;
          const contextLower = contextLabel.toLowerCase();

          if (/customer\s*id|cust\s*id|client\s*id|member\s*id|applicant\s*id/i.test(contextLower)) {
            matchedType = 'CUSTOMER_ID';
            matchedText = rawText;
          } else if (/account\s*holder|beneficiary|full\s*name|holder\s*name|applicant\s*name/i.test(contextLower)) {
            matchedType = 'NAME';
            matchedText = rawText;
          } else if (/account\s*number|a\/c\s*no/i.test(contextLower)) {
            matchedType = 'ACCOUNT_NUMBER';
            matchedText = rawText;
          } else if (/aadhaar|aadhar/i.test(contextLower)) {
            matchedType = 'AADHAAR';
            matchedText = rawText;
          } else if (/pan\s*card|pan\s*no/i.test(contextLower)) {
            matchedType = 'PAN';
            matchedText = rawText;
          } else if (/pincode|pin\s*code|postal\s*code|zip\s*code/i.test(contextLower) && /^\d{5,6}$/.test(rawText)) {
            matchedType = 'PINCODE';
            matchedText = rawText;
          } else if (/village|taluk|district|post\s*office|place/i.test(contextLower) && rawText.length < 50) {
            matchedType = 'ADDRESS';
            matchedText = rawText;
          }
        }
      }

      if (matchedType) {
        let elId = parentEl.getAttribute('data-privacylens-id');
        if (!elId) {
          elId = `el_${idCounter++}`;
          parentEl.setAttribute('data-privacylens-id', elId);
        }

        let nodeBBox = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          docX: rect.left + window.scrollX,
          docY: rect.top + window.scrollY
        };

        try {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          const rangeRect = range.getBoundingClientRect();
          if (rangeRect.width > 0 && rangeRect.height > 0) {
            nodeBBox = {
              x: rangeRect.left,
              y: rangeRect.top,
              width: rangeRect.width,
              height: rangeRect.height,
              docX: rangeRect.left + window.scrollX,
              docY: rangeRect.top + window.scrollY
            };
          }
        } catch (e) {}

        const textData = {
          element_id: elId,
          tag: parentTag.toLowerCase(),
          type: 'text',
          name: matchedType,
          id: parentEl.id || '',
          bbox: nodeBBox,
          text: matchedText || rawText,
          isSensitive: true,
          sensitivityReason: matchedType
        };

        elements.push(textData);
        sensitiveElements.push(textData);
      }
    }
  } catch (err) {
    console.warn('[PrivacyLens] Text scanning notice:', err);
  }

  return {
    url: window.location.href,
    title: document.title,
    devicePixelRatio: window.devicePixelRatio || 1,
    scroll: { x: window.scrollX, y: window.scrollY },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    elements,
    sensitiveElements
  };
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ANALYZE_DOM') {
    sendResponse(window.__getDomSkeleton());
  }
});


import DOMPurify from '/vendor/purify.js';

// All dynamic markup passes through a maintained sanitizer before entering the DOM.
export const sanitizeHtml = (markup) => DOMPurify.sanitize(markup, { USE_PROFILES: { html: true, svg: true, svgFilters: true } });

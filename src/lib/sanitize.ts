import DOMPurify from "dompurify";

/**
 * SEC-006: Sanitize HTML content from the database before rendering
 * with dangerouslySetInnerHTML to prevent stored XSS attacks.
 */
export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    // Allow safe HTML tags commonly used in rich text editors
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "del",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code",
      "span", "div", "hr", "sup", "sub",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "style",
      "target", "rel", "width", "height",
    ],
    // Force safe link attributes
    ADD_ATTR: ["target"],
    ALLOW_DATA_ATTR: false,
  });
};

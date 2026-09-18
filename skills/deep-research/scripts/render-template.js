// Simple {{placeholder}} template renderer for research entries.
// Used by Task 07 (Document phase) to fill `templates/research-entry.md`
// with frontmatter + body values. Supports:
//   - {{key}}        — substituted with vars[key] (strings, numbers, booleans)
//   - {{key_yaml}}   — convention: serialize vars[key] as YAML inline (arrays, objects)
//   - missing keys   — substituted with empty string (no crash) + recorded as missing
//   - {{body}}       — substituted with the raw markdown body (no escaping)
//
// Does NOT support: conditionals, loops, partials. Keep simple.
// If you need more, swap in a real template engine (handlebars / mustache).

function yamlInline(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    // Quote strings that contain colons/brackets/quotes; emit array inline.
    return '[' + value.map(v => {
      if (typeof v === 'string') {
        if (v.startsWith('[[') && v.endsWith(']]')) return `"${v}"`;
        if (/[:\[\]{},#"']/.test(v)) return JSON.stringify(v);
        return `"${v}"`;
      }
      return JSON.stringify(v);
    }).join(', ') + ']';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string') {
    if (/[:\[\]{},#"']/.test(value)) return JSON.stringify(value);
    return value;
  }
  return String(value);
}

function asString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Fallback for objects/arrays passed without _yaml suffix — JSON it
  return JSON.stringify(value);
}

/**
 * Render a template string by substituting {{placeholder}} markers.
 * @param {string} template - raw template content (e.g., from templates/research-entry.md)
 * @param {Object} vars - flat key/value map. Keys ending in `_yaml` get YAML-inline serialization.
 * @returns {{ rendered: string, missing: string[] }}
 */
export function renderTemplate(template, vars) {
  const missing = [];
  const rendered = template.replace(/\{\{([a-zA-Z_][\w]*)\}\}/g, (match, key) => {
    if (!(key in vars)) {
      missing.push(key);
      return '';
    }
    const v = vars[key];
    if (key.endsWith('_yaml')) return yamlInline(v);
    return asString(v);
  });
  return { rendered, missing };
}

export default { renderTemplate };

const STOPWORDS_PT = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'pelo', 'pela',
  'com', 'sem', 'sob', 'sobre',
  'que', 'se', 'e', 'ou', 'mas',
  'eh', 'foi', 'ser', 'ter',
  'como', 'quando', 'onde',
  'isso', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela',
]);

const STOPWORDS_EN = new Set([
  'a', 'an', 'the',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as',
  'and', 'or', 'but', 'nor',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had',
  'how', 'what', 'when', 'where', 'why', 'who', 'which',
  'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
]);

const PRESERVE_TERMS = {
  'nfs-e': 'nfse',
  'nfse': 'nfse',
  'mcp': 'mcp',
  'ai': 'ai',
  'api': 'api',
  'apis': 'apis',
  'llm': 'llm',
  'llms': 'llms',
  'rag': 'rag',
  'sdk': 'sdk',
  'crm': 'crm',
  'saas': 'saas',
  'ui': 'ui',
  'ux': 'ux',
  'rpa': 'rpa',
  'erp': 'erp',
};

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenize(query) {
  const lowered = query.toLowerCase();
  let s = lowered;
  for (const [term, replacement] of Object.entries(PRESERVE_TERMS)) {
    const re = new RegExp(`\\b${term.replace(/-/g, '\\-?')}\\b`, 'gi');
    s = s.replace(re, replacement);
  }
  s = stripAccents(s);
  s = s.replace(/[^a-z0-9\- ]+/g, ' ');
  return s.split(/\s+/).filter(Boolean);
}

function isStopword(token) {
  return STOPWORDS_PT.has(token) || STOPWORDS_EN.has(token);
}

function dateToYYYYMMDD(date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function generateSlug(query, date = new Date()) {
  const tokens = tokenize(query)
    .filter(t => !isStopword(t))
    .filter(t => t.length >= 2 || /^\d+$/.test(t));
  let body = tokens.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (body.length > 50) {
    body = body.slice(0, 50).replace(/-[^-]*$/, '');
  }
  return `${dateToYYYYMMDD(date)}-${body}`;
}

export default { generateSlug };

import { TAXONOMY } from './taxonomy.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchers = TAXONOMY.map(({ domain, keywords }) => ({
  domain,
  // Word-boundary match keeps short keywords (ai, ml, ui, edge) from
  // matching inside longer words (main, build, knowledge).
  regex: new RegExp(keywords.map((k) => `\\b${escapeRe(k)}\\b`).join('|'), 'i'),
}));

function matchDomain(text) {
  for (const { domain, regex } of matchers) {
    if (regex.test(text)) return domain;
  }
  return null;
}

// Deterministic, no network, no randomness. Topics are more reliable than
// free-text descriptions, so they are checked first; description + name are
// the fallback, and 'other' is the final fallback.
export function classify({ name, description, topics }) {
  const topicText = (topics ?? []).join(' ');
  const fromTopics = matchDomain(topicText);
  if (fromTopics) return fromTopics;

  const text = `${description ?? ''} ${name ?? ''}`;
  return matchDomain(text) ?? 'other';
}
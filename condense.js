const CONDENSE_STOPWORDS = new Set((
  'a an and are as at be been being but by can could did do does for from had has have ' +
  'he her his how i if in into is it its just like may me might more most my no nor not of ' +
  'off on once only or other our out over own same she should so some such than that the ' +
  'their them then there these they this those through to too under until up very was we ' +
  'were what when where which while who whom why will with would you your about also each ' +
  'few both any all here yes via etc'
).split(' '));

const CONDENSE_SKIP = [
  'nav', 'header', 'footer', 'aside', 'form', 'button', 'select', 'textarea',
  'script', 'style', 'noscript', 'svg', 'iframe', 'canvas', 'template',
  '[hidden]', '[aria-hidden="true"]',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[role="complementary"]', '[role="dialog"]', '[role="alert"]',
  '[class*="cookie" i]', '[id*="cookie" i]', '[class*="newsletter" i]',
  '[class*="sidebar" i]', '[class*="breadcrumb" i]', '[class*="share" i]',
].join(', ');

const CONDENSE_MAX_BLOCKS = 3000;

function condenseTokens(sentence) {
  return (sentence.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [])
    .filter((w) => !CONDENSE_STOPWORDS.has(w));
}

function condensePage(budget = 6000) {

  const blocks = [];
  const headings = [];
  const seenBlocks = new Set();

  const candidates = document.body.querySelectorAll('h1, h2, h3, h4, p, li, blockquote, dd, figcaption, td');
  for (const el of candidates) {
    if (blocks.length >= CONDENSE_MAX_BLOCKS) break;
    if (el.closest(CONDENSE_SKIP)) continue;

    const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text || seenBlocks.has(text)) continue;
    seenBlocks.add(text);

    const isHeading = /^H[1-4]$/.test(el.tagName);
    if (isHeading) {
      if (text.length >= 3 && text.length <= 120 && headings.length < 15) headings.push(text);
      continue;
    }
    if (text.length < 20) continue;
    blocks.push(text);
  }

  const sentences = [];
  blocks.forEach((text, blockIndex) => {
    const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
    for (const part of parts) {
      const words = part.split(/\s+/).length;
      if (words < 6 || words > 60) continue;
      sentences.push({ text: part, block: blockIndex, index: sentences.length, score: 0 });
    }
  });

  if (!sentences.length) return { text: '', kept: 0, total: 0 };

  const termCount = new Map();
  const sentenceTerms = sentences.map((s) => {
    const terms = condenseTokens(s.text);
    for (const t of terms) termCount.set(t, (termCount.get(t) || 0) + 1);
    return terms;
  });

  const opening = sentences.length * 0.15;
  sentences.forEach((s, i) => {
    const terms = sentenceTerms[i];
    if (!terms.length) return;
    const unique = new Set(terms);
    let total = 0;
    for (const t of unique) total += termCount.get(t) || 0;
    let score = total / Math.sqrt(terms.length);
    if (s.index < opening) score *= 1.25;
    if (/\d/.test(s.text)) score *= 1.1;
    s.score = score;
  });

  const outline = headings.length ? `Sections: ${headings.join(' | ')}\n\n` : '';
  let remaining = budget - outline.length;

  const ranked = [...sentences].sort((a, b) => b.score - a.score);
  const chosen = [];
  const keys = new Set();

  for (const s of ranked) {
    if (remaining <= 0) break;
    const key = s.text.toLowerCase().slice(0, 50);
    if (keys.has(key)) continue;
    if (s.text.length > remaining) continue;
    keys.add(key);
    chosen.push(s);
    remaining -= s.text.length + 1;
  }

  chosen.sort((a, b) => a.index - b.index);
  let body = '';
  let lastBlock = -1;
  for (const s of chosen) {
    body += (lastBlock === -1 ? '' : (s.block === lastBlock ? ' ' : '\n\n')) + s.text;
    lastBlock = s.block;
  }

  return { text: (outline + body).trim(), kept: chosen.length, total: sentences.length };
}

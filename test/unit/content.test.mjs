import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, stripComments, attrValues, LINKEDIN, STATUTORY } from './helpers.mjs';

const raw = read('index.html');
const html = stripComments(raw);
const meta = (attr, name) =>
  html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

test('is British English', () => {
  assert.match(html, /<html lang="en-GB">/);
});

test('has exactly one h1', () => {
  assert.equal(html.match(/<h1[\s>]/g)?.length, 1);
});

test('footer carries the statutory company details', () => {
  const footer = html.slice(html.indexOf('<footer'));
  for (const s of STATUTORY) assert.ok(footer.includes(s), `footer is missing "${s}"`);
});

test('every book-a-call control links somewhere real', () => {
  const ctas = [...html.matchAll(/<a\b[^>]*data-cta="book"[^>]*>/g)].map((m) => m[0]);
  assert.ok(ctas.length >= 3, `expected 3 book-a-call links, found ${ctas.length}`);
  for (const tag of ctas) {
    const href = tag.match(/href="([^"]*)"/)?.[1] ?? '';
    assert.match(href, /^https:\/\/\S+$/, `bad book-a-call href in ${tag}`);
  }
});

test('links to LinkedIn, GitHub and 100Starlings', () => {
  const hrefs = attrValues(html, 'href');
  for (const url of [LINKEDIN, 'https://github.com/bru', 'https://100starlings.com']) {
    assert.ok(hrefs.includes(url), `missing link to ${url}`);
  }
});

test('placeholders are exactly booking, bluesky and email', () => {
  const keys = new Set([...raw.matchAll(/TODO\((\w+)\)/g)].map((m) => m[1]));
  assert.deepEqual([...keys].sort(), ['bluesky', 'booking', 'email']);
});

test('commented-out placeholders do not leak into the page', () => {
  assert.ok(!html.includes('mailto:'), 'email link is live');
  assert.ok(!html.includes('bsky.app'), 'Bluesky link is live');
});

test('has no JavaScript', () => {
  assert.doesNotMatch(html, /<script\b/i);
});

test('head metadata is complete', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  assert.ok(title.length > 0 && title.length <= 70, `title length ${title.length}`);
  assert.ok(meta('name', 'description'), 'missing meta description');
  assert.match(html, /<link rel="canonical" href="https:\/\/chaoscafe\.co\.uk\/">/);
  assert.equal(meta('property', 'og:image'), 'https://chaoscafe.co.uk/assets/img/og-image.png');
  assert.equal(meta('property', 'og:url'), 'https://chaoscafe.co.uk/');
  assert.ok(meta('property', 'og:title'), 'missing og:title');
  assert.ok(meta('property', 'og:description'), 'missing og:description');
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
});

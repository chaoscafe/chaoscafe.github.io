import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, stripComments, STATUTORY } from './helpers.mjs';

const html = stripComments(read('404.html'));

test('404 has one h1, a link home and is not indexed', () => {
  assert.equal(html.match(/<h1[\s>]/g)?.length, 1);
  assert.match(html, /<a href="\/">/);
  assert.match(html, /<meta name="robots" content="noindex">/);
});

test('404 uses root-absolute asset paths (served at any depth)', () => {
  assert.match(html, /<link rel="stylesheet" href="\/assets\/css\/site\.css">/);
});

test('404 footer carries the statutory company details', () => {
  const footer = html.slice(html.indexOf('<footer'));
  for (const s of STATUTORY) assert.ok(footer.includes(s), `footer is missing "${s}"`);
});

test('404 header offers the book-a-call link, like the home page', () => {
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.match(header, /<a class="header-cta" data-cta="book" href="https:\/\/\S+">Book a call<\/a>/);
});

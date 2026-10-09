import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, read, resolveLocal } from './helpers.mjs';

const FONTS = join(SITE, 'assets/fonts');
const IMG = join(SITE, 'assets/img');

function pngSize(file) {
  const buf = readFileSync(file);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('fonts are WOFF2 and within the size budget', () => {
  const files = readdirSync(FONTS).filter((f) => f.endsWith('.woff2'));
  assert.equal(files.length, 4, `expected 4 font files, found ${files.join(', ')}`);
  let total = 0;
  for (const f of files) {
    const buf = readFileSync(join(FONTS, f));
    assert.equal(buf.toString('ascii', 0, 4), 'wOF2', `${f} is not WOFF2`);
    total += buf.length;
  }
  assert.ok(total <= 200 * 1024, `fonts total ${Math.round(total / 1024)} KB, budget 200 KB`);
});

test('font licences ship with the fonts', () => {
  for (const f of ['OFL-crimson-pro.txt', 'OFL-inter-tight.txt']) {
    assert.ok(existsSync(join(FONTS, f)), `missing ${f}`);
  }
});

test('every url() in site.css resolves to a file', () => {
  const css = read('assets/css/site.css');
  const urls = [...css.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 4, 'expected @font-face url()s in site.css');
  for (const url of urls) {
    const target = resolveLocal('assets/css/site.css', url);
    assert.ok(existsSync(target), `site.css: ${url} does not resolve`);
  }
});

test('images exist at the expected sizes', () => {
  assert.deepEqual(pngSize(join(IMG, 'og-image.png')), { width: 1200, height: 630 });
  assert.deepEqual(pngSize(join(IMG, 'apple-touch-icon.png')), { width: 180, height: 180 });
  assert.deepEqual(pngSize(join(IMG, 'favicon-32.png')), { width: 32, height: 32 });
  for (const f of ['favicon.svg', 'geometric-composition.svg']) {
    assert.ok(statSync(join(IMG, f)).size > 0, `missing ${f}`);
  }
});

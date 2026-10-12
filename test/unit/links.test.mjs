import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, read, stripComments, attrValues, isExternal, resolveLocal } from './helpers.mjs';

const PAGES = ['index.html', '404.html'].filter((p) => existsSync(join(SITE, p)));

const localRefs = (html) =>
  [...attrValues(html, 'href'), ...attrValues(html, 'src')]
    .filter((url) => !isExternal(url) && !url.startsWith('#'));

for (const page of PAGES) {
  test(`${page}: every local reference resolves`, () => {
    const html = stripComments(read(page));
    for (const url of localRefs(html)) {
      const target = resolveLocal(page, url);
      assert.ok(target && existsSync(target), `${page}: ${url} does not resolve`);
    }
  });

  test(`${page}: loads nothing from third parties`, () => {
    const html = stripComments(read(page));
    const loaded = [
      ...attrValues(html, 'src'),
      ...[...html.matchAll(/<link\b[^>]*>/g)]
        .map((m) => m[0])
        .filter((tag) => !/rel="canonical"/.test(tag))
        .map((tag) => tag.match(/href="([^"]*)"/)?.[1])
        .filter(Boolean),
    ];
    for (const url of loaded) assert.ok(!isExternal(url), `${page} loads ${url}`);
  });
}

test('index.html uses only relative paths (portable to any base path)', () => {
  for (const url of localRefs(stripComments(read('index.html')))) {
    assert.ok(!url.startsWith('/'), `root-absolute path in index.html: ${url}`);
  }
});

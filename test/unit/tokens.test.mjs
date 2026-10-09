import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, themeTokens, contrast } from './helpers.mjs';

const TEXT_PAIRS = [
  ['fg', 'bg'], ['fg-muted', 'bg'], ['link', 'bg'], ['link-hover', 'bg'],
  ['fg', 'surface'], ['fg-muted', 'surface'], ['link', 'surface'],
  ['primary-fg', 'primary'],
];
const NON_TEXT_PAIRS = [['accent', 'bg'], ['accent', 'surface']];

const tokens = () => themeTokens(read('assets/css/site.css'));

function check(theme, pairs, min) {
  const t = tokens()[theme];
  for (const [fg, bg] of pairs) {
    assert.ok(t[fg] && t[bg], `${theme}: missing --${fg} or --${bg}`);
    const ratio = contrast(t[fg], t[bg]);
    assert.ok(ratio >= min, `${theme}: --${fg} on --${bg} is ${ratio.toFixed(2)}:1, need ${min}:1`);
  }
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: text pairs meet WCAG AA (4.5:1)`, () => check(theme, TEXT_PAIRS, 4.5));
  test(`${theme}: accent meets non-text contrast (3:1)`, () => check(theme, NON_TEXT_PAIRS, 3));
}

test('dark theme overrides surfaces and text', () => {
  const { light, dark } = tokens();
  assert.notEqual(dark.bg, light.bg);
  assert.notEqual(dark.fg, light.fg);
  assert.notEqual(dark.link, light.link);
});

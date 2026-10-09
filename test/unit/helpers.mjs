import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SITE = join(ROOT, 'site');

export const read = (rel) => readFileSync(join(SITE, rel), 'utf8');

export const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

export function attrValues(html, attr) {
  const re = new RegExp(`\\s${attr}="([^"]*)"`, 'g');
  return [...html.matchAll(re)].map((m) => m[1]);
}

export const isExternal = (url) => /^(https?:|mailto:|tel:|\/\/)/.test(url);

// Resolve a local href/src (relative or root-absolute) to a file under site/.
export function resolveLocal(fromRel, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (clean === '') return null;
  const target = clean.startsWith('/')
    ? join(SITE, clean)
    : join(SITE, dirname(fromRel), clean);
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.html');
  return target;
}

export function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// First :root block is the light theme; the second (inside the dark
// prefers-color-scheme query) overrides it. Only #rrggbb values are read.
export function themeTokens(css) {
  const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const parse = (block = '') =>
    Object.fromEntries(
      [...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]),
    );
  const light = parse(blocks[0]);
  return { light, dark: { ...light, ...parse(blocks[1]) } };
}

export const LINKEDIN = 'https://www.linkedin.com/in/riccardocambiassi/';

export const STATUTORY = [
  'ChaosCafe Ltd',
  'Registered in England and Wales',
  'Company no. 08162326',
  'Registered office: Devonshire House, 582 Honeypot Lane, Stanmore, Middlesex, HA7 1JS, United Kingdom',
  'VAT GB143188122',
];

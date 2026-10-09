import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.mjs';

const workflow = readFileSync(join(ROOT, '.github/workflows/pages.yml'), 'utf8');

test('every action is pinned to a full commit SHA', () => {
  const uses = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length > 0);
  for (const ref of uses) assert.match(ref, /@[0-9a-f]{40}$/, `${ref} is not pinned to a SHA`);
});

test('deploy job keeps contents: read alongside its Pages permissions', () => {
  const deploy = workflow.slice(workflow.indexOf('\n  deploy:'));
  const permissions = deploy.match(/permissions:\n((?:\s{6}.+\n)+)/)?.[1] ?? '';
  for (const p of ['contents: read', 'pages: write', 'id-token: write']) {
    assert.ok(permissions.includes(p), `deploy job is missing "${p}"`);
  }
});

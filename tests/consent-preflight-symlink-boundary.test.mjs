import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('preflight rejects linked SQLite files by lstat',()=>assert.match(readFileSync(new URL('../scripts/verify-sensitive-consent-cutover.mjs',import.meta.url),'utf8'),/lstatSync/));

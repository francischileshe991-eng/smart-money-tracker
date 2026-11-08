import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decideSyncAction } from '../src/data/sync-decision.ts';

const cases = [
  ['new user with no local or remote data', null, { revision: 0, hasData: false }, { type: 'noop' }],
  ['first device load adopts existing data', null, { revision: 3, hasData: true }, { type: 'adopt-remote' }],
  ['first load adopts a cloud deletion', null, { revision: 3, hasData: false }, { type: 'adopt-remote' }],
  ['unchanged cached data needs no write', { revision: 3, dirty: false }, { revision: 3, hasData: true }, { type: 'noop' }],
  ['clean cache adopts newer cloud data', { revision: 3, dirty: false }, { revision: 4, hasData: true }, { type: 'adopt-remote' }],
  ['clean cache adopts a newer cloud deletion', { revision: 3, dirty: false }, { revision: 4, hasData: false }, { type: 'adopt-remote' }],
  ['offline edits push against their base revision', { revision: 3, dirty: true }, { revision: 3, hasData: true }, { type: 'push', expectedRevision: 3 }],
  ['retrying unsynced edits keeps the same revision', { revision: 3, dirty: true }, { revision: 3, hasData: true }, { type: 'push', expectedRevision: 3 }],
  ['new offline data can populate an empty cloud', { revision: 0, dirty: true }, { revision: 0, hasData: false }, { type: 'push', expectedRevision: 0 }],
  ['cross-device changes require a choice', { revision: 3, dirty: true }, { revision: 4, hasData: true }, { type: 'conflict', expectedRevision: 3, remoteRevision: 4 }],
  ['cloud deletion conflicts with offline edits', { revision: 3, dirty: true }, { revision: 4, hasData: false }, { type: 'conflict', expectedRevision: 3, remoteRevision: 4 }],
  ['legacy cloud data is not overwritten at revision zero', { revision: 0, dirty: true }, { revision: 0, hasData: true }, { type: 'conflict', expectedRevision: 0, remoteRevision: 0 }],
  ['clean legacy cache refreshes from cloud', { revision: 0, dirty: false }, { revision: 0, hasData: true }, { type: 'adopt-remote' }],
];

for (const [name, local, remote, expected] of cases) {
  test(name, () => {
    assert.deepEqual(decideSyncAction({ local, remote }), expected);
  });
}

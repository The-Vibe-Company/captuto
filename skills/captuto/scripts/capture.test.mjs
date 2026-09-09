import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialize, capture, sync, loadState, discard } from './capture.mjs';

async function directory(t) {
  const dir = await mkdtemp(join(tmpdir(), 'captuto-capture-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
function newTutorialTool(name, args) {
  if (name === 'create_capture') return { tutorialId: args.tutorialId };
  if (name === 'read_tutorial') return { tutorial: { visibility: 'private' }, sources: [] };
  throw new Error(`Unexpected tool: ${name}`);
}
function fakeBrowser(url = 'https://example.test/start') {
  return (_session, args) => {
    if (args[0] === 'scrollintoview') return {};
    if (args[0] === 'get') return { x: 100, y: 40, width: 200, height: 80 };
    if (args[0] === 'eval') return { result: { url, title: 'Example', width: 1000, height: 500 } };
    if (args[0] === 'screenshot') { writeFileSync(args[1], Buffer.from('test image')); return {}; }
    throw new Error(`Unexpected browser command: ${args}`);
  };
}

test('a lost create response retains the same tutorial ID for retry', async t => {
  const dir = await directory(t);
  let firstId;
  await assert.rejects(initialize(dir, {}, (name, args) => {
    firstId = args.tutorialId; throw new Error('Disconnected');
  }), /Disconnected/);
  const state = await initialize(dir, {}, newTutorialTool);
  assert.equal(state.tutorialId, firstId);
});

test('resuming a published tutorial creates a revision and appends after existing sources', async t => {
  const dir = await directory(t);
  const state = await initialize(dir, { tutorial: 'original' }, (name, args) => {
    if (name === 'read_tutorial') return args.tutorialId === 'original'
      ? { tutorial: { visibility: 'link_only' }, sources: [] }
      : { tutorial: { visibility: 'private', revision_of: 'original' }, sources: [{ order_index: 7 }] };
    if (name === 'begin_revision') return { tutorialId: 'revision' };
    throw new Error(name);
  });
  assert.equal(state.tutorialId, 'revision');
  assert.equal(state.nextOrder, 8);
});

test('normalizes actual get-box output, retains two sites and resumes a lost upload response', async t => {
  const dir = await directory(t);
  await initialize(dir, { session: 'demo' }, newTutorialTool);
  await capture(dir, { caption: 'Open settings', action: 'click', target: '@e1' }, fakeBrowser());
  await capture(dir, { caption: 'Finish setup' }, fakeBrowser('https://second.test/settings'));
  const before = await loadState(dir);
  assert.deepEqual(before.sources[0].click, { x: 0.2, y: 0.16 });
  assert.notEqual(before.sources[0].url, before.sources[1].url);
  let lostInput;
  await assert.rejects(sync(dir, (name, args) => { lostInput = args; throw new Error('Lost response'); }), /Lost response/);
  const inputs = [];
  await sync(dir, (name, args) => { inputs.push(args); return { saved: true }; });
  assert.deepEqual(inputs[0], lostInput);
  assert.equal(inputs.length, 2);
  await sync(dir, () => { throw new Error('Already uploaded sources must be skipped'); });
});

test('recovers a completed screenshot after interruption before manifest persistence', async t => {
  const dir = await directory(t);
  await initialize(dir, {}, newTutorialTool);
  const oldManifest = await readFile(join(dir, 'capture.json'));
  const shot = await capture(dir, { caption: 'Result' }, fakeBrowser());
  await writeFile(join(dir, 'capture.json'), oldManifest);
  const recovered = await loadState(dir);
  assert.equal(recovered.sources[0].sourceId, shot.sourceId);
  assert.equal(recovered.nextOrder, 1);
  await sync(dir, () => ({ saved: true }));
  assert.equal((await loadState(dir)).sources[0].uploaded, true);
});

test('does not import a screenshot that failed before its final file was written', async t => {
  const dir = await directory(t);
  await initialize(dir, {}, newTutorialTool);
  await assert.rejects(capture(dir, { caption: 'Result' }, (session, args) => {
    if (args[0] === 'screenshot') throw new Error('Browser closed');
    return fakeBrowser()(session, args);
  }), /Browser closed/);
  assert.equal((await loadState(dir)).sources.length, 0);
});

test('ignores an interrupted sidecar write and preserves earlier captures', async t => {
  const dir = await directory(t);
  await initialize(dir, {}, newTutorialTool);
  const previous = await capture(dir, { caption: 'Completed capture' }, fakeBrowser());
  await writeFile(join(dir, 'interrupted.source.json.tmp'), '{"sourceId":');
  assert.equal((await loadState(dir)).sources[0].sourceId, previous.sourceId);
  await sync(dir, () => ({ saved: true }));
  assert.equal((await loadState(dir)).sources[0].uploaded, true);
});

test('discarding an unusable pending capture allows later captures to sync', async t => {
  const dir = await directory(t);
  await initialize(dir, {}, newTutorialTool);
  const bad = await capture(dir, { caption: 'Unusable capture' }, fakeBrowser());
  await discard(dir, bad.sourceId);
  const replacement = await capture(dir, { caption: 'Replacement' }, fakeBrowser());
  const uploaded = [];
  const result = await sync(dir, (name, args) => { uploaded.push(args.sourceId); return {}; });
  assert.deepEqual(uploaded, [replacement.sourceId]);
  assert.equal(result.sourcesUploaded, 1);
  assert.ok(await readFile(bad.file));
});

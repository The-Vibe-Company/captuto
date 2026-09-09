#!/usr/bin/env node
// Localhost I/O goes exclusively through agent-browser, including MCP requests.
// Sign in as a test user first. Fixtures are private except while testing sharing.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { initialize, capture, sync, browser, loadState } from '../skills/captuto/scripts/capture.mjs';

const session = process.env.CAPTUTO_BROWSER_SESSION || 'captuto-autonomous';
const output = resolve(process.env.CAPTUTO_CAPTURE_OUTPUT || `.scratch/autonomous-${Date.now()}`);
const origin = 'http://localhost:3678';
function evaluate(code) {
  const raw = execFileSync('agent-browser', ['--session', session, '--json', 'eval', '--stdin'], {
    input: code, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024,
  });
  const result = JSON.parse(raw);
  if (!result.success) throw new Error(result.error);
  return result.data.result;
}
async function rpc(name, args) {
  const result = evaluate(`(async () => {
    const token = JSON.parse(sessionStorage.getItem('captuto-autonomous-test')).token;
    const response = await fetch('/api/mcp', { method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json, text/event-stream', Authorization:'Bearer '+token},
      body:JSON.stringify(${JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/call', params: { name, arguments: args } })}) });
    if (!response.ok) throw new Error('MCP HTTP '+response.status);
    return await response.json();
  })()`);
  if (result.error || result.result.isError) throw new Error(JSON.stringify(result.error || result.result));
  return result.result;
}
async function tool(name, args) {
  const result = await rpc(name, args);
  return JSON.parse(result.content[0].text);
}

await mkdir(output, { recursive: true });
const ids = [];
let tokenId;
try {
  tokenId = evaluate(`(async()=>{
    const response=await fetch('/api/tokens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Autonomous capture test'})});
    if(!response.ok)throw new Error('Sign in before running this test');
    const token=await response.json();sessionStorage.setItem('captuto-autonomous-test',JSON.stringify(token));return token.id;
  })()`);
  const state = await initialize(output, { title: 'Créer et retrouver un guide', session }, tool);
  ids.push(state.tutorialId);
  const shot = await capture(output, { caption: 'Ouvrir les paramètres', action: 'click', target: 'a[href="/settings"]' });
  browser(session, ['click', 'a[href="/settings"]']);
  browser(session, ['snapshot', '-i']);
  await capture(output, { caption: 'Connecter votre agent depuis les paramètres' });
  let loseResponse = true;
  await assert.rejects(sync(output, async (name, args) => {
    const result = await tool(name, args);
    if (loseResponse) { loseResponse = false; throw new Error('Simulated lost response'); }
    return result;
  }), /Simulated lost response/);
  assert.equal((await loadState(output)).sources[0].uploaded, false);
  await sync(output, tool);
  await sync(output, tool);
  let read = await tool('read_tutorial', { tutorialId: state.tutorialId });
  assert.equal(read.sources.length, 2);
  const source = read.sources.find(s => s.id === shot.sourceId);
  assert.ok(source.clickPosition.x > 0 && source.clickPosition.x < 1);
  const steps = read.sources.map((s, index) => ({ id: randomUUID(), source_id: s.id, order_index: index,
    step_type: 'image', text_content: s.auto_caption, description: index ? 'La connexion MCP permet à votre agent de préparer le guide.' : 'Les paramètres regroupent les connexions et les jetons API.',
    annotations: s.clickPosition ? [{ id: 'target', type: 'arrow', x: Math.min(0.9,s.clickPosition.x + 0.15), y: Math.max(0.1,s.clickPosition.y - 0.15), endX: s.clickPosition.x, endY: s.clickPosition.y, color: '#d9462f' }] : [],
  }));
  await tool('save_steps', { tutorialId: state.tutorialId, steps });
  for (let i = 0; i < steps.length; i++) {
    const preview = await rpc('preview_step', { tutorialId: state.tutorialId, stepId: steps[i].id });
    await writeFile(join(output, `preview-${i}.png`), Buffer.from(preview.content[0].data, 'base64'));
  }
  const shared = await tool('share_tutorial', { tutorialId: state.tutorialId, visibility: 'link_only' });
  await assert.rejects(tool('update_tutorial', { tutorialId: state.tutorialId, title: 'Must not update live' }), /revision/);
  const revision = await initialize(join(output, 'revision'), { tutorial: state.tutorialId, session }, tool);
  ids.push(revision.tutorialId);
  assert.notEqual(revision.tutorialId, state.tutorialId);
  const shareAttempt = evaluate(`(async()=>{const r=await fetch('/api/tutorials/${revision.tutorialId}/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visibility:'link_only'})});return r.status;})()`);
  assert.equal(shareAttempt, 409, 'Editor sharing must not publish the revision under a separate link');
  assert.equal((await tool('begin_revision', { tutorialId: state.tutorialId, revisionId: randomUUID() })).tutorialId, revision.tutorialId);
  await tool('update_tutorial', { tutorialId: revision.tutorialId, title: 'Guide révisé et complété' });
  await capture(join(output, 'revision'), { caption: 'Vérifier la configuration du compte' });
  await sync(join(output, 'revision'), tool);
  const draft = await tool('read_tutorial', { tutorialId: revision.tutorialId });
  assert.equal(draft.sources.length, 3);
  assert.equal(draft.steps.length, 2);
  const newSource = draft.sources.find(s => s.order_index === 2);
  await tool('save_steps', { tutorialId: revision.tutorialId, steps: [{ ...steps[1], id: randomUUID(), source_id: newSource.id, order_index: 2, text_content: 'Vérifier la configuration' }] });
  const before = await tool('read_tutorial', { tutorialId: state.tutorialId });
  assert.equal(before.tutorial.title, state.title);
  assert.equal(before.steps.length, 2);
  browser(session, ['open', `${origin}/editor/${revision.tutorialId}`]);
  browser(session, ['snapshot', '-i']);
  browser(session, ['screenshot', join(output, 'private-revision.png')]);
  const published = await tool('publish_revision', { tutorialId: revision.tutorialId });
  assert.equal(published.url, shared.url);
  await tool('publish_revision', { tutorialId: revision.tutorialId });
  const after = await tool('read_tutorial', { tutorialId: state.tutorialId });
  assert.equal(after.tutorial.title, 'Guide révisé et complété');
  assert.equal(after.steps.length, 3);
  assert.equal(after.sources.length, 3, 'Publishing reuses original sources rather than duplicating them');
  assert.ok(after.sources.some(s => s.id === shot.sourceId), 'Original sources preserved');
  browser(session, ['open', shared.url]);
  const page = browser(session, ['snapshot']);
  assert.match(JSON.stringify(page), /Guide révisé et complété/);
  browser(session, ['screenshot', join(output, 'published.png')]);
  browser(session, ['open', `${origin}/editor/${state.tutorialId}`]);
  browser(session, ['snapshot', '-i']);
  browser(session, ['screenshot', join(output, 'editor.png')]);
  const second = await tool('begin_revision', { tutorialId: state.tutorialId, revisionId: randomUUID() });
  ids.push(second.tutorialId);
  await tool('publish_revision', { tutorialId: second.tutorialId });
  assert.equal((await tool('read_tutorial', { tutorialId: state.tutorialId })).sources.length, 3, 'Repeated revision publication does not accumulate duplicate sources');
  const conflicting = await tool('begin_revision', { tutorialId: state.tutorialId, revisionId: randomUUID() });
  ids.push(conflicting.tutorialId);
  evaluate(`(async()=>{const r=await fetch('/api/tutorials/${state.tutorialId}',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Concurrent editor change'})});if(!r.ok)throw new Error('Concurrent edit fixture failed');return true;})()`);
  await assert.rejects(tool('publish_revision', { tutorialId: conflicting.tutorialId }), /Original changed/);
  assert.equal((await tool('read_tutorial', { tutorialId: state.tutorialId })).tutorial.title, 'Concurrent editor change');
  const report = { output, capture: '2 actual browser screenshots', retry: 'lost response resumed without duplicates', revision: 'private copy with a third source', publication: 'atomic replacement, same public URL, idempotent retry', originalSources: 'preserved without accumulating duplicates', concurrentEdit: 'publication rejected and newer content retained' };
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  // Return to a page on the same origin before authenticated cleanup.
  browser(session, ['open', `${origin}/dashboard`]);
  for (const id of ids.reverse()) evaluate(`(async()=>{const r=await fetch('/api/tutorials/${id}',{method:'DELETE'});if(!r.ok&&r.status!==404)throw new Error('Fixture cleanup failed');return r.status;})()`);
  if (tokenId) evaluate(`(async()=>{const r=await fetch('/api/tokens?id=${tokenId}',{method:'DELETE'});if(!r.ok)throw new Error('Token cleanup failed');sessionStorage.removeItem('captuto-autonomous-test');return true;})()`);
}

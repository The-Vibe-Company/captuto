#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export function browser(session, args) {
  let raw;
  try { raw = execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); }
  catch { throw new Error(`agent-browser ${args[0]} failed; inspect the browser and resume this capture.`); }
  const result = JSON.parse(raw);
  if (!result.success) throw new Error(result.error || 'Browser command failed');
  return result.data;
}

export async function callTool(name, args) {
  const origin = process.env.CAPTUTO_URL;
  const token = process.env.CAPTUTO_API_TOKEN;
  if (!origin || !token) throw new Error('Set CAPTUTO_URL and CAPTUTO_API_TOKEN in the agent environment. Create the token in Captuto Settings.');
  const endpoint = new URL('/api/mcp', origin);
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) throw new Error('CAPTUTO_URL must use HTTPS (HTTP is supported for localhost).');
  const response = await fetch(endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/call', params: { name, arguments: args } }),
  });
  if (!response.ok) throw new Error(`Captuto returned HTTP ${response.status}; local captures are retained. Check connection and retry sync.`);
  const body = await response.json();
  if (body.error || body.result?.isError) throw new Error(body.error?.message || body.result.content?.find(c => c.type === 'text')?.text || 'Captuto tool failed');
  const content = body.result?.content?.find(c => c.type === 'text');
  if (!content) throw new Error('Captuto returned no result');
  return JSON.parse(content.text);
}

export async function saveState(dir, state) {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const temporary = join(dir, `capture.${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(temporary, join(dir, 'capture.json'));
}
export async function loadState(dir) {
  const state = JSON.parse(await readFile(join(dir, 'capture.json'), 'utf8'));
  // Recover a screenshot completed just before interruption of the manifest write.
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.source.json')) continue;
    const source = JSON.parse(await readFile(join(dir, file), 'utf8'));
    if (state.sources.some(s => s.sourceId === source.sourceId)) continue;
    try { await access(join(dir, source.file)); } catch { continue; }
    state.sources.push(source);
    state.nextOrder = Math.max(state.nextOrder, source.order + 1);
  }
  state.sources.sort((a, b) => a.order - b.order);
  return state;
}

export async function initialize(dir, options, tool = callTool) {
  let state;
  try { state = await loadState(dir); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = { version: 1, id: randomUUID(), originalId: options.tutorial || null,
      title: options.title || 'Web tutorial', session: options.session || 'captuto',
      startedAt: new Date().toISOString(), sources: [], initialized: false };
    await saveState(dir, state);
  }
  if (state.initialized) return state;
  let result;
  if (state.originalId) {
    const original = await tool('read_tutorial', { tutorialId: state.originalId });
    if (original.tutorial.revision_published_at) throw new Error('This revision was published. Start a new capture directory with its revision_of tutorial ID.');
    result = original.tutorial.visibility !== 'private' || original.tutorial.is_public
      ? await tool('begin_revision', { tutorialId: state.originalId, revisionId: state.id })
      : { tutorialId: state.originalId };
  } else result = await tool('create_capture', { tutorialId: state.id, title: state.title });
  const read = await tool('read_tutorial', { tutorialId: result.tutorialId });
  state.tutorialId = result.tutorialId;
  state.revisionOf = read.tutorial.revision_of || null;
  state.editorUrl = result.editorUrl || (process.env.CAPTUTO_URL ? new URL(`/editor/${state.tutorialId}`, process.env.CAPTUTO_URL).href : null);
  state.nextOrder = Math.max(-1, ...read.sources.map(s => s.order_index)) + 1;
  state.initialized = true;
  await saveState(dir, state);
  return state;
}

export async function capture(dir, options, run = browser) {
  const state = await loadState(dir);
  if (!state.initialized) throw new Error('Run init again to finish connecting this capture.');
  if (!options.caption) throw new Error('--caption is required: describe the action or result shown.');
  const action = options.action || 'manual_marker';
  if (!['click', 'navigation', 'tab_change', 'type', 'keyboard_shortcut', 'scroll', 'manual_marker'].includes(action)) throw new Error('Unsupported capture action');
  let box;
  if (options.target) {
    run(state.session, ['scrollintoview', options.target]);
    const result = run(state.session, ['get', 'box', options.target]);
    box = result.box || result;
    if (!['x', 'y', 'width', 'height'].every(key => Number.isFinite(box[key]))) throw new Error('Target has no visible bounding box');
  }
  const page = run(state.session, ['eval', '({url:location.href,title:document.title,width:innerWidth,height:innerHeight})']).result;
  const sourceId = randomUUID();
  const file = `${sourceId}.png`;
  let click;
  if (box) {
    const x = (box.x + box.width / 2) / page.width, y = (box.y + box.height / 2) / page.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) throw new Error('Target is outside the viewport; reposition it and capture again.');
    click = { x, y };
  }
  const source = { sourceId, file, tutorialId: state.tutorialId, timestamp: Date.now() - Date.parse(state.startedAt),
    order: state.nextOrder++, action, url: page.url, title: page.title, caption: options.caption,
    ...(click ? { click } : {}), uploaded: false };
  const sidecar = join(dir, `${sourceId}.source.json`);
  await writeFile(`${sidecar}.tmp`, JSON.stringify(source), { mode: 0o600 });
  await rename(`${sidecar}.tmp`, sidecar);
  const temporaryImage = join(resolve(dir), `${sourceId}.pending.png`);
  run(state.session, ['screenshot', temporaryImage]);
  await rename(temporaryImage, join(dir, file));
  state.sources.push(source);
  await saveState(dir, state);
  return { tutorialId: state.tutorialId, sourceId, file: join(resolve(dir), file), pending: state.sources.filter(s => !s.uploaded).length };
}

export async function sync(dir, tool = callTool) {
  const state = await loadState(dir);
  if (!state.initialized) throw new Error('Run init again before sync.');
  for (const source of state.sources) {
    if (source.uploaded || source.discarded) continue;
    const { file, uploaded: _, ...input } = source;
    const image = await readFile(join(dir, file));
    if (image.length > 3 * 1024 * 1024) throw new Error(`Capture ${file} exceeds 3 MB. Discard it with --source ${source.sourceId}, resize the viewport and take a replacement capture; local files are retained.`);
    await tool('append_capture', { ...input, screenshot: image.toString('base64') });
    source.uploaded = true;
    await saveState(dir, state);
  }
  return { tutorialId: state.tutorialId, revisionOf: state.revisionOf, editorUrl: state.editorUrl, sourcesUploaded: state.sources.filter(s => s.uploaded).length };
}

export async function discard(dir, sourceId) {
  const state = await loadState(dir);
  const source = state.sources.find(s => s.sourceId === sourceId);
  if (!source) throw new Error('Unknown source ID');
  if (source.uploaded) throw new Error('Source is already uploaded; omit it from authored steps instead.');
  source.discarded = true;
  await saveState(dir, state);
  return { sourceId, discarded: true, fileRetained: true };
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    dir: { type: 'string' }, title: { type: 'string' }, tutorial: { type: 'string' },
    session: { type: 'string' }, caption: { type: 'string' }, action: { type: 'string' },
    target: { type: 'string' }, source: { type: 'string' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('capture.mjs init|capture|sync|status|discard --dir <capture-directory>\ninit: --title <title> [--tutorial <existing-id>] [--session <agent-browser-session>]\ncapture: --caption <description> [--action click|navigation|tab_change|type|keyboard_shortcut|scroll|manual_marker] [--target <selector-or-ref>]\ndiscard: --source <pending-source-id> (retains local file)\nRequires Node 20+, agent-browser, CAPTUTO_URL and CAPTUTO_API_TOKEN. Run commands sequentially per capture directory.');
    return;
  }
  if (!values.dir) throw new Error('--dir is required');
  const command = positionals[0];
  const result = command === 'init' ? await initialize(values.dir, values)
    : command === 'capture' ? await capture(values.dir, values)
    : command === 'sync' ? await sync(values.dir)
    : command === 'discard' ? await discard(values.dir, values.source)
    : command === 'status' ? await loadState(values.dir)
    : (() => { throw new Error('Expected init, capture, sync, or status. See --help.'); })();
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

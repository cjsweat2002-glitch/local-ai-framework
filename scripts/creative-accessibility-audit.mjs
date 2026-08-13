import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SignJWT } from 'jose';

const baseUrl = 'http://127.0.0.1:3000';
const port = 9237;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    ready,
    async send(method, params = {}) {
      await ready;
      const id = nextId++;
      const reply = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return reply;
    },
    close() { socket.close(); },
  };
}

async function main() {
  const required = ['JWT_SECRET', 'OWNER_OPEN_ID', 'VITE_APP_ID'];
  for (const key of required) if (!process.env[key]) throw new Error(`${key} is required for the local authenticated audit.`);

  const session = await new SignJWT({
    openId: process.env.OWNER_OPEN_ID,
    appId: process.env.VITE_APP_ID,
    name: process.env.OWNER_NAME || 'Accessibility Audit',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 600)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  const userDataDir = await mkdtemp(join(tmpdir(), 'aah-accessibility-'));
  const chrome = spawn('/usr/bin/chromium', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: 'ignore' });

  const audit = { baseUrl, routes: [], timestamp: new Date().toISOString() };
  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' });
    const target = await created.json();
    const cdp = createCdpClient(target.webSocketDebuggerUrl);
    await cdp.send('Page.bringToFront');
    await cdp.send('Network.enable');
    const cookieResult = await cdp.send('Network.setCookie', { name: 'app_session_id', value: session, url: `${baseUrl}/`, sameSite: 'Lax', secure: false });
    if (!cookieResult.success) throw new Error('The temporary local audit session cookie was not accepted by Chromium.');
    audit.cookieConfigured = (await cdp.send('Network.getAllCookies')).cookies.some((cookie) => cookie.name === 'app_session_id' && cookie.domain === '127.0.0.1');

    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const press = async (key, code, modifiers = 0) => {
      const keyCodes = { Enter: 13, Tab: 9, ' ': 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, '?': 191, t: 84 };
      const keyCode = keyCodes[key] || 0;
      const text = key === 'Enter' ? '\r' : key === ' ' || key === '?' || key === 't' ? key : undefined;
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, text, unmodifiedText: text, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    };
    const navigate = async (path) => {
      await cdp.send('Page.navigate', { url: `${baseUrl}${path}` });
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await sleep(250);
        const ready = await evaluate(`document.querySelectorAll('button, input, select, textarea, [role="button"], a[href]').length > 1`);
        if (ready) break;
      }
      return evaluate('location.pathname');
    };
    const focusAudit = async (path) => {
      await navigate(path);
      const keyboardControlCount = await evaluate(`document.querySelectorAll('button, input, select, textarea, [role="button"], a[href]').length`);
      await evaluate(`document.querySelector('button, input, select, textarea, [role="button"], a[href]')?.focus()`);
      await press('Tab', 'Tab');
      const afterTab = await evaluate(`({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().slice(0, 48), outline: getComputedStyle(document.activeElement).outlineWidth })`);
      await press('Tab', 'Tab', 8);
      const afterShiftTab = await evaluate(`({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().slice(0, 48) })`);
      const routeState = await evaluate(`({ location: location.pathname, body: document.body.innerText.slice(0, 160) })`);
      const record = { path, keyboardControlCount, afterTab, afterShiftTab, routeState };
      audit.routes.push(record);
      if (keyboardControlCount < 2 || afterTab.tag === 'BODY' || afterShiftTab.tag === 'BODY') throw new Error(`Keyboard focus traversal failed for ${path}: ${JSON.stringify(record)}`);
    };

    await focusAudit('/');
    await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Content Creation'))?.focus()`);
    await press(' ', 'Space');
    await sleep(250);
    audit.branchActivation = await evaluate(`document.querySelector('[aria-current="page"]')?.textContent?.includes('Content Creation')`);
    if (!audit.branchActivation) throw new Error('Space key did not activate the Content Creation branch.');

    const taskHistoryButtonFound = await evaluate(`Array.from(document.querySelectorAll('button')).some((button) => button.textContent.includes('Task History'))`);
    if (!taskHistoryButtonFound) throw new Error('Task History navigation button was not present in the authenticated workspace.');
    await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Task History'))?.focus()`);
    audit.taskHistoryFocusedControl = await evaluate(`document.activeElement?.textContent?.trim()`);
    await press('Enter', 'Enter');
    await sleep(500);
    audit.enterRouteNavigation = await evaluate('location.pathname');
    if (audit.enterRouteNavigation !== '/task-history') throw new Error(`Enter key did not activate Task History navigation; current path was ${audit.enterRouteNavigation}.`);

    await focusAudit('/task-history');
    await focusAudit('/system-factory');
    await focusAudit('/gemini-developer');
    await focusAudit('/design-studio');
    const canvasLayer = await evaluate(`(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.getAttribute('aria-label')?.includes('Orbit field')); if (!button) return null; button.focus(); return { left: getComputedStyle(button).left, focused: document.activeElement === button }; })()`);
    if (!canvasLayer?.focused) throw new Error('The editable Orbit field was not focusable on the Design Studio canvas.');
    await press('ArrowLeft', 'ArrowLeft');
    await sleep(250);
    audit.canvasNudge = await evaluate(`(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.getAttribute('aria-label')?.includes('Orbit field')); return { before: '${canvasLayer.left}', after: getComputedStyle(button).left }; })()`);
    if (audit.canvasNudge.before === audit.canvasNudge.after) throw new Error('Arrow-key nudge did not reposition the focused canvas layer.');
    await press('?', 'Slash');
    await sleep(200);
    audit.shortcutSettings = await evaluate(`Boolean(document.querySelector('#canvas-shortcuts'))`);
    if (!audit.shortcutSettings) throw new Error('Shortcut settings did not open with the question-mark command.');
    await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Open direction tools'))?.focus()`);
    await press('Enter', 'Enter');
    await sleep(250);
    const layerCountBeforeTyping = await evaluate(`document.querySelectorAll('.canvas-object').length`);
    await evaluate(`document.querySelector('#studio-brief')?.focus()`);
    await press('t', 'KeyT');
    await sleep(150);
    audit.typingSafety = await evaluate(`({ focusedInput: document.activeElement?.id === 'studio-brief', layerCountBefore: ${layerCountBeforeTyping}, layerCountAfter: document.querySelectorAll('.canvas-object').length })`);
    if (!audit.typingSafety.focusedInput || audit.typingSafety.layerCountBefore !== audit.typingSafety.layerCountAfter) throw new Error('Canvas commands intercepted ordinary text input.');
    await evaluate(`Array.from(document.querySelectorAll('button[aria-pressed]')).find((button) => button.textContent.includes('Identity Forge'))?.click()`);
    await sleep(250);
    audit.designEngineSelection = await evaluate(`({ selected: Array.from(document.querySelectorAll('button[aria-pressed="true"]')).some((button) => button.textContent.includes('Identity Forge')), console: document.body.innerText.includes('Identity Forge') })`);
    if (!audit.designEngineSelection.selected) throw new Error('The Identity Forge advisor card was not selected.');
    await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Ask in Design & UI'))?.focus()`);
    await press('Enter', 'Enter');
    await sleep(900);
    audit.designStudioHandoff = await evaluate(`({ path: location.pathname, branch: document.querySelector('[aria-current="page"]')?.textContent?.includes('Design & UI'), prompt: document.querySelector('textarea')?.value?.includes('Identity Forge') })`);
    if (audit.designStudioHandoff.path !== '/' || !audit.designStudioHandoff.branch || !audit.designStudioHandoff.prompt) throw new Error(`Design Studio handoff failed: ${JSON.stringify(audit.designStudioHandoff)}`);
    await cdp.send('Browser.close');
    cdp.close();
  } finally {
    chrome.kill('SIGTERM');
  }

  if (!audit.routes.every((route) => route.afterTab.outline === '3px')) throw new Error('Visible focus outline was not observed during keyboard traversal.');
  await writeFile('creative-accessibility-audit.json', `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});

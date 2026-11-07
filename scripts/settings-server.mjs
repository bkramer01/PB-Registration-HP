// Serves the settings page on this PC only, so it can load and save config.json.
// Started by settings.cmd (Windows) or settings.command (Mac). Pass --no-open to skip opening the browser.

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { exec, execFile } from 'node:child_process';
import { applySettings } from '../src/settings.js';

const CONFIG = new URL('../config.json', import.meta.url);
const PAGE = new URL('../docs/index.html', import.meta.url);

const server = createServer(async (req, res) => {
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type }); res.end(body); };
  const sendJson = (code, value) => send(code, 'application/json', JSON.stringify(value));
  const here = `127.0.0.1:${server.address().port}`;

  // Only this page may use the server, not other websites open in the browser.
  if (req.headers.host !== here) return send(403, 'text/plain', 'Forbidden');
  if (req.headers.origin && req.headers.origin !== `http://${here}`) return send(403, 'text/plain', 'Forbidden');

  try {
    if (req.method === 'GET' && req.url === '/') return send(200, 'text/html; charset=utf-8', await readFile(PAGE));
    if (req.method === 'GET' && req.url === '/config') return send(200, 'application/json', await readFile(CONFIG));
    if (req.method === 'POST' && req.url === '/config') {
      if (req.headers['content-type'] !== 'application/json') return send(415, 'text/plain', 'JSON only');
      let body = '';
      for await (const chunk of req) body += chunk;
      const saved = applySettings(JSON.parse(await readFile(CONFIG, 'utf8')), JSON.parse(body));
      await writeFile(CONFIG, `${JSON.stringify(saved, null, 2)}\n`);
      return sendJson(200, saved);
    }
    return send(404, 'text/plain', 'Not found');
  } catch (err) {
    return sendJson(400, { error: err.message });
  }
});

server.listen(0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Settings page: ${url}`);
  console.log('Close this window when you are done.');
  if (process.argv.includes('--no-open')) return;
  if (process.platform === 'darwin') execFile('open', [url]);
  else exec(`start "" "${url}"`); // Windows, unchanged
});

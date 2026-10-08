'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1]);
const mainScript = scripts.at(-1);

function appContext() {
  const stop = mainScript.indexOf('// ── DÉTECTION PROTOCOLE');
  assert.ok(stop > 0, 'le code de l’application est présent');
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(mainScript.slice(0, stop), context);
  return context;
}

test('le JavaScript principal et le service worker ont une syntaxe valide', () => {
  for (const script of scripts) new vm.Script(script);
  new vm.Script(sw);
});

test('le jeu contient 78 cartes distinctes et tous les tirages sont configurés', () => {
  const context = appContext();
  assert.equal(vm.runInContext('FULL_DECK.length', context), 78);
  assert.equal(vm.runInContext('new Set(FULL_DECK.map(c => c.id)).size', context), 78);
  assert.equal(vm.runInContext('MAJEURS.length', context), 22);
  assert.equal(vm.runInContext('MINEURS.length', context), 56);
  assert.equal(vm.runInContext("TIRAGES['6'].pos.length", context), 6);
});

test('le lecteur SSE accepte les trames sans espace et avec fins de ligne CRLF', () => {
  const context = appContext();
  const one = JSON.stringify({ choices: [{ delta: { content: 'Bonjour' } }] });
  const two = JSON.stringify({ choices: [{ delta: { content: ' !' } }] });
  const payload = 'data:' + one + '\r\ndata: ' + two + '\n\ndata: [DONE]\n';
  assert.equal(context.parseSSE(payload), 'Bonjour !');
});

test('le streaming reconstruit les messages coupés entre les chunks', async () => {
  const context = appContext();
  const full = 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Bonjour' } }] }) + '\r\n' +
    'data: ' + JSON.stringify({ choices: [{ delta: { content: ' !' } }] }) + '\n\n';
  const chunks = [
    full.slice(0, 19),
    full.slice(19, 45),
    full.slice(45)
  ].map((part) => new TextEncoder().encode(part));
  const updates = [];
  const response = {
    body: {
      getReader() {
        return {
          async read() {
            return chunks.length ? { done: false, value: chunks.shift() } : { done: true };
          }
        };
      }
    }
  };
  context.TextDecoder = TextDecoder;
  assert.equal(await context.lireReponseMistral(response, (value) => updates.push(value)), 'Bonjour !');
  assert.equal(updates.at(-1), 'Bonjour !');
});

test('la clé API n’est plus conservée dans localStorage', () => {
  assert.doesNotMatch(html, /localStorage\.setItem\(\s*['"]oracle_apikey/);
  assert.doesNotMatch(html, /safeStorage\.setItem/);
  assert.match(html, /localStorage\.removeItem\('oracle_apikey'\)/);
});

test('la PWA utilise des chemins relatifs compatibles avec GitHub Pages', () => {
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.match(html, /serviceWorker\.register\('\.\/sw\.js'\)/);
});

test('le service worker met en cache son sous-dossier, jamais les requêtes API', async () => {
  const handlers = {};
  const assets = [];
  const deleted = [];
  const cached = new Map();
  const cache = {
    async addAll(urls) {
      assets.push(...urls);
      for (const url of urls) cached.set(url, { url });
    },
    async put(request, response) { cached.set(request.url || request, response); }
  };
  const caches = {
    open: async () => cache,
    keys: async () => ['tarot-de-niko-v1', 'another-app-v1'],
    delete: async (name) => { deleted.push(name); },
    match: async (req) => cached.get(req.url || req)
  };
  const self = {
    registration: { scope: 'https://example.org/tarot-de-niko/' },
    location: { origin: 'https://example.org' },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener(type, fn) { handlers[type] = fn; }
  };
  vm.runInNewContext(sw, { self, caches, URL, Set, Promise, fetch: async () => { throw Error('hors ligne'); } });
  let installation;
  handlers.install({ waitUntil(promise) { installation = promise; } });
  await installation;
  assert.ok(assets.includes('https://example.org/tarot-de-niko/index.html'));
  assert.ok(assets.every((url) => url.startsWith('https://example.org/tarot-de-niko/')));
  let activation;
  handlers.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ['tarot-de-niko-v1']);

  let intercepted = false;
  handlers.fetch({
    request: { method: 'POST', mode: 'cors', url: 'https://api.mistral.ai/v1/chat/completions' },
    respondWith() { intercepted = true; }
  });
  assert.equal(intercepted, false);

  let fallback;
  handlers.fetch({
    request: { method: 'GET', mode: 'navigate', url: 'https://example.org/tarot-de-niko/page' },
    respondWith(promise) { fallback = promise; },
    waitUntil() {}
  });
  const response = await fallback;
  assert.equal(response.url, 'https://example.org/tarot-de-niko/index.html');
});

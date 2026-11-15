import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import serveStatic from 'serve-static';

const project = fileURLToPath(new URL('../', import.meta.url));
const output = join(project, 'dist');
const stamp = join(project, '.expo', 'local-web.sha256');
const host = '127.0.0.1';
const port = 8204;
const origin = 'http://' + host + ':' + port;
const require = createRequire(import.meta.url);

function sourceHash() {
  const hash = createHash('sha256');
  function add(relative) {
    const file = join(project, relative);
    if (statSync(file).isDirectory()) {
      for (const name of readdirSync(file).sort()) add(join(relative, name));
    } else {
      const content = readFileSync(file);
      hash.update(relative + '\0' + content.length + '\0');
      hash.update(content);
    }
  }
  for (const input of ['src', 'assets', 'app.json', 'babel.config.js', 'metro.config.js',
    'package.json', 'package-lock.json', 'tsconfig.json', 'scripts/local.mjs']) add(input);
  return hash.digest('hex');
}

async function build(force = false) {
  const hash = sourceHash();
  if (!force && existsSync(join(output, 'index.html')) && existsSync(stamp) && readFileSync(stamp, 'utf8') === hash) return;

  rmSync(stamp, { force: true });
  console.log('Building Rent Manager with the installed Expo tools…');
  await new Promise((resolve, reject) => {
    const cli = require.resolve('expo/bin/cli');
    const child = spawn(process.execPath, [cli, 'export', '--platform', 'web', '--output-dir', output], {
      cwd: project,
      stdio: 'inherit',
      env: { ...process.env, EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1',
        EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '' },
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('Expo export failed. See the build output above.')));
  });
  mkdirSync(join(project, '.expo'), {recursive:true});
  writeFileSync(stamp, hash);
}

function start() {
  const files = serveStatic(output, { dotfiles: 'deny', fallthrough: false, index: false, redirect: false });
  let ready = false;
  const server = createServer((req, res) => {
    res.setHeader('X-Rent-Manager', 'local');
    if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    if (req.headers.host === 'localhost:' + port) {
      return res.writeHead(307, { Location: origin + req.url }).end();
    }
    if (req.headers.host !== host + ':' + port) return res.writeHead(400).end();
    if (!ready) return res.writeHead(503, { Refresh: '2', 'Retry-After': '2' }).end('Starting Rent Manager…');
    // The local ledger and its assets require only this origin.
    res.setHeader('Content-Security-Policy', "connect-src 'self'; object-src 'none'; base-uri 'self'");
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, origin).pathname); }
    catch { return res.writeHead(400).end(); }
    if (pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) return res.writeHead(404).end();
    if (!pathname.startsWith('/_expo/') && !pathname.startsWith('/assets/') && !['/favicon.ico', '/index.html'].includes(pathname)) {
      if (extname(pathname)) return res.writeHead(404).end();
      req.url = '/index.html';
    }
    files(req, res, error => res.writeHead(error?.statusCode || 404).end());
  });
  server.on('error', async error => {
    if (error.code === 'EADDRINUSE') {
      try {
        const current = await fetch(origin, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        if (current.headers.get('X-Rent-Manager') === 'local') {
          console.log('Rent Manager is already running at ' + origin + '/');
          return;
        }
      } catch { /* The occupied port does not serve Rent Manager. */ }
      console.error('Port 8204 is in use. Stop the other server and run npm start again.');
    } else console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, host, async () => {
    try {
      await build();
      ready = true;
      console.log('Rent Manager is ready at ' + origin + '/');
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
      server.close();
    }
  });
}

if (process.argv.includes('--build')) await build(true);
else start();

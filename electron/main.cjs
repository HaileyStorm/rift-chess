const fs = require('node:fs/promises');
const path = require('node:path');

const APP_ID = 'com.haileystorm.riftchess';
const APP_HOST = 'app';
const APP_SCHEME = 'rift';
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

const ALLOWED_EXTERNAL_URLS = new Set([
  'https://buymeacoffee.com/threadspan',
  'https://docs.vast.ai/guides/reference/billing',
  'https://docs.vast.ai/cli/reference/transfer-credit',
  'https://github.com/HaileyStorm/Creative-Writing-Rubrics/blob/main/docs/DONATIONS.md',
  'https://github.com/HaileyStorm/rift-chess',
  'https://xkcd.com/3139/',
]);

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

let mainWindow;

function response(status, message) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function rawPathname(rawUrl) {
  const schemeEnd = rawUrl.indexOf('://');
  if (schemeEnd < 0) return null;

  const pathStart = rawUrl.indexOf('/', schemeEnd + 3);
  if (pathStart < 0) return '/';
  const queryStart = rawUrl.search(/[?#]/, pathStart);
  return rawUrl.slice(pathStart, queryStart < 0 ? undefined : queryStart);
}

function hasUnsafePathSegment(rawPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return true;
  }

  return decoded.includes('\0')
    || decoded.includes('\\')
    || decoded.split('/').some((segment) => segment === '.' || segment === '..');
}

function resolveStaticPath(distRoot, rawUrl) {
  if (typeof rawUrl !== 'string') return null;

  let requested;
  try {
    requested = new URL(rawUrl);
  } catch {
    return null;
  }

  const pathname = rawPathname(rawUrl);
  if (
    requested.protocol !== `${APP_SCHEME}:`
    || requested.hostname !== APP_HOST
    || requested.port
    || requested.username
    || requested.password
    || !pathname
    || hasUnsafePathSegment(pathname)
  ) {
    return null;
  }

  const root = path.resolve(distRoot);
  const relativePath = requested.pathname === '/' ? 'index.html' : requested.pathname.slice(1);
  const resolvedPath = path.resolve(root, relativePath);
  const relativeToRoot = path.relative(root, resolvedPath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) return null;
  return resolvedPath;
}

function isAllowedExternalUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' && ALLOWED_EXTERNAL_URLS.has(parsed.toString());
  } catch {
    return false;
  }
}

function contentTypeFor(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

function installContentSecurityPolicy(session) {
  session.webRequest.onHeadersReceived((details, callback) => {
    const headers = Object.fromEntries(
      Object.entries(details.responseHeaders || {}).filter(([name]) => name.toLowerCase() !== 'content-security-policy'),
    );
    callback({
      responseHeaders: {
        ...headers,
        'Content-Security-Policy': [CONTENT_SECURITY_POLICY],
      },
    });
  });
}

function registerStaticProtocol(protocol, distRoot) {
  protocol.handle(APP_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return response(405, 'Method not allowed');

    const filePath = resolveStaticPath(distRoot, request.url);
    if (!filePath) return response(404, 'Not found');

    try {
      const metadata = await fs.stat(filePath);
      if (!metadata.isFile()) return response(404, 'Not found');
      const body = request.method === 'HEAD' ? undefined : await fs.readFile(filePath);
      return new Response(body, {
        headers: { 'Content-Type': contentTypeFor(filePath) },
      });
    } catch {
      return response(404, 'Not found');
    }
  });
}

function installExternalLinkBoundary(ipcMain, shell) {
  ipcMain.handle('rift:open-external', async (event, rawUrl) => {
    if (event.sender !== mainWindow?.webContents || !isAllowedExternalUrl(rawUrl)) return false;
    await shell.openExternal(rawUrl);
    return true;
  });
}

function createWindow(electron) {
  const { BrowserWindow } = electron;
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#101820',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (resolveStaticPath(path.join(__dirname, '..', 'dist'), navigationUrl)) return;
    event.preventDefault();
  });

  mainWindow = window;
  window.once('closed', () => {
    if (mainWindow === window) mainWindow = undefined;
  });

  window.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`);
  return window;
}

function start() {
  const electron = require('electron');
  const { app, protocol, session } = electron;
  if (process.env.RIFT_CHESS_TEST_PROFILE) app.setPath('userData', path.resolve(process.env.RIFT_CHESS_TEST_PROFILE));

  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);

  app.setAppUserModelId(APP_ID);
  app.whenReady().then(() => {
    installContentSecurityPolicy(session.defaultSession);
    registerStaticProtocol(protocol, path.join(__dirname, '..', 'dist'));
    installExternalLinkBoundary(electron.ipcMain, electron.shell);
    createWindow(electron);
    app.on('activate', () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) createWindow(electron);
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

module.exports = {
  ALLOWED_EXTERNAL_URLS,
  APP_HOST,
  APP_SCHEME,
  CONTENT_SECURITY_POLICY,
  isAllowedExternalUrl,
  resolveStaticPath,
};

if (require.main === module) start();

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import asar from '@electron/asar';

// The ZIP root is the versioned Windows runtime directory; its resources/app.asar
// contains only the allowlisted application bundle. Renaming electron.exe does not
// rewrite the stock Electron PE metadata or replace code signing.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIRECTORIES = ['dist', 'electron'];
const APP_FILES = ['package.json', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md'];
const RUNTIME_LICENSES = ['LICENSE', 'LICENSES.chromium.html'];

function resolveWithin(root, ...segments) {
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Refusing a path outside the workspace: ${resolved}`);
  }
  return resolved;
}

async function lstatNoReparse(target, kind) {
  const metadata = await fs.lstat(target);
  if (metadata.isSymbolicLink()) throw new Error(`Refusing reparse-point ${kind}: ${target}`);
  return metadata;
}

async function requireFile(target, description) {
  const metadata = await lstatNoReparse(target, description);
  if (!metadata.isFile()) throw new Error(`Expected ${description} to be a file: ${target}`);
}

async function requireDirectory(target, description) {
  const metadata = await lstatNoReparse(target, description);
  if (!metadata.isDirectory()) throw new Error(`Expected ${description} to be a directory: ${target}`);
}

async function copyFile(source, destination, description) {
  await requireFile(source, description);
  await fs.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
}

async function copyDirectory(source, destination, description) {
  await requireDirectory(source, description);
  await fs.mkdir(destination, { recursive: false });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const sourceEntry = path.join(source, entry.name);
    const destinationEntry = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing reparse point in ${description}: ${sourceEntry}`);
    if (entry.isDirectory()) {
      await copyDirectory(sourceEntry, destinationEntry, description);
    } else if (entry.isFile()) {
      await fs.copyFile(sourceEntry, destinationEntry, fs.constants.COPYFILE_EXCL);
    } else {
      throw new Error(`Refusing non-file application input: ${sourceEntry}`);
    }
  }
}

async function sha256(filePath) {
  const hash = createHash('sha256');
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    await handle.close();
  }
  return hash.digest('hex');
}

function runPowerShellZip(sourceDirectory, zipPath) {
  const command = [
    "$ErrorActionPreference = 'Stop'",
    'Compress-Archive -LiteralPath $env:RIFT_CHESS_PACKAGE_SOURCE -DestinationPath $env:RIFT_CHESS_PACKAGE_DESTINATION -CompressionLevel Optimal',
  ].join('; ');
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      env: {
        ...process.env,
        RIFT_CHESS_PACKAGE_SOURCE: sourceDirectory,
        RIFT_CHESS_PACKAGE_DESTINATION: zipPath,
      },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Compress-Archive failed with exit code ${code}`));
    });
  });
}

async function packageElectron() {
  const packagePath = resolveWithin(projectRoot, 'package.json');
  await requireFile(packagePath, 'package metadata');
  const packageMetadata = JSON.parse(await fs.readFile(packagePath, 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(packageMetadata.version || '')) {
    throw new Error('package.json must contain a semver version for the Windows artifact name.');
  }

  const outRoot = resolveWithin(projectRoot, 'out');
  try {
    await requireDirectory(outRoot, 'output directory');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(outRoot, { recursive: false });
    await requireDirectory(outRoot, 'output directory');
  }

  const artifactName = `Rift-Chess-win32-x64-${packageMetadata.version}`;
  const artifactDirectory = resolveWithin(outRoot, artifactName);
  const zipPath = resolveWithin(outRoot, `${artifactName}.zip`);
  const checksumPath = resolveWithin(outRoot, `${artifactName}.zip.sha256`);
  for (const target of [artifactDirectory, zipPath, checksumPath]) {
    try {
      await fs.lstat(target);
      throw new Error(`Refusing to overwrite an existing artifact: ${target}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const electronDist = resolveWithin(projectRoot, 'node_modules', 'electron', 'dist');
  await requireDirectory(electronDist, 'installed Electron Windows runtime');
  await requireFile(path.join(electronDist, 'electron.exe'), 'installed Electron Windows executable');
  for (const licenseName of RUNTIME_LICENSES) {
    await requireFile(path.join(electronDist, licenseName), `Electron runtime ${licenseName}`);
  }
  for (const directoryName of APP_DIRECTORIES) {
    await requireDirectory(resolveWithin(projectRoot, directoryName), `application ${directoryName}`);
  }
  for (const fileName of APP_FILES) {
    await requireFile(resolveWithin(projectRoot, fileName), `application ${fileName}`);
  }

  await copyDirectory(electronDist, artifactDirectory, 'installed Electron Windows runtime');
  await fs.rename(path.join(artifactDirectory, 'electron.exe'), path.join(artifactDirectory, 'Rift Chess.exe'));

  const stagingDirectory = resolveWithin(artifactDirectory, '.app-staging');
  const resourcesDirectory = resolveWithin(artifactDirectory, 'resources');
  const appAsarPath = resolveWithin(resourcesDirectory, 'app.asar');
  await requireDirectory(resourcesDirectory, 'Electron resources directory');
  await fs.mkdir(stagingDirectory, { recursive: false });
  try {
    for (const fileName of APP_FILES) {
      await copyFile(resolveWithin(projectRoot, fileName), path.join(stagingDirectory, fileName), `application ${fileName}`);
    }
    for (const directoryName of APP_DIRECTORIES) {
      await copyDirectory(
        resolveWithin(projectRoot, directoryName),
        path.join(stagingDirectory, directoryName),
        `application ${directoryName}`,
      );
    }
    await asar.createPackage(stagingDirectory, appAsarPath);
  } finally {
    await requireDirectory(stagingDirectory, 'owned application staging directory');
    await fs.rm(stagingDirectory, { recursive: true, force: false, maxRetries: 3, retryDelay: 200 });
  }

  await requireFile(appAsarPath, 'packaged application archive');
  await runPowerShellZip(artifactDirectory, zipPath);
  await requireFile(zipPath, 'Windows ZIP artifact');
  const checksum = await sha256(zipPath);
  await fs.writeFile(checksumPath, `${checksum}  ${path.basename(zipPath)}\n`, { flag: 'wx' });
  process.stdout.write(`Created ${path.relative(projectRoot, zipPath)}\nCreated ${path.relative(projectRoot, checksumPath)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageElectron().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

export { packageElectron, resolveWithin };

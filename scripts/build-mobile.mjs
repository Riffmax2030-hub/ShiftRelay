import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());
const WWW = resolve(ROOT, 'www');

console.log('Building mobile static package into www/...');

// 1. Recreate www directory
if (existsSync(WWW)) {
  rmSync(WWW, { recursive: true, force: true });
}
mkdirSync(WWW, { recursive: true });

// 2. Define frontend file patterns to copy
const allowedExtensions = ['.html', '.css', '.js', '.svg', '.webmanifest', '.json', '.jpg', '.png', '.ico'];
const excludedFiles = new Set([
  'server.mjs',
  'database.mjs',
  'seed-demo.mjs',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  'schema.sql'
]);
const excludedDirs = new Set([
  'node_modules',
  'android',
  'ios',
  'data',
  'scratch',
  '.git',
  '.gemini',
  'tests',
  'www',
  'scripts',
  'k8s'
]);

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    if (excludedFiles.has(entry) || excludedDirs.has(entry)) continue;
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase();
      if (allowedExtensions.includes(ext) || entry.endsWith('.mp4')) {
        cpSync(srcPath, destPath);
        console.log(`  Copied: ${entry}`);
      }
    }
  }
}

copyDir(ROOT, WWW);
console.log('Mobile web packaging complete in www/ directory.');

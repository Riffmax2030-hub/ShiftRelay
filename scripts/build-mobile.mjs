import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

const ROOT = resolve(process.cwd());
const WWW = resolve(ROOT, 'www');

console.log('Building mobile static package into www/...');

// 1. Recreate www directory
if (existsSync(WWW)) {
  rmSync(WWW, { recursive: true, force: true });
}
mkdirSync(WWW, { recursive: true });

// 2. Define frontend file patterns to copy
const allowedExtensions = ['.html', '.css', '.js', '.svg', '.webmanifest', '.json', '.jpg', '.png', '.gif', '.ico'];
const excludedFiles = new Set([
  'server.mjs',
  'database.mjs',
  'seed-demo.mjs',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  'schema.sql',
  'mcp.json',
  'railway.json',
  'render.yaml',
  'skills-lock.json',
  'design-tokens-starter.json'
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
  'k8s',
  'docs',
  'riffmax-brain',
  'visual-inspections',
  'visuals'
]);

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const isUploadsRoot = basename(src) === 'uploads';
  const entries = readdirSync(src);
  for (const entry of entries) {
    if (entry.startsWith('.') || excludedFiles.has(entry) || excludedDirs.has(entry)) continue;
    if (isUploadsRoot && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(entry)) continue;
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const ext = entry.includes('.') ? entry.slice(entry.lastIndexOf('.')).toLowerCase() : '';
      if (allowedExtensions.includes(ext)) {
        cpSync(srcPath, destPath);
        console.log(`  Copied: ${entry}`);
      }
    }
  }
}

copyDir(ROOT, WWW);
console.log('Mobile web packaging complete in www/ directory.');

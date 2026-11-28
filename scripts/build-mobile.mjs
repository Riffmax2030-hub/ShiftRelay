import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const WWW = resolve(ROOT, 'www');

console.log('Building slim mobile static package into www/...');

// 1. Recreate www directory
if (existsSync(WWW)) {
  rmSync(WWW, { recursive: true, force: true });
}
mkdirSync(WWW, { recursive: true });

// 2. Define frontend file patterns to copy (app-only assets; strip marketing/admin/brand-kit bloat)
const allowedExtensions = ['.html', '.css', '.js', '.svg', '.webmanifest', '.json', '.jpg', '.png', '.ico', '.woff2'];
const excludedFiles = new Set([
  'server.mjs',
  'database.mjs',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  'schema.sql',
  'railway.json',
  'render.yaml',
  'skills-lock.json',
  // Marketing / Admin / Public prospect pages (hosted on web, not needed inside native mobile APK)
  'admin.html',
  'website.html',
  'book-demo.html',
  'pricing.html',
  'calculator.html',
  'healthcare.html',
  'hospitality.html',
  'logistics.html',
  'manufacturing.html',
  'office.html',
  'shiftrelay.html',
  'status.html',
  'sla.html',
  'dpa.html',
  'acceptable-use.html',
  'cookies.html',
  'trust.html',
  'onboard.html',
  'activate.html',
  // Social / marketing launch banners
  'day1-payroll-leaks.png',
  'day2-nta2025-paye.png',
  'day3-dual-ledger-trap.png',
  'day4-zero-hardware.png'
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
  'visuals',
  'downloads',
  'ShiftRelay-Brand-Kit'
]);
const excludedRelPaths = new Set([
  'assets/site',
  'uploads/hero-workplace.jpg'
]);

let copiedCount = 0;
let copiedBytes = 0;

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const isUploadsRoot = basename(src) === 'uploads';
  const entries = readdirSync(src);
  for (const entry of entries) {
    if (entry.startsWith('.') || excludedFiles.has(entry) || excludedDirs.has(entry)) continue;
    if (isUploadsRoot && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(entry)) continue;
    const srcPath = join(src, entry);
    const relPath = relative(ROOT, srcPath).replace(/\\/g, '/');
    if (excludedRelPaths.has(relPath)) continue;
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const ext = entry.includes('.') ? entry.slice(entry.lastIndexOf('.')).toLowerCase() : '';
      if (allowedExtensions.includes(ext)) {
        cpSync(srcPath, destPath);
        copiedCount += 1;
        copiedBytes += stat.size;
      }
    }
  }
}

copyDir(ROOT, WWW);
// Bundle universal pure-JS QR decoder for offline/WebView Peer Check-In scanning
const jsqrSrc = join(ROOT, 'node_modules', 'jsqr', 'dist', 'jsQR.js');
if (existsSync(jsqrSrc)) {
  mkdirSync(join(WWW, 'vendor'), { recursive: true });
  cpSync(jsqrSrc, join(WWW, 'vendor', 'jsqr.js'));
  copiedCount += 1;
  copiedBytes += statSync(jsqrSrc).size;
}
console.log(`Mobile web packaging complete: ${copiedCount} files (${(copiedBytes / (1024 * 1024)).toFixed(2)} MB) in www/ directory.`);

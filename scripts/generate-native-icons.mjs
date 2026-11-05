import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());
const svgPath = join(ROOT, 'icon.svg');
const svgContent = readFileSync(svgPath, 'utf8');

// For Android adaptive foreground: transparent background with the fingerprint + keyhole lock centered
const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="100%" height="100%">
  <defs>
    <filter id="fgGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1AD079" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g transform="translate(54, 52) scale(0.48)" fill="none" stroke="#F0FDF4" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#fgGlow)">
    <path d="M -42 -38 C -28 -70, 28 -70, 44 -34 C 49 -20, 49 -4, 47 12" />
    <path d="M -48 -12 C -46 -38, -30 -56, -5 -58 C 22 -60, 36 -40, 36 -12 C 36 4, 34 16, 44 25" />
    <path d="M -48 4 C -32 2, -22 -10, -18 -28 C -14 -42, 0 -46, 12 -41 C 23 -36, 25 -20, 23 -2 C 21 14, 25 27, 41 34" />
    <path d="M -46 20 C -27 16, -12 2, -7 -20 C -3 -32, 11 -30, 12 -16 C 14 2, 11 20, 22 34" />
    <path d="M -41 34 C -22 29, -5 14, 0 -9" />
    <path d="M -16 25 C -5 20, 5 20, 16 29" />
    <path d="M -2 9 L 4 21" />
    <path d="M -39 46 C -23 34, -2 32, 11 41" />
    <path d="M -34 61 C -20 48, -3 48, 7 57" />
    <path d="M -23 73 C -12 64, -2 64, 5 71" />
    <g transform="translate(32, 55)" stroke="none">
      <circle cx="0" cy="0" r="26" fill="#1AD079" />
      <circle cx="0" cy="-5" r="7.5" fill="#041B14" />
      <path d="M -4.5 -1 L 4.5 -1 L 7.5 13 L -7.5 13 Z" fill="#041B14" />
    </g>
  </g>
</svg>`;

async function run() {
  console.log('Launching browser to render native app icons...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Helper to render HTML with SVG to buffer
  async function renderSvgToPng(svg, size, isRound = false) {
    await page.setViewportSize({ width: size, height: size });
    const html = `<!DOCTYPE html><html><head><style>
      body, html { margin: 0; padding: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
      ${isRound ? 'svg { border-radius: 50%; }' : ''}
    </style></head><body>${svg}</body></html>`;
    await page.setContent(html);
    return await page.screenshot({ type: 'png', omitBackground: true });
  }

  // 1. iOS AppIcon-512@2x.png (1024x1024)
  const iosPath = join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  const iosBuf = await renderSvgToPng(svgContent, 1024);
  writeFileSync(iosPath, iosBuf);
  console.log('Generated iOS 1024x1024 icon:', iosPath);

  // 2. Android Mipmap dimensions
  const androidSizes = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const s of androidSizes) {
    const targetDir = join(ROOT, 'android/app/src/main/res', s.dir);
    mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    const launcherBuf = await renderSvgToPng(svgContent, s.size);
    writeFileSync(join(targetDir, 'ic_launcher.png'), launcherBuf);

    // ic_launcher_round.png
    const roundBuf = await renderSvgToPng(svgContent, s.size, true);
    writeFileSync(join(targetDir, 'ic_launcher_round.png'), roundBuf);

    // ic_launcher_foreground.png
    const fgBuf = await renderSvgToPng(fgSvg, s.fgSize);
    writeFileSync(join(targetDir, 'ic_launcher_foreground.png'), fgBuf);

    console.log(`Generated Android ${s.dir} icons (${s.size}x${s.size}, fg ${s.fgSize}x${s.fgSize})`);
  }

  await browser.close();
  console.log('All native icons generated successfully!');
}

run().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

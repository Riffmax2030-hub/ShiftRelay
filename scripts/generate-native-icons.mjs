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

  // 3. Branded Dark-Green Native Splash Screens (Android 11 densities + iOS 2732x2732)
  async function renderSplashPng(width, height) {
    await page.setViewportSize({ width, height });
    const minSide = Math.min(width, height);
    const iconPx = Math.round(Math.max(76, Math.min(minSide * 0.24, 340)));
    const wordmarkW = Math.round(iconPx * 1.9);
    const wordmarkH = Math.round(wordmarkW * (24 / 142));
    const tagPx = Math.max(9, Math.round(iconPx * 0.105));
    const gapPx = Math.max(12, Math.round(iconPx * 0.18));
    const html = `<!DOCTYPE html><html><head><style>
      html, body {
        margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden;
        background: radial-gradient(circle at 50% 42%, #0A3828 0%, #041B14 58%, #02100C 100%);
        display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .stage { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${gapPx}px; }
      .icon-box { width: ${iconPx}px; height: ${iconPx}px; border-radius: ${Math.round(iconPx * 0.22)}px; overflow: hidden; box-shadow: 0 ${Math.round(iconPx * 0.14)}px ${Math.round(iconPx * 0.34)}px rgba(0, 0, 0, 0.45); }
      .tag { color: rgba(209, 250, 229, 0.72); font-size: ${tagPx}px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }
    </style></head><body>
      <div class="stage">
        <div class="icon-box">${svgContent}</div>
        <svg width="${wordmarkW}" height="${wordmarkH}" viewBox="0 0 160 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="80" y="19" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="19" font-weight="800" letter-spacing="0.08em">
            <tspan fill="#1AD079">SHIFT</tspan><tspan fill="#ECFDF5">RELAY</tspan>
          </text>
        </svg>
        <div class="tag">ENTERPRISE WORKFORCE PLATFORM</div>
      </div>
    </body></html>`;
    await page.setContent(html);
    return await page.screenshot({ type: 'png' });
  }

  const androidSplashes = [
    { dir: 'drawable', w: 480, h: 320 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 }
  ];
  for (const sp of androidSplashes) {
    const outPath = join(ROOT, 'android/app/src/main/res', sp.dir, 'splash.png');
    mkdirSync(join(ROOT, 'android/app/src/main/res', sp.dir), { recursive: true });
    writeFileSync(outPath, await renderSplashPng(sp.w, sp.h));
    console.log(`Generated Android ${sp.dir}/splash.png (${sp.w}x${sp.h})`);
  }

  const iosSplashBuf = await renderSplashPng(2732, 2732);
  for (const fname of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    const outPath = join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset', fname);
    writeFileSync(outPath, iosSplashBuf);
    console.log(`Generated iOS Splash.imageset/${fname} (2732x2732)`);
  }

  await browser.close();
  console.log('All native icons and splash screens generated successfully!');
}

run().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

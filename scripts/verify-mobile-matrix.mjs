import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SAVE_SCREENSHOTS = process.argv.includes('--screenshots');
const SCREENSHOT_DIR = resolve(process.cwd(), 'visual-inspections', 'mobile-matrix');
if (SAVE_SCREENSHOTS) mkdirSync(SCREENSHOT_DIR, { recursive: true });

export const MOBILE_DEVICES = [
  { id: 'iphone-se-320', label: 'iPhone SE 1st Gen (320x568)', width: 320, height: 568, dpr: 2, platform: 'iOS' },
  { id: 'android-360', label: 'Android Compact 360 (Galaxy S8/A14/Tecno/Redmi)', width: 360, height: 740, dpr: 3, platform: 'Android' },
  { id: 'iphone-8-375', label: 'iPhone 8 / SE2-3 (375x667)', width: 375, height: 667, dpr: 2, platform: 'iOS' },
  { id: 'iphone-15-390', label: 'iPhone 13/14/15/16 (390x844)', width: 390, height: 844, dpr: 3, platform: 'iOS' },
  { id: 'android-412', label: 'Pixel 7/8 & Galaxy S23/S24 (412x915)', width: 412, height: 915, dpr: 2.625, platform: 'Android' },
  { id: 'iphone-promax-430', label: 'iPhone 15/16 Pro Max (430x932)', width: 430, height: 932, dpr: 3, platform: 'iOS' },
  { id: 'android-large-480', label: 'Large Android Phablet (480x854)', width: 480, height: 854, dpr: 2, platform: 'Android' },
  { id: 'foldable-600', label: 'Foldable / Wide Mobile (600x800)', width: 600, height: 800, dpr: 2, platform: 'Android' }
];

async function pickPort() {
  return new Promise((res) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });
}

async function waitHealth(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${url}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server health check timed out');
}

async function inspectAppViewport(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sw = document.documentElement.scrollWidth;

    const header = document.querySelector('#sr-app-shell .sr-header');
    const brand = document.querySelector('#sr-app-shell .sr-brand-link');
    const headerRight = document.querySelector('#sr-app-shell .sr-header-right');
    const headerRect = header ? header.getBoundingClientRect() : null;
    const brandRect = brand ? brand.getBoundingClientRect() : null;
    const rightRect = headerRight ? headerRight.getBoundingClientRect() : null;
    const headerOverlap = Boolean(brandRect && rightRect && brandRect.right > rightRect.left + 2);
    const headerClipped = Boolean((headerRect && headerRect.right > vw + 2) || (rightRect && rightRect.right > vw + 2));

    const dock = document.querySelector('#sr-app-shell .sr-mobile-dock');
    const dockRect = dock ? dock.getBoundingClientRect() : null;
    const dockItems = Array.from(document.querySelectorAll('#sr-app-shell .sr-mobile-dock .sr-dock-item')).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        view: el.dataset.srView || '',
        text: el.textContent.trim().replace(/\s+/g, ' '),
        w: Math.round(r.width),
        h: Math.round(r.height),
        left: Math.round(r.left),
        right: Math.round(r.right),
        visible: r.width >= 36 && r.height >= 36 && r.left >= -1 && r.right <= vw + 2 && r.bottom <= vh + 2
      };
    });

    const overflows = [];
    const scrollContainers = ['.sr-v2-table-wrap', '.sr-table-scroll', '.sr-v2-week-strip', '.week-date-carousel', '.sr-notif-categories', '.sr-dnd-staff-dock', '.sr-tabs-header', '.sr-v2-tabs'];
    function insideHorizontalScroller(el) {
      if (el.closest(scrollContainers.join(','))) return true;
      let cur = el.parentElement;
      while (cur && cur !== document.body) {
        const cs = window.getComputedStyle(cur);
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && cur.getBoundingClientRect().right <= vw + 3) {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    }
    document.querySelectorAll('#sr-app-shell *').forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
      if (insideHorizontalScroller(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > vw + 3) {
        overflows.push({
          tag: el.tagName,
          id: el.id || '',
          cls: String(el.className || '').slice(0, 60),
          right: Math.round(r.right),
          vw
        });
      }
    });

    return {
      vw,
      vh,
      sw,
      hasHorizontalOverflow: sw > vw + 1,
      headerOverlap,
      headerClipped,
      headerRightEdge: rightRect ? Math.round(rightRect.right) : 0,
      dockVisible: Boolean(dockRect && dockRect.width > 0 && dockRect.height > 0 && dockRect.bottom <= vh + 2),
      dockCount: dockItems.length,
      allDockTabsVisible: dockItems.length >= 4 && dockItems.every((d) => d.visible),
      dockItems,
      overflowCount: overflows.length,
      sampleOverflows: overflows.slice(0, 5)
    };
  });
}

async function inspectPublicPage(page, checkStoreButtons = false) {
  return page.evaluate((checkStore) => {
    const vw = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    const clippedButtons = [];
    document.querySelectorAll('a, button').forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > vw + 3 && !el.closest('.marquee-viewport')) {
        clippedButtons.push({ text: el.textContent.trim().slice(0, 32), right: Math.round(r.right), vw });
      }
    });
    let apkButtonOk = true;
    if (checkStore) {
      const apkBtn = document.getElementById('sr-hero-apk-btn');
      const r = apkBtn ? apkBtn.getBoundingClientRect() : null;
      apkButtonOk = Boolean(apkBtn && r && r.width > 120 && r.height > 36 && r.right <= vw + 2);
    }
    return { vw, sw, hasHorizontalOverflow: sw > vw + 1, clippedButtons: clippedButtons.slice(0, 5), apkButtonOk };
  }, checkStoreButtons);
}

const port = await pickPort();
const base = `http://127.0.0.1:${port}`;
const srv = spawn(process.execPath, ['server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'development',
    DATABASE_URL: '',
    ALLOW_DEV_FALLBACK: 'true',
    ALLOW_DEV_DEMO_AUTH: 'true'
  },
  stdio: 'ignore'
});

let failures = [];

try {
  await waitHealth(base);

  // Verify APK Release Metadata + Binary Download Endpoint
  const metaRes = await fetch(`${base}/api/app/apk-release`);
  const metaJson = await metaRes.json();
  const apkHead = await fetch(`${base}/download/apk`, { method: 'HEAD' });
  const apkCt = apkHead.headers.get('content-type') || '';
  const apkDisp = apkHead.headers.get('content-disposition') || '';
  const apkOk = metaRes.ok && metaJson.available && apkHead.ok && apkCt.includes('vnd.android.package-archive') && apkDisp.includes('.apk');
  console.log(`[APK Release Check] ${apkOk ? 'PASS' : 'FAIL'} version=${metaJson.version} size=${metaJson.sizeLabel} ct=${apkCt} disp=${apkDisp}`);
  if (!apkOk) failures.push({ device: 'server', view: 'apk-release', detail: { metaJson, status: apkHead.status, apkCt, apkDisp } });

  const browser = await chromium.launch({ headless: true });

  for (const dev of MOBILE_DEVICES) {
    console.log(`\n=== ${dev.label} [${dev.platform}] ===`);
    const ua = dev.platform === 'iOS'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

    const ctxOpts = {
      viewport: { width: dev.width, height: dev.height },
      deviceScaleFactor: dev.dpr,
      isMobile: true,
      hasTouch: true,
      userAgent: ua
    };

    // 1. Public pages (Website Landing + Sign-In)
    {
      const ctx = await browser.newContext(ctxOpts);
      const page = await ctx.newPage();
      await page.goto(`${base}/website.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const webRes = await inspectPublicPage(page, true);
      const webOk = !webRes.hasHorizontalOverflow && webRes.clippedButtons.length === 0 && webRes.apkButtonOk;
      console.log(`  [website]  ${webOk ? 'PASS' : 'FAIL'} sw=${webRes.sw}/${webRes.vw} apkBtn=${webRes.apkButtonOk} clippedBtns=${webRes.clippedButtons.length}`, webRes.clippedButtons.length ? JSON.stringify(webRes.clippedButtons) : '');
      if (!webOk) failures.push({ device: dev.id, view: 'website', detail: webRes });
      if (SAVE_SCREENSHOTS) await page.screenshot({ path: resolve(SCREENSHOT_DIR, `${dev.id}-website.png`) });

      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const loginRes = await inspectPublicPage(page, false);
      const loginOk = !loginRes.hasHorizontalOverflow && loginRes.clippedButtons.length === 0;
      console.log(`  [signin]   ${loginOk ? 'PASS' : 'FAIL'} sw=${loginRes.sw}/${loginRes.vw} clippedBtns=${loginRes.clippedButtons.length}`);
      if (!loginOk) failures.push({ device: dev.id, view: 'signin', detail: loginRes });
      await ctx.close();
    }

    // 2. Isolated context per role (Worker & Executive)
    async function testRole(roleName, email, password) {
      const ctx = await browser.newContext(ctxOpts);
      const page = await ctx.newPage();
      // Abort persistent SSE stream during layout audit so HTTP/1.1 sockets never stall across 24 contexts
      await page.route('**/api/events*', (route) => route.abort());
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async ({ email, password }) => {
        await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: 'RIF-2026', email, password })
        });
      }, { email, password });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#sr-app-shell .sr-mobile-dock .sr-dock-item', { timeout: 15000 });
      await page.waitForTimeout(800);

      const views = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#sr-app-shell .sr-mobile-dock .sr-dock-item')).map((el) => el.dataset.srView)
      );

      for (let i = 0; i < views.length; i++) {
        const viewName = views[i];
        if (i > 0) {
          const btn = page.locator(`#sr-app-shell .sr-mobile-dock .sr-dock-item[data-sr-view="${viewName}"]`).first();
          await btn.click();
          await page.waitForTimeout(550);
        }
        const res = await inspectAppViewport(page);
        const ok = !res.hasHorizontalOverflow && !res.headerOverlap && !res.headerClipped && res.dockVisible && res.allDockTabsVisible && res.overflowCount === 0;
        console.log(
          `  [${roleName}:${viewName}] ${ok ? 'PASS' : 'FAIL'} sw=${res.sw}/${res.vw} hdrClip=${res.headerClipped} hdrOvlp=${res.headerOverlap} dock=${res.dockCount}(allVis=${res.allDockTabsVisible}) ovf=${res.overflowCount}` +
          (res.overflowCount ? ` ${JSON.stringify(res.sampleOverflows)}` : '') +
          (!res.allDockTabsVisible ? ` DOCK=${JSON.stringify(res.dockItems)}` : '')
        );
        if (!ok) failures.push({ device: dev.id, view: `${roleName}:${viewName}`, detail: res });
        if (SAVE_SCREENSHOTS && (i === 0 || !ok)) {
          await page.screenshot({ path: resolve(SCREENSHOT_DIR, `${dev.id}-${roleName}-${viewName}.png`) });
        }
      }
      await ctx.close();
    }

    await testRole('worker', 'babatunde@riffmax.tech', 'Riffmax2026!');
    await testRole('exec', 'sherif@riffmax.tech', 'Iamgreat@2030');
  }

  await browser.close();
} finally {
  srv.kill('SIGTERM');
}

console.log('\n================================================');
if (failures.length === 0) {
  console.log(`ALL ${MOBILE_DEVICES.length} ANDROID & APPLE PHONE SIZES + APK DOWNLOAD PASSED 100% (0 FAILURES)!`);
  process.exit(0);
} else {
  console.log(`FOUND ${failures.length} RESPONSIVE ISSUE(S) ACROSS DEVICE MATRIX.`);
  process.exit(1);
}

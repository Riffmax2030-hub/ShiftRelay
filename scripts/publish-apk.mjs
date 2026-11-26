import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const GRADLE_PATH = resolve(ROOT, 'android', 'app', 'build.gradle');
const RELEASE_APK = resolve(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const DEBUG_APK = resolve(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const DOWNLOADS_DIR = resolve(ROOT, 'downloads');
const TARGET_APK = resolve(DOWNLOADS_DIR, 'shiftrelay-latest.apk');
const META_PATH = resolve(DOWNLOADS_DIR, 'release-meta.json');

const useDebug = process.argv.includes('--debug');
const sourceApk = useDebug ? DEBUG_APK : (existsSync(RELEASE_APK) ? RELEASE_APK : DEBUG_APK);

if (!existsSync(sourceApk)) {
  console.error('No built APK found at:', sourceApk);
  console.error('Run Android Gradle assembleRelease first (cd android && .\\gradlew assembleRelease).');
  process.exit(1);
}

let versionName = '2.0.2';
let versionCode = 202;
if (existsSync(GRADLE_PATH)) {
  const gradleText = readFileSync(GRADLE_PATH, 'utf8');
  const vnMatch = gradleText.match(/versionName\s+"([^"]+)"/);
  const vcMatch = gradleText.match(/versionCode\s+(\d+)/);
  if (vnMatch) versionName = vnMatch[1].trim();
  if (vcMatch) versionCode = Number(vcMatch[1]);
}

mkdirSync(DOWNLOADS_DIR, { recursive: true });
copyFileSync(sourceApk, TARGET_APK);

const stat = statSync(TARGET_APK);
const sha256 = createHash('sha256').update(readFileSync(TARGET_APK)).digest('hex');
const sizeLabel = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
const fileName = `ShiftRelay-v${versionName}.apk`;

const meta = {
  appName: 'ShiftRelay',
  packageId: 'com.shiftrelayos.app',
  version: versionName,
  versionCode,
  buildType: sourceApk === RELEASE_APK ? 'release' : 'debug',
  fileName,
  sizeBytes: stat.size,
  sizeLabel,
  sha256,
  updatedAt: new Date().toISOString(),
  downloadUrl: '/download/apk',
  releaseNotes: 'Universal Android & Apple mobile screen optimization (320px–767px), 5-tab locked bottom dock, and verified shift & payroll OS.'
};

writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + '\n', 'utf8');
console.log(`Published ${fileName} (${sizeLabel}, versionCode ${versionCode}) -> downloads/shiftrelay-latest.apk`);
console.log(`SHA-256: ${sha256}`);

/**
 * Generates iOS app icon and splash screen assets from the DFS logo.
 * Run with: node scripts/generate-ios-assets.mjs
 */

import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const logoPath = join(root, 'public', 'Delaware Fence Logo.png');
const iconDir = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const splashDir = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');

// ── App Icon: 1024×1024, white background, logo centered with padding ──────
async function generateAppIcon() {
  const size = 1024;
  const padding = 160; // ~15% padding on each side
  const logoSize = size - padding * 2;

  const logoResized = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'inside', background: '#ffffff' })
    .png()
    .toBuffer();

  const { width: lw, height: lh } = await sharp(logoResized).metadata();
  const left = Math.round((size - lw) / 2);
  const top = Math.round((size - lh) / 2);

  await sharp({
    create: { width: size, height: size, channels: 3, background: '#ffffff' },
  })
    .composite([{ input: logoResized, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(join(iconDir, 'AppIcon-512@2x.png'));

  console.log('✓ App icon generated (1024×1024)');
}

// ── Splash Screen: 2732×2732, white background, logo centered ─────────────
async function generateSplash(outputName) {
  const size = 2732;
  const logoWidth = 1600; // fits comfortably in all orientations

  const logoResized = await sharp(logoPath)
    .resize(logoWidth, null, { fit: 'inside', background: '#ffffff' })
    .png()
    .toBuffer();

  const { width: lw, height: lh } = await sharp(logoResized).metadata();
  const left = Math.round((size - lw) / 2);
  const top = Math.round((size - lh) / 2);

  await sharp({
    create: { width: size, height: size, channels: 3, background: '#ffffff' },
  })
    .composite([{ input: logoResized, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(join(splashDir, outputName));

  console.log(`✓ Splash screen generated: ${outputName}`);
}

// ── Run ───────────────────────────────────────────────────────────────────
console.log('Generating iOS assets from Delaware Fence Logo.png...\n');

await generateAppIcon();
await generateSplash('splash-2732x2732.png');
await generateSplash('splash-2732x2732-1.png');
await generateSplash('splash-2732x2732-2.png');

console.log('\nDone! Assets written to ios/App/App/Assets.xcassets/');

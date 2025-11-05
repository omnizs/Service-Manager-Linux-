const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = typeof pngToIcoModule === 'function' ? pngToIcoModule : pngToIcoModule.default;

const ROOT = path.resolve(__dirname, '..');
const RESOURCES_DIR = path.resolve(ROOT, 'resources');
const ICON_BASE_NAME = 'icon';
const PNG_SIZES = [512, 256, 128, 64, 48, 32, 16];

const svgTemplate = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="backup" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect x="28" y="28" width="456" height="456" rx="112" fill="url(#bg)"/>
  <g filter="url(#shadow)">
    <!-- Main gear/cog for services -->
    <path fill="#ffffff" d="M256 120c-8 0-16 8-16 16v8c-16 4-28 12-40 24l-8-4c-8-4-16 0-20 8l-16 28c-4 8 0 16 8 20l8 4c-4 16-4 32 0 48l-8 4c-8 4-12 12-8 20l16 28c4 8 12 12 20 8l8-4c12 12 24 20 40 24v8c0 8 8 16 16 16h32c8 0 16-8 16-16v-8c16-4 28-12 40-24l8 4c8 4 16 0 20-8l16-28c4-8 0-16-8-20l-8-4c4-16 4-32 0-48l8-4c8-4 12-12 8-20l-16-28c-4-8-12-12-20-8l-8 4c-12-12-24-20-40-24v-8c0-8-8-16-16-16h-32zm16 76c26 0 48 22 48 48s-22 48-48 48-48-22-48-48 22-48 48-48z"/>
    <!-- Backup/Database icon -->
    <g fill="url(#backup)">
      <ellipse cx="360" cy="320" rx="80" ry="28"/>
      <path d="M280 320v48c0 16 36 28 80 28s80-12 80-28v-48c-16 12-48 20-80 20s-64-8-80-20z"/>
      <path d="M280 368v48c0 16 36 28 80 28s80-12 80-28v-48c-16 12-48 20-80 20s-64-8-80-20z"/>
    </g>
    <!-- Small circular arrow for backup/restore -->
    <path fill="#ffffff" d="M364 306v-12l-16 12 16 12v-12c12 0 20 8 20 20s-8 20-20 20v8c16 0 28-12 28-28s-12-28-28-28z" opacity="0.9"/>
  </g>
</svg>`;

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generatePng(size) {
  const svg = svgTemplate(size);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const filePath = path.join(RESOURCES_DIR, `${ICON_BASE_NAME}-${size}.png`);
  await fs.promises.writeFile(filePath, buffer);
  return { size, buffer, filePath };
}

async function main() {
  await ensureDir(RESOURCES_DIR);

  const variants = await Promise.all(PNG_SIZES.map((size) => generatePng(size)));

  // Use the largest size as the primary PNG icon
  const primary = variants.find((v) => v.size === 512) || variants[0];
  if (primary) {
    const primaryPath = path.join(RESOURCES_DIR, `${ICON_BASE_NAME}.png`);
    await fs.promises.copyFile(primary.filePath, primaryPath);
  }

  // Build ICO from all size buffers (descending order recommended)
  const icoVariants = variants
    .filter((variant) => variant.size <= 256)
    .sort((a, b) => b.size - a.size);
  const icoBuffer = await pngToIco(icoVariants.map((v) => v.buffer));
  await fs.promises.writeFile(path.join(RESOURCES_DIR, `${ICON_BASE_NAME}.ico`), icoBuffer);

  // Clean up intermediate files except primary and ICO
  await Promise.all(
    variants
      .map((variant) => variant.filePath)
      .filter((filePath) => path.basename(filePath) !== 'icon-512.png')
      .map((filePath) => fs.promises.unlink(filePath).catch(() => undefined))
  );

  console.log('[icons] Generated application icons');
}

main().catch((error) => {
  console.error('[icons] Failed to generate application icons', error);
  process.exit(1);
});


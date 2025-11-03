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
      <stop offset="0%" stop-color="#0f4c75"/>
      <stop offset="100%" stop-color="#1b262c"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8dff9c"/>
      <stop offset="100%" stop-color="#2fbf71"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect x="28" y="28" width="456" height="456" rx="112" fill="url(#bg)"/>
  <g filter="url(#shadow)">
    <path fill="#E6EEF5" d="M190 120c26-26 68-26 94 0l32 32-34 34-18-18c-6-6-16-6-22 0l-24 24c-6 6-6 16 0 22l56 56c26 26 26 68 0 94l-32 32c-26 26-68 26-94 0l-32-32 34-34 18 18c6 6 16 6 22 0l24-24c6-6 6-16 0-22l-56-56c-26-26-26-68 0-94l32-32z"/>
    <path fill="#ffffff" d="M226 298l128-128 48 48-128 128c-6 6-16 6-22 0l-26-26c-6-6-6-16 0-22z"/>
    <circle cx="322" cy="186" r="28" fill="#ffffff"/>
    <path fill="url(#accent)" d="M302 82l120 120-46 46-22-22-38 38-44-44 38-38-22-22z"/>
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


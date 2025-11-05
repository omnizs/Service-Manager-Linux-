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
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background rounded square -->
  <rect x="0" y="0" width="512" height="512" rx="100" fill="url(#bgGradient)"/>
  
  <!-- Service grid icon (representing multiple services) -->
  <g filter="url(#shadow)">
    <!-- Top left service block -->
    <rect x="100" y="100" width="80" height="80" rx="12" fill="url(#primaryGradient)" opacity="0.9"/>
    
    <!-- Top right service block -->
    <rect x="220" y="100" width="80" height="80" rx="12" fill="url(#primaryGradient)" opacity="0.9"/>
    
    <!-- Bottom left service block -->
    <rect x="100" y="220" width="80" height="80" rx="12" fill="url(#primaryGradient)" opacity="0.7"/>
    
    <!-- Bottom right service block -->
    <rect x="220" y="220" width="80" height="80" rx="12" fill="url(#primaryGradient)" opacity="0.7"/>
    
    <!-- Center accent - active/running indicator -->
    <circle cx="340" cy="260" r="70" fill="url(#accentGradient)"/>
    <path d="M 320 260 L 360 240 L 360 280 Z" fill="#ffffff" opacity="0.95"/>
  </g>
  
  <!-- Subtle grid lines connecting blocks -->
  <line x1="140" y1="180" x2="140" y2="220" stroke="#60a5fa" stroke-width="3" opacity="0.4"/>
  <line x1="260" y1="180" x2="260" y2="220" stroke="#60a5fa" stroke-width="3" opacity="0.4"/>
  <line x1="180" y1="140" x2="220" y2="140" stroke="#60a5fa" stroke-width="3" opacity="0.4"/>
  <line x1="180" y1="260" x2="220" y2="260" stroke="#60a5fa" stroke-width="3" opacity="0.4"/>
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


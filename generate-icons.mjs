import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, 'limina-icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const targets = [
  // Desktop app
  { path: 'desktop-app/public/icon.png', size: 512 },
  { path: 'desktop-app/dist/icon.png', size: 512 },
  { path: 'desktop-app/build/installer-icon.png', size: 256 },
  // Chrome extension
  { path: 'chrome-extension/assets/icon.png', size: 128 },
  // Landing page
  { path: 'landing-page/public/assets/limina-icon-cyan.png', size: 512 },
  { path: 'landing-page/src/app/icon.png', size: 180 },
  // Web dashboard
  { path: 'web-dashboard/public/assets/limina-icon-cyan.png', size: 512 },
  { path: 'web-dashboard/src/app/icon.png', size: 180 },
];

for (const target of targets) {
  const outPath = path.join(__dirname, target.path);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await sharp(svgBuffer, { density: 300 })
    .resize(target.size, target.size)
    .png()
    .toFile(outPath);

  console.log(`✓ ${target.path} (${target.size}x${target.size})`);
}

console.log('\nDone! Now generating ICO...');

// Generate ICO using png-to-ico
const pngToIco = (await import('png-to-ico')).default;
const pngBuf = fs.readFileSync(path.join(__dirname, 'desktop-app/build/installer-icon.png'));
const icoBuf = await pngToIco(pngBuf);
fs.writeFileSync(path.join(__dirname, 'desktop-app/build/icon.ico'), icoBuf);
console.log('✓ desktop-app/build/icon.ico');

console.log('\nAll icons generated!');

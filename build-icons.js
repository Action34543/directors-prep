// One-time script: converts assets/icon.svg → assets/icon.png + assets/icon.ico
const sharp    = require('sharp');
const pngToIco = require('png-to-ico');
const fs       = require('fs');
const path     = require('path');

const svg  = path.join(__dirname, 'assets', 'icon.svg');
const png  = path.join(__dirname, 'assets', 'icon.png');
const ico  = path.join(__dirname, 'assets', 'icon.ico');

async function run() {
  // 1. Render SVG → 1024×1024 PNG (high-res master)
  await sharp(svg).resize(1024, 1024).png().toFile(png);
  console.log('✓ icon.png (1024×1024)');

  // 2. Build ICO from multiple sizes (Windows needs 16, 32, 48, 256)
  const sizes = [16, 32, 48, 256];
  const buffers = await Promise.all(
    sizes.map(s => sharp(svg).resize(s, s).png().toBuffer())
  );
  const icoBuf = await pngToIco(buffers);
  fs.writeFileSync(ico, icoBuf);
  console.log('✓ icon.ico (16/32/48/256)');
}

run().catch(e => { console.error(e); process.exit(1); });

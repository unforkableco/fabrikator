const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
  favicon: [16, 32, 48, 64],
  logo192: 192,
  logo512: 512
};

async function generateIcons() {
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/logo.svg'));
  
  // Generate favicon.ico
  const faviconBuffers = await Promise.all(
    sizes.favicon.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .toBuffer()
    )
  );
  
  await sharp(faviconBuffers[0])
    .joinChannel(faviconBuffers[1])
    .joinChannel(faviconBuffers[2])
    .joinChannel(faviconBuffers[3])
    .toFile(path.join(__dirname, '../public/favicon.ico'));
  
  // Generate logo192.png
  await sharp(svgBuffer)
    .resize(sizes.logo192, sizes.logo192)
    .png()
    .toFile(path.join(__dirname, '../public/logo192.png'));
  
  // Generate logo512.png
  await sharp(svgBuffer)
    .resize(sizes.logo512, sizes.logo512)
    .png()
    .toFile(path.join(__dirname, '../public/logo512.png'));
}

generateIcons().catch(console.error); 
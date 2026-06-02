import Jimp from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const icon = await Jimp.read(path.join(__dirname, 'public/icon.png'));
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  
  const width = icon.bitmap.width;
  const height = icon.bitmap.height;
  
  // Banner occupies bottom 20%
  const bannerHeight = Math.floor(height * 0.2);
  const bannerY = height - bannerHeight;
  
  // Create a dark banner with rounded corners conceptually
  // We'll just draw it where the original icon has opacity
  icon.scan(0, bannerY, width, bannerHeight, function (x, y, idx) {
    if (this.bitmap.data[idx + 3] > 10) {
      this.bitmap.data[idx + 0] = 30; // R
      this.bitmap.data[idx + 1] = 30; // G
      this.bitmap.data[idx + 2] = 30; // B
      this.bitmap.data[idx + 3] = 255; // Alpha
    }
  });

  const text = "SETUP";
  const textWidth = Jimp.measureText(font, text);
  const textHeight = Jimp.measureTextHeight(font, text, width);
  
  icon.print(
    font,
    Math.floor((width - textWidth) / 2),
    bannerY + Math.floor((bannerHeight - textHeight) / 2),
    text
  );

  await icon.writeAsync(path.join(__dirname, 'build/installer-icon.png'));
  console.log("Successfully created transparent installer-icon.png");
}

main().catch(console.error);

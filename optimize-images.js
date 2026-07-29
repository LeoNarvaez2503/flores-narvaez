const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'Fotos', 'myairbridge-Rf0k2JifzUx', 'Fotos');
const OUTPUT_DIR = path.join(__dirname, 'assets', 'frames');
const FRAME_STEP = 3; // Take every 3rd frame for smoother scroll
const TARGET_WIDTH = 1280;
const QUALITY = 80;

async function optimizeImages() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get all source files sorted
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.jpg'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)[1]);
      const numB = parseInt(b.match(/(\d+)/)[1]);
      return numA - numB;
    });

  console.log(`Total source frames: ${files.length}`);

  // Select every Nth frame
  const selectedFiles = files.filter((_, i) => i % FRAME_STEP === 0);
  console.log(`Selected frames (every ${FRAME_STEP}th): ${selectedFiles.length}`);

  let processed = 0;
  const batchSize = 10;

  for (let i = 0; i < selectedFiles.length; i += batchSize) {
    const batch = selectedFiles.slice(i, i + batchSize);
    await Promise.all(batch.map(async (file, batchIdx) => {
      const frameIndex = i + batchIdx;
      const inputPath = path.join(SOURCE_DIR, file);
      const outputName = `frame-${String(frameIndex).padStart(4, '0')}.webp`;
      const outputPath = path.join(OUTPUT_DIR, outputName);

      try {
        await sharp(inputPath)
          .resize(TARGET_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(outputPath);

        processed++;
        if (processed % 20 === 0) {
          console.log(`Processed ${processed}/${selectedFiles.length} frames...`);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }));
  }

  console.log(`\n✅ Done! ${processed} optimized frames saved to ${OUTPUT_DIR}`);
  console.log(`Frame naming: frame-0000.webp to frame-${String(selectedFiles.length - 1).padStart(4, '0')}.webp`);
}

optimizeImages().catch(console.error);

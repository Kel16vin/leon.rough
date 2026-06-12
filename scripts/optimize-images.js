const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const sharp = require('sharp');

const images = [
  {
    url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&q=80&w=1200',
    name: 'project1'
  },
  {
    url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1200',
    name: 'project2'
  },
  {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=1200',
    name: 'project3'
  },
  {
    url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=1200',
    name: 'project4'
  }
];

(async () => {
  const outDir = path.join(__dirname, '..', 'images', 'optimized');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const img of images) {
    try {
      console.log('Downloading', img.url);
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`Failed to fetch ${img.url}`);
      const buffer = await res.buffer();

      const outJpg = path.join(outDir, `${img.name}.jpg`);
      // Resize to 1200 width, convert to progressive jpeg with moderate quality
      await sharp(buffer)
        .resize({ width: 1200 })
        .jpeg({ quality: 70, progressive: true, mozjpeg: true })
        .toFile(outJpg);

      // Also create a smaller webp variant
      const outWebp = path.join(outDir, `${img.name}.webp`);
      await sharp(buffer)
        .resize({ width: 800 })
        .webp({ quality: 60 })
        .toFile(outWebp);

      console.log('Saved', outJpg, 'and', outWebp);
    } catch (err) {
      console.error('Error processing', img.url, err);
    }
  }

  console.log('Done. Optimized images are in images/optimized');
})();

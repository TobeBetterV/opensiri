import { fileURLToPath } from "node:url";
import sharp from "sharp";

const assets = [
  ["../public/opensiri-logo-color.png", "../public/opensiri-logo-color-v2.png"],
  ["../public/opensiri-logo-mono.png", "../public/opensiri-logo-monochrome-v2.png"],
];

await Promise.all(
  assets.map(async ([source, destination]) => {
    const sourcePath = fileURLToPath(new URL(source, import.meta.url));
    const destinationPath = fileURLToPath(new URL(destination, import.meta.url));

    await sharp(sourcePath)
      .resize(1024, 1024, { fit: "contain" })
      .png({ compressionLevel: 9 })
      .toFile(destinationPath);
  }),
);

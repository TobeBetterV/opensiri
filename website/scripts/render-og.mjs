import { rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const sourcePath = fileURLToPath(new URL("../public/og.png", import.meta.url));
const colorLogoPath = fileURLToPath(new URL("../public/opensiri-logo-color.png", import.meta.url));
const appIconPath = fileURLToPath(new URL("../public/opensiri-app-icon.png", import.meta.url));
const outputPath = fileURLToPath(new URL("../public/og.next.png", import.meta.url));

const appIcon = await sharp(appIconPath)
  .trim()
  .resize(92, 92, { fit: "contain" })
  .png()
  .toBuffer();

const replyLogo = await sharp(colorLogoPath)
  .trim()
  .resize(26, 26, { fit: "contain" })
  .png()
  .toBuffer();

const logoPlate = Buffer.from(`
  <svg width="118" height="118" xmlns="http://www.w3.org/2000/svg">
    <rect width="118" height="118" rx="28" fill="#fbfaf7"/>
  </svg>
`);

const replyPlate = Buffer.from(`
  <svg width="38" height="38" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="38" fill="#fbfaf7"/>
  </svg>
`);

const replyMarks = [211, 295, 387].flatMap((top) => [
  { input: replyPlate, left: 960, top },
  { input: replyLogo, left: 966, top: top + 6 },
]);

await sharp(sourcePath)
  .resize(1200, 630, { fit: "fill" })
  .composite([
    { input: logoPlate, left: 77, top: 126 },
    { input: appIcon, left: 90, top: 139 },
    ...replyMarks,
  ])
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

await rename(outputPath, sourcePath);

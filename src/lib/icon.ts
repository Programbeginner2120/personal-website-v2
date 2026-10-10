import path from 'node:path';
import sharp from 'sharp';

// The site icon is cut from the same photo as the hero portrait.
const SOURCE = path.join(process.cwd(), 'src/assets/Portrait.jpg');

/**
 * Square crop around the face, in pixels of the source photo (750 × 1334).
 * Adjust if you swap the photo: left/top move the square, size zooms in or out.
 */
const FACE = { left: 90, top: 285, size: 560 };

/** Renders the portrait icon as a PNG. `round` cuts it into a circle with a transparent background. */
export async function portraitIcon(px: number, { round }: { round: boolean }): Promise<Uint8Array<ArrayBuffer>> {
  const square = sharp(SOURCE)
    .extract({ left: FACE.left, top: FACE.top, width: FACE.size, height: FACE.size })
    .resize(px, px);

  if (!round) return new Uint8Array(await square.png().toBuffer());

  const circle = Buffer.from(
    `<svg width="${px}" height="${px}"><circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}" /></svg>`,
  );
  // dest-in keeps the photo only where the circle is drawn
  const png = await square.composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
  return new Uint8Array(png);
}

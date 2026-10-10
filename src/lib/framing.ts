import type { Photo } from '@/types/site';

/**
 * Turns a photo's `position` ("x y") and `zoom` into CSS custom properties
 * read by the `.framed-img` utility in global.css.
 */
export function framingStyle({ position, zoom }: Pick<Photo, 'position' | 'zoom'>): Record<string, string> {
  const [x = '50%', y = '50%'] = (position ?? '').trim().split(/\s+/).filter(Boolean);
  return { '--x': x, '--y': y, '--zoom': String(zoom ?? 1) };
}

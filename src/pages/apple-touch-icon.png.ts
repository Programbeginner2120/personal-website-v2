import type { APIRoute } from 'astro';
import { portraitIcon } from '@/lib/icon';

// iOS home-screen icon. Square, because iOS rounds the corners itself
// and fills transparent areas with black.
export const GET: APIRoute = async () =>
  new Response(await portraitIcon(180, { round: false }), {
    headers: { 'Content-Type': 'image/png' },
  });

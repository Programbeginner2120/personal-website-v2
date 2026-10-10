import type { APIRoute } from 'astro';
import { portraitIcon } from '@/lib/icon';

// Browser-tab icon. Built once at build time into dist/favicon.png.
export const GET: APIRoute = async () =>
  new Response(await portraitIcon(64, { round: true }), {
    headers: { 'Content-Type': 'image/png' },
  });

import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // The production domain. Used for canonical URLs and the sitemap.
  site: 'https://matthewrkilleen.com',
  integrations: [
    // Generates /sitemap-index.xml at build time. The style guide is left out.
    sitemap({ filter: (page) => !page.includes('/styleguide') }),
  ],
  fonts: [
    {
      provider: fontProviders.google(),
      // Google merged "Big Shoulders Display" and "Text" into one family with an
      // optical-size axis; at headline sizes it renders as the Display cut.
      name: 'Big Shoulders',
      cssVariable: '--font-display',
      weights: [700, 900],
      styles: ['normal'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Manrope',
      cssVariable: '--font-body',
      weights: [400, 500, 700],
      styles: ['normal'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: [500, 700],
      styles: ['normal'],
      fallbacks: ['monospace'],
    },
  ],
});

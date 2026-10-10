import type { SiteMeta } from '@/types/site';

export const site = {
  name: 'Matthew Killeen',
  description: "Software engineer at JPMorgan Chase. Pool player and dog lover.",
  domain: 'matthewrkilleen.com',
  // 'green' or 'blue' (palettes live in src/styles/tokens.css)
  theme: 'green',
  nav: [
    { label: 'About', href: '#about' },
    { label: 'Experience', href: '#experience' },
    { label: 'Off the clock', href: '#life' },
    { label: 'Contact →', href: '#contact', cta: true },
  ],
} satisfies SiteMeta;

import type { AboutContent, HeroContent } from '@/types/site';
// Importing the image (rather than using a URL string) lets Astro resize and optimise it.
import portrait from '@/assets/Portrait.jpg';

export const hero = {
  nameLines: ['Matthew', 'Killeen'],
  intro: "Software engineer at JPMorgan Chase, building for wealth management. Pool player and dog lover.",
  actions: [
    { label: 'See my work', href: '#experience', variant: 'primary' },
    // The PDF lives at public/Matthew_Killeen_Resume.pdf. `download` saves it
    // under that filename instead of opening it in the browser.
    { label: 'Résumé', href: '/Matthew_Killeen_Resume.pdf', download: 'Matthew_Killeen_Resume.pdf' },
  ],
  portrait: {
    image: portrait,
    alt: 'Matthew Killeen',
    caption: 'you',
    // Framing: "x y" = which part stays in frame (lower y = higher up the photo).
    position: '50% 40%',
    // 1 = no zoom; raise it (e.g. 1.2) to crop in tighter around the face.
    zoom: 1.1,
  },
} satisfies HeroContent;

/** Scrolling strip under the hero. */
export const ticker: string[] = [
  'Software engineer',
  'JPMorgan Chase',
  'Java',
  'Angular',
  'React',
  'AWS',
  'SQL',
  'Pool',
  'Cooper',
  'Finn'
];

export const about = {
  lead: 'Full-stack engineer who likes hard problems, clean systems and learning something new every week.',
  body: 'From machine learning research at UAlbany to client work at Infosys and LBi Software, and now wealth management at JPMorgan Chase.',
  skills: ['Java', 'Python', 'JavaScript', 'TypeScript', 'Spring Boot', 'Angular', 'React', 'AWS', 'Docker', 'SQL'],
} satisfies AboutContent;

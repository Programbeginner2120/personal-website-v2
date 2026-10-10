import type { ImageMetadata } from 'astro';

/** Colour palettes defined in tokens.css. Add one here AND there. */
export type Theme = 'green' | 'blue';

/** Any labelled link. */
export interface Link {
  label: string;
  href: string;
}

export interface NavLink extends Link {
  /** Highlight as a call-to-action (accent colour). */
  cta?: boolean;
}

export type ButtonVariant = 'default' | 'primary' | 'solid';

export interface ButtonLink extends Link {
  variant?: ButtonVariant;
  /** Open in a new tab (external sites, PDFs). */
  external?: boolean;
}

export interface SiteMeta {
  /** Your name: used in <title>, the footer and alt text. */
  name: string;
  description: string;
  domain: string;
  theme: Theme;
  nav: NavLink[];
}

export interface Photo {
  /** An imported image, or null to show a placeholder. */
  image: ImageMetadata | null;
  alt: string;
  caption: string;
  /**
   * Which part of the photo stays in frame, as "x y" percentages (CSS object-position).
   * "50% 50%" = centre (default), "50% 0%" = keep the top, "50% 100%" = keep the bottom.
   */
  position?: string;
  /** Zoom in around the centre of the frame: 1 = none (default), 1.2 = 20% closer. */
  zoom?: number;
}

export interface HeroContent {
  /** Each entry is one line of the giant name; the last is accent-coloured. */
  nameLines: [string, string];
  intro: string;
  actions: ButtonLink[];
  portrait: Photo;
}

export interface AboutContent {
  lead: string;
  body: string;
  skills: string[];
}

/** A year (2024) or a placeholder you haven't filled in yet ('[Year]'). */
export type YearValue = number | string;

export interface Job {
  org: string;
  role: string;
  start: YearValue;
  /** Omit for a current position: it renders as "Present". */
  end?: YearValue;
  blurb: string;
}

export interface LifeContent {
  /** Use "\n" to force a line break in the big heading. */
  heading: string;
  intro: string;
  photos: Photo[];
}

export interface ContactContent {
  heading: string;
  links: ButtonLink[];
}

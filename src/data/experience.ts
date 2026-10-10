import type { Job } from '@/types/site';

/** Most recent first. A job with no `end` is the current one (shows "Now"). */
export const jobs = [
  {
    org: 'JPMorgan Chase',
    role: 'Software Engineer II',
    start: '2026',
    blurb: 'Build and maintain backend systems to fuel the future of Wealth Management technology.',
  },
  {
    org: 'LBi Software',
    role: 'Software Engineer',
    start: 2024,
    end: 2026,
    blurb: 'Built and maintained web and mobile applications spanning multiple sports leagues and enterprises.',
  },
  {
    org: 'Infosys Limited',
    role: 'Software Engineer',
    start: 2022,
    end: 2023,
    blurb: 'Built web applications for clients alongside a team of software engineers.',
  },
  {
    org: 'University at Albany, SUNY',
    role: 'Undergraduate Researcher',
    start: 2021,
    end: 2022,
    blurb: 'Generated ideal forms of nano-clusters with machine learning in the Data Mining and Management Lab.',
  },
] satisfies Job[];

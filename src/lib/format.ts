import type { Job } from '@/types/site';

/** A job without an end year is the current one. */
export const isCurrent = (job: Job): boolean => job.end === undefined;

/** "2022 — 2023" or "2024 — Present". */
export function formatYears(job: Job): string {
  return `${job.start} — ${job.end ?? 'Present'}`;
}

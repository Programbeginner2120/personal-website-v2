import type { ContactContent } from '@/types/site';

export const contact = {
  heading: "Let's talk.",
  links: [
    { label: 'Matthewkilleen99@gmail.com', href: 'mailto:Matthewkilleen99@gmail.com', variant: 'solid' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/matthew-r-killeen', external: true },
    { label: 'GitHub', href: 'https://github.com/Programbeginner2120', external: true },
  ],
} satisfies ContactContent;

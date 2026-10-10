import type { LifeContent } from '@/types/site';
import cooper from '@/assets/Cooper.jpg';
import finn from '@/assets/Finn.jpg';
import poolShot from '@/assets/pool_shot.jpg';
import friends from '@/assets/j_cole_concert.jpg';

// Each card shows a landscape (4:3) slice of the photo. For tall photos, `position`
// picks which slice: "50% 0%" = top, "50% 50%" = middle (default), "50% 100%" = bottom.
// `zoom` crops in tighter (1 = none). Both are optional.
export const life = {
  heading: 'Off the\nclock',
  intro: "When I'm not programming, I'm at the pool table, chilling with friends or hanging out with my dogs Cooper and Finn.",
  photos: [
    { image: cooper, alt: 'Cooper the dog', caption: 'Cooper', position: '50% 50%' },
    { image: finn, alt: 'Finn the pup', caption: 'Finn', position: '0% 10%', zoom: 1.05 },
    { image: poolShot, alt: 'The pool table', caption: 'The table', position: '50% 40%' },
    { image: friends, alt: 'J Cole Concert with Friends', caption: 'J Cole Concert' },
  ],
} satisfies LifeContent;

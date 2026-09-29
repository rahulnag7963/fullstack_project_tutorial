import { describe, expect, it } from 'vitest';
import { ICON_NAMES, pickIcon } from './icons.jsx';

describe('pickIcon', () => {
  it.each([
    ['Reading books', 'book'],
    ['Study for exam', 'book'],
    ['Painting', 'palette'],
    ['Save money', 'jar'],
    ['Climb mountains', 'mountain'],
    ['Buy milk', 'cart'],
    ['Workout at the gym', 'dumbbell'],
    ['Code the project', 'laptop'],
    ['Water the plants', 'plant'],
  ])('picks an icon from keywords in "%s"', (title, icon) => {
    expect(pickIcon(title, 'any-id')).toBe(icon);
  });

  it('falls back to a stable icon based on the id', () => {
    const first = pickIcon("Bob's secret plan", '00000000-0000-4000-8000-000000000b0b');
    expect(ICON_NAMES).toContain(first);
    expect(pickIcon("Bob's secret plan", '00000000-0000-4000-8000-000000000b0b')).toBe(first);
  });

  it('uses the star while nothing is known yet', () => {
    expect(pickIcon('', '')).toBe('star');
  });
});

import { describe, expect, it } from 'vitest';
import { buildCreatorVoxelModel } from '../creatorVoxelModel';

describe('buildCreatorVoxelModel', () => {
  const parts = buildCreatorVoxelModel();
  const part = (name: string) => parts.find((p) => p.name === name)!;

  it('builds every body part with boxes', () => {
    expect(parts.map((p) => p.name)).toEqual(['head', 'torso', 'armL', 'armR', 'legL', 'legR']);
    for (const p of parts) expect(p.boxes.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    expect(buildCreatorVoxelModel()).toEqual(parts);
  });

  it('puts an earbud outside each ear', () => {
    const white = part('head').boxes.filter(([, , , , , , c]) => c === 0xf4f4f0);
    expect(white).toHaveLength(4); // bud + stem per side
    expect(white.filter(([x]) => x >= 5)).toHaveLength(2);
    expect(white.filter(([x, , , w]) => x + w <= -5)).toHaveLength(2);
  });

  it('mirrors the limbs across the centre line', () => {
    const span = (name: string) => {
      const xs = part(name).boxes.flatMap(([x, , , w]) => [x, x + w]);
      return [Math.min(...xs), Math.max(...xs)];
    };
    for (const [l, r] of [['armL', 'armR'], ['legL', 'legR']]) {
      const [lMin, lMax] = span(l);
      expect(span(r)).toEqual([-lMax, -lMin]);
    }
  });
});

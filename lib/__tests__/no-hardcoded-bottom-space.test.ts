import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Studio LEARNINGS L-L4: bottom padding for scroll content comes from useTabBarSpace() /
// useBottomSpace() (hooks/useTabBarSpace.ts), never a fixed number: a hardcoded 160 hid the last
// row behind the tab bar on Android 3-button navigation.
const ROOT = join(__dirname, '..', '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });

describe('bottom padding', () => {
  it('is never a large hardcoded number', () => {
    const offenders = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'components'))].flatMap((p) =>
      readFileSync(p, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => {
          const m = line.match(/paddingBottom:\s*(\d+)/);
          return m && Number(m[1]) > 48;
        })
        .map(({ line, i }) => `${p.slice(ROOT.length + 1)}:${i + 1}: ${line.trim()}`)
    );
    expect(offenders).toEqual([]);
  });
});

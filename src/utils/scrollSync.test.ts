import { describe, expect, it } from 'vitest';
import { getSyncedScrollTop } from './scrollSync';

describe('getSyncedScrollTop', () => {
  it('maps source scroll progress to a differently sized target', () => {
    expect(
      getSyncedScrollTop(
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 200 },
        { scrollHeight: 600, clientHeight: 200 },
      ),
    ).toBe(200);
  });

  it('returns zero when either pane cannot scroll', () => {
    expect(
      getSyncedScrollTop(
        { scrollTop: 0, scrollHeight: 200, clientHeight: 200 },
        { scrollHeight: 600, clientHeight: 200 },
      ),
    ).toBe(0);
    expect(
      getSyncedScrollTop(
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 200 },
        { scrollHeight: 200, clientHeight: 200 },
      ),
    ).toBe(0);
  });
});
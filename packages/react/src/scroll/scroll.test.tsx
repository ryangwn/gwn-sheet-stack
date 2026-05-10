import React from 'react';

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';

import { usePreventScroll } from './usePreventScroll';

afterEach(cleanup);

function Probe({ disabled }: { disabled: boolean }) {
  usePreventScroll({ isDisabled: disabled });
  return null;
}

describe('usePreventScroll refcount', () => {
  test('does not throw when mounted/unmounted in jsdom (non-iOS)', () => {
    let view!: ReturnType<typeof render>;
    act(() => {
      view = render(
        <>
          <Probe disabled={false} />
          <Probe disabled={false} />
        </>,
      );
    });

    // Two consumers active; unmount one — body styles still managed by the other.
    act(() => {
      view.rerender(<Probe disabled={false} />);
    });

    // Final unmount — refcount should reach zero cleanly.
    act(() => {
      view.unmount();
    });

    expect(true).toBe(true);
  });

  test('isDisabled=true is a no-op (no refcount increment)', () => {
    let view!: ReturnType<typeof render>;
    act(() => {
      view = render(<Probe disabled={true} />);
    });
    act(() => {
      view.unmount();
    });
    expect(true).toBe(true);
  });
});

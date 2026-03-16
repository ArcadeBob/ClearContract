import { vi } from 'vitest';
import React from 'react';

vi.mock('framer-motion', () => {
  // Cache created components to avoid re-creation on every access
  const componentCache = new Map<string, React.FC>();

  const motionProxy = new Proxy({} as Record<string, React.FC>, {
    get: (_target, prop: string) => {
      if (!componentCache.has(prop)) {
        // Forward ref so components using ref= don't break
        const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(
          (props, ref) => {
            // Filter out framer-motion-specific props
            const filteredProps: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(props)) {
              if (
                !key.startsWith('animate') &&
                !key.startsWith('initial') &&
                !key.startsWith('exit') &&
                !key.startsWith('transition') &&
                !key.startsWith('variants') &&
                !key.startsWith('whileHover') &&
                !key.startsWith('whileTap') &&
                !key.startsWith('whileFocus') &&
                !key.startsWith('whileInView') &&
                !key.startsWith('layout') &&
                key !== 'drag' &&
                key !== 'dragConstraints' &&
                key !== 'onAnimationComplete'
              ) {
                filteredProps[key] = value;
              }
            }
            return React.createElement(prop, { ...filteredProps, ref });
          }
        );
        Component.displayName = `motion.${prop}`;
        componentCache.set(prop, Component as unknown as React.FC);
      }
      return componentCache.get(prop);
    },
  });

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
    useMotionValue: (initial: number) => ({
      get: () => initial,
      set: vi.fn(),
      onChange: vi.fn(),
    }),
    useTransform: (_value: unknown, _input: unknown, output: unknown[]) => ({
      get: () => output?.[0] ?? 0,
      set: vi.fn(),
      onChange: vi.fn(),
    }),
  };
});

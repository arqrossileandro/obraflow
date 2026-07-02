'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function ThemeProvider({ children, ...props }: { children: ReactNode } & Record<string, any>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

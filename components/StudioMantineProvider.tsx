'use client';

import type { ReactNode } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

const theme = createTheme({
  colors: {
    studioBlue: ['#edf3ff', '#dbe7ff', '#bfd0ff', '#96b3ff', '#6e96ff', '#4b7bf9', '#2563eb', '#1d4ed8', '#1b43b8', '#1b398f'],
  },
  primaryColor: 'studioBlue',
  primaryShade: 6,
  autoContrast: true,
  defaultRadius: 'md',
  fontFamily: "'Montserrat Alternates', system-ui, sans-serif",
  headings: {
    fontFamily: "'Momo Trust Display', 'Montserrat Alternates', system-ui, sans-serif",
  },
});

export function StudioMantineProvider({ children }: { children: ReactNode }) {
  return (
    <div className="studio-mantine-root">
      <MantineProvider theme={theme} cssVariablesSelector=".studio-mantine-root" defaultColorScheme="light">
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </div>
  );
}

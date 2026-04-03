'use client';

import type { ReactNode } from 'react';
import { Button, Stack, Text, Title } from '@mantine/core';

interface Props {
  title: string;
  subtitle: string;
  meta?: string;
  onBack: () => void;
  children: ReactNode;
}

export function StudioLockedMobileShell({
  title,
  subtitle,
  meta,
  onBack,
  children,
}: Props) {
  return (
    <section className="studio-mobile-locked-shell">
      <header className="studio-mobile-locked-shell__topbar">
        <Button
          type="button"
          variant="subtle"
          color="gray"
          leftSection={<i className="fa-solid fa-arrow-left" aria-hidden="true" />}
          onClick={onBack}
          className="studio-mobile-locked-shell__back"
        >
          Tillbaka
        </Button>
        <div className="studio-mobile-locked-shell__brand" aria-label="Recept Studio">
          <span className="studio-mobile-locked-shell__brand-mark" aria-hidden="true">
            R
          </span>
          <span className="studio-mobile-locked-shell__brand-copy">Recept Studio</span>
        </div>
      </header>

      <Stack gap="xl" className="studio-mobile-locked-shell__body">
        <div className="studio-mobile-locked-shell__intro">
          {title ? (
            <Title order={1} className="studio-mobile-locked-shell__title">
              {title}
            </Title>
          ) : null}
          {subtitle ? <Text className="studio-mobile-locked-shell__subtitle">{subtitle}</Text> : null}
          {meta ? <Text className="studio-mobile-locked-shell__meta">{meta}</Text> : null}
        </div>

        {children}
      </Stack>
    </section>
  );
}

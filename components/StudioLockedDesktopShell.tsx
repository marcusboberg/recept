'use client';

import type { ReactNode } from 'react';
import { Button, Stack, Text, Title } from '@mantine/core';

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  meta?: string;
  onBack: () => void;
  children: ReactNode;
}

export function StudioLockedDesktopShell({
  eyebrow,
  title,
  subtitle,
  meta,
  onBack,
  children,
}: Props) {
  return (
    <section className="studio-desktop-locked-shell">
      <div className="studio-desktop-locked-shell__backdrop" aria-hidden="true" />
      <header className="studio-desktop-locked-shell__topbar">
        <div className="studio-desktop-locked-shell__brand" aria-label="Recept Studio">
          <span className="studio-desktop-locked-shell__brand-mark" aria-hidden="true">
            R
          </span>
          <span className="studio-desktop-locked-shell__brand-copy">
            <span>Recept</span>
            <strong>Studio</strong>
          </span>
        </div>

        <Button
          type="button"
          variant="subtle"
          color="gray"
          leftSection={<i className="fa-solid fa-arrow-left" aria-hidden="true" />}
          onClick={onBack}
          className="studio-desktop-locked-shell__back"
        >
          Tillbaka
        </Button>
      </header>

      <div className="studio-desktop-locked-shell__body">
        <div className="studio-desktop-locked-shell__story">
          <Stack gap="xl" className="studio-desktop-locked-shell__story-inner">
            <div className="studio-desktop-locked-shell__intro">
              {eyebrow ? <Text className="studio-desktop-locked-shell__eyebrow">{eyebrow}</Text> : null}
              {title ? (
                <Title order={1} className="studio-desktop-locked-shell__title">
                  {title}
                </Title>
              ) : null}
              {subtitle ? <Text className="studio-desktop-locked-shell__subtitle">{subtitle}</Text> : null}
              {meta ? <Text className="studio-desktop-locked-shell__meta">{meta}</Text> : null}
            </div>
          </Stack>
        </div>

        <div className="studio-desktop-locked-shell__login">{children}</div>
      </div>
    </section>
  );
}

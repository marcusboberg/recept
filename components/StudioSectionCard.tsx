'use client';

import type { ReactNode } from 'react';
import { Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';

interface StudioSectionCardProps {
  title: string;
  description?: string;
  iconClass?: string;
  children: ReactNode;
  className?: string;
}

export function StudioSectionCard({
  title,
  description,
  iconClass = 'fa-solid fa-layer-group',
  children,
  className,
}: StudioSectionCardProps) {
  return (
    <Paper withBorder radius="xl" p="xl" shadow="sm" className={className}>
      <Stack gap="lg">
        <Group gap="md" align="flex-start" wrap="nowrap">
          <ThemeIcon size={42} radius="xl" color="studioBlue" variant="light">
            <i className={iconClass} aria-hidden="true" />
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={3}>{title}</Title>
            {description ? (
              <Text c="dimmed" size="sm">
                {description}
              </Text>
            ) : null}
          </Stack>
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}

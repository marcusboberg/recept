'use client';

import type { ReactNode } from 'react';
import { Badge, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';

interface StudioPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  iconClass?: string;
  badge?: string;
  aside?: ReactNode;
}

export function StudioPageHeader({
  eyebrow,
  title,
  description,
  iconClass = 'fa-solid fa-wand-magic-sparkles',
  badge,
  aside,
}: StudioPageHeaderProps) {
  return (
    <Paper withBorder radius="xl" p="xl" shadow="sm">
      <Group justify="space-between" align="flex-start" gap="xl">
        <Group align="flex-start" gap="md" wrap="nowrap">
          <ThemeIcon size={46} radius="xl" color="studioBlue" variant="light">
            <i className={iconClass} aria-hidden="true" />
          </ThemeIcon>
          <Stack gap={6}>
            <Group gap="sm">
              <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.12em' }}>
                {eyebrow}
              </Text>
              {badge ? (
                <Badge variant="light" color="studioBlue" radius="xl">
                  {badge}
                </Badge>
              ) : null}
            </Group>
            <Title order={2}>{title}</Title>
            <Text c="dimmed" maw={760}>
              {description}
            </Text>
          </Stack>
        </Group>
        {aside ? <div>{aside}</div> : null}
      </Group>
    </Paper>
  );
}

import { Badge, Box, Group, NavLink, Paper, Stack, Text, Title } from '@mantine/core';
import { useMemo, useState, type ReactNode } from 'react';

type NavChild = {
  id: string;
  label: string;
  description: string;
  disabled?: boolean;
};

type NavSection = {
  id: string;
  label: string;
  iconClass: string;
  children: NavChild[];
};

interface Props {
  title: string;
  navSections: NavSection[];
  activeId: string;
  onSelect: (id: string) => void;
  footer: ReactNode;
}

export function StudioSidebar({ title, navSections, activeId, onSelect, footer }: Props) {
  const activeSectionId = useMemo(
    () => navSections.find((section) => section.children.some((item) => item.id === activeId))?.id ?? navSections[0]?.id ?? '',
    [activeId, navSections],
  );

  const [openedSections, setOpenedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navSections.map((section) => [section.id, true])),
  );

  return (
    <Paper className="studio-sidebar" radius="xl" p="lg" withBorder shadow="sm">
      <Stack gap="lg" h="100%">
        <Group justify="space-between" align="center" className="studio-sidebar__brand">
          <Group gap="sm" wrap="nowrap">
            <Box className="studio-sidebar__brand-mark" aria-hidden="true">
              R
            </Box>
            <Box className="studio-sidebar__brand-copy">
              <Text fw={700} size="sm" tt="uppercase" c="dimmed">
                Recept
              </Text>
              <Text fw={600}>Studio</Text>
            </Box>
          </Group>
          <Badge variant="light" color="studioBlue">
            v1.0
          </Badge>
        </Group>

        <Box className="studio-sidebar__title">
          <Title order={2} size="h3">
            {title}
          </Title>
        </Box>

        <Stack gap="sm" flex={1} className="studio-sidebar__nav">
          {navSections.map((section) => {
            const opened = openedSections[section.id] ?? (section.id === activeSectionId);
            const isSectionActive = section.id === activeSectionId;

            return (
              <NavLink
                key={section.id}
                opened={opened}
                onClick={() =>
                  setOpenedSections((current) => ({
                    ...current,
                    [section.id]: !opened,
                  }))
                }
                label={section.label}
                variant="subtle"
                color="studioBlue"
                childrenOffset="md"
                className={isSectionActive ? 'studio-sidebar__section-link studio-sidebar__section-link--active' : 'studio-sidebar__section-link'}
                classNames={{
                  body: 'studio-sidebar__section-link-body',
                  label: 'studio-sidebar__section-link-label',
                  chevron: 'studio-sidebar__section-chevron',
                  children: 'studio-sidebar__section-children',
                }}
              >
                {section.children.map((item) => (
                  <NavLink
                    key={item.id}
                    component="button"
                    type="button"
                    active={activeId === item.id}
                    disabled={item.disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!item.disabled) {
                        onSelect(item.id);
                      }
                    }}
                    label={item.label}
                    description={item.description}
                    variant="subtle"
                    color="studioBlue"
                    classNames={{
                      root: 'studio-sidebar__child-link',
                      body: 'studio-sidebar__child-link-body',
                      label: 'studio-sidebar__child-link-label',
                      description: 'studio-sidebar__child-link-description',
                    }}
                  />
                ))}
              </NavLink>
            );
          })}
        </Stack>

        <Box className="studio-sidebar__footer">{footer}</Box>
      </Stack>
    </Paper>
  );
}

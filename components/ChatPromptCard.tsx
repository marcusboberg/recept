'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Code, Group, Paper, Stack, Text, Textarea } from '@mantine/core';
import { StudioSectionCard } from './StudioSectionCard';

interface Props {
  prompt: string;
  className?: string;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
}

export function ChatPromptCard({ prompt, className, title, subtitle, defaultOpen = false }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [customText, setCustomText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showMessage = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setMessage(null);
      setIsError(false);
    }, 2500);
  };

  const copyPrompt = async () => {
    try {
      const trimmed = customText.trim();
      const fullPrompt = trimmed.length > 0 ? `${prompt}\n\nText att konvertera:\n${trimmed}` : prompt;
      await navigator.clipboard.writeText(fullPrompt);
      showMessage(trimmed.length > 0 ? 'Prompt + text kopierad!' : 'Prompt kopierad!');
    } catch (error) {
      showMessage('Kunde inte kopiera prompten. Kopiera manuellt.', true);
    }
  };

  return (
    <StudioSectionCard
      className={className}
      iconClass="fa-solid fa-sparkles"
      title={title ?? 'ChatGPT-flöde'}
      description={subtitle ?? 'Klistra in fritexten, kopiera prompten och gå sedan vidare till preview eller JSON.'}
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            1. Recepttext
          </Text>
          <Textarea
            rows={7}
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder="Klistra in hela receptet här. När du kopierar prompten följer texten med."
            styles={{ input: { minHeight: 220, fontSize: '1rem' } }}
          />
        </Stack>

        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              2. Prompt
            </Text>
            <Button type="button" variant="subtle" color="studioBlue" onClick={() => setIsOpen((prev) => !prev)}>
              {isOpen ? 'Dölj prompt' : 'Visa prompt'}
            </Button>
          </Group>
          {isOpen && (
            <Paper withBorder radius="lg" p="md">
              <Text component="pre" size="sm" style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', margin: 0 }}>
                {prompt}
              </Text>
            </Paper>
          )}
        </Stack>

        <Group justify="space-between" align="flex-start" gap="md">
          <Group gap="sm">
            <Button type="button" color="studioBlue" radius="xl" onClick={copyPrompt}>
              Kopiera prompt
            </Button>
            <Button
              type="button"
              variant="light"
              color="gray"
              radius="xl"
              onClick={() => {
                setShowHint(true);
                try {
                  window.open('https://chatgpt.com', '_blank');
                } catch {
                  // ignore if blocked
                }
              }}
            >
              Öppna ChatGPT
            </Button>
          </Group>
          {message ? (
            <Text size="sm" c={isError ? 'red' : 'dimmed'}>
              {message}
            </Text>
          ) : null}
        </Group>

        {showHint ? (
          <Alert
            color="studioBlue"
            variant="light"
            title="Nästa steg"
            withCloseButton
            onClose={() => setShowHint(false)}
          >
            <Text size="sm">Klistra in prompt + text i ChatGPT och kom sedan tillbaka med JSON-resultatet.</Text>
          </Alert>
        ) : null}

        <Paper withBorder radius="lg" p="md">
          <Stack gap={6}>
            <Text size="sm" fw={700}>
              Snabbguide
            </Text>
            <Text size="sm" c="dimmed">
              1. Klistra in recepttexten. 2. Kopiera prompten. 3. Kör den i ChatGPT. 4. Klistra in JSON i preview eller JSON-vyn.
            </Text>
            <Text size="sm" c="dimmed">
              Prompten skickar med din text automatiskt om fältet ovan är ifyllt.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </StudioSectionCard>
  );
}

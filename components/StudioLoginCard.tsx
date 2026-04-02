'use client';

import { FormEvent, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type QuickAccount = { id: string; label: string; value: string };

interface Props {
  status: AuthStatus;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  quickAccounts?: QuickAccount[];
  compact?: boolean;
  embedded?: boolean;
  showBackButton?: boolean;
}

const DEFAULT_QUICK_ACCOUNTS: QuickAccount[] = [
  { id: 'philip', label: 'Philip', value: 'philip.ottosson@gmail.com' },
  { id: 'marcus', label: 'Marcus', value: 'marcusboberg@icloud.com' },
];

const loginSegmentedClassNames = {
  root: 'studio-segmented-root',
  indicator: 'studio-segmented-indicator',
  label: 'studio-segmented-label',
  innerLabel: 'studio-segmented-inner-label',
} as const;

export function StudioLoginCard({
  status,
  onBack,
  title = 'Logga in för att använda studion',
  subtitle = 'Snabbinloggning med färdiga konton eller valfri e-post. Lösenord krävs alltid.',
  quickAccounts = DEFAULT_QUICK_ACCOUNTS,
  compact = false,
  embedded = false,
  showBackButton = Boolean(onBack),
}: Props) {
  const [activeQuick, setActiveQuick] = useState<string>(quickAccounts[0]?.id ?? 'primary');
  const [email, setEmail] = useState<string>(quickAccounts[0]?.value ?? '');
  const [showCustomEmail, setShowCustomEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectQuick = (id: string) => {
    const account = quickAccounts.find((item) => item.id === id);
    if (!account) return;
    setActiveQuick(id);
    setShowCustomEmail(false);
    setEmail(account.value);
    setPassword('');
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch (error) {
      setAuthError((error as Error).message ?? 'Fel vid inloggning.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (status === 'authenticated') {
    return null;
  }

  const content = (
    <Paper
      shadow={compact ? 'sm' : 'lg'}
      radius="xl"
      withBorder
      p={compact ? 'lg' : 'xl'}
      maw={compact ? 560 : 720}
      mx="auto"
      w="100%"
      className={compact ? 'studio-login-card studio-login-card--compact' : 'studio-login-card'}
    >
        <Stack gap="lg">
          <Group gap="sm">
            <ThemeIcon radius="xl" size="lg" color="studioBlue">
              <i className="fa-solid fa-lock" aria-hidden="true"></i>
            </ThemeIcon>
            <div>
              <Title order={3}>{title}</Title>
              <Text c="dimmed" size="sm">
                {subtitle}
              </Text>
            </div>
          </Group>

          {status === 'loading' ? (
            <Text c="dimmed" size="sm">
              Kontrollerar behörighet…
            </Text>
          ) : (
            <form onSubmit={handleLogin}>
              <Stack gap="md">
                <SegmentedControl
                  fullWidth
                  value={activeQuick}
                  onChange={handleSelectQuick}
                  data={quickAccounts.map((account) => ({ label: account.label, value: account.id }))}
                  classNames={loginSegmentedClassNames}
                />

                <PasswordInput
                  label="Lösenord"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <Button type="submit" color="studioBlue" loading={authSubmitting}>
                  {authSubmitting ? 'Loggar in…' : 'Logga in'}
                </Button>

                {authError ? (
                  <Alert color="red" variant="light">
                    {authError}
                  </Alert>
                ) : null}

                <Divider label="eller" labelPosition="center" />

                {showCustomEmail ? (
                  <Stack gap="sm">
                    <TextInput
                      label="Annan e-postadress"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      ref={emailInputRef}
                    />
                    <Button
                      type="button"
                      variant="light"
                      color="gray"
                      onClick={() => {
                        handleSelectQuick(quickAccounts[0]?.id ?? 'primary');
                        setShowCustomEmail(false);
                      }}
                    >
                      Avbryt annan adress
                    </Button>
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      Behöver du en annan e-postadress?
                    </Text>
                    <Button
                      type="button"
                      variant="subtle"
                      color="studioBlue"
                      onClick={() => {
                        setShowCustomEmail(true);
                        setActiveQuick('custom');
                        setEmail('');
                        setPassword('');
                        setTimeout(() => emailInputRef.current?.focus(), 0);
                      }}
                    >
                      Annan e-postadress
                    </Button>
                  </Stack>
                )}

                {showBackButton && onBack ? (
                  <Group justify="center">
                    <Button type="button" variant="subtle" color="gray" onClick={onBack}>
                      Tillbaka
                    </Button>
                  </Group>
                ) : null}
              </Stack>
            </form>
          )}
        </Stack>
      </Paper>
  );

  if (embedded) {
    return content;
  }

  return <div className="new-recipe-locked">{content}</div>;
}

'use client';

import { FormEvent, useRef, useState } from 'react';
import {
  Alert,
  Badge,
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
  contextLabel?: string;
  contextValue?: string;
  contextBody?: string;
  highlights?: string[];
  quickAccounts?: QuickAccount[];
  compact?: boolean;
  embedded?: boolean;
  immersive?: boolean;
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
  contextLabel = 'Efter inloggning',
  contextValue = 'Du fortsätter direkt där du var.',
  contextBody = 'Studion öppnar samma vy igen så att du kan fortsätta utan att tappa tempo.',
  highlights = ['Fortsätt i samma vy', 'Snabbinloggning med färdiga konton', 'Spara direkt efter ändringar'],
  quickAccounts = DEFAULT_QUICK_ACCOUNTS,
  compact = false,
  embedded = false,
  immersive = false,
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

  const accountSelector = (
    <SegmentedControl
      fullWidth
      value={activeQuick}
      onChange={handleSelectQuick}
      data={quickAccounts.map((account) => ({ label: account.label, value: account.id }))}
      classNames={loginSegmentedClassNames}
    />
  );

  const alternativeEmail = showCustomEmail ? (
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
  ) : immersive ? (
    <Group justify="center">
      <Button
        type="button"
        variant="subtle"
        color="gray"
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
    </Group>
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
  );

  const formContent = (
    <form onSubmit={handleLogin}>
      <Stack gap="md" className="studio-login-card__form">
        {accountSelector}

        <PasswordInput
          label="Lösenord"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <Button type="submit" color="studioBlue" loading={authSubmitting} size={immersive ? 'md' : 'sm'} fullWidth>
          {authSubmitting ? 'Loggar in…' : 'Logga in'}
        </Button>

        {authError ? (
          <Alert color="red" variant="light">
            {authError}
          </Alert>
        ) : null}

        <Divider label={immersive ? '' : 'eller'} labelPosition="center" />

        {alternativeEmail}

        {showBackButton && onBack ? (
          <Group justify="center">
            <Button type="button" variant="subtle" color="gray" onClick={onBack}>
              Tillbaka
            </Button>
          </Group>
        ) : null}
      </Stack>
    </form>
  );

  const shellClassName = [
    'studio-login-card',
    compact ? 'studio-login-card--compact' : '',
    immersive ? 'studio-login-card--immersive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const showImmersiveHeader = immersive && (title.trim().length > 0 || subtitle.trim().length > 0);

  const content = (
    <Paper
      shadow={immersive ? undefined : compact ? 'sm' : 'lg'}
      radius={immersive ? '0' : 'xl'}
      withBorder={!immersive}
      p={immersive ? 0 : compact ? 'lg' : 'xl'}
      maw={immersive ? undefined : compact ? 560 : 720}
      mx={immersive ? undefined : 'auto'}
      w="100%"
      className={shellClassName}
    >
      {immersive ? (
        <Stack gap="xl" className="studio-login-card__immersive-shell">
          {showImmersiveHeader ? (
            <div className="studio-login-card__plain-head">
              <Text className="studio-login-card__eyebrow">Studio access</Text>
              <Title order={compact ? 3 : 2} className="studio-login-card__title">
                {title}
              </Title>
              {subtitle.trim().length > 0 ? (
                <Text c="dimmed" size={compact ? 'sm' : 'md'} className="studio-login-card__subtitle">
                  {subtitle}
                </Text>
              ) : null}
            </div>
          ) : null}

          {status === 'loading' ? (
            <Text c="dimmed" size="sm">
              Kontrollerar behörighet…
            </Text>
          ) : (
            formContent
          )}
        </Stack>
      ) : (
        <Stack gap={compact ? 'md' : 'lg'}>
          <div className="studio-login-card__hero">
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <ThemeIcon radius="xl" size={compact ? 44 : 54} color="studioBlue" className="studio-login-card__lock">
                <i className="fa-solid fa-lock" aria-hidden="true"></i>
              </ThemeIcon>
              <div className="studio-login-card__hero-copy">
                <Text className="studio-login-card__eyebrow">Studio access</Text>
                <Title order={compact ? 3 : 2} className="studio-login-card__title">
                  {title}
                </Title>
                <Text c="dimmed" size={compact ? 'sm' : 'md'} className="studio-login-card__subtitle">
                  {subtitle}
                </Text>
              </div>
            </Group>

            <div className="studio-login-card__story">
              <div className="studio-login-card__story-head">
                <Badge variant="light" color="studioBlue" radius="xl">
                  {contextLabel}
                </Badge>
                <Text className="studio-login-card__story-title">{contextValue}</Text>
                <Text className="studio-login-card__story-body">{contextBody}</Text>
              </div>

              {highlights.length > 0 ? (
                <div className="studio-login-card__highlights" aria-label="Fördelar med att logga in">
                  {highlights.map((highlight) => (
                    <div key={highlight} className="studio-login-card__highlight">
                      <span className="studio-login-card__highlight-icon" aria-hidden="true">
                        <i className="fa-solid fa-check"></i>
                      </span>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {status === 'loading' ? (
            <Text c="dimmed" size="sm">
              Kontrollerar behörighet…
            </Text>
          ) : (
            formContent
          )}
        </Stack>
      )}
      </Paper>
  );

  if (embedded) {
    return content;
  }

  return <div className="new-recipe-locked">{content}</div>;
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Button, Divider, Group, Paper, Stack, Text } from '@mantine/core';
import { doc, getDoc } from 'firebase/firestore';
import { EditorShell } from '@/components/EditorShell';
import { StudioSidebar } from '@/components/StudioSidebar';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebaseClient';
import { normalizeLegacyRecipeForRead } from '@/lib/legacyRecipes';
import { resolveRecipeSlugByHistory } from '@/lib/slugHistory';
import { recipeToJson } from '@/lib/recipes';
import { recipeSchema } from '@/schema/recipeSchema';
import { getUserDisplay } from '@/lib/userDisplay';
import { getRecipeQuickEditPath, STUDIO_MOBILE_QUICK_EDIT_INTENT_KEY } from '@/lib/routes';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { BackupRecipesButton } from './BackupRecipesButton';
import { StudioLoginCard } from './StudioLoginCard';
import { StudioMantineProvider } from './StudioMantineProvider';
import { StudioLockedMobileShell } from './StudioLockedMobileShell';

interface Props {
  slug: string;
}

export function EditRecipeSection({ slug }: Props) {
  const [json, setJson] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'preview' | 'json'>('preview');

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRecipe = async () => {
      try {
        setStatus('loading');
        setError(null);
        const db = getFirestoreClient();
        const snapshot = await getDoc(doc(db, 'recipes', slug));
        if (!snapshot.exists()) {
          const resolved = await resolveRecipeSlugByHistory(db, slug);
          if (resolved && resolved !== slug && typeof window !== 'undefined') {
            window.location.hash = `#/edit/${resolved}`;
            return;
          }
          throw new Error('Receptet kunde inte hittas.');
        }
        const parsed = recipeSchema.parse(normalizeLegacyRecipeForRead(snapshot.data()));
        if (!isMounted) return;
        setJson(recipeToJson(parsed));
        setTitle(parsed.title);
        setStatus('ready');
      } catch (fetchError) {
        if (!isMounted) return;
        setStatus('error');
        setError((fetchError as Error).message);
      }
    };
    fetchRecipe();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (current) {
        setUser(current);
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || typeof window === 'undefined') {
      return;
    }

    const intentSlug = window.sessionStorage.getItem(STUDIO_MOBILE_QUICK_EDIT_INTENT_KEY);
    if (intentSlug !== slug) {
      return;
    }

    window.sessionStorage.removeItem(STUDIO_MOBILE_QUICK_EDIT_INTENT_KEY);

    if (window.matchMedia('(max-width: 960px)').matches) {
      window.location.assign(getRecipeQuickEditPath(slug));
    }
  }, [authStatus, slug]);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
  };

  const showMobileLockedShell = authStatus !== 'authenticated';
  const mobileLockedTitle = status === 'ready' && title ? title : 'Redigera recept';
  const mobileLockedSubtitle =
    status === 'ready' && title
      ? `Logga in för att fortsätta redigera ${title} från mobilen.`
      : 'Logga in för att fortsätta redigera receptet från mobilen.';

  const { name: profileName, initial: profileInitial } = getUserDisplay(user);

  const navSections = useMemo(
    () => [
      {
        id: 'import',
        label: 'Importera',
        iconClass: 'fa-solid fa-file-import',
        children: [
          { id: 'wordpress', label: 'WordPress', description: 'Klistra in länk', disabled: true },
          { id: 'chatgpt', label: 'ChatGPT', description: 'Prompt + text', disabled: true },
          { id: 'manual', label: 'JSON', description: 'Klistra in manuellt', disabled: true },
        ],
      },
      {
        id: 'workspace',
        label: 'Workspace',
        iconClass: 'fa-solid fa-laptop-code',
        children: [
          { id: 'preview', label: 'Review', description: 'Redigera & spara' },
          { id: 'json', label: 'JSON', description: 'Rådata' },
        ],
      },
    ],
    [],
  );

  const sidebarFooter = (
    <>
      {authStatus === 'loading' && (
        <Text size="sm" c="dimmed">
          Kontrollerar behörighet…
        </Text>
      )}
      {authStatus === 'unauthenticated' && (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Logga in i huvudrutan för att låsa upp studion.
          </Text>
          <Button type="button" variant="light" color="gray" onClick={handleBack}>
            Tillbaka
          </Button>
        </Stack>
      )}
      {authStatus === 'authenticated' && (
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap">
            <Avatar color="studioBlue" radius="xl">
              {profileInitial}
            </Avatar>
            <div>
              <Text fw={600}>{profileName}</Text>
              <Text size="sm" c="dimmed">
                {user?.email ?? ''}
              </Text>
            </div>
          </Group>
          <Divider />
          <BackupRecipesButton />
          <Divider />
          <Group grow>
            <Button type="button" variant="light" color="gray" onClick={handleBack}>
              Tillbaka
            </Button>
            <Button type="button" variant="subtle" color="red" onClick={handleLogout}>
              Logga ut
            </Button>
          </Group>
        </Stack>
      )}
    </>
  );

  const contentClass = 'new-recipe-shell__content new-recipe-shell__content--locked';

  return (
    <StudioMantineProvider>
      {showMobileLockedShell && (
        <div className="studio-mobile-locked-only">
          <StudioLockedMobileShell title={mobileLockedTitle} subtitle={mobileLockedSubtitle} onBack={handleBack}>
            <StudioLoginCard
              status={authStatus}
              title="Logga in för att fortsätta"
              subtitle="Använd ett av snabbkontona eller valfri e-post. När du är inne stannar du kvar i samma redigeringsvy."
              compact
              embedded
            />
          </StudioLockedMobileShell>
        </div>
      )}

      <div className={`new-recipe-shell ${showMobileLockedShell ? 'studio-shell--desktop-when-locked' : ''}`}>
        <StudioSidebar
          title="Redigera recept"
          navSections={navSections}
          activeId={activeView}
          onSelect={(id) => setActiveView(id as 'preview' | 'json')}
          footer={sidebarFooter}
        />

        <div className={contentClass}>
          {status === 'loading' && (
            <div className="new-recipe-workspace">
              <Paper withBorder shadow="sm" radius="xl" p="lg">
                <Text c="dimmed">Laddar recept…</Text>
              </Paper>
            </div>
          )}
          {status === 'error' && (
            <div className="new-recipe-workspace">
              <Alert color="red" variant="light">
                {error ?? 'Kunde inte läsa receptet.'}
              </Alert>
            </div>
          )}
          {status === 'ready' && json && (
            <>
            {authStatus === 'authenticated' ? (
              <>
                {activeView === 'preview' && (
                  <section className="preview-wall">
                    <EditorShell initialJson={json} initialTitle={title} mode="edit" forcedTab="form" />
                  </section>
                )}
                {activeView === 'json' && (
                  <section className="preview-wall">
                    <EditorShell initialJson={json} initialTitle={title} mode="edit" forcedTab="json" />
                  </section>
                )}
              </>
            ) : (
              <StudioLoginCard
                status={authStatus}
                onBack={handleBack}
                title="Logga in för att redigera"
                subtitle="Snabbinloggning med färdiga konton eller valfri e-post. Lösenord krävs alltid."
              />
            )}
            </>
          )}
        </div>
      </div>
    </StudioMantineProvider>
  );
}

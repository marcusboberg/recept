'use client';

import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Code, Divider, Group, List, Paper, Stack, Text, Textarea, ThemeIcon, Title } from '@mantine/core';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { ChatPromptCard } from './ChatPromptCard';
import { BackupRecipesButton } from './BackupRecipesButton';
import { EditorShell } from './EditorShell';
import { WordPressImportCard } from './WordPressImportCard';
import { IcaImportCard } from './IcaImportCard';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import { getUserDisplay } from '@/lib/userDisplay';
import { StudioSidebar } from './StudioSidebar';
import { StudioLoginCard } from './StudioLoginCard';
import { StudioMantineProvider } from './StudioMantineProvider';
import { StudioPageHeader } from './StudioPageHeader';
import { StudioSectionCard } from './StudioSectionCard';
import { StudioLockedMobileShell } from './StudioLockedMobileShell';

interface Props {
  initialJson: string;
  initialTitle: string;
}

type ImportView = 'wordpress' | 'ica' | 'chatgpt' | 'manual' | 'preview' | 'json';

function ManualJsonCard({ onImport }: { onImport: (json: string, title: string) => void }) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleLoad = () => {
    if (!value.trim()) {
      setStatus('Klistra in JSON först.');
      return;
    }
    onImport(value, 'Manuell JSON');
    setStatus('JSON laddad i editorn.');
  };

  return (
    <StudioSectionCard
      title="Klistra in JSON"
      description="Hoppa över importflöden och öppna receptet direkt i editorn."
      iconClass="fa-solid fa-brackets-curly"
    >
      <Stack gap="md">
        <Textarea
          rows={10}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='{ "title": "Ny rätt", ... }'
        />
        <Group gap="sm" align="center">
          <Button type="button" color="studioBlue" onClick={handleLoad}>
            Ladda i editor
          </Button>
          {status ? (
            <Text size="sm" c="dimmed">
              {status}
            </Text>
          ) : null}
        </Group>
      </Stack>
    </StudioSectionCard>
  );
}

export function NewRecipeSection({ initialJson, initialTitle }: Props) {
  const [editorPayload, setEditorPayload] = useState({ json: initialJson, title: initialTitle });
  const [editorKey, setEditorKey] = useState(0);
  const [activeView, setActiveView] = useState<ImportView>('wordpress');
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<User | null>(null);

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

  const handleImport = (json: string, title: string) => {
    setEditorPayload({ json, title });
    setEditorKey((value) => value + 1);
    setActiveView('preview');
  };

  const navSections = useMemo(
    () => [
      {
        id: 'import',
        label: 'Importera',
        iconClass: 'fa-solid fa-file-import',
        children: [
          { id: 'wordpress' as const, label: 'WordPress', description: 'Klistra in länk' },
          { id: 'ica' as const, label: 'ICA.se', description: 'JSON-LD' },
          { id: 'chatgpt' as const, label: 'ChatGPT', description: 'Prompt + text' },
          { id: 'manual' as const, label: 'JSON', description: 'Klistra in manuellt' },
        ],
      },
      {
        id: 'workspace',
        label: 'Workspace',
        iconClass: 'fa-solid fa-laptop-code',
        children: [
          { id: 'preview' as const, label: 'Review', description: 'Redigera & spara' },
          { id: 'json' as const, label: 'JSON', description: 'Rådata' },
        ],
      },
    ],
    [],
  );

  const { name: profileName, initial: profileInitial } = getUserDisplay(user);

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
  };

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  const isAuthenticated = authStatus === 'authenticated';
  const showMobileLockedShell = !isAuthenticated;

  const contentClass =
    activeView === 'preview' || activeView === 'json'
      ? 'new-recipe-shell__content new-recipe-shell__content--locked'
      : 'new-recipe-shell__content';

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

  return (
    <StudioMantineProvider>
      {showMobileLockedShell && (
        <div className="studio-mobile-locked-only">
          <StudioLockedMobileShell
            title="Ny rätt"
            subtitle="Logga in för att importera, klistra in eller skapa ett nytt recept från mobilen utan att öppna hela studion först."
            onBack={handleBack}
          >
            <StudioLoginCard
              status={authStatus}
              title="Logga in för att fortsätta"
              subtitle="När du är inne kan du direkt importera eller skapa ett nytt recept."
              compact
              embedded
            />
          </StudioLockedMobileShell>
        </div>
      )}

      <div className={`new-recipe-shell ${showMobileLockedShell ? 'studio-shell--desktop-when-locked' : ''}`}>
        <StudioSidebar
          title="Ny rätt"
          navSections={navSections}
          activeId={activeView}
          onSelect={(id) => setActiveView(id as ImportView)}
          footer={sidebarFooter}
        />
        <div className={contentClass}>
          {!isAuthenticated && <StudioLoginCard status={authStatus} onBack={handleBack} />}
          {isAuthenticated && (
            <>
            {activeView === 'wordpress' && (
              <section className="new-recipe-workspace">
                <StudioPageHeader
                  eyebrow="WordPress"
                  iconClass="fa-brands fa-wordpress"
                  badge="Automatisk import"
                  title="Klistra in länken och låt studion bygga receptet."
                  description="Använd den här vyn när receptet redan finns på recept.marcusboberg.se. Flödet är gjort för att få dig till editorn snabbt med så lite manuellt arbete som möjligt."
                />
                <div className="workspace-single">
                  <WordPressImportCard onImport={handleImport} />
                </div>
              </section>
            )}

            {activeView === 'ica' && (
              <section className="new-recipe-workspace">
                <StudioPageHeader
                  eyebrow="ICA.se"
                  iconClass="fa-solid fa-cart-shopping"
                  badge="JSON-LD import"
                  title="Låt ICA-data bli ett redigerbart recept."
                  description="När ett recept finns på ica.se kan vi läsa dess strukturerade metadata, mappa om det till ert format och öppna det direkt i studion."
                />
                <div className="workspace-single">
                  <IcaImportCard onImport={handleImport} />
                </div>
              </section>
            )}

            {activeView === 'chatgpt' && (
              <section className="new-recipe-workspace">
                <StudioPageHeader
                  eyebrow="ChatGPT"
                  iconClass="fa-solid fa-sparkles"
                  badge="Halvautomatisk"
                  title="Förvandla fritext till recept-JSON."
                  description="Det här läget passar när du bara har rå text, anteckningar eller ett recept från en källa vi inte importerar direkt. Studion hjälper dig att paketera rätt prompt och sedan fortsätter du i editorn."
                />
                <div className="workspace-grid">
                  <ChatPromptCard
                    defaultOpen={false}
                    title="Skicka till ChatGPT"
                    subtitle="Studion ger dig en färdig prompt och tar dig sedan vidare till preview när du har JSON-svaret."
                    prompt={`Du är en formatkonverterare som tar ett recept i fritext och svarar med exakt JSON för webbplatsen Recept. Svara ALLTID med ett enda kodblock \`\`\`json ... \`\`\` (inga kommentarer, ingen extra text).

1) Läs texten och hämta titel, beskrivning, tider, portioner, ingredienser (ev. grupper) och steg.
2) Returnera giltig JSON med strukturen:
{
  "title": "",
  "slug": "",
  "description": "",
  "imageUrl": "/images/recipes/new-recipe.jpg",
  "categoryPlace": "",
  "categoryBase": "",
  "isDrink": false,
  "categories": [],
  "prepTimeMinutes": 0,
  "cookTimeMinutes": 0,
  "servings": 0,
  "ingredients": [{ "label": "", "amount": "", "notes": "" }],
  "ingredientGroups": [{ "title": "", "items": [{ "label": "", "amount": "", "notes": "" }] }],
  "steps": [{ "title": "", "body": "" }],
  "source": "",
  "createdAt": "",
  "updatedAt": ""
}

Regler:
- Behåll svensk stavning/diakritik i text (endast raka ASCII-citattecken runt nycklar/värden).
- "slug" = kebab-case av titeln (endast a-z, 0-9, bindestreck). Konvertera å/ä/ö → a, övriga accenter till närmaste ASCII.
- "categoryPlace" (plats) och "categoryBase" (basvara) måste alltid fyllas.
- "isDrink": true för drinkar, annars false.
- Lägg bara in extra etiketter i "categories" när de inte redan täcks av plats, basvara eller Drinkar.
- Tider: heltal minuter, sätt 0 om saknas.
- "servings": heltal >= 1. Om okänt, sätt 4.
- "ingredients": alltid minst ett objekt. Lämna bort fält som saknas (ingen tom sträng).
- "ingredientGroups": använd endast om texten har tydliga sektioner. Annars utelämna hela fältet (skriv inte en tom array).
- "steps": i rätt ordning. "title" valfri, "body" obligatorisk.
- "source": URL om den finns, annars utelämna.
- "createdAt"/"updatedAt": ISO 8601 i UTC (t.ex. 2024-01-05T12:00:00.000Z). Använd dagens datum om inget anges.
- Svara ENDAST med JSON-objektet, inga kommentarer eller extra tecken.`}
                  />
                  <StudioSectionCard
                    title="Vad du får ut"
                    description="Följ samma flöde varje gång så blir resultatet mer förutsägbart."
                    iconClass="fa-solid fa-list-check"
                  >
                    <List
                      spacing="sm"
                      icon={
                        <ThemeIcon color="studioBlue" size={22} radius="xl" variant="light">
                          <i className="fa-solid fa-check" aria-hidden="true" />
                        </ThemeIcon>
                      }
                    >
                      <List.Item>Rätt fältnamn för ert receptschema</List.Item>
                      <List.Item>Tvingade kategorier, tider och portioner</List.Item>
                      <List.Item>JSON som kan klistras direkt in i studion</List.Item>
                    </List>
                    <Text size="sm" c="dimmed">
                      Viktigt: om modellen svarar med extra text, be om endast ett JSON-objekt eller ett enda <Code>json</Code>-block.
                    </Text>
                  </StudioSectionCard>
                </div>
              </section>
            )}

            {activeView === 'manual' && (
              <section className="new-recipe-workspace">
                <StudioPageHeader
                  eyebrow="Manuell JSON"
                  iconClass="fa-solid fa-brackets-curly"
                  badge="Direktläge"
                  title="Klistra in färdig JSON och gå vidare."
                  description="När du redan har receptet i rätt format behöver du inte gå omvägen via importer eller ChatGPT. Det här är det snabbaste sättet in i editorn."
                  aside={
                    <Button type="button" variant="light" color="gray" radius="xl" onClick={() => setActiveView('preview')}>
                      Till preview
                    </Button>
                  }
                />
                <div className="workspace-grid">
                  <ManualJsonCard onImport={handleImport} />
                  <StudioSectionCard
                    title="Tips innan du går vidare"
                    description="De här tre sakerna sparar flest minuter senare i flödet."
                    iconClass="fa-solid fa-lightbulb"
                  >
                    <List
                      spacing="sm"
                      icon={
                        <ThemeIcon color="studioBlue" size={22} radius="xl" variant="light">
                          <i className="fa-solid fa-check" aria-hidden="true" />
                        </ThemeIcon>
                      }
                    >
                      <List.Item>
                        Fyll alltid i <Code>createdAt</Code> och <Code>updatedAt</Code> med ISO-datum.
                      </List.Item>
                      <List.Item>
                        Glöm inte <Code>slug</Code> eftersom den används i URL:en.
                      </List.Item>
                      <List.Item>
                        Om du saknar grupper, ta bort hela <Code>ingredientGroups</Code>-fältet.
                      </List.Item>
                    </List>
                    <Text size="sm" c="dimmed">
                      Efter import kan du öppna preview och göra resten visuellt i editorn.
                    </Text>
                  </StudioSectionCard>
                </div>
              </section>
            )}

            {activeView === 'preview' && (
              <section className="preview-wall">
                <EditorShell key={editorKey} initialJson={editorPayload.json} initialTitle={editorPayload.title} mode="new" forcedTab="form" />
              </section>
            )}

            {activeView === 'json' && (
              <section className="preview-wall">
                <EditorShell key={`${editorKey}-json`} initialJson={editorPayload.json} initialTitle={editorPayload.title} mode="new" forcedTab="json" />
              </section>
            )}
            </>
          )}
        </div>
      </div>
    </StudioMantineProvider>
  );
}

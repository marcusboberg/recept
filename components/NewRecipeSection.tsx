'use client';

import { useState } from 'react';
import { ChatPromptCard } from './ChatPromptCard';
import { EditorShell } from './EditorShell';
import { WordPressImportCard } from './WordPressImportCard';

interface Props {
  initialJson: string;
  initialTitle: string;
}

export function NewRecipeSection({ initialJson, initialTitle }: Props) {
  const [editorPayload, setEditorPayload] = useState({ json: initialJson, title: initialTitle });
  const [editorKey, setEditorKey] = useState(0);

  const handleImport = (json: string, title: string) => {
    setEditorPayload({ json, title });
    setEditorKey((value) => value + 1);
  };

  return (
    <>
      <ChatPromptCard
        prompt={`Du är en formatkonverterare som tar ett recept i fritext och svarar med exakt JSON för webbplatsen Recept.

1. Läs texten och hämta titel, beskrivning, tid, portioner, ingredienser, ev. grupper och steg.
2. Ge mig giltig JSON och INGEN annan text. Använd följande struktur och fyll alla fält:
{
  "title": "",
  "slug": "",
  "description": "",
  "imageUrl": "/images/recipes/new-recipe.jpg",
  "tags": [],
  "prepTimeMinutes": 0,
  "cookTimeMinutes": 0,
  "servings": 0,
  "ingredients": [
    { "label": "", "amount": "", "notes": "" }
  ],
  "ingredientGroups": [
    {
      "title": "",
      "items": [{ "label": "", "amount": "", "notes": "" }]
    }
  ],
  "steps": [
    { "title": "", "body": "" }
  ],
  "source": "",
  "createdAt": "",
  "updatedAt": ""
}

Regler:
- "slug" ska vara titeln i kebab-case (små bokstäver, siffror och bindestreck).
- "tags" är 3–5 korta etiketter, skrivna i engelska eller svenska beroende på texten.
- Tider anges i heltal minuter. Sätt 0 om texten saknar information.
- "imageUrl" är en URL. Behåll default-värdet om inget anges.
- Använd ENDAST raka ASCII-citattecken (") runt alla strängar och nycklar.
- Svara som ett rent \`\`\`json ... \`\`\`-block (inga andra tecken före eller efter) så att alla citattecken förblir ASCII.
- "ingredients" är alltid en lista med { label, amount?, notes? }. Lämna bort fält som saknar värde (ingen tom sträng).
- Använd "ingredientGroups" endast om texten har tydliga sektioner; annars utelämna hela fältet.
- "steps" är i rätt ordning. "title" är valfri, "body" ska alltid fyllas.
- "source" ska vara en URL om den finns, annars utelämna fältet.
- "createdAt" och "updatedAt" är ISO 8601 i UTC (t.ex. 2024-01-05T12:00:00.000Z). Använd dagens datum om texten saknar datum.
- Svara aldrig med kommentarer eller Markdown, endast ren JSON.`}
      />
      <WordPressImportCard onImport={handleImport} />
      <EditorShell key={editorKey} initialJson={editorPayload.json} initialTitle={editorPayload.title} mode="new" />
    </>
  );
}

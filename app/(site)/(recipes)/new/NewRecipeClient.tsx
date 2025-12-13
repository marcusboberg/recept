'use client';

import { useState } from 'react';
import { ChatPromptCard } from '@/components/ChatPromptCard';
import { EditorShell } from '@/components/EditorShell';
import { WordPressImportCard } from '@/components/WordPressImportCard';

interface Props {
  prompt: string;
  initialJson: string;
  initialTitle: string;
}

export function NewRecipeClient({ prompt, initialJson, initialTitle }: Props) {
  const [editorPayload, setEditorPayload] = useState({ json: initialJson, title: initialTitle });
  const [editorKey, setEditorKey] = useState(0);

  const handleImport = (json: string, title: string) => {
    setEditorPayload({ json, title });
    setEditorKey((value) => value + 1);
  };

  return (
    <>
      <ChatPromptCard prompt={prompt} />
      <WordPressImportCard onImport={handleImport} />
      <EditorShell key={editorKey} initialJson={editorPayload.json} initialTitle={editorPayload.title} mode="new" />
    </>
  );
}

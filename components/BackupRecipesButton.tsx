'use client';

import { useState } from 'react';
import { Button, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getFirestoreClient } from '@/lib/firebaseClient';
import { normalizeLegacyRecipeForRead } from '@/lib/legacyRecipes';
import { recipeSchema, type Recipe } from '@/schema/recipeSchema';

function createBackupPayload(recipes: Recipe[]) {
  return {
    exportedAt: new Date().toISOString(),
    source: 'firestore',
    count: recipes.length,
    recipes,
  };
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function BackupRecipesButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setStatus(null);

    try {
      const db = getFirestoreClient();
      const recipesQuery = query(collection(db, 'recipes'), orderBy('title'));
      const snapshot = await getDocs(recipesQuery);
      const recipes: Recipe[] = [];
      let invalidCount = 0;

      snapshot.forEach((docSnapshot) => {
        const parsed = recipeSchema.safeParse(normalizeLegacyRecipeForRead(docSnapshot.data()));
        if (parsed.success) {
          recipes.push(parsed.data);
        } else {
          invalidCount += 1;
        }
      });

      const filename = `recipes-backup-${timestampForFilename()}.json`;
      downloadJson(filename, createBackupPayload(recipes));

      const message =
        invalidCount > 0
          ? `Laddade ner ${recipes.length} recept. ${invalidCount} ogiltiga dokument hoppades over.`
          : `Laddade ner ${recipes.length} recept som JSON-backup.`;

      notifications.show({
        title: 'Backup skapad',
        message,
        color: invalidCount > 0 ? 'yellow' : 'studioBlue',
      });

      if (invalidCount > 0) {
        setStatus(message);
      } else {
        setStatus(message);
      }
    } catch (error) {
      const message = (error as Error).message || 'Kunde inte skapa backup.';
      setStatus(message);
      notifications.show({
        title: 'Backup misslyckades',
        message,
        color: 'red',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        className="studio-sidebar__backup-button"
        variant="filled"
        color="studioBlue"
        fullWidth
        radius="xl"
        size="md"
        leftSection={<i className="fa-solid fa-download" aria-hidden="true"></i>}
        onClick={handleExport}
        loading={isExporting}
      >
        {isExporting ? 'Skapar backup...' : 'Ladda ner backup'}
      </Button>
      {status ? (
        <Text size="sm" c="dimmed" mt="xs">
          {status}
        </Text>
      ) : null}
    </div>
  );
}

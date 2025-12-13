import fs from 'fs/promises';
import path from 'path';
import { fetchAllRecipes, fetchRecipe as fetchRemote, listRecipeFiles } from '@/lib/github';
import { parseRecipe } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';

const hasGitHubConfig = Boolean(process.env.GITHUB_OWNER && process.env.GITHUB_REPO);

export async function loadAllRecipes(): Promise<Recipe[]> {
  if (hasGitHubConfig) {
    try {
      return await fetchAllRecipes();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Falling back to local recipes', error);
    }
  }
  const dir = path.join(process.cwd(), 'data/recipes');
  const files = await fs.readdir(dir);
  const recipes: Recipe[] = [];
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    const content = await fs.readFile(path.join(dir, file), 'utf8');
    const parsed = parseRecipe(content);
    if (parsed.recipe) {
      recipes.push(parsed.recipe);
    }
  }
  return recipes;
}

export async function loadRecipe(slug: string): Promise<Recipe> {
  if (hasGitHubConfig) {
    try {
      return await fetchRemote(slug);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Remote fetch failed, using local', error);
    }
  }
  const file = path.join(process.cwd(), 'data/recipes', `${slug}.json`);
  const content = await fs.readFile(file, 'utf8');
  const parsed = parseRecipe(content);
  if (!parsed.recipe) {
    throw new Error(parsed.errors?.join('\n') ?? 'Invalid recipe');
  }
  return parsed.recipe;
}

export async function listLocalRecipeSlugs(): Promise<string[]> {
  if (hasGitHubConfig) {
    try {
      const files = await listRecipeFiles();
      return files.map((file) => file.replace('.json', ''));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Remote listing failed, using local', error);
    }
  }
  const dir = path.join(process.cwd(), 'data/recipes');
  const files = await fs.readdir(dir);
  return files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));
}

import { parseRecipe, recipeToJson } from '@/lib/recipes';
import type { Recipe } from '@/schema/recipeSchema';

const owner = process.env.GITHUB_OWNER ?? '';
const repo = process.env.GITHUB_REPO ?? '';
const branch = process.env.GITHUB_BRANCH ?? 'main';
const token = process.env.GITHUB_TOKEN ?? '';
const allowedUsers = (process.env.ALLOWED_USERS ?? '').split(',').map((u) => u.trim()).filter(Boolean);

if (!owner || !repo) {
  // eslint-disable-next-line no-console
  console.warn('GITHUB_OWNER and GITHUB_REPO must be set for GitHub integration');
}

const baseHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

if (token) {
  baseHeaders.Authorization = `Bearer ${token}`;
}

export async function fetchGitHubUser(): Promise<{ login: string } | null> {
  if (!token) return null;
  const res = await fetch('https://api.github.com/user', { headers: baseHeaders });
  if (!res.ok) return null;
  return res.json();
}

export function isUserAllowed(user: { login: string } | null): boolean {
  if (!user) return false;
  return allowedUsers.length === 0 || allowedUsers.includes(user.login);
}

export async function listRecipeFiles(): Promise<string[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/recipes?ref=${branch}`, {
    headers: baseHeaders,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Unable to read recipe directory from GitHub');
  }
  const files = await res.json();
  return (files as Array<{ name: string }>).filter((file) => file.name.endsWith('.json')).map((file) => file.name);
}

export async function fetchRecipe(slug: string): Promise<Recipe> {
  const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/recipes/${slug}.json`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Recipe not found');
  }
  const json = await res.text();
  const parsed = parseRecipe(json);
  if (!parsed.recipe) {
    throw new Error(parsed.errors?.join('\n') ?? 'Invalid recipe');
  }
  return parsed.recipe;
}

export async function fetchAllRecipes(): Promise<Recipe[]> {
  const names = await listRecipeFiles();
  const results = await Promise.allSettled(names.map((name) => fetchRecipe(name.replace('.json', ''))));
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

interface CommitOptions {
  recipe: Recipe;
  path: string;
  message: string;
  sha?: string;
}

export async function commitRecipe({ recipe, path, message, sha }: CommitOptions): Promise<void> {
  if (!token) throw new Error('GITHUB_TOKEN is required to commit');
  const encode = (input: string) => {
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(input)));
    }
    return Buffer.from(input).toString('base64');
  };
  const content = encode(recipeToJson(recipe));
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content,
      branch,
      sha,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub commit failed: ${res.status} ${body}`);
  }
}

export async function fetchFileSha(path: string): Promise<string | undefined> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers: baseHeaders });
  if (!res.ok) return undefined;
  const json = await res.json();
  return json.sha as string;
}

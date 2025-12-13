import fs from 'fs/promises';
import path from 'path';
import { recipeSchema } from '../schema/recipeSchema.ts';

async function main() {
  const dir = path.join(process.cwd(), 'data/recipes');
  const files = await fs.readdir(dir);
  const errors: string[] = [];

  for (const file of files.filter((name) => name.endsWith('.json'))) {
    const fullPath = path.join(dir, file);
    const content = await fs.readFile(fullPath, 'utf8');
    const parsed = recipeSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      errors.push(`${file}: ${parsed.error.flatten().formErrors.join('; ')} ${parsed.error.flatten().fieldErrors}`);
    }
  }

  if (errors.length > 0) {
    console.error('Invalid recipes:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('All recipes valid.');
}

main();

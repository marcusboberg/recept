import type { User } from 'firebase/auth';

const USER_ALIASES: Record<string, string> = {
  'marcusboberg@icloud.com': 'Marcus',
  'philip.ottosson@gmail.com': 'Philip',
};

export function getUserDisplay(user: User | null) {
  const email = user?.email ?? '';
  const name = USER_ALIASES[email] ?? email ?? user?.uid ?? 'User';
  const initial = name.charAt(0).toUpperCase();
  return { name, initial, email };
}

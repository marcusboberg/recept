const codeMap = new Map<string, string>();

(process.env.AUTH_CODES ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .forEach((entry) => {
    const [login, code] = entry.split(':').map((value) => value.trim());
    if (login && code) {
      codeMap.set(login, code);
    }
  });

export function isLoginAllowed(login: string | null | undefined): boolean {
  if (!login) return false;
  if (codeMap.size === 0) return false;
  return codeMap.has(login);
}

export function verifyLoginCode(login: string, code: string): boolean {
  const expected = codeMap.get(login);
  if (!expected) return false;
  return slowEqual(expected, code);
}

function slowEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

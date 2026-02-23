const ANONYMOUS_USER_KEY = 'anonymous_user_id';

export function getAnonymousUserId(): string {
  let anonymousId = localStorage.getItem(ANONYMOUS_USER_KEY);

  if (anonymousId && anonymousId.startsWith('anon_')) {
    anonymousId = null;
    localStorage.removeItem(ANONYMOUS_USER_KEY);
  }

  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_USER_KEY, anonymousId);
  }

  return anonymousId;
}

export function clearAnonymousUserId(): void {
  localStorage.removeItem(ANONYMOUS_USER_KEY);
}

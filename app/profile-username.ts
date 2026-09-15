/** Supabase password auth uses an internal, non-deliverable email identifier. */
export function profileUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    throw new Error('Use 3–32 letters, numbers, or underscores for your username.');
  }
  return username;
}

export function profileAuthIdentifier(value: string) {
  return `${profileUsername(value)}@profiles.glp1.invalid`;
}

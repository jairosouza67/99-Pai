export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked =
    local.length <= 2
      ? '*'.repeat(local.length)
      : local.slice(0, 2) + '*'.repeat(Math.min(local.length - 2, 5));
  return `${masked}@${domain}`;
}

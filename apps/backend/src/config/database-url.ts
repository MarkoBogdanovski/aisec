export type DatabaseUrlTarget = 'runtime' | 'direct';

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function resolveDatabaseProvider(): string {
  return readEnv('DATABASE_PROVIDER') || 'postgres';
}

export function resolveDatabaseUrl(target: DatabaseUrlTarget = 'runtime'): string {
  const provider = resolveDatabaseProvider().toLowerCase();

  if (provider === 'supabase') {
    if (target === 'direct') {
      return (
        readEnv('SUPABASE_DIRECT_URL') ||
        readEnv('DATABASE_DIRECT_URL') ||
        readEnv('SUPABASE_DATABASE_URL') ||
        readEnv('DATABASE_URL') ||
        ''
      );
    }

    return readEnv('SUPABASE_DATABASE_URL') || readEnv('DATABASE_URL') || '';
  }

  if (target === 'direct') {
    return readEnv('DATABASE_DIRECT_URL') || readEnv('DATABASE_URL') || '';
  }

  return readEnv('DATABASE_URL') || '';
}

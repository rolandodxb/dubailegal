/**
 * Reports what the application is actually connected to.
 *
 *   npm run db:check
 *
 * Useful before and after moving to Supabase: it says which host and database
 * answered, whether the connection is pooled, what migrations have been applied,
 * and whether the tables are visible — which is the question that matters when
 * the pooler is connected as the wrong role.
 *
 * It makes no changes. Nothing here writes to the database.
 */

process.loadEnvFile('.env');

async function main(): Promise<void> {
  const { prisma } = await import('../src/lib/db');

  const [identity] = await prisma.$queryRaw<
    { database: string; role: string; version: string; host: string | null; port: number | null }[]
  >`select current_database() as database,
           current_user as role,
           version() as version,
           inet_server_addr()::text as host,
           inet_server_port() as port`;

  console.info('\nDatabase connection\n');
  console.info(`  database   ${identity.database}`);
  console.info(`  role       ${identity.role}`);
  console.info(`  server     ${identity.host ?? 'not reported'}:${identity.port ?? '?'}`);
  console.info(`  version    ${identity.version.split(',')[0]}`);

  const describe = (name: string, raw: string | undefined) => {
    if (!raw) return console.info(`  ${name.padEnd(10)} — not set`);
    let parsed: URL | null = null;
    try {
      parsed = new URL(raw);
    } catch {
      return console.info(`  ${name.padEnd(10)} — unreadable`);
    }
    const supabase = parsed.hostname.includes('supabase');
    const pooled = parsed.hostname.includes('pooler') || parsed.port === '6543';
    console.info(
      `  ${name.padEnd(10)} ${parsed.hostname}:${parsed.port || '5432'}` +
        `${supabase ? ' · supabase' : ''}${pooled ? ' · pooled' : ''}${
          parsed.searchParams.get('pgbouncer') ? ' · pgbouncer=true' : ''
        }`,
    );
  };

  console.info('\nConfigured URLs\n');
  describe('url', process.env.DATABASE_URL);
  describe('directUrl', process.env.DIRECT_URL);

  const migrations = await prisma.$queryRaw<{ count: bigint }[]>`
    select count(*)::bigint as count from _prisma_migrations where finished_at is not null`;
  const tables = await prisma.$queryRaw<{ count: bigint }[]>`
    select count(*)::bigint as count
      from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'`;

  const latest = await prisma.$queryRaw<{ migration_name: string; finished_at: Date }[]>`
    select migration_name, finished_at from _prisma_migrations
     where finished_at is not null order by finished_at desc limit 1`;

  console.info('\nSchema\n');
  console.info(`  tables     ${Number(tables[0]!.count)}`);
  console.info(`  migrations ${Number(migrations[0]!.count)} applied`);
  if (latest[0]) {
    console.info(`  latest     ${latest[0].migration_name} (${latest[0].finished_at.toISOString()})`);
  }

  // The tables existing but being invisible is the classic pooled-connection
  // mistake: the app connects as a role that cannot see the schema.
  if (Number(tables[0]!.count) === 0) {
    console.error(
      '\nNo tables are visible. Either the migrations have not been applied to this database,\n' +
        'or the role in DATABASE_URL cannot see the public schema.',
    );
    process.exitCode = 1;
  }

  // Encryption is the other thing that has to be right before going live.
  const { encryptionKeySource } = await import('../src/lib/crypto');
  const source = encryptionKeySource();
  console.info('\nEncryption at rest\n');
  console.info(
    source === 'environment'
      ? '  ENCRYPTION_KEY is set: files and messages are encrypted under it.'
      : '  ENCRYPTION_KEY is not set: a key is being derived from APP_SECRET. Set one before going live.',
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\nCould not reach the database:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

export {};

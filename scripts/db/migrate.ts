import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sql from './client.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

await sql.unsafe(schema);
console.log('✓ Schema sukurta');
await sql.end();

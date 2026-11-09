import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const users = await sql`SELECT id, name, email, role FROM "user"`;
console.log('All Users in DB:', users);

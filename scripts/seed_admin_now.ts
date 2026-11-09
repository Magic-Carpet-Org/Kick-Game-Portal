import { auth } from '../src/lib/auth';
import { sql } from '../src/lib/db';

async function seedAdmin() {
  const email = 'admin@kick.com';
  const password = 'password123';
  const name = 'Kick Super Admin';

  console.log(`Checking if ${email} already exists...`);
  const existing = await sql`SELECT id, email, role FROM "user" WHERE email = ${email}`;

  let userId: string;

  if (existing.length > 0) {
    console.log(`User ${email} already exists with id ${existing[0].id}. Updating role to admin...`);
    userId = existing[0].id;
  } else {
    console.log(`Creating user ${email} via Better Auth...`);
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!res || !res.user) {
      throw new Error('Failed to create admin user');
    }
    userId = res.user.id;
    console.log(`Created user ${email} with id ${userId}`);
  }

  // Elevate to admin
  await sql`
    UPDATE "user"
    SET role = 'admin',
        "emailVerified" = true,
        "updatedAt" = NOW()
    WHERE id = ${userId};
  `;

  console.log('Successfully set role = admin for:', email);
  
  const verify = await sql`SELECT id, name, email, role FROM "user" WHERE id = ${userId}`;
  console.log('Verification:', verify);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});


import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { auth } from '../src/lib/auth';

async function testSignUp() {
  console.log("Testing Better Auth sign up in Neon...");
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: `testgamer_${Date.now()}@kick.com`,
        password: "Password123!",
        name: "Test Gamer",
        username: "testgamer",
        phone: "08012345678",
      }
    });

    console.log("Sign up result:", res);
    console.log("✅ Better Auth sign up succeeded with 0 schema errors!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Sign up failed:", err);
    process.exit(1);
  }
}

testSignUp();


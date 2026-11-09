import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { auth } from '../src/lib/auth.js';

async function testSignUp() {
  console.log("Testing Better Auth sign up in Neon...");
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: "testgamer@kick.com",
        password: "Password123!",
        name: "Test Gamer",
        username: "testgamer",
        phone: "08012345678",
      }
    });

    console.log("Sign up result:", res);
    console.log("✅ Sign up succeeded!");
  } catch (err) {
    console.error("❌ Sign up failed:", err);
  }
}

testSignUp();


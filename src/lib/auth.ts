import { betterAuth } from 'better-auth';
import { pool } from './db';

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
      },
      role: {
        type: 'string',
        defaultValue: 'user', // 'user' | 'admin' | 'subadmin'
      },
      location: {
        type: 'string',
        required: false,
      },
      username: {
        type: 'string',
        required: false,
      },
    },
  },
});


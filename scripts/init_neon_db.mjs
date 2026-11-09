import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function initDatabase() {
  console.log('🚀 Initializing Neon Database Schema for Kick Game Portal...');

  try {
    // 1. Enable UUID Extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    // 2. Better Auth Tables
    console.log('📦 Creating Better Auth tables...');

    await sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        "image" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "phone" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user',
        "location" TEXT,
        "username" TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "scope" TEXT,
        "password" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" TEXT PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 3. Kick Game Portal Core Tables
    console.log('🎮 Creating Kick Game Portal domain tables...');

    // Games Table
    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        game_image_url TEXT,
        game_url TEXT NOT NULL,
        version VARCHAR(50) DEFAULT '1.0.0',
        status VARCHAR(50) DEFAULT 'published',
        webhook_secret TEXT NOT NULL,
        integration_status VARCHAR(50) DEFAULT 'testing',
        total_sessions_completed INTEGER DEFAULT 0,
        last_event_received_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Collections Table
    await sql`
      CREATE TABLE IF NOT EXISTS collections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Collection Games Junction
    await sql`
      CREATE TABLE IF NOT EXISTS collection_games (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(collection_id, game_id)
      );
    `;

    // Game Sessions (Pay-to-Play tracking, No Tournaments)
    await sql`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        mode VARCHAR(50) DEFAULT 'single_player',
        status VARCHAR(50) DEFAULT 'in_progress',
        session_token TEXT NOT NULL,
        score INTEGER DEFAULT NULL,
        is_personal_best BOOLEAN DEFAULT FALSE,
        best_score INTEGER DEFAULT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Intelli Subscriptions Table (MSISDN Direct Carrier Billing)
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        msisdn VARCHAR(32) NOT NULL,
        service_id INTEGER NOT NULL DEFAULT 82,
        sub_status VARCHAR(50) NOT NULL,
        telco VARCHAR(50),
        starts_date TIMESTAMP WITH TIME ZONE,
        ends_date TIMESTAMP WITH TIME ZONE,
        last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        raw_response JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Integration Logs Table
    await sql`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        game_id UUID REFERENCES games(id) ON DELETE SET NULL,
        endpoint VARCHAR(50) NOT NULL,
        status_code INTEGER NOT NULL,
        payload JSONB,
        error_message TEXT,
        signature_valid BOOLEAN,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // API Keys Table
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key TEXT UNIQUE NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        game_id UUID REFERENCES games(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 4. Create Indexes for Performance
    console.log('⚡ Creating database indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_game_sessions_user_game ON game_sessions(user_id, game_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(game_id, score DESC NULLS LAST);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_msisdn ON subscriptions(msisdn);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, sub_status);`;

    console.log('✅ All tables and indexes created successfully in Neon DB!');

    // Check tables in DB
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('📋 Current tables in Neon:', tables.map(t => t.table_name));

  } catch (err) {
    console.error('❌ Database Initialization Failed:', err);
    process.exit(1);
  }
}

initDatabase();


#!/usr/bin/env node

/**
 * Database Reset Script for Temporal Knowledge Graph
 * Clears all data from PostgreSQL database tables
 * WARNING: This permanently deletes all data!
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// Import schema
import { 
  companies, 
  people, 
  ratings, 
  employments, 
  transactions, 
  regulatoryEvents,
  queryHistory 
} from '../shared/schema.ts';

// Database connection (same pattern as server/db.ts)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { companies, people, ratings, employments, transactions, regulatoryEvents, queryHistory } });

async function resetDatabase() {
  try {
    console.log('⚠️  DANGER: Resetting database - this will delete ALL data!');
    console.log('');
    
    // Clear all data in reverse dependency order
    console.log('🧹 Clearing query history...');
    await db.delete(queryHistory);
    
    console.log('🧹 Clearing regulatory events...');
    await db.delete(regulatoryEvents);
    
    console.log('🧹 Clearing transactions...');
    await db.delete(transactions);
    
    console.log('🧹 Clearing employments...');
    await db.delete(employments);
    
    console.log('🧹 Clearing ratings...');
    await db.delete(ratings);
    
    console.log('🧹 Clearing people...');
    await db.delete(people);
    
    console.log('🧹 Clearing companies...');
    await db.delete(companies);

    // Verify reset
    console.log('🔍 Verifying database is empty...');
    const companiesCount = await db.select().from(companies);
    const peopleCount = await db.select().from(people);
    const ratingsCount = await db.select().from(ratings);
    const employmentsCount = await db.select().from(employments);
    const transactionsCount = await db.select().from(transactions);
    const eventsCount = await db.select().from(regulatoryEvents);
    const queryCount = await db.select().from(queryHistory);

    console.log('📊 Database state after reset:');
    console.log(`   Companies: ${companiesCount.length}`);
    console.log(`   People: ${peopleCount.length}`);
    console.log(`   Ratings: ${ratingsCount.length}`);
    console.log(`   Employments: ${employmentsCount.length}`);
    console.log(`   Transactions: ${transactionsCount.length}`);
    console.log(`   Regulatory Events: ${eventsCount.length}`);
    console.log(`   Query History: ${queryCount.length}`);

    console.log('');
    console.log('✅ Database reset completed successfully!');
    console.log('💡 Run "just seed" to populate with fresh data.');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase();
}

export default resetDatabase;
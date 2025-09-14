#!/usr/bin/env node

/**
 * Database Seeding Script for Temporal Knowledge Graph
 * Populates PostgreSQL database with financial domain data
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from 'ws';

// Import schema
import { 
  companies, 
  people, 
  ratings, 
  employments, 
  transactions, 
  regulatoryEvents 
} from '../shared/schema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection (same pattern as server/db.ts)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { companies, people, ratings, employments, transactions, regulatoryEvents } });

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding process...');
    
    // Load seed data
    const seedDataPath = join(__dirname, 'seed-data.json');
    const seedData = JSON.parse(readFileSync(seedDataPath, 'utf8'));
    
    console.log('📊 Seed data loaded:');
    console.log(`   - Companies: ${seedData.companies.length}`);
    console.log(`   - People: ${seedData.people.length}`);
    console.log(`   - Ratings: ${seedData.ratings.length}`);
    console.log(`   - Employments: ${seedData.employments.length}`);
    console.log(`   - Transactions: ${seedData.transactions.length}`);
    console.log(`   - Regulatory Events: ${seedData.regulatoryEvents.length}`);

    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...');
    await db.delete(regulatoryEvents);
    await db.delete(transactions);
    await db.delete(employments);
    await db.delete(ratings);
    await db.delete(people);
    await db.delete(companies);
    console.log('✅ Existing data cleared');

    // Insert data in dependency order
    
    // 1. Companies (no dependencies)
    console.log('🏢 Inserting companies...');
    for (const company of seedData.companies) {
      await db.insert(companies).values({
        id: company.id,
        name: company.name,
        ticker: company.ticker,
        sector: company.sector,
        industry: company.industry,
        marketCap: company.marketCap,
        foundedYear: company.foundedYear,
        headquarters: company.headquarters
      });
    }
    console.log(`✅ Inserted ${seedData.companies.length} companies`);

    // 2. People (no dependencies)
    console.log('👥 Inserting people...');
    for (const person of seedData.people) {
      await db.insert(people).values({
        id: person.id,
        name: person.name,
        title: person.title,
        age: person.age,
        nationality: person.nationality,
        education: person.education
      });
    }
    console.log(`✅ Inserted ${seedData.people.length} people`);

    // 3. Ratings (depends on companies)
    console.log('⭐ Inserting ratings...');
    for (const rating of seedData.ratings) {
      await db.insert(ratings).values({
        id: rating.id,
        companyId: rating.companyId,
        rating: rating.rating,
        ratingAgency: rating.ratingAgency,
        ratingType: rating.ratingType,
        validFrom: new Date(rating.validFrom),
        validTo: rating.validTo ? new Date(rating.validTo) : null
      });
    }
    console.log(`✅ Inserted ${seedData.ratings.length} ratings`);

    // 4. Employments (depends on people and companies)
    console.log('💼 Inserting employments...');
    for (const employment of seedData.employments) {
      await db.insert(employments).values({
        id: employment.id,
        personId: employment.personId,
        companyId: employment.companyId,
        position: employment.position,
        startDate: new Date(employment.startDate),
        endDate: employment.endDate ? new Date(employment.endDate) : null,
        salary: employment.salary
      });
    }
    console.log(`✅ Inserted ${seedData.employments.length} employments`);

    // 5. Transactions (depends on companies)
    console.log('💰 Inserting transactions...');
    for (const transaction of seedData.transactions) {
      await db.insert(transactions).values({
        id: transaction.id,
        type: transaction.type,
        acquirerId: transaction.acquirerId,
        targetId: transaction.targetId,
        value: transaction.value,
        currency: transaction.currency,
        status: transaction.status,
        announcedDate: transaction.announcedDate ? new Date(transaction.announcedDate) : null,
        completedDate: transaction.completedDate ? new Date(transaction.completedDate) : null,
        description: transaction.description
      });
    }
    console.log(`✅ Inserted ${seedData.transactions.length} transactions`);

    // 6. Regulatory Events (depends on companies)
    console.log('⚖️ Inserting regulatory events...');
    for (const event of seedData.regulatoryEvents) {
      await db.insert(regulatoryEvents).values({
        id: event.id,
        companyId: event.companyId,
        eventType: event.eventType,
        regulator: event.regulator,
        description: event.description,
        amount: event.amount,
        currency: event.currency,
        eventDate: new Date(event.eventDate),
        resolutionDate: event.resolutionDate ? new Date(event.resolutionDate) : null,
        status: event.status
      });
    }
    console.log(`✅ Inserted ${seedData.regulatoryEvents.length} regulatory events`);

    // Verify seeding
    console.log('🔍 Verifying seeded data...');
    const companiesCount = await db.select().from(companies);
    const peopleCount = await db.select().from(people);
    const ratingsCount = await db.select().from(ratings);
    const employmentsCount = await db.select().from(employments);
    const transactionsCount = await db.select().from(transactions);
    const eventsCount = await db.select().from(regulatoryEvents);

    console.log('📈 Database verification:');
    console.log(`   ✅ Companies: ${companiesCount.length}`);
    console.log(`   ✅ People: ${peopleCount.length}`);
    console.log(`   ✅ Ratings: ${ratingsCount.length}`);
    console.log(`   ✅ Employments: ${employmentsCount.length}`);
    console.log(`   ✅ Transactions: ${transactionsCount.length}`);
    console.log(`   ✅ Regulatory Events: ${eventsCount.length}`);

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('Sample queries you can try:');
    console.log('  - "Show me credit ratings"');
    console.log('  - "Find companies and their executives"');
    console.log('  - "What regulatory events happened in 2024?"');
    console.log('  - "Show me recent M&A transactions"');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;
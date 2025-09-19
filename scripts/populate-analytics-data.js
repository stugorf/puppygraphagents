#!/usr/bin/env node

/**
 * Enhanced Database Population Script for Analytics Dashboard
 * Populates PostgreSQL database with comprehensive multi-sector data
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

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

// Database connection for local PostgreSQL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { companies, people, ratings, employments, transactions, regulatoryEvents } });

async function populateAnalyticsData() {
  try {
    console.log('🌱 Starting enhanced database population for analytics...');
    
    // Load enhanced seed data
    const seedDataPath = join(__dirname, 'enhanced-seed-data.json');
    const seedData = JSON.parse(readFileSync(seedDataPath, 'utf8'));
    
    console.log('📊 Enhanced seed data loaded:');
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
        headquarters: company.headquarters,
        employeeCount: company.employeeCount || null
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
        announcedDate: new Date(transaction.announcedDate),
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

    console.log('🎉 Enhanced database population completed successfully!');
    
    // Print summary by sector
    console.log('\n📊 Data Summary by Sector:');
    const sectorCounts = {};
    seedData.companies.forEach(company => {
      sectorCounts[company.sector] = (sectorCounts[company.sector] || 0) + 1;
    });
    
    Object.entries(sectorCounts).forEach(([sector, count]) => {
      console.log(`   ${sector}: ${count} companies`);
    });

    console.log('\n📈 Analytics Dashboard Ready!');
    console.log('   - Multiple sectors represented');
    console.log('   - Rich transaction data with various types');
    console.log('   - Diverse credit ratings');
    console.log('   - Recent regulatory events');
    console.log('   - Comprehensive employment relationships');

  } catch (error) {
    console.error('❌ Error populating analytics data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the population script
populateAnalyticsData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

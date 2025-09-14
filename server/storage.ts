import { 
  type Company, 
  type Person, 
  type Employment,
  type Rating,
  type Transaction,
  type RegulatoryEvent,
  type QueryHistory,
  type InsertQueryHistory,
  companies,
  people,
  employments,
  ratings,
  transactions,
  regulatoryEvents,
  queryHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, sql } from "drizzle-orm";

export interface IStorage {
  // Query History methods
  insertQueryHistory(query: InsertQueryHistory): Promise<QueryHistory>;
  getQueryHistory(limit: number, offset: number): Promise<QueryHistory[]>;
  
  // Company methods
  getCompanies(sector?: string, limit?: number): Promise<Company[]>;
  getCompanyRelationships(companyId: string): Promise<any>;
  
  // Person methods
  getPeople(limit?: number): Promise<Person[]>;
  
  // Financial data methods
  getRatings(companyId?: string): Promise<Rating[]>;
  getTransactions(limit?: number): Promise<Transaction[]>;
  getRegulatoryEvents(companyId?: string): Promise<RegulatoryEvent[]>;
  
  // Metrics methods
  getMetrics(): Promise<{
    totalEntities: number;
    activeRelationships: number;
    temporalEvents: number;
    aiQueriesProcessed: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  
  async insertQueryHistory(query: InsertQueryHistory): Promise<QueryHistory> {
    const [result] = await db.insert(queryHistory).values(query).returning();
    return result;
  }

  async getQueryHistory(limit: number = 20, offset: number = 0): Promise<QueryHistory[]> {
    return await db
      .select()
      .from(queryHistory)
      .orderBy(desc(queryHistory.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getCompanies(sector?: string, limit: number = 50): Promise<Company[]> {
    let query = db.select().from(companies);
    
    if (sector) {
      query = query.where(eq(companies.sector, sector));
    }
    
    return await query.limit(limit);
  }

  async getCompanyRelationships(companyId: string): Promise<any> {
    // Get all relationships for a company
    const [
      companyEmployments,
      companyRatings,
      companyTransactions,
      companyRegulatoryEvents
    ] = await Promise.all([
      // Employments with person details
      db
        .select({
          employment: employments,
          person: people
        })
        .from(employments)
        .leftJoin(people, eq(employments.personId, people.id))
        .where(eq(employments.companyId, companyId)),
      
      // Ratings
      db
        .select()
        .from(ratings)
        .where(eq(ratings.companyId, companyId))
        .orderBy(desc(ratings.validFrom)),
      
      // Transactions (as acquirer or target)
      db
        .select()
        .from(transactions)
        .where(
          sql`${transactions.acquirerId} = ${companyId} OR ${transactions.targetId} = ${companyId}`
        ),
      
      // Regulatory events
      db
        .select()
        .from(regulatoryEvents)
        .where(eq(regulatoryEvents.companyId, companyId))
        .orderBy(desc(regulatoryEvents.eventDate))
    ]);

    return {
      employments: companyEmployments,
      ratings: companyRatings,
      transactions: companyTransactions,
      regulatory_events: companyRegulatoryEvents
    };
  }

  async getPeople(limit: number = 50): Promise<Person[]> {
    return await db.select().from(people).limit(limit);
  }

  async getRatings(companyId?: string): Promise<Rating[]> {
    let query = db.select().from(ratings).orderBy(desc(ratings.validFrom));
    
    if (companyId) {
      query = query.where(eq(ratings.companyId, companyId));
    }
    
    return await query;
  }

  async getTransactions(limit: number = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.announcedDate))
      .limit(limit);
  }

  async getRegulatoryEvents(companyId?: string): Promise<RegulatoryEvent[]> {
    let query = db.select().from(regulatoryEvents).orderBy(desc(regulatoryEvents.eventDate));
    
    if (companyId) {
      query = query.where(eq(regulatoryEvents.companyId, companyId));
    }
    
    return await query;
  }

  async getMetrics(): Promise<{
    totalEntities: number;
    activeRelationships: number;
    temporalEvents: number;
    aiQueriesProcessed: number;
  }> {
    // Get counts for all entity types
    const [
      companyCount,
      personCount,
      ratingCount,
      transactionCount,
      regulatoryEventCount,
      employmentCount,
      queryCount
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(companies),
      db.select({ count: sql<number>`count(*)` }).from(people),
      db.select({ count: sql<number>`count(*)` }).from(ratings),
      db.select({ count: sql<number>`count(*)` }).from(transactions),
      db.select({ count: sql<number>`count(*)` }).from(regulatoryEvents),
      db.select({ count: sql<number>`count(*)` }).from(employments),
      db.select({ count: sql<number>`count(*)` }).from(queryHistory)
    ]);

    // Calculate total entities (companies + people + ratings + transactions + regulatory events)
    const totalEntities = 
      companyCount[0].count + 
      personCount[0].count + 
      ratingCount[0].count + 
      transactionCount[0].count + 
      regulatoryEventCount[0].count;

    // Active relationships (employments + ratings + transactions + regulatory events)
    const activeRelationships = 
      employmentCount[0].count + 
      ratingCount[0].count + 
      transactionCount[0].count + 
      regulatoryEventCount[0].count;

    // Temporal events (regulatory events + transactions with dates)
    const temporalEvents = 
      regulatoryEventCount[0].count + 
      transactionCount[0].count;

    // AI queries processed (from query history)
    const aiQueriesProcessed = queryCount[0].count;

    return {
      totalEntities,
      activeRelationships,
      temporalEvents,
      aiQueriesProcessed
    };
  }
}

export const storage = new DatabaseStorage();

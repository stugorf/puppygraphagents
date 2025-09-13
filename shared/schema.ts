import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, jsonb, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies in our knowledge graph
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ticker: varchar("ticker", { length: 10 }),
  sector: text("sector").notNull(),
  industry: text("industry").notNull(),
  marketCap: numeric("market_cap", { precision: 15, scale: 2 }),
  foundedYear: integer("founded_year"),
  headquarters: text("headquarters"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tickerIdx: index("ticker_idx").on(table.ticker),
  sectorIdx: index("sector_idx").on(table.sector),
}));

// People (executives, board members, etc.)
export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  title: text("title"),
  age: integer("age"),
  nationality: text("nationality"),
  education: text("education"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("people_name_idx").on(table.name),
}));

// Credit ratings and financial metrics
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  rating: text("rating").notNull(), // e.g., "AAA", "AA+", "BBB-"
  ratingAgency: text("rating_agency").notNull(), // e.g., "Moody's", "S&P", "Fitch"
  ratingType: text("rating_type").notNull(), // e.g., "credit", "debt", "outlook"
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyIdx: index("ratings_company_idx").on(table.companyId),
  validFromIdx: index("ratings_valid_from_idx").on(table.validFrom),
}));

// M&A transactions and deals
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // e.g., "merger", "acquisition", "spinoff"
  acquirerId: varchar("acquirer_id").references(() => companies.id),
  targetId: varchar("target_id").references(() => companies.id),
  value: numeric("value", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: text("status").notNull(), // e.g., "announced", "completed", "cancelled"
  announcedDate: timestamp("announced_date"),
  completedDate: timestamp("completed_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  acquirerIdx: index("transactions_acquirer_idx").on(table.acquirerId),
  targetIdx: index("transactions_target_idx").on(table.targetId),
  announcedDateIdx: index("transactions_announced_date_idx").on(table.announcedDate),
}));

// Employment relationships (temporal)
export const employments = pgTable("employments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").notNull().references(() => people.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  position: text("position").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // NULL means current employment
  salary: numeric("salary", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  personIdx: index("employments_person_idx").on(table.personId),
  companyIdx: index("employments_company_idx").on(table.companyId),
  startDateIdx: index("employments_start_date_idx").on(table.startDate),
}));

// Regulatory events and compliance
export const regulatoryEvents = pgTable("regulatory_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventType: text("event_type").notNull(), // e.g., "fine", "investigation", "approval"
  regulator: text("regulator").notNull(), // e.g., "SEC", "CFTC", "FINRA"
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  eventDate: timestamp("event_date").notNull(),
  resolutionDate: timestamp("resolution_date"),
  status: text("status").notNull(), // e.g., "pending", "resolved", "ongoing"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyIdx: index("regulatory_events_company_idx").on(table.companyId),
  eventDateIdx: index("regulatory_events_event_date_idx").on(table.eventDate),
  regulatorIdx: index("regulatory_events_regulator_idx").on(table.regulator),
}));

// Query history for tracking DSPy agent queries
export const queryHistory = pgTable("query_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalQuery: text("original_query").notNull(),
  queryType: text("query_type").notNull(), // "natural" or "cypher"
  generatedCypher: text("generated_cypher"),
  results: jsonb("results"),
  executionTime: integer("execution_time"), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  createdAtIdx: index("query_history_created_at_idx").on(table.createdAt),
  queryTypeIdx: index("query_history_query_type_idx").on(table.queryType),
}));

// Zod schemas for validation
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertEmploymentSchema = createInsertSchema(employments).omit({
  id: true,
  createdAt: true,
});

export const insertRegulatoryEventSchema = createInsertSchema(regulatoryEvents).omit({
  id: true,
  createdAt: true,
});

export const insertQueryHistorySchema = createInsertSchema(queryHistory).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Employment = typeof employments.$inferSelect;
export type InsertEmployment = z.infer<typeof insertEmploymentSchema>;

export type RegulatoryEvent = typeof regulatoryEvents.$inferSelect;
export type InsertRegulatoryEvent = z.infer<typeof insertRegulatoryEventSchema>;

export type QueryHistory = typeof queryHistory.$inferSelect;
export type InsertQueryHistory = z.infer<typeof insertQueryHistorySchema>;

import { db } from "./db";
import { 
  companies, 
  people, 
  employments, 
  ratings, 
  transactions, 
  regulatoryEvents,
  InsertCompany,
  InsertPerson,
  InsertEmployment,
  InsertRating,
  InsertTransaction,
  InsertRegulatoryEvent
} from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Clear existing data
    await db.delete(employments);
    await db.delete(ratings);
    await db.delete(transactions);
    await db.delete(regulatoryEvents);
    await db.delete(people);
    await db.delete(companies);

    // Seed Companies
    const companyData: InsertCompany[] = [
      {
        name: "Goldman Sachs Group Inc",
        ticker: "GS",
        sector: "Financial Services",
        industry: "Investment Banking",
        marketCap: "115000000000",
        foundedYear: 1869,
        headquarters: "New York, NY"
      },
      {
        name: "JPMorgan Chase & Co",
        ticker: "JPM",
        sector: "Financial Services", 
        industry: "Banking",
        marketCap: "485000000000",
        foundedYear: 1799,
        headquarters: "New York, NY"
      },
      {
        name: "Bank of America Corporation",
        ticker: "BAC",
        sector: "Financial Services",
        industry: "Banking",
        marketCap: "320000000000",
        foundedYear: 1784,
        headquarters: "Charlotte, NC"
      },
      {
        name: "Wells Fargo & Company",
        ticker: "WFC",
        sector: "Financial Services",
        industry: "Banking",
        marketCap: "180000000000",
        foundedYear: 1852,
        headquarters: "San Francisco, CA"
      },
      {
        name: "Citigroup Inc",
        ticker: "C",
        sector: "Financial Services",
        industry: "Banking",
        marketCap: "95000000000",
        foundedYear: 1812,
        headquarters: "New York, NY"
      },
      {
        name: "Morgan Stanley",
        ticker: "MS",
        sector: "Financial Services",
        industry: "Investment Banking",
        marketCap: "145000000000",
        foundedYear: 1935,
        headquarters: "New York, NY"
      },
      {
        name: "Berkshire Hathaway Inc",
        ticker: "BRK.A",
        sector: "Financial Services",
        industry: "Diversified Investments",
        marketCap: "875000000000",
        foundedYear: 1839,
        headquarters: "Omaha, NE"
      },
      {
        name: "American Express Company",
        ticker: "AXP",
        sector: "Financial Services",
        industry: "Credit Services",
        marketCap: "165000000000",
        foundedYear: 1850,
        headquarters: "New York, NY"
      },
      {
        name: "BlackRock Inc",
        ticker: "BLK",
        sector: "Financial Services",
        industry: "Asset Management",
        marketCap: "115000000000",
        foundedYear: 1988,
        headquarters: "New York, NY"
      },
      {
        name: "Charles Schwab Corporation",
        ticker: "SCHW",
        sector: "Financial Services",
        industry: "Brokerage",
        marketCap: "125000000000",
        foundedYear: 1971,
        headquarters: "Westlake, TX"
      }
    ];

    const insertedCompanies = await db.insert(companies).values(companyData).returning();
    console.log(`✅ Inserted ${insertedCompanies.length} companies`);

    // Seed People (Executives)
    const peopleData: InsertPerson[] = [
      {
        name: "David M. Solomon",
        title: "CEO",
        age: 62,
        nationality: "American",
        education: "Hamilton College, Fordham University"
      },
      {
        name: "Jamie Dimon",
        title: "CEO", 
        age: 68,
        nationality: "American",
        education: "Tufts University, Harvard Business School"
      },
      {
        name: "Brian T. Moynihan",
        title: "CEO",
        age: 64,
        nationality: "American", 
        education: "Brown University, Notre Dame Law School"
      },
      {
        name: "Charles W. Scharf",
        title: "CEO",
        age: 59,
        nationality: "American",
        education: "NYU Stern School of Business"
      },
      {
        name: "Jane Fraser",
        title: "CEO",
        age: 57,
        nationality: "Scottish",
        education: "Cambridge University, Harvard Business School"
      },
      {
        name: "James P. Gorman",
        title: "Executive Chairman",
        age: 66,
        nationality: "Australian",
        education: "University of Melbourne, Columbia Business School"
      },
      {
        name: "Warren E. Buffett",
        title: "CEO",
        age: 94,
        nationality: "American",
        education: "University of Nebraska, Columbia Business School"
      },
      {
        name: "Stephen J. Squeri",
        title: "CEO",
        age: 64,
        nationality: "American",
        education: "Manhattan College"
      },
      {
        name: "Laurence D. Fink",
        title: "CEO",
        age: 72,
        nationality: "American",
        education: "UCLA, Wharton School"
      },
      {
        name: "Walter W. Bettinger",
        title: "CEO",
        age: 64,
        nationality: "American",
        education: "Ohio University"
      }
    ];

    const insertedPeople = await db.insert(people).values(peopleData).returning();
    console.log(`✅ Inserted ${insertedPeople.length} people`);

    // Seed Employment Relationships (match CEOs to their companies)
    const employmentData: InsertEmployment[] = [
      {
        personId: insertedPeople[0].id, // David Solomon
        companyId: insertedCompanies[0].id, // Goldman Sachs
        position: "Chief Executive Officer",
        startDate: new Date("2018-10-01"),
        salary: "35000000"
      },
      {
        personId: insertedPeople[1].id, // Jamie Dimon
        companyId: insertedCompanies[1].id, // JPMorgan
        position: "Chief Executive Officer", 
        startDate: new Date("2005-12-31"),
        salary: "34500000"
      },
      {
        personId: insertedPeople[2].id, // Brian Moynihan
        companyId: insertedCompanies[2].id, // Bank of America
        position: "Chief Executive Officer",
        startDate: new Date("2010-01-01"),
        salary: "32000000"
      },
      {
        personId: insertedPeople[3].id, // Charles Scharf
        companyId: insertedCompanies[3].id, // Wells Fargo
        position: "Chief Executive Officer",
        startDate: new Date("2019-10-21"),
        salary: "24500000"
      },
      {
        personId: insertedPeople[4].id, // Jane Fraser
        companyId: insertedCompanies[4].id, // Citigroup
        position: "Chief Executive Officer",
        startDate: new Date("2021-03-01"),
        salary: "22500000"
      },
      {
        personId: insertedPeople[5].id, // James Gorman
        companyId: insertedCompanies[5].id, // Morgan Stanley
        position: "Executive Chairman",
        startDate: new Date("2024-01-01"),
        salary: "28000000"
      },
      {
        personId: insertedPeople[6].id, // Warren Buffett
        companyId: insertedCompanies[6].id, // Berkshire Hathaway
        position: "Chief Executive Officer",
        startDate: new Date("1970-05-10"),
        salary: "100000" // Famously low salary
      },
      {
        personId: insertedPeople[7].id, // Stephen Squeri
        companyId: insertedCompanies[7].id, // American Express
        position: "Chief Executive Officer",
        startDate: new Date("2018-02-01"),
        salary: "29000000"
      },
      {
        personId: insertedPeople[8].id, // Larry Fink
        companyId: insertedCompanies[8].id, // BlackRock
        position: "Chief Executive Officer",
        startDate: new Date("1988-01-01"),
        salary: "36000000"
      },
      {
        personId: insertedPeople[9].id, // Walter Bettinger
        companyId: insertedCompanies[9].id, // Charles Schwab
        position: "Chief Executive Officer",
        startDate: new Date("2008-10-01"),
        salary: "18500000"
      }
    ];

    const insertedEmployments = await db.insert(employments).values(employmentData).returning();
    console.log(`✅ Inserted ${insertedEmployments.length} employment relationships`);

    // Seed Credit Ratings
    const ratingsData: InsertRating[] = [
      {
        companyId: insertedCompanies[0].id, // Goldman Sachs
        rating: "A+",
        ratingAgency: "S&P Global",
        ratingType: "Long-term Credit",
        validFrom: new Date("2024-01-15")
      },
      {
        companyId: insertedCompanies[1].id, // JPMorgan
        rating: "A+",
        ratingAgency: "Moody's",
        ratingType: "Bank Financial Strength",
        validFrom: new Date("2024-02-01")
      },
      {
        companyId: insertedCompanies[2].id, // Bank of America
        rating: "A-",
        ratingAgency: "Fitch Ratings",
        ratingType: "Long-term Issuer Default",
        validFrom: new Date("2023-11-20")
      },
      {
        companyId: insertedCompanies[3].id, // Wells Fargo
        rating: "A-",
        ratingAgency: "S&P Global",
        ratingType: "Long-term Credit", 
        validFrom: new Date("2023-09-15")
      },
      {
        companyId: insertedCompanies[4].id, // Citigroup
        rating: "BBB+",
        ratingAgency: "Moody's",
        ratingType: "Long-term Deposit",
        validFrom: new Date("2024-03-10")
      },
      {
        companyId: insertedCompanies[5].id, // Morgan Stanley
        rating: "A",
        ratingAgency: "S&P Global", 
        ratingType: "Long-term Credit",
        validFrom: new Date("2024-01-30")
      }
    ];

    const insertedRatings = await db.insert(ratings).values(ratingsData).returning();
    console.log(`✅ Inserted ${insertedRatings.length} credit ratings`);

    // Seed Transactions (M&A deals)
    const transactionData: InsertTransaction[] = [
      {
        type: "acquisition",
        acquirerId: insertedCompanies[1].id, // JPMorgan
        targetId: null, // External company
        value: "175000000",
        status: "completed",
        announcedDate: new Date("2023-05-15"),
        completedDate: new Date("2023-08-30"),
        description: "JPMorgan Chase acquired First Republic Bank assets following regulatory seizure"
      },
      {
        type: "merger",
        acquirerId: insertedCompanies[9].id, // Charles Schwab
        targetId: null, // External company  
        value: "26000000000",
        status: "completed",
        announcedDate: new Date("2019-11-25"),
        completedDate: new Date("2020-10-06"),
        description: "Charles Schwab completed acquisition of TD Ameritrade"
      },
      {
        type: "acquisition",
        acquirerId: insertedCompanies[2].id, // Bank of America
        targetId: null, // External company
        value: "11600000000", 
        status: "completed",
        announcedDate: new Date("2022-02-07"),
        completedDate: new Date("2022-10-03"),
        description: "Bank of America completed acquisition of securities services business"
      },
      {
        type: "divestiture",
        acquirerId: insertedCompanies[3].id, // Wells Fargo
        targetId: null, // External buyer
        value: "2100000000",
        status: "completed", 
        announcedDate: new Date("2024-01-10"),
        completedDate: new Date("2024-07-15"),
        description: "Wells Fargo sold commercial mortgage servicing portfolio"
      }
    ];

    const insertedTransactions = await db.insert(transactions).values(transactionData).returning();
    console.log(`✅ Inserted ${insertedTransactions.length} transactions`);

    // Seed Regulatory Events
    const regulatoryData: InsertRegulatoryEvent[] = [
      {
        companyId: insertedCompanies[3].id, // Wells Fargo
        eventType: "fine",
        regulator: "OCC",
        description: "Civil money penalty for unsafe and unsound practices in residential mortgage lending",
        amount: "3000000000",
        eventDate: new Date("2023-12-20"),
        resolutionDate: new Date("2024-02-15"),
        status: "resolved"
      },
      {
        companyId: insertedCompanies[0].id, // Goldman Sachs
        eventType: "settlement",
        regulator: "SEC",
        description: "Settlement related to 1MDB corruption scandal and compliance failures",
        amount: "2900000000", 
        eventDate: new Date("2023-10-22"),
        resolutionDate: new Date("2024-01-30"),
        status: "resolved"
      },
      {
        companyId: insertedCompanies[1].id, // JPMorgan
        eventType: "fine",
        regulator: "CFTC",
        description: "Record-keeping violations related to business communications on personal devices",
        amount: "200000000",
        eventDate: new Date("2023-02-17"),
        resolutionDate: new Date("2023-05-20"),
        status: "resolved"
      },
      {
        companyId: insertedCompanies[4].id, // Citigroup
        eventType: "consent_order",
        regulator: "Federal Reserve",
        description: "Risk management and internal controls deficiencies in data governance",
        amount: "400000000",
        eventDate: new Date("2024-07-10"), 
        resolutionDate: null,
        status: "ongoing"
      },
      {
        companyId: insertedCompanies[2].id, // Bank of America
        eventType: "investigation",
        regulator: "CFPB",
        description: "Consumer reporting practices and credit card account management investigation",
        amount: null,
        eventDate: new Date("2024-09-05"),
        resolutionDate: null,
        status: "pending"
      }
    ];

    const insertedRegulatory = await db.insert(regulatoryEvents).values(regulatoryData).returning();
    console.log(`✅ Inserted ${insertedRegulatory.length} regulatory events`);

    console.log("🎉 Database seeding completed successfully!");
    
    // Print summary
    console.log("\n📊 Seeding Summary:");
    console.log(`Companies: ${insertedCompanies.length}`);
    console.log(`People: ${insertedPeople.length}`);
    console.log(`Employment relationships: ${insertedEmployments.length}`);
    console.log(`Credit ratings: ${insertedRatings.length}`);
    console.log(`Transactions: ${insertedTransactions.length}`);
    console.log(`Regulatory events: ${insertedRegulatory.length}`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log("✅ Seeding process completed");
    process.exit(0);
  }).catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
}

export { seedDatabase };
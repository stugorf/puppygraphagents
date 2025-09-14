import axios from 'axios';

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  executionTime: number;
  cypherQuery: string;
}

export interface PuppyGraphConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
}

export class PuppyGraphClient {
  private config: PuppyGraphConfig;
  private isConnected: boolean = false;

  constructor(config: Partial<PuppyGraphConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8081',
      username: config.username || 'puppygraph',
      password: config.password || 'puppygraph123',
      timeout: config.timeout || 30000
    };
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection to PuppyGraph
      const response = await axios.get(`${this.config.baseUrl}/api/health`, {
        timeout: this.config.timeout,
        auth: {
          username: this.config.username,
          password: this.config.password
        }
      });
      
      this.isConnected = response.status === 200;
      return this.isConnected;
    } catch (error) {
      console.warn('PuppyGraph not available, falling back to SQL simulation:', error instanceof Error ? error.message : 'Unknown error');
      this.isConnected = false;
      return false;
    }
  }

  async executeCypherQuery(cypherQuery: string): Promise<GraphQueryResult> {
    const startTime = Date.now();

    if (this.isConnected) {
      return this.executeCypherOnPuppyGraph(cypherQuery, startTime);
    } else {
      return this.simulateCypherWithSQL(cypherQuery, startTime);
    }
  }

  private async executeCypherOnPuppyGraph(cypherQuery: string, startTime: number): Promise<GraphQueryResult> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/cypher`,
        {
          query: cypherQuery
        },
        {
          timeout: this.config.timeout,
          auth: {
            username: this.config.username,
            password: this.config.password
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const executionTime = Date.now() - startTime;
      
      // Transform PuppyGraph response to our format
      return {
        nodes: this.transformPuppyGraphNodes(response.data.nodes || []),
        edges: this.transformPuppyGraphEdges(response.data.edges || []),
        executionTime,
        cypherQuery
      };
    } catch (error) {
      console.error('Error executing Cypher on PuppyGraph:', error);
      throw new Error(`PuppyGraph query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async simulateCypherWithSQL(cypherQuery: string, startTime: number): Promise<GraphQueryResult> {
    // Import storage here to avoid circular dependencies
    const { storage } = await import('../storage');
    
    try {
      // Parse the Cypher query to determine what data to fetch
      const queryAnalysis = this.analyzeCypherQuery(cypherQuery);
      
      let nodes: GraphNode[] = [];
      let edges: GraphEdge[] = [];

      // Fetch data based on query analysis
      if (queryAnalysis.entities.includes('Company')) {
        const companies = await storage.getCompanies(queryAnalysis.filters.sector, 20);
        nodes.push(...companies.map(company => ({
          id: company.id,
          label: 'Company',
          properties: {
            name: company.name,
            ticker: company.ticker,
            sector: company.sector,
            industry: company.industry,
            market_cap: company.marketCap,
            founded_year: company.foundedYear,
            headquarters: company.headquarters
          }
        })));

        // If we have companies, fetch their relationships
        if (companies.length > 0) {
          for (const company of companies.slice(0, 5)) { // Limit to first 5 for performance
            const relationships = await storage.getCompanyRelationships(company.id);
            
            // Add people nodes and employment edges
            for (const emp of relationships.employments) {
              if (emp.person) {
                nodes.push({
                  id: emp.person.id,
                  label: 'Person',
                  properties: {
                    name: emp.person.name,
                    title: emp.person.title,
                    age: emp.person.age,
                    nationality: emp.person.nationality,
                    education: emp.person.education
                  }
                });

                edges.push({
                  id: `emp_${emp.employment.id}`,
                  fromId: emp.person.id,
                  toId: company.id,
                  label: 'EMPLOYED_BY',
                  properties: {
                    position: emp.employment.position,
                    start_date: emp.employment.startDate,
                    end_date: emp.employment.endDate,
                    salary: emp.employment.salary
                  }
                });
              }
            }

            // Add rating nodes and edges
            for (const rating of relationships.ratings) {
              nodes.push({
                id: rating.id,
                label: 'Rating',
                properties: {
                  rating: rating.rating,
                  rating_agency: rating.ratingAgency,
                  rating_type: rating.ratingType,
                  valid_from: rating.validFrom,
                  valid_to: rating.validTo
                }
              });

              edges.push({
                id: `rating_${rating.id}`,
                fromId: company.id,
                toId: rating.id,
                label: 'HAS_RATING',
                properties: {}
              });
            }
          }
        }
      }

      // Handle direct Rating queries
      if (queryAnalysis.entities.includes('Rating') && !queryAnalysis.entities.includes('Company')) {
        // Get all ratings (without company filter)
        const allRatings = await storage.getRatings();
        const limitedRatings = allRatings.slice(0, 20); // Limit to 20 for performance
        
        const companyIds = new Set<string>();
        
        for (const rating of limitedRatings) {
          // Add rating node
          nodes.push({
            id: rating.id,
            label: 'Rating',
            properties: {
              rating: rating.rating,
              rating_agency: rating.ratingAgency,
              rating_type: rating.ratingType,
              valid_from: rating.validFrom,
              valid_to: rating.validTo
            }
          });

          // Track company IDs for batch fetching
          if (rating.companyId) {
            companyIds.add(rating.companyId);
          }
        }

        // Fetch all unique companies in batch
        if (companyIds.size > 0) {
          const companies = await storage.getCompanies(undefined, 50);
          const companyMap = new Map(companies.map(c => [c.id, c]));
          
          for (const rating of limitedRatings) {
            if (rating.companyId) {
              const company = companyMap.get(rating.companyId);
              if (company) {
                // Add company node if not already added
                if (!nodes.find(n => n.id === company.id)) {
                  nodes.push({
                    id: company.id,
                    label: 'Company',
                    properties: {
                      name: company.name,
                      ticker: company.ticker,
                      sector: company.sector,
                      industry: company.industry,
                      market_cap: company.marketCap,
                      founded_year: company.foundedYear,
                      headquarters: company.headquarters
                    }
                  });
                }

                edges.push({
                  id: `rating_${rating.id}`,
                  fromId: company.id,
                  toId: rating.id,
                  label: 'HAS_RATING',
                  properties: {}
                });
              }
            }
          }
        }
      }

      const executionTime = Date.now() - startTime;
      
      return {
        nodes: this.deduplicateNodes(nodes),
        edges,
        executionTime,
        cypherQuery
      };
    } catch (error) {
      console.error('Error simulating Cypher with SQL:', error);
      throw new Error(`Query simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private analyzeCypherQuery(cypherQuery: string): {
    entities: string[];
    relationships: string[];
    filters: Record<string, any>;
  } {
    const query = cypherQuery.toLowerCase();
    
    const entities: string[] = [];
    const relationships: string[] = [];
    const filters: Record<string, any> = {};

    // Detect entities
    if (query.includes('company') || query.includes(':company')) entities.push('Company');
    if (query.includes('person') || query.includes(':person')) entities.push('Person');
    if (query.includes('rating') || query.includes(':rating')) entities.push('Rating');
    if (query.includes('transaction') || query.includes(':transaction')) entities.push('Transaction');
    if (query.includes('regulatory') || query.includes(':regulatory')) entities.push('RegulatoryEvent');

    // Detect relationships
    if (query.includes('employed_by') || query.includes('works_for')) relationships.push('EMPLOYED_BY');
    if (query.includes('has_rating')) relationships.push('HAS_RATING');
    if (query.includes('participates_in')) relationships.push('PARTICIPATES_IN');
    if (query.includes('subject_to')) relationships.push('SUBJECT_TO');

    // Detect filters
    if (query.includes('financial services') || query.includes("'financial services'")) {
      filters.sector = 'Financial Services';
    }
    if (query.includes('banking') || query.includes("'banking'")) {
      filters.industry = 'Banking';
    }

    return { entities, relationships, filters };
  }

  private transformPuppyGraphNodes(puppyNodes: any[]): GraphNode[] {
    return puppyNodes.map(node => ({
      id: node.id.toString(),
      label: node.label || 'Unknown',
      properties: node.properties || {}
    }));
  }

  private transformPuppyGraphEdges(puppyEdges: any[]): GraphEdge[] {
    return puppyEdges.map(edge => ({
      id: edge.id.toString(),
      fromId: edge.fromId.toString(),
      toId: edge.toId.toString(),
      label: edge.label || 'CONNECTS_TO',
      properties: edge.properties || {}
    }));
  }

  private deduplicateNodes(nodes: GraphNode[]): GraphNode[] {
    const uniqueNodes = new Map<string, GraphNode>();
    
    for (const node of nodes) {
      if (!uniqueNodes.has(node.id)) {
        uniqueNodes.set(node.id, node);
      }
    }
    
    return Array.from(uniqueNodes.values());
  }

  async getGraphSchema(): Promise<any> {
    if (this.isConnected) {
      try {
        const response = await axios.get(`${this.config.baseUrl}/api/schema`, {
          timeout: this.config.timeout,
          auth: {
            username: this.config.username,
            password: this.config.password
          }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching graph schema:', error);
        return null;
      }
    }
    
    // Return our expected schema structure
    return {
      nodeTypes: ['Company', 'Person', 'Rating', 'Transaction', 'RegulatoryEvent'],
      relationshipTypes: ['EMPLOYED_BY', 'HAS_RATING', 'PARTICIPATES_IN', 'TARGET_OF', 'SUBJECT_TO'],
      status: 'simulated'
    };
  }

  isReady(): boolean {
    return true; // Always ready in simulation mode
  }

  getStatus(): { connected: boolean; mode: string; endpoint?: string } {
    return {
      connected: this.isConnected,
      mode: this.isConnected ? 'puppygraph' : 'simulation',
      endpoint: this.isConnected ? this.config.baseUrl : undefined
    };
  }
}

// Create a singleton instance
export const puppyGraphClient = new PuppyGraphClient();

// Initialize connection on module load
puppyGraphClient.connect().then(connected => {
  console.log(`PuppyGraph client initialized: ${connected ? 'Connected to PuppyGraph' : 'Running in simulation mode'}`);
}).catch(error => {
  console.warn('PuppyGraph client initialization warning:', error);
});
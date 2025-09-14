import axios from 'axios';
import neo4j from 'neo4j-driver';

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
  scalarResults?: any[];
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
  private driver: neo4j.Driver | null = null;
  private isConnected: boolean = false;

  constructor(config: Partial<PuppyGraphConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.PUPPYGRAPH_URL || 'http://localhost:8081',
      username: config.username || process.env.PUPPYGRAPH_USERNAME || 'puppygraph',
      password: config.password || process.env.PUPPYGRAPH_PASSWORD || 'puppygraph123',
      timeout: config.timeout || 30000
    };
  }

  async connect(): Promise<boolean> {
    const maxRetries = 10;
    const retryDelay = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to connect to PuppyGraph (attempt ${attempt}/${maxRetries})...`);
        
        // Connect to PuppyGraph using Bolt protocol on port 7687
        const uri = 'bolt://localhost:7687';
        this.driver = neo4j.driver(uri, neo4j.auth.basic(this.config.username, this.config.password), {
          encrypted: false, // Disable encryption for PuppyGraph
          trust: 'TRUST_ALL_CERTIFICATES',
          maxConnectionLifetime: 30000,
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2000,
          disableLosslessIntegers: true
        });
        
        // Test the connection with a timeout
        const session = this.driver.session();
        const result = await session.run('RETURN 1 as test');
        await session.close();
        
        this.isConnected = true;
        console.log('Connected to PuppyGraph via Bolt protocol on port 7687');
        return this.isConnected;
      } catch (error) {
        console.error(`Connection attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (this.driver) {
          await this.driver.close();
          this.driver = null;
        }
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          this.isConnected = false;
          throw new Error(`PuppyGraph connection failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return false;
  }

  async executeCypherQuery(cypherQuery: string): Promise<GraphQueryResult> {
    if (!this.isConnected || !this.driver) {
      throw new Error('PuppyGraph client is not connected. Please ensure PuppyGraph service is running.');
    }
    
    const startTime = Date.now();
    return this.executeCypherOnPuppyGraph(cypherQuery, startTime);
  }

  // Alias for executeCypherQuery to match route expectations
  async executeQuery(cypherQuery: string): Promise<GraphQueryResult> {
    return this.executeCypherQuery(cypherQuery);
  }

  private async executeCypherOnPuppyGraph(cypherQuery: string, startTime: number): Promise<GraphQueryResult> {
    if (!this.driver) {
      throw new Error('PuppyGraph driver is not initialized');
    }

    const session = this.driver.session();
    try {
      // First, try to extract relationships from the pattern if they're not explicitly returned
      const enhancedQuery = this.enhanceQueryForRelationships(cypherQuery);
      const result = await session.run(enhancedQuery);
      const executionTime = Date.now() - startTime;
      
      // Transform Neo4j result to our format
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const scalarResults: any[] = [];
      const nodeMap = new Map<string, GraphNode>();
      const edgeMap = new Map<string, GraphEdge>();
      
      result.records.forEach(record => {
        record.keys.forEach(key => {
          const value = record.get(key);
          if (neo4j.isNode(value)) {
            const nodeId = value.elementId;
            if (!nodeMap.has(nodeId)) {
              const node = {
                id: nodeId,
                label: value.labels[0] || 'Unknown',
                properties: value.properties
              };
              nodeMap.set(nodeId, node);
              nodes.push(node);
            }
          } else if (neo4j.isRelationship(value)) {
            const edgeId = value.elementId;
            if (!edgeMap.has(edgeId)) {
              const edge = {
                id: edgeId,
                fromId: value.startNodeElementId,
                toId: value.endNodeElementId,
                label: value.type,
                properties: value.properties
              };
              edgeMap.set(edgeId, edge);
              edges.push(edge);
            }
          } else {
            // Handle scalar values (counts, aggregations, etc.)
            let processedValue = value;
            if (neo4j.isInt(value)) {
              processedValue = value.toNumber();
            }
            scalarResults.push({
              key: key,
              value: processedValue
            });
          }
        });
      });
      
      return {
        nodes,
        edges,
        scalarResults,
        executionTime,
        cypherQuery
      };
    } catch (error) {
      console.error('Error executing Cypher on PuppyGraph:', error);
      throw new Error(`PuppyGraph query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  private enhanceQueryForRelationships(cypherQuery: string): string {
    // For queries that have relationship patterns but don't return relationships,
    // modify them to also return the relationships
    const upperQuery = cypherQuery.toUpperCase();
    
    // Check if query has relationship patterns but doesn't return relationships
    // Handle both forward (->) and reverse (<-) relationships
    const hasRelationshipPattern = /\([^)]*\)\s*-\[[^\]]*\]->\([^)]*\)/.test(cypherQuery) || 
                                  /\([^)]*\)<-\[[^\]]*\]-\s*\([^)]*\)/.test(cypherQuery);
    const returnsRelationships = upperQuery.includes('RETURN') && 
      (upperQuery.includes('R,') || upperQuery.includes('R ') || upperQuery.includes('RELATIONSHIP'));
    
    // Check if query returns scalar values (properties) instead of nodes/edges
    const returnsScalarValues = upperQuery.includes('RETURN') && 
      (upperQuery.includes('.NAME') || upperQuery.includes('.TITLE') || upperQuery.includes('.SECTOR') || 
       upperQuery.includes('.VALUE') || upperQuery.includes('.ID') || upperQuery.includes('.TYPE'));
    
    
    if (hasRelationshipPattern && !returnsRelationships && !returnsScalarValues) {
      // Handle both forward and reverse relationships
      let enhancedQuery = cypherQuery;
      
      // Replace forward relationships: (a)-[:REL]->(b)
      enhancedQuery = enhancedQuery.replace(
        /\(([^)]*)\)\s*-\[([^\]]*)\]->\(([^)]*)\)/g,
        (match, startNode, relType, endNode) => {
          const relTypeMatch = relType.match(/:([^:\]]+)/);
          const relTypeName = relTypeMatch ? relTypeMatch[1] : 'RELATED_TO';
          return `(${startNode})-[rel:${relTypeName}]->(${endNode})`;
        }
      );
      
      // Replace reverse relationships: (a)<-[:REL]-(b)
      enhancedQuery = enhancedQuery.replace(
        /\(([^)]*)\)<-\[([^\]]*)\]-\s*\(([^)]*)\)/g,
        (match, startNode, relType, endNode) => {
          const relTypeMatch = relType.match(/:([^:\]]+)/);
          const relTypeName = relTypeMatch ? relTypeMatch[1] : 'RELATED_TO';
          return `(${endNode})-[rel:${relTypeName}]->(${startNode})`;
        }
      );
      
      // Now add the relationship variable to the RETURN clause
      const returnMatch = enhancedQuery.match(/RETURN\s+([^]+?)$/i);
      if (returnMatch) {
        const currentReturn = returnMatch[1].trim();
        const finalQuery = enhancedQuery.replace(/RETURN\s+[^]+?$/i, `RETURN ${currentReturn}, rel`);
        return finalQuery;
      }
      
      return enhancedQuery;
    }
    
    return cypherQuery;
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


  async getGraphSchema(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('PuppyGraph client is not connected. Please ensure PuppyGraph service is running.');
    }
    
    try {
      // Use HTTP endpoint for schema since it's not available via Bolt
      const response = await axios.get(`${this.config.baseUrl}/schemajson`, {
        timeout: this.config.timeout,
        auth: {
          username: this.config.username,
          password: this.config.password
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching graph schema:', error);
      throw new Error(`Failed to fetch graph schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getStatus(): { connected: boolean; mode: string; endpoint?: string } {
    return {
      connected: this.isConnected,
      mode: 'puppygraph-bolt',
      endpoint: this.isConnected ? 'bolt://localhost:7687' : undefined
    };
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance
export const puppyGraphClient = new PuppyGraphClient();

// Initialize connection on module load with retry logic
puppyGraphClient.connect().then(connected => {
  console.log(`PuppyGraph client initialized: Connected to PuppyGraph`);
}).catch(error => {
  console.warn('PuppyGraph client initialization failed, will retry in background:', error.message);
  // Retry connection in background
  setTimeout(() => {
    puppyGraphClient.connect().catch(err => {
      console.warn('Background PuppyGraph connection retry failed:', err.message);
    });
  }, 10000); // Retry after 10 seconds
});
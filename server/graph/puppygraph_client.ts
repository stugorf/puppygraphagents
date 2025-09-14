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
    try {
      // Connect to PuppyGraph using Bolt protocol on port 7687
      const uri = 'bolt://localhost:7687';
      this.driver = neo4j.driver(uri, neo4j.auth.basic(this.config.username, this.config.password), {
        encrypted: false, // Disable encryption for PuppyGraph
        trust: 'TRUST_ALL_CERTIFICATES'
      });
      
      // Test the connection
      const session = this.driver.session();
      await session.run('RETURN 1 as test');
      await session.close();
      
      this.isConnected = true;
      console.log('Connected to PuppyGraph via Bolt protocol on port 7687');
      return this.isConnected;
    } catch (error) {
      console.error('Failed to connect to PuppyGraph:', error instanceof Error ? error.message : 'Unknown error');
      this.isConnected = false;
      if (this.driver) {
        await this.driver.close();
        this.driver = null;
      }
      throw new Error(`PuppyGraph connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeCypherQuery(cypherQuery: string): Promise<GraphQueryResult> {
    if (!this.isConnected || !this.driver) {
      throw new Error('PuppyGraph client is not connected. Please ensure PuppyGraph service is running.');
    }
    
    const startTime = Date.now();
    return this.executeCypherOnPuppyGraph(cypherQuery, startTime);
  }

  private async executeCypherOnPuppyGraph(cypherQuery: string, startTime: number): Promise<GraphQueryResult> {
    if (!this.driver) {
      throw new Error('PuppyGraph driver is not initialized');
    }

    const session = this.driver.session();
    try {
      const result = await session.run(cypherQuery);
      const executionTime = Date.now() - startTime;
      
      // Transform Neo4j result to our format
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      
      result.records.forEach(record => {
        record.keys.forEach(key => {
          const value = record.get(key);
          if (neo4j.isNode(value)) {
            nodes.push({
              id: value.elementId,
              label: value.labels[0] || 'Unknown',
              properties: value.properties
            });
          } else if (neo4j.isRelationship(value)) {
            edges.push({
              id: value.elementId,
              fromId: value.startNodeElementId,
              toId: value.endNodeElementId,
              label: value.type,
              properties: value.properties
            });
          }
        });
      });
      
      return {
        nodes,
        edges,
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

// Initialize connection on module load
puppyGraphClient.connect().then(connected => {
  console.log(`PuppyGraph client initialized: Connected to PuppyGraph`);
}).catch(error => {
  console.warn('PuppyGraph client initialization failed, continuing without graph functionality:', error.message);
  // Don't exit, just continue without PuppyGraph
});
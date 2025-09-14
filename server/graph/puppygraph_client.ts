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
      baseUrl: config.baseUrl || 'http://localhost:8082',
      username: config.username || 'puppygraph',
      password: config.password || 'puppygraph123',
      timeout: config.timeout || 30000
    };
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection to PuppyGraph - try multiple endpoints and ports
      const endpoints = [
        { url: 'http://localhost:8081/api/health', port: 8081 },
        { url: 'http://localhost:8081/health', port: 8081 },
        { url: 'http://localhost:8082/api/health', port: 8082 },
        { url: 'http://localhost:8082/health', port: 8082 },
        { url: 'http://localhost:8081/', port: 8081 },
        { url: 'http://localhost:8082/', port: 8082 }
      ];
      let connected = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint.url, {
            timeout: 5000,
            auth: {
              username: this.config.username,
              password: this.config.password
            }
          });
          
          if (response.status === 200) {
            // Update the base URL to the working port
            this.config.baseUrl = `http://localhost:${endpoint.port}`;
            connected = true;
            console.log(`Connected to PuppyGraph on port ${endpoint.port}`);
            break;
          }
        } catch (e) {
          // Try next endpoint
          continue;
        }
      }
      
      this.isConnected = connected;
      if (!this.isConnected) {
        throw new Error('PuppyGraph is not responding on any known endpoint');
      }
      return this.isConnected;
    } catch (error) {
      console.error('Failed to connect to PuppyGraph:', error instanceof Error ? error.message : 'Unknown error');
      this.isConnected = false;
      throw new Error(`PuppyGraph connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeCypherQuery(cypherQuery: string): Promise<GraphQueryResult> {
    if (!this.isConnected) {
      throw new Error('PuppyGraph client is not connected. Please ensure PuppyGraph service is running.');
    }
    
    const startTime = Date.now();
    return this.executeCypherOnPuppyGraph(cypherQuery, startTime);
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
      throw new Error(`Failed to fetch graph schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getStatus(): { connected: boolean; mode: string; endpoint?: string } {
    return {
      connected: this.isConnected,
      mode: 'puppygraph',
      endpoint: this.isConnected ? this.config.baseUrl : undefined
    };
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
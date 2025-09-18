import neo4j from 'neo4j-driver';

export interface UnifiedGraphRecord {
  id: string;
  type: 'node' | 'edge' | 'scalar';
  label: string;
  properties: Record<string, any>;
  // For nodes
  labels?: string[];
  // For edges  
  source?: string;
  target?: string;
  relationship?: string;
  // For display
  x?: number;
  y?: number;
  displayType?: 'company' | 'person' | 'transaction' | 'rating' | 'other';
}

export interface SimplifiedQueryResult {
  records: UnifiedGraphRecord[];
  executionTime: number;
  cypherQuery: string;
  recordCount: number;
}

export interface PuppyGraphConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
}

export class SimplifiedPuppyGraphClient {
  private config: PuppyGraphConfig;
  private driver: any | null = null;
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
    const retryDelay = 5000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to connect to PuppyGraph (attempt ${attempt}/${maxRetries})...`);
        
        const host = process.env.NODE_ENV === 'production' ? 'puppygraph' : 'puppygraph-dev';
        const uri = `bolt://${host}:7687`;
        this.driver = neo4j.driver(uri, neo4j.auth.basic(this.config.username, this.config.password), {
          encrypted: false,
          trust: 'TRUST_ALL_CERTIFICATES',
          maxConnectionLifetime: 30000,
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2000,
          disableLosslessIntegers: true
        });
        
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

  async executeCypherQuery(cypherQuery: string): Promise<SimplifiedQueryResult> {
    if (!this.isConnected || !this.driver) {
      throw new Error('PuppyGraph client is not connected. Please ensure PuppyGraph service is running.');
    }
    
    const startTime = Date.now();
    const session = this.driver.session();
    
    try {
      console.log('Executing Cypher query:', cypherQuery);
      const result = await session.run(cypherQuery);
      const executionTime = Date.now() - startTime;
      
      // Transform Neo4j result to unified format
      const records: UnifiedGraphRecord[] = [];
      const nodeMap = new Map<string, UnifiedGraphRecord>();
      const edgeMap = new Map<string, UnifiedGraphRecord>();
      
      result.records.forEach((record: any) => {
        record.keys.forEach((key: any) => {
          const value = record.get(key);
          
          if (neo4j.isNode(value)) {
            const nodeId = value.elementId;
            if (!nodeMap.has(nodeId)) {
              const unifiedRecord: UnifiedGraphRecord = {
                id: nodeId,
                type: 'node',
                label: this.getNodeLabel(value),
                labels: value.labels,
                properties: this.convertNeo4jProperties(value.properties),
                displayType: this.getDisplayType(value.labels)
              };
              nodeMap.set(nodeId, unifiedRecord);
              records.push(unifiedRecord);
            }
          } else if (neo4j.isRelationship(value)) {
            const edgeId = value.elementId;
            if (!edgeMap.has(edgeId)) {
              const unifiedRecord: UnifiedGraphRecord = {
                id: edgeId,
                type: 'edge',
                label: value.type,
                source: value.startNodeElementId,
                target: value.endNodeElementId,
                relationship: value.type,
                properties: this.convertNeo4jProperties(value.properties)
              };
              edgeMap.set(edgeId, unifiedRecord);
              records.push(unifiedRecord);
            }
          } else {
            // Handle scalar values - create a scalar record for them
            const scalarRecord: UnifiedGraphRecord = {
              id: `scalar-${records.length}`,
              type: 'scalar',
              label: key,
              properties: { [key]: this.convertNeo4jValue(value) }
            };
            records.push(scalarRecord);
          }
        });
      });
      
      return {
        records,
        executionTime,
        cypherQuery,
        recordCount: records.length
      };
      
    } catch (error) {
      console.error('Error executing Cypher on PuppyGraph:', error);
      throw new Error(`PuppyGraph query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  private getNodeLabel(node: any): string {
    // Try to get a meaningful label from properties
    const properties = node.properties || {};
    return properties.name || properties.title || properties.ticker || node.labels[0] || 'Unknown';
  }

  private getDisplayType(labels: string[]): 'company' | 'person' | 'transaction' | 'rating' | 'other' {
    if (!labels || labels.length === 0) return 'other';
    
    const label = labels[0].toLowerCase();
    if (label.includes('company')) return 'company';
    if (label.includes('person')) return 'person';
    if (label.includes('transaction')) return 'transaction';
    if (label.includes('rating')) return 'rating';
    return 'other';
  }

  private convertNeo4jProperties(properties: any): Record<string, any> {
    const converted: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      converted[key] = this.convertNeo4jValue(value);
    }
    return converted;
  }

  private convertNeo4jValue(value: any): any {
    if (neo4j.isInt(value)) {
      return value.toNumber();
    }
    if (neo4j.isDate(value)) {
      return value.toString();
    }
    if (neo4j.isDateTime(value)) {
      return value.toString();
    }
    if (neo4j.isTime(value)) {
      return value.toString();
    }
    if (neo4j.isLocalDateTime(value)) {
      return value.toString();
    }
    if (neo4j.isLocalTime(value)) {
      return value.toString();
    }
    if (neo4j.isDuration(value)) {
      return value.toString();
    }
    if (neo4j.isPoint(value)) {
      return value.toString();
    }
    return value;
  }

  async getGraphSchema(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('PuppyGraph client is not connected. Please ensure PuppyGraph service is running.');
    }
    
    try {
      // Use HTTP endpoint for schema since it's not available via Bolt
      const response = await fetch(`${this.config.baseUrl}/schemajson`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
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
      mode: 'puppygraph-bolt-simplified',
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
export const simplifiedPuppyGraphClient = new SimplifiedPuppyGraphClient();

// Initialize connection on module load with retry logic
simplifiedPuppyGraphClient.connect().then(connected => {
  console.log(`Simplified PuppyGraph client initialized: Connected to PuppyGraph`);
}).catch(error => {
  console.warn('Simplified PuppyGraph client initialization failed, will retry in background:', error.message);
  // Retry connection in background
  setTimeout(() => {
    simplifiedPuppyGraphClient.connect().catch(err => {
      console.warn('Background PuppyGraph connection retry failed:', err.message);
    });
  }, 10000);
});

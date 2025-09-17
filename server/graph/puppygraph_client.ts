import axios from 'axios';
import neo4j, { Node, Relationship } from 'neo4j-driver';

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
    const retryDelay = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to connect to PuppyGraph (attempt ${attempt}/${maxRetries})...`);
        
        // Connect to PuppyGraph using Bolt protocol on port 7687
        // Use container name in Docker environment, localhost in development
        const host = process.env.NODE_ENV === 'production' ? 'puppygraph' : 'localhost';
        const uri = `bolt://${host}:7687`;
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
      let enhancedQuery = this.enhanceQueryForRelationships(cypherQuery);
      
      // Enhance queries that return whole node objects to return specific properties
      enhancedQuery = await this.enhanceNodeObjectReturns(enhancedQuery);
      
      
      const result = await session.run(enhancedQuery);
      const executionTime = Date.now() - startTime;
      
      // Transform Neo4j result to our format
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const scalarResults: any[] = [];
      const nodeMap = new Map<string, GraphNode>();
      const edgeMap = new Map<string, GraphEdge>();
      
      result.records.forEach((record: any) => {
        record.keys.forEach((key: any) => {
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

      // Post-process scalar results to reconstruct nodes from property queries
      // This handles cases where queries return specific properties like "c.name, c.ticker"
      if (scalarResults.length > 0) {
        const reconstructedNodes = this.reconstructNodesFromScalarResults(scalarResults);
        if (reconstructedNodes.length > 0) {
          nodes.push(...reconstructedNodes);
          // Clear scalar results since they've been reconstructed into nodes
          scalarResults.length = 0; // Clear array instead of reassigning
        }
      }
      
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
      // Find the RETURN clause and add the relationship variable
      const returnMatch = enhancedQuery.match(/RETURN\s+([^]+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s+SKIP|\s+UNION|\s*$)/i);
      if (returnMatch) {
        const currentReturn = returnMatch[1].trim();
        // Find where the RETURN clause ends (before ORDER BY, LIMIT, etc.)
        const returnEndMatch = enhancedQuery.match(/RETURN\s+[^]+?(?=\s+ORDER\s+BY|\s+LIMIT|\s+SKIP|\s+UNION|\s*$)/i);
        if (returnEndMatch) {
          const returnEndIndex = returnEndMatch.index! + returnEndMatch[0].length;
          const beforeReturn = enhancedQuery.substring(0, returnEndIndex);
          const afterReturn = enhancedQuery.substring(returnEndIndex);
          const finalQuery = beforeReturn + ', rel' + afterReturn;
          return finalQuery;
        }
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

  private reconstructNodesFromScalarResults(scalarResults: any[]): GraphNode[] {
    const nodes: GraphNode[] = [];
    
    // Group scalar results by property type first, then by record
    const propertyGroups = new Map<string, any[]>();
    
    // Group by property name (e.g., "c.name", "c.ticker")
    scalarResults.forEach(scalar => {
      const key = scalar.key;
      if (!propertyGroups.has(key)) {
        propertyGroups.set(key, []);
      }
      propertyGroups.get(key)!.push(scalar.value);
    });
    
    // Determine the number of records by looking at the first property group
    const firstProperty = Array.from(propertyGroups.keys())[0];
    const recordCount = propertyGroups.get(firstProperty)?.length || 0;
    
    // Group properties by their source (node/relationship alias)
    const sourceGroups = new Map<string, Map<string, any[]>>();
    
    for (const [propertyKey, values] of Array.from(propertyGroups.entries())) {
      const match = propertyKey.match(/^(\w+)\.(.+)$/);
      if (match) {
        const [, sourceAlias, propertyName] = match;
        if (!sourceGroups.has(sourceAlias)) {
          sourceGroups.set(sourceAlias, new Map());
        }
        sourceGroups.get(sourceAlias)!.set(propertyName, values);
      }
    }
    
    // Reconstruct nodes and relationships separately
    for (let recordIndex = 0; recordIndex < recordCount; recordIndex++) {
      for (const [sourceAlias, properties] of Array.from(sourceGroups.entries())) {
        const nodeProperties: any = {};
        let label = 'Unknown';
        
        // Collect all properties for this source at this record index
        for (const [propertyName, values] of Array.from(properties.entries())) {
          if (recordIndex < values.length) {
            nodeProperties[propertyName] = values[recordIndex];
          }
        }
        
        // Determine label based on property patterns
        if (nodeProperties.name && (sourceAlias === 'c' || sourceAlias.includes('company'))) {
          label = 'Company';
        } else if (nodeProperties.name && (sourceAlias === 'p' || sourceAlias.includes('person'))) {
          label = 'Person';
        } else if (nodeProperties.rating && sourceAlias === 'r') {
          label = 'Rating';
        } else if (nodeProperties.type && (sourceAlias === 't' || sourceAlias.includes('transaction'))) {
          label = 'Transaction';
        } else if (nodeProperties.event_type && sourceAlias === 're') {
          label = 'RegulatoryEvent';
        } else if (nodeProperties.position || nodeProperties.salary) {
          // This is likely a relationship
          label = 'Relationship';
        }
        
        if (Object.keys(nodeProperties).length > 0) {
          const nodeId = `reconstructed_${recordIndex}_${sourceAlias}`;
          nodes.push({
            id: nodeId,
            label,
            properties: nodeProperties
          });
        }
      }
    }
    
    return nodes;
  }

  private getPropertiesPerNode(scalarResults: any[]): number {
    // Count how many unique properties we have for the first node alias
    const firstNodeAlias = scalarResults[0]?.key?.match(/^(\w+)\./)?.[1];
    if (!firstNodeAlias) return 1;
    
    // Count properties that belong to the first node alias in the first record
    // We need to find where the first record ends (when we see a different pattern)
    let count = 0;
    for (const scalar of scalarResults) {
      const match = scalar.key.match(/^(\w+)\./);
      if (match && match[1] === firstNodeAlias) {
        count++;
      } else {
        break; // We've moved to the next record
      }
    }
    
    return count;
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

  /**
   * Enhance queries that return whole node objects to return specific properties
   * This fixes the issue where RETURN c, r returns empty properties in PuppyGraph
   */
  private async enhanceNodeObjectReturns(cypherQuery: string): Promise<string> {
    // Check if the query returns whole node objects (e.g., RETURN c, r, n)
    const returnMatch = cypherQuery.match(/RETURN\s+(.+)$/i);
    if (!returnMatch) return cypherQuery;
    
    const returnClause = returnMatch[1].trim();
    
    // Check if any return values are just variable names (whole node or relationship objects)
    const returnItems = returnClause.split(',').map(item => item.trim());
    const hasNodeObjects = returnItems.some(item => 
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item) && 
      !item.includes('.') && 
      !item.includes('(') && 
      !item.includes(')')
    );
    
    if (!hasNodeObjects) return cypherQuery;
    
    // Find all node and relationship variables in the MATCH clause
    const matchMatch = cypherQuery.match(/MATCH\s+(.+?)(?:\s+WHERE|\s+RETURN|\s+ORDER|\s+LIMIT|$)/i);
    if (!matchMatch) return cypherQuery;
    
    const matchClause = matchMatch[1];
    const nodeVariables = new Set<string>();
    const relationshipVariables = new Set<string>();
    
    // Extract node variables from patterns like (c:Company), (p:Person), (r:Rating)
    const nodePatterns = matchClause.match(/\(([a-zA-Z_][a-zA-Z0-9_]*):[A-Za-z]+\)/g);
    if (nodePatterns) {
      nodePatterns.forEach(pattern => {
        const varMatch = pattern.match(/\(([a-zA-Z_][a-zA-Z0-9_]*):/);
        if (varMatch) {
          nodeVariables.add(varMatch[1]);
        }
      });
    }
    
    // Extract relationship variables from patterns like [e:EMPLOYED_BY], [r:HAS_RATING]
    const relationshipPatterns = matchClause.match(/\[([a-zA-Z_][a-zA-Z0-9_]*):[A-Za-z_]+\]/g);
    if (relationshipPatterns) {
      relationshipPatterns.forEach(pattern => {
        const varMatch = pattern.match(/\[([a-zA-Z_][a-zA-Z0-9_]*):/);
        if (varMatch) {
          relationshipVariables.add(varMatch[1]);
        }
      });
    }
    
    // Also check if 'rel' was added by enhanceQueryForRelationships
    if (matchClause.includes('[rel:')) {
      relationshipVariables.add('rel');
    }
    
    // Build new return clause with specific properties for each node and relationship variable
    const enhancedReturnItems: string[] = [];
    
    for (const item of returnItems) {
      if (nodeVariables.has(item)) {
        // This is a whole node object, replace with specific properties
        const nodeVar = item;
        const properties = await this.getNodeProperties(nodeVar, matchClause);
        if (properties.length > 0) {
          enhancedReturnItems.push(properties.join(', '));
        } else {
          // Fallback: return the node variable as-is if we can't determine properties
          enhancedReturnItems.push(item);
        }
      } else if (relationshipVariables.has(item)) {
        // This is a whole relationship object, replace with specific properties
        const relVar = item;
        const properties = await this.getRelationshipProperties(relVar, matchClause);
        if (properties.length > 0) {
          enhancedReturnItems.push(properties.join(', '));
        } else {
          // Fallback: return the relationship variable as-is if we can't determine properties
          enhancedReturnItems.push(item);
        }
      } else if (item === 'e' && relationshipVariables.has('rel')) {
        // Handle case where original query had 'e' but it was renamed to 'rel'
        const properties = await this.getRelationshipProperties('rel', matchClause);
        if (properties.length > 0) {
          enhancedReturnItems.push(properties.join(', '));
        } else {
          // Fallback: return the relationship variable as-is if we can't determine properties
          enhancedReturnItems.push('rel');
        }
      } else {
        // This is already a specific property or expression, keep as-is
        enhancedReturnItems.push(item);
      }
    }
    
    const enhancedReturnClause = enhancedReturnItems.join(', ');
    return cypherQuery.replace(/RETURN\s+.+$/i, `RETURN ${enhancedReturnClause}`);
  }
  
  /**
   * Get properties for a node variable based on its label from the graph schema
   */
  private async getNodeProperties(nodeVar: string, matchClause: string): Promise<string[]> {
    // Try to determine the node label from the match clause
    const labelMatch = matchClause.match(new RegExp(`\\(${nodeVar}:([A-Za-z]+)\\)`));
    const label = labelMatch ? labelMatch[1] : '';
    
    if (!label) {
      return [`${nodeVar}.name`, `${nodeVar}.id`]; // Default fallback
    }
    
    try {
      // Get the graph schema to determine available properties
      const schema = await this.getGraphSchema();
      
      // Find the node type in the schema (PuppyGraph uses graph.vertices structure)
      const nodeType = schema.graph?.vertices?.find((vertex: any) => vertex.label === label);
      if (nodeType && nodeType.attributes) {
        // Return all available properties for this node type
        return nodeType.attributes.map((attr: any) => `${nodeVar}.${attr.alias || attr.field}`);
      }
      
      // Fallback: try to get properties by querying a sample node
      return await this.getPropertiesFromSampleNode(nodeVar, label);
      
    } catch (error) {
      console.warn(`Failed to get properties for ${label}:`, error);
      // Fallback to common properties
      return this.getFallbackProperties(nodeVar, label);
    }
  }
  
  /**
   * Get properties for a relationship variable based on its label from the graph schema
   */
  private async getRelationshipProperties(relVar: string, matchClause: string): Promise<string[]> {
    // Try to determine the relationship label from the match clause
    const relMatch = matchClause.match(new RegExp(`\\[${relVar}:([A-Za-z_]+)\\]`));
    const label = relMatch ? relMatch[1] : '';
    
    if (!label) {
      return [`${relVar}.type`, `${relVar}.id`]; // Default fallback
    }
    
    try {
      // Get the graph schema to determine available properties
      const schema = await this.getGraphSchema();
      
      // Find the relationship type in the schema (PuppyGraph uses graph.edges structure)
      const relationshipType = schema.graph?.edges?.find((edge: any) => edge.label === label);
      if (relationshipType && relationshipType.attributes) {
        // Return all available properties for this relationship type
        return relationshipType.attributes.map((attr: any) => `${relVar}.${attr.alias || attr.field}`);
      }
      
      // Fallback: try to get properties by querying a sample relationship
      return await this.getPropertiesFromSampleRelationship(relVar, label);
      
    } catch (error) {
      console.warn(`Failed to get properties for relationship ${label}:`, error);
      // Fallback to common properties
      return this.getFallbackRelationshipProperties(relVar, label);
    }
  }
  
  /**
   * Get properties by querying a sample relationship of the given type
   */
  private async getPropertiesFromSampleRelationship(relVar: string, label: string): Promise<string[]> {
    if (!this.driver) {
      return this.getFallbackRelationshipProperties(relVar, label);
    }
    
    try {
      const session = this.driver.session();
      const sampleQuery = `MATCH ()-[r:${label}]->() RETURN r LIMIT 1`;
      const result = await session.run(sampleQuery);
      
      if (result.records.length > 0) {
        const record = result.records[0];
        const relationship = record.get('r');
        if (relationship && typeof relationship === 'object' && 'properties' in relationship) {
          const properties = Object.keys(relationship.properties);
          if (properties.length > 0) {
            return properties.map(prop => `${relVar}.${prop}`);
          }
        }
      }
      
      await session.close();
    } catch (error) {
      console.warn(`Failed to get sample properties for relationship ${label}:`, error);
    }
    
    return this.getFallbackRelationshipProperties(relVar, label);
  }
  
  /**
   * Fallback properties when relationship schema lookup fails
   */
  private getFallbackRelationshipProperties(relVar: string, label: string): string[] {
    const fallbackMap: { [key: string]: string[] } = {
      'EMPLOYED_BY': ['position', 'start_date', 'end_date', 'salary'],
      'HAS_RATING': ['rating', 'rating_agency'],
      'PARTICIPATES_IN': ['type', 'value', 'currency'],
      'TARGET_OF': ['type', 'value', 'currency'],
      'SUBJECT_TO': ['event_type', 'regulator', 'description']
    };
    
    const properties = fallbackMap[label] || ['type', 'id'];
    return properties.map(prop => `${relVar}.${prop}`);
  }

  /**
   * Get properties by querying a sample node of the given type
   */
  private async getPropertiesFromSampleNode(nodeVar: string, label: string): Promise<string[]> {
    if (!this.driver) {
      return this.getFallbackProperties(nodeVar, label);
    }
    
    try {
      const session = this.driver.session();
      const sampleQuery = `MATCH (n:${label}) RETURN n LIMIT 1`;
      const result = await session.run(sampleQuery);
      
      if (result.records.length > 0) {
        const record = result.records[0];
        const node = record.get('n');
        if (node && typeof node === 'object' && 'properties' in node) {
          const properties = Object.keys(node.properties);
          if (properties.length > 0) {
            return properties.map(prop => `${nodeVar}.${prop}`);
          }
        }
      }
      
      await session.close();
    } catch (error) {
      console.warn(`Failed to get sample properties for ${label}:`, error);
    }
    
    return this.getFallbackProperties(nodeVar, label);
  }
  
  /**
   * Fallback properties when schema lookup fails
   */
  private getFallbackProperties(nodeVar: string, label: string): string[] {
    const fallbackMap: { [key: string]: string[] } = {
      'Company': ['name', 'ticker', 'sector', 'industry'],
      'Person': ['name', 'title'],
      'Rating': ['rating', 'rating_agency'],
      'Transaction': ['type', 'value', 'currency'],
      'RegulatoryEvent': ['event_type', 'regulator', 'description']
    };
    
    const properties = fallbackMap[label] || ['name', 'id'];
    return properties.map(prop => `${nodeVar}.${prop}`);
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
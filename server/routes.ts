import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { puppyGraphClient } from "./graph/puppygraph_client";
import { simplifiedPuppyGraphClient } from "./graph/simplified_puppygraph_client";
import { DataTransformer } from "./graph/data_transformer";
import { cypherGenAgent } from "./agents/cypher_gen_wrapper";
import { 
  insertQueryHistorySchema, 
  temporalQuerySchema, 
  naturalLanguageQuerySchema, 
  multiHopQuerySchema, 
  cypherQuerySchema 
} from "@shared/schema";
import { z } from "zod";

// Function to update CypherGen agent with dynamic schema
async function updateCypherGenAgentSchema() {
  try {
    const schema = await puppyGraphClient.getGraphSchema();
    
    // Convert PuppyGraph schema to a readable format for the agent
    const schemaContext = convertSchemaToContext(schema);
    
    // Update the agent with the new schema
    cypherGenAgent.updateSchema(schemaContext);
    
    console.log("CypherGen agent schema updated successfully");
  } catch (error) {
    console.warn("Failed to update CypherGen agent schema:", error);
    // Agent will use default schema as fallback
  }
}

// Function to convert PuppyGraph schema to readable context
function convertSchemaToContext(schema: any): string {
  const vertices = schema.graph?.vertices || [];
  const edges = schema.graph?.edges || [];
  
  let context = "The knowledge graph contains:\n";
  
  // Add node types and their properties
  vertices.forEach((vertex: any) => {
    const label = vertex.label;
    const attributes = vertex.oneToOne?.attributes || [];
    const propertyNames = attributes.map((attr: any) => attr.alias).join(", ");
    context += `- ${label} nodes (${propertyNames})\n`;
  });
  
  // Add relationships
  if (edges.length > 0) {
    context += "\nRelationships:\n";
    edges.forEach((edge: any) => {
      context += `- ${edge.label}: ${edge.fromVertex} -> ${edge.toVertex}\n`;
    });
  }
  
  return context;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Update CypherGen agent with dynamic schema on startup
  await updateCypherGenAgentSchema();
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Metrics endpoint
  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await storage.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ 
        error: "Failed to fetch metrics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test PuppyGraph queries for metrics
  app.get("/api/metrics/puppygraph", async (req, res) => {
    try {
      const isConnected = simplifiedPuppyGraphClient.isReady();
      if (!isConnected) {
        return res.status(503).json({ 
          error: "PuppyGraph not connected",
          details: "PuppyGraph service is not available"
        });
      }

      // Test queries to get actual counts from PuppyGraph
      const testQueries = [
        "MATCH (n) RETURN count(n) as total_nodes",
        "MATCH ()-[r]->() RETURN count(r) as total_edges",
        "MATCH (n:Company) RETURN count(n) as companies",
        "MATCH (n:Person) RETURN count(n) as people"
      ];

      const results = await Promise.all(
        testQueries.map(async (query) => {
          try {
            const result = await puppyGraphClient.executeQuery(query);
            return { query, success: true, result };
          } catch (error) {
            return { query, success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
        })
      );

      res.json({
        puppygraph_connected: true,
        test_results: results
      });
    } catch (error) {
      console.error("Error testing PuppyGraph metrics:", error);
      res.status(500).json({ 
        error: "Failed to test PuppyGraph metrics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // DSPy Agent Query Processing
  app.post("/api/query/natural", async (req, res) => {
    try {
      // Validate input with Zod schema
      const validationResult = naturalLanguageQuerySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid input parameters",
          details: validationResult.error.issues
        });
      }

      const { query } = validationResult.data;

      console.log(`Processing natural language query: ${query}`);
      const startTime = Date.now();
      
      // Process query with CypherGen agent
      const result = await cypherGenAgent.generateCypherQuery(query);
      const executionTime = Date.now() - startTime;

      // Save query to history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "natural",
          generatedCypher: result.cypher_query,
          results: { 
            reasoning: result.reasoning, 
            execution_time: result.execution_time
          },
          executionTime
        });
      } catch (historyError) {
        console.warn("Failed to save query history:", historyError);
      }

      res.json({
        success: !result.error,
        query_type: "natural",
        cypher_query: result.cypher_query,
        reasoning: result.reasoning,
        execution_time: executionTime,
        error: result.error
      });

    } catch (error) {
      console.error("Error processing natural language query:", error);
      res.status(500).json({ 
        error: "Failed to process query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // CypherGen Query Processing
  app.post("/api/query/cyphergen", async (req, res) => {
    try {
      // Validate input with Zod schema  
      const validationResult = naturalLanguageQuerySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid input parameters",
          details: validationResult.error.issues
        });
      }

      const { query: question } = validationResult.data;

      console.log(`Processing CypherGen query: ${question}`);
      const startTime = Date.now();
      
      const result = await cypherGenAgent.generateCypherQuery(question);
      const executionTime = Date.now() - startTime;

      res.json({
        success: !result.error,
        cypher_query: result.cypher_query,
        reasoning: result.reasoning,
        execution_time: executionTime,
        error: result.error
      });

    } catch (error) {
      console.error("Error processing CypherGen query:", error);
      res.status(500).json({ 
        error: "Failed to process CypherGen query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get Query History
  app.get("/api/query/history", async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const history = await storage.getQueryHistory(
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      
      res.json({
        queries: history,
        total: history.length
      });
    } catch (error) {
      console.error("Error fetching query history:", error);
      res.status(500).json({ 
        error: "Failed to fetch query history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Financial Data Endpoints
  app.get("/api/companies", async (req, res) => {
    try {
      const { sector, limit = 50 } = req.query;
      const companies = await storage.getCompanies(
        sector as string, 
        parseInt(limit as string)
      );
      res.json({ companies });
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ 
        error: "Failed to fetch companies",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/companies/:id/relationships", async (req, res) => {
    try {
      const { id } = req.params;
      const relationships = await storage.getCompanyRelationships(id);
      res.json({ relationships });
    } catch (error) {
      console.error("Error fetching company relationships:", error);
      res.status(500).json({ 
        error: "Failed to fetch company relationships",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test CypherGen Agent Status
  app.get("/api/agent/status", async (req, res) => {
    try {
      const isWorking = await cypherGenAgent.test();
      res.json({ 
        status: isWorking ? "operational" : "error",
        agent_type: "CypherGen",
        capabilities: ["natural_language_to_cypher", "graph_query_generation"]
      });
    } catch (error) {
      res.json({ 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Graph Query Endpoints (PuppyGraph integration)
  app.post("/api/graph/query", async (req, res) => {
    try {
      // Validate input with Zod schema
      const validationResult = cypherQuerySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid input parameters",
          details: validationResult.error.issues
        });
      }

      const { cypher_query } = validationResult.data;

      console.log(`Executing graph query: ${cypher_query}`);
      const result = await simplifiedPuppyGraphClient.executeCypherQuery(cypher_query);

      // Transform to legacy format for backward compatibility
      const legacyFormat = DataTransformer.toLegacyFormat(result.records);

      res.json({
        success: true,
        nodes: legacyFormat.nodes,
        edges: legacyFormat.edges,
        scalarResults: legacyFormat.scalarResults,
        executionTime: result.executionTime,
        cypherQuery: result.cypherQuery,
        recordCount: result.recordCount
      });

    } catch (error) {
      console.error("Error executing graph query:", error);
      res.status(500).json({ 
        error: "Failed to execute graph query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Combined Natural Language to Graph Query
  app.post("/api/graph/natural", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required and must be a string" });
      }

      console.log(`Processing natural language to graph query: ${query}`);
      const startTime = Date.now();
      
      // Step 1: Convert natural language to Cypher using CypherGen agent
      const cypherGenResult = await cypherGenAgent.generateCypherQuery(query);
      
      if (cypherGenResult.error || !cypherGenResult.cypher_query) {
        return res.status(400).json({
          error: "Failed to generate Cypher query",
          details: cypherGenResult.reasoning,
          cyphergen_error: cypherGenResult.error
        });
      }

      // Step 2: Execute the generated Cypher on the graph
      const graphResult = await simplifiedPuppyGraphClient.executeCypherQuery(cypherGenResult.cypher_query);
      
      const totalExecutionTime = Date.now() - startTime;

      // Transform to legacy format for backward compatibility
      const legacyFormat = DataTransformer.toLegacyFormat(graphResult.records);

      // Save to query history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "natural",
          generatedCypher: cypherGenResult.cypher_query,
          results: { 
            reasoning: cypherGenResult.reasoning, 
            nodes_count: legacyFormat.nodes.length,
            edges_count: legacyFormat.edges.length,
            cyphergen_execution_time: cypherGenResult.execution_time,
            graph_execution_time: graphResult.executionTime
          },
          executionTime: totalExecutionTime
        });
      } catch (historyError) {
        console.warn("Failed to save query history:", historyError);
      }

      res.json({
        success: true,
        query_type: "natural",
        cypher_query: cypherGenResult.cypher_query,
        reasoning: cypherGenResult.reasoning,
        nodes: legacyFormat.nodes,
        edges: legacyFormat.edges,
        scalarResults: legacyFormat.scalarResults,
        cyphergen_execution_time: cypherGenResult.execution_time,
        graph_execution_time: graphResult.executionTime,
        total_execution_time: totalExecutionTime
      });

    } catch (error) {
      console.error("Error processing natural language graph query:", error);
      res.status(500).json({ 
        error: "Failed to process natural language graph query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Graph Status and Schema
  app.get("/api/graph/status", async (req, res) => {
    try {
      const status = simplifiedPuppyGraphClient.getStatus();
      const schema = await simplifiedPuppyGraphClient.getGraphSchema();
      
      res.json({
        ...status,
        schema,
        ready: simplifiedPuppyGraphClient.isReady()
      });
    } catch (error) {
      console.error("Error getting graph status:", error);
      res.status(500).json({ 
        error: "Failed to get graph status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Simplified Graph Query Endpoint (returns unified format)
  app.post("/api/graph/query/simplified", async (req, res) => {
    try {
      const validationResult = cypherQuerySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid input parameters",
          details: validationResult.error.issues
        });
      }

      const { cypher_query } = validationResult.data;

      console.log(`Executing simplified graph query: ${cypher_query}`);
      const result = await simplifiedPuppyGraphClient.executeCypherQuery(cypher_query);

      // Transform to graph visualization format
      const graphData = DataTransformer.toGraphVisualization(result.records);
      
      // Apply force layout
      const layoutedNodes = DataTransformer.applyForceLayout(graphData.nodes, graphData.edges);

      // Transform to legacy format to get scalar results
      const legacyFormat = DataTransformer.toLegacyFormat(result.records);

      res.json({
        success: true,
        nodes: layoutedNodes,
        edges: graphData.edges,
        scalarResults: legacyFormat.scalarResults,
        records: result.records,
        executionTime: result.executionTime,
        cypherQuery: result.cypherQuery,
        recordCount: result.recordCount
      });

    } catch (error) {
      console.error("Error executing simplified graph query:", error);
      res.status(500).json({ 
        error: "Failed to execute simplified graph query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Multi-hop Retrieval Endpoint
  app.post("/api/graph/multi-hop", async (req, res) => {
    try {
      const { query, max_hops } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required and must be a string" });
      }

      const maxHops = max_hops || 3;
      if (maxHops < 1 || maxHops > 5) {
        return res.status(400).json({ error: "max_hops must be between 1 and 5" });
      }

      console.log(`Processing multi-hop query: ${query} (max hops: ${maxHops})`);
      const startTime = Date.now();
      
      // Process the complex query using multi-hop retrieval
      // TODO: Implement multi-hop agent or use simplified approach
      const result = await simplifiedPuppyGraphClient.executeCypherQuery(query);
      const legacyFormat = DataTransformer.toLegacyFormat(result.records);
      
      // Mock multi-hop result for now
      const mockResult = {
        reasoning: "Multi-hop query processed using simplified approach",
        hops: [query],
        final_nodes: legacyFormat.nodes,
        final_edges: legacyFormat.edges,
        cypher_queries: [query],
        execution_time: result.executionTime
      };
      
      const totalExecutionTime = Date.now() - startTime;

      // Save to query history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "multi-hop",
          generatedCypher: mockResult.cypher_queries.join('; '),
          results: { 
            reasoning: mockResult.reasoning, 
            hops: mockResult.hops.length,
            nodes_count: mockResult.final_nodes.length,
            edges_count: mockResult.final_edges.length,
            multi_hop_execution_time: mockResult.execution_time
          },
          executionTime: totalExecutionTime
        });
      } catch (historyError) {
        console.warn("Failed to save multi-hop query history:", historyError);
      }

      res.json({
        success: true,
        query_type: "multi-hop",
        original_query: query,
        reasoning: mockResult.reasoning,
        hops_executed: mockResult.hops.length,
        hops: mockResult.hops,
        cypher_queries: mockResult.cypher_queries,
        nodes: mockResult.final_nodes,
        edges: mockResult.final_edges,
        multi_hop_execution_time: mockResult.execution_time,
        total_execution_time: totalExecutionTime,
        error: null
      });

    } catch (error) {
      console.error("Error processing multi-hop query:", error);
      res.status(500).json({ 
        error: "Failed to process multi-hop query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // CypherGen Agent Status
  app.get("/api/agent/cyphergen/status", async (req, res) => {
    try {
      const isWorking = await cypherGenAgent.test();
      res.json({ 
        status: isWorking ? "operational" : "error",
        agent_type: "CypherGen DSPy",
        capabilities: ["natural_language_to_cypher", "graph_query_generation", "financial_entity_queries"]
      });
    } catch (error) {
      res.json({ 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============ FRONTEND-COMPATIBLE GRAPH API ROUTES ============
  // These routes match the frontend expectations and return nodes/edges format

  // Natural Language Query with Graph Results
  app.post("/api/graph/natural", async (req, res) => {
    try {
      // Validate input with Zod schema
      const validationResult = temporalQuerySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid input parameters",
          details: validationResult.error.issues
        });
      }

      const { query, startDate, endDate, granularity } = validationResult.data;

      console.log(`Processing natural language query for graph: ${query}`);
      const startTime = Date.now();
      
      // Process query with CypherGen agent (temporal context not yet supported)
      const cypherResult = await cypherGenAgent.generateCypherQuery(query);
      
      if (cypherResult.error) {
        return res.json({
          success: false,
          error: cypherResult.error,
          reasoning: cypherResult.reasoning,
          nodes: [],
          edges: [],
          execution_time: Date.now() - startTime
        });
      }

      // Execute Cypher query and get graph results
      const graphStartTime = Date.now();
      const graphResult = await puppyGraphClient.executeQuery(cypherResult.cypher_query);
      const graphExecutionTime = Date.now() - graphStartTime;
      
      const totalExecutionTime = Date.now() - startTime;

      // Save to history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "natural",
          generatedCypher: cypherResult.cypher_query,
          results: { 
            reasoning: cypherResult.reasoning, 
            execution_time: cypherResult.execution_time,
            temporal_params: { startDate, endDate, granularity },
            nodes_count: graphResult.nodes.length,
            edges_count: graphResult.edges.length
          },
          executionTime: totalExecutionTime
        });
      } catch (historyError) {
        console.warn("Failed to save query history:", historyError);
      }

      res.json({
        success: true,
        query_type: "natural",
        cypher_query: cypherResult.cypher_query,
        reasoning: cypherResult.reasoning,
        nodes: graphResult.nodes,
        edges: graphResult.edges,
        graph_execution_time: graphExecutionTime,
        total_execution_time: totalExecutionTime
      });

    } catch (error) {
      console.error("Error processing natural language graph query:", error);
      res.status(500).json({ 
        error: "Failed to process graph query",
        details: error instanceof Error ? error.message : "Unknown error",
        nodes: [],
        edges: []
      });
    }
  });


  // CypherGen Query with Graph Results  
  app.post("/api/graph/cyphergen", async (req, res) => {
    try {
      const { query, max_hops = 3, startDate, endDate, granularity } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required and must be a string" });
      }

      console.log(`Processing CypherGen graph query: ${query}`);
      const startTime = Date.now();
      
      // Generate Cypher query using CypherGen agent
      const cypherGenResult = await cypherGenAgent.generateCypherQuery(query);
      
      if (cypherGenResult.error) {
        return res.json({
          success: false,
          error: cypherGenResult.error,
          reasoning: cypherGenResult.reasoning,
          nodes: [],
          edges: [],
          execution_time: Date.now() - startTime
        });
      }

      // Execute the generated Cypher query on the graph
      const graphStartTime = Date.now();
      const graphResult = await puppyGraphClient.executeQuery(cypherGenResult.cypher_query);
      const graphExecutionTime = Date.now() - graphStartTime;
      const totalExecutionTime = Date.now() - startTime;

      // Save to history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "cyphergen",
          generatedCypher: cypherGenResult.cypher_query,
          results: { 
            reasoning: cypherGenResult.reasoning,
            nodes_count: graphResult.nodes.length,
            edges_count: graphResult.edges.length,
            cyphergen_execution_time: cypherGenResult.execution_time,
            graph_execution_time: graphExecutionTime
          },
          executionTime: totalExecutionTime
        });
      } catch (historyError) {
        console.warn("Failed to save CypherGen query history:", historyError);
      }

      res.json({
        success: true,
        cypher_query: cypherGenResult.cypher_query,
        reasoning: cypherGenResult.reasoning,
        nodes: graphResult.nodes,
        edges: graphResult.edges,
        scalarResults: graphResult.scalarResults,
        cyphergen_execution_time: cypherGenResult.execution_time,
        graph_execution_time: graphExecutionTime,
        total_execution_time: totalExecutionTime
      });

    } catch (error) {
      console.error("Error processing CypherGen graph query:", error);
      res.status(500).json({ 
        error: "Failed to process CypherGen query",
        details: error instanceof Error ? error.message : "Unknown error",
        nodes: [],
        edges: []
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

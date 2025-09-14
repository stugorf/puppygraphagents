import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dspyAgent } from "./agents/dspy_wrapper";
import { puppyGraphClient } from "./graph/puppygraph_client";
import { multiHopAgent } from "./agents/multi_hop_wrapper";
import { insertQueryHistorySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // DSPy Agent Query Processing
  app.post("/api/query/natural", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required and must be a string" });
      }

      console.log(`Processing natural language query: ${query}`);
      const startTime = Date.now();
      
      // Process query with DSPy agent
      const result = await dspyAgent.processNaturalQuery(query);
      const executionTime = Date.now() - startTime;

      // Save query to history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "natural",
          generatedCypher: result.cypher_query,
          results: { 
            reasoning: result.reasoning, 
            query_type: result.query_type,
            time_context: result.time_context 
          },
          executionTime
        });
      } catch (historyError) {
        console.warn("Failed to save query history:", historyError);
      }

      res.json({
        success: result.query_type !== 'error',
        query_type: result.query_type,
        cypher_query: result.cypher_query,
        reasoning: result.reasoning,
        time_context: result.time_context,
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

  // Multi-hop Query Processing
  app.post("/api/query/multihop", async (req, res) => {
    try {
      const { question, max_hops = 3 } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: "Question is required and must be a string" });
      }

      console.log(`Processing multi-hop query: ${question}`);
      const startTime = Date.now();
      
      const result = await dspyAgent.processMultiHopQuery(question, max_hops);
      const executionTime = Date.now() - startTime;

      res.json({
        success: !result.error,
        hops: result.hops,
        reasoning: result.reasoning,
        final_query: result.final_query,
        execution_time: executionTime,
        error: result.error
      });

    } catch (error) {
      console.error("Error processing multi-hop query:", error);
      res.status(500).json({ 
        error: "Failed to process multi-hop query",
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

  // Test DSPy Agent Status
  app.get("/api/agent/status", async (req, res) => {
    try {
      const isWorking = await dspyAgent.test();
      res.json({ 
        status: isWorking ? "operational" : "error",
        agent_type: "DSPy",
        capabilities: ["natural_language_to_cypher", "multi_hop_reasoning"]
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
      const { cypher_query } = req.body;
      
      if (!cypher_query || typeof cypher_query !== 'string') {
        return res.status(400).json({ error: "cypher_query is required and must be a string" });
      }

      console.log(`Executing graph query: ${cypher_query}`);
      const result = await puppyGraphClient.executeCypherQuery(cypher_query);

      res.json({
        success: true,
        ...result
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
      
      // Step 1: Convert natural language to Cypher using DSPy
      const dspyResult = await dspyAgent.processNaturalQuery(query);
      
      if (dspyResult.query_type === 'error' || !dspyResult.cypher_query) {
        return res.status(400).json({
          error: "Failed to generate Cypher query",
          details: dspyResult.reasoning,
          dsph_error: dspyResult.error
        });
      }

      // Step 2: Execute the generated Cypher on the graph
      const graphResult = await puppyGraphClient.executeCypherQuery(dspyResult.cypher_query);
      
      const totalExecutionTime = Date.now() - startTime;

      // Save to query history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "natural",
          generatedCypher: dspyResult.cypher_query,
          results: { 
            reasoning: dspyResult.reasoning, 
            nodes_count: graphResult.nodes.length,
            edges_count: graphResult.edges.length,
            graph_execution_time: graphResult.executionTime
          },
          executionTime: totalExecutionTime
        });
      } catch (historyError) {
        console.warn("Failed to save query history:", historyError);
      }

      res.json({
        success: true,
        query_type: dspyResult.query_type,
        cypher_query: dspyResult.cypher_query,
        reasoning: dspyResult.reasoning,
        time_context: dspyResult.time_context,
        nodes: graphResult.nodes,
        edges: graphResult.edges,
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
      const status = puppyGraphClient.getStatus();
      const schema = await puppyGraphClient.getGraphSchema();
      
      res.json({
        ...status,
        schema,
        ready: puppyGraphClient.isReady()
      });
    } catch (error) {
      console.error("Error getting graph status:", error);
      res.status(500).json({ 
        error: "Failed to get graph status",
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
      const result = await multiHopAgent.processComplexQuery(query, maxHops);
      
      const totalExecutionTime = Date.now() - startTime;

      // Save to query history
      try {
        await storage.insertQueryHistory({
          originalQuery: query,
          queryType: "multi-hop",
          generatedCypher: result.cypher_queries.join('; '),
          results: { 
            reasoning: result.reasoning, 
            hops: result.hops.length,
            nodes_count: result.final_nodes.length,
            edges_count: result.final_edges.length,
            multi_hop_execution_time: result.execution_time
          },
          executionTime: totalExecutionTime
        });
      } catch (historyError) {
        console.warn("Failed to save multi-hop query history:", historyError);
      }

      res.json({
        success: true,
        query_type: "multi-hop",
        original_query: result.query,
        reasoning: result.reasoning,
        hops_executed: result.hops.length,
        hops: result.hops,
        cypher_queries: result.cypher_queries,
        nodes: result.final_nodes,
        edges: result.final_edges,
        multi_hop_execution_time: result.execution_time,
        total_execution_time: totalExecutionTime,
        error: result.error
      });

    } catch (error) {
      console.error("Error processing multi-hop query:", error);
      res.status(500).json({ 
        error: "Failed to process multi-hop query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Multi-hop Agent Status
  app.get("/api/agent/multi-hop/status", async (req, res) => {
    try {
      const isWorking = await multiHopAgent.test();
      res.json({ 
        status: isWorking ? "operational" : "error",
        agent_type: "Multi-Hop DSPy",
        capabilities: ["complex_reasoning", "multi_step_retrieval", "graph_traversal", "temporal_analysis"]
      });
    } catch (error) {
      res.json({ 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

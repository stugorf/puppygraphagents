import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

export interface MultiHopResult {
  query: string;
  reasoning: string;
  hops: Array<{
    step_number: number;
    description: string;
    cypher_query?: string;
    reasoning?: string;
    nodes_found?: number;
    edges_found?: number;
    error?: string;
  }>;
  final_nodes: Array<{
    id: string;
    label: string;
    properties: Record<string, any>;
  }>;
  final_edges: Array<{
    id: string;
    from_id: string;
    to_id: string;
    label: string;
    properties: Record<string, any>;
  }>;
  execution_time: number;
  cypher_queries: string[];
  error?: string;
}

class MultiHopAgent {
  private agentsDir: string;

  constructor() {
    // Get current directory for ES modules
    const currentFilePath = fileURLToPath(import.meta.url);
    this.agentsDir = path.dirname(currentFilePath);
  }

  async processComplexQuery(question: string, maxHops: number = 3): Promise<MultiHopResult> {
    return new Promise((resolve, reject) => {
      console.log(`Starting multi-hop retrieval for: ${question}`);
      
      const pythonProcess = spawn('python3', ['-c', `
import sys
import os
sys.path.append('${this.agentsDir}')

from multi_hop_agent import MultiHopAgent
import json

# Initialize agent with API key from environment
api_key = os.environ.get('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

agent = MultiHopAgent(api_key)

# Process the complex query
question = """${question.replace(/"/g, '\\"')}"""
result = agent.process_complex_query(question, max_hops=${maxHops})

# Convert to dictionary for JSON output
output = {
    "query": result.query,
    "reasoning": result.reasoning,
    "hops": result.hops,
    "final_nodes": [agent._node_to_dict(node) for node in result.final_nodes],
    "final_edges": [agent._edge_to_dict(edge) for edge in result.final_edges],
    "execution_time": result.execution_time,
    "cypher_queries": result.cypher_queries,
    "error": result.error
}

print(json.dumps(output))
`], {
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY
        }
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Multi-hop agent stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Multi-hop agent process exited with code ${code}`);
          console.error('Error output:', errorData);
          reject(new Error(`Multi-hop agent failed with exit code ${code}: ${errorData}`));
          return;
        }

        try {
          // Find the JSON output in the data (last complete JSON object)
          const lines = outputData.trim().split('\n');
          let jsonOutput = '';
          
          // Look for JSON output (starts with { and ends with })
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
              jsonOutput = line;
              break;
            }
          }

          if (!jsonOutput) {
            throw new Error('No valid JSON output found from multi-hop agent');
          }

          const result: MultiHopResult = JSON.parse(jsonOutput);
          console.log(`Multi-hop retrieval completed: ${result.final_nodes.length} nodes, ${result.final_edges.length} edges in ${result.execution_time}s`);
          resolve(result);
        } catch (error) {
          console.error('Error parsing multi-hop agent output:', error);
          console.error('Raw output:', outputData);
          reject(new Error(`Failed to parse multi-hop agent output: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Error spawning multi-hop agent process:', error);
        reject(new Error(`Failed to start multi-hop agent: ${error.message}`));
      });
    });
  }

  async processComplexQueryWithTemporal(
    question: string, 
    maxHops: number = 3,
    startDate?: string,
    endDate?: string,
    granularity?: string
  ): Promise<MultiHopResult> {
    // For now, temporal multi-hop can fall back to regular processing
    // In the future, this could incorporate temporal context into the multi-hop reasoning
    console.log(`Multi-hop query with temporal context: ${question}, temporal: ${startDate} to ${endDate}, granularity: ${granularity}`);
    
    // TODO: Enhance multi-hop agent to use temporal context in reasoning steps
    return await this.processComplexQuery(question, maxHops);
  }

  async test(): Promise<boolean> {
    try {
      const testQuestion = "Find companies and their executives";
      const result = await this.processComplexQuery(testQuestion, 1);
      return result.error === null || result.error === undefined;
    } catch (error) {
      console.error('Multi-hop agent test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const multiHopAgent = new MultiHopAgent();
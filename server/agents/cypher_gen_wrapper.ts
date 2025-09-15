import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

export interface CypherGenResult {
  query: string;
  cypher_query: string;
  reasoning: string;
  execution_time: number;
  error?: string;
}

class CypherGenAgent {
  private agentsDir: string;
  private schemaContext: string | null = null;

  constructor(schemaContext?: string) {
    // Get current directory for ES modules
    const currentFilePath = fileURLToPath(import.meta.url);
    this.agentsDir = path.dirname(currentFilePath);
    this.schemaContext = schemaContext || null;
  }

  updateSchema(schemaContext: string): void {
    this.schemaContext = schemaContext;
  }

  async generateCypherQuery(question: string): Promise<CypherGenResult> {
    return new Promise((resolve, reject) => {
      console.log(`Generating Cypher query for: ${question}`);
      
      const schemaContext = this.schemaContext ? `"""${this.schemaContext.replace(/"/g, '\\"')}"""` : 'None';
      
      const pythonProcess = spawn('python3', ['-c', `
import sys
import os
sys.path.append('${this.agentsDir}')

from multi_hop_agent import CypherGenAgent
import json

# Initialize agent (will load API key from .env file)
schema_context = ${schemaContext}
agent = CypherGenAgent(schema_context=schema_context)

# Generate Cypher query
question = """${question.replace(/"/g, '\\"')}"""
result = agent.generate_cypher_query(question)

# Convert to dictionary for JSON output
output = {
    "query": result.query,
    "cypher_query": result.cypher_query,
    "reasoning": result.reasoning,
    "execution_time": result.execution_time,
    "error": result.error
}

print(json.dumps(output))
`], {
      env: {
        ...process.env
      }
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('CypherGen agent stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`CypherGen agent process exited with code ${code}`);
          console.error('Error output:', errorData);
          reject(new Error(`CypherGen agent failed with exit code ${code}: ${errorData}`));
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
            throw new Error('No valid JSON output found from CypherGen agent');
          }

          const result: CypherGenResult = JSON.parse(jsonOutput);
          console.log(`Cypher generation completed in ${result.execution_time}s`);
          resolve(result);
        } catch (error) {
          console.error('Error parsing CypherGen agent output:', error);
          console.error('Raw output:', outputData);
          reject(new Error(`Failed to parse CypherGen agent output: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Error spawning CypherGen agent process:', error);
        reject(new Error(`Failed to start CypherGen agent: ${error.message}`));
      });
    });
  }

  async test(): Promise<boolean> {
    try {
      const testQuestion = "Show me all companies in the financial services sector";
      const result = await this.generateCypherQuery(testQuestion);
      return result.error === null || result.error === undefined;
    } catch (error) {
      console.error('CypherGen agent test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const cypherGenAgent = new CypherGenAgent();
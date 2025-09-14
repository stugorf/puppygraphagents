import { spawn } from 'child_process';
import path from 'path';

interface DSPyResult {
  cypher_query: string | null;
  reasoning: string;
  query_type: 'standard' | 'temporal' | 'error';
  time_context?: string | null;
  error?: string;
}

interface MultiHopResult {
  hops: string[];
  reasoning: string;
  final_query: string | null;
  error?: string;
}

export class DSPyAgent {
  private pythonPath: string;
  private agentPath: string;

  constructor() {
    // Use system Python instead of .pythonlibs
    this.pythonPath = 'python3';
    this.agentPath = path.join(process.cwd(), 'server', 'agents', 'dspy_agent.py');
  }

  private async runPythonScript(script: string, stdinData?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, ['-c', script], {
        env: {
          ...process.env,
          PYTHONPATH: process.env.PYTHONPATH || ''
        }
      });

      // Send JSON data via stdin if provided
      if (stdinData) {
        python.stdin.write(stdinData);
        python.stdin.end();
      }

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${stdout}\nError: ${error}`));
        }
      });
    });
  }

  async processNaturalQuery(naturalQuery: string): Promise<DSPyResult> {
    try {
      const script = `
import sys
import os
import json
sys.path.append('${path.join(process.cwd(), 'server', 'agents')}')

from dspy_agent import process_natural_query

data = json.loads(sys.stdin.read())
result = process_natural_query(data['query'])
print(json.dumps(result))
`;

      const inputData = JSON.stringify({ query: naturalQuery });
      const result = await this.runPythonScript(script, inputData);
      return result as DSPyResult;
    } catch (error) {
      console.error('Error in DSPy agent:', error);
      return {
        cypher_query: null,
        reasoning: `Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        query_type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processNaturalQueryWithTemporal(
    naturalQuery: string, 
    startDate?: string, 
    endDate?: string, 
    granularity?: string
  ): Promise<DSPyResult> {
    try {
      const script = `
import sys
import os
import json
sys.path.append('${path.join(process.cwd(), 'server', 'agents')}')

from dspy_agent import process_temporal_query

data = json.loads(sys.stdin.read())
result = process_temporal_query(
    data['query'], 
    data.get('start_date'), 
    data.get('end_date'), 
    data.get('granularity')
)
print(json.dumps(result))
`;

      const inputData = JSON.stringify({
        query: naturalQuery,
        start_date: startDate || null,
        end_date: endDate || null,
        granularity: granularity || null
      });
      const result = await this.runPythonScript(script, inputData);
      return result as DSPyResult;
    } catch (error) {
      console.error('Error in temporal DSPy agent:', error);
      
      // Fallback to regular query if temporal processing fails
      console.log('Falling back to regular natural query processing...');
      return await this.processNaturalQuery(naturalQuery);
    }
  }

  async processMultiHopQuery(question: string, maxHops: number = 3): Promise<MultiHopResult> {
    try {
      const script = `
import sys
import os
import json
sys.path.append('${path.join(process.cwd(), 'server', 'agents')}')

from dspy_agent import process_multihop_query

data = json.loads(sys.stdin.read())
result = process_multihop_query(data['question'], data['max_hops'])
print(json.dumps(result))
`;

      const inputData = JSON.stringify({ question, max_hops: maxHops });
      const result = await this.runPythonScript(script, inputData);
      return result as MultiHopResult;
    } catch (error) {
      console.error('Error in multi-hop DSPy agent:', error);
      return {
        hops: [],
        reasoning: `Failed to process multi-hop query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        final_query: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Simple test method to verify the agent is working
  async test(): Promise<boolean> {
    try {
      const result = await this.processNaturalQuery("Show me all companies in the financial sector");
      return result.query_type !== 'error' && result.cypher_query !== null;
    } catch (error) {
      console.error('DSPy agent test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const dspyAgent = new DSPyAgent();
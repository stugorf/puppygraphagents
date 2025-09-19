import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface NERResult {
  success: boolean;
  entities: {
    companies: Array<{
      name: string;
      ticker?: string;
      sector: string;
      industry: string;
      marketCap?: number;
      foundedYear?: number;
      headquarters?: string;
      employeeCount?: number;
    }>;
    people: Array<{
      name: string;
      title?: string;
      age?: number;
      nationality?: string;
      education?: string;
    }>;
    ratings: Array<{
      rating: string;
      ratingAgency: string;
      ratingType: string;
      validFrom?: string;
      validTo?: string;
    }>;
    transactions: Array<{
      type: string;
      value?: number;
      currency: string;
      status: string;
      announcedDate?: string;
      completedDate?: string;
      description?: string;
    }>;
    employments: Array<{
      personName: string;
      companyName: string;
      position: string;
      startDate?: string;
      endDate?: string;
      salary?: number;
    }>;
    regulatory_events: Array<{
      companyName?: string;
      eventType: string;
      regulator: string;
      description: string;
      amount?: number;
      currency: string;
      eventDate?: string;
      resolutionDate?: string;
      status: string;
    }>;
  };
  entitiesCount: number;
  error?: string;
  raw_extraction?: string;
}

export class NERAgent {
  private pythonPath: string;
  private agentPath: string;

  constructor() {
    // Use the same Python setup as the existing DSPy agent
    this.pythonPath = 'python3';
    this.agentPath = path.join(process.cwd(), 'server', 'agents', 'ner_agent.py');
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
        console.log('Python process closed with code:', code);
        console.log('STDOUT length:', stdout.length);
        console.log('STDERR length:', stderr.length);
        console.log('STDOUT content:', JSON.stringify(stdout));
        console.log('STDERR content:', JSON.stringify(stderr));

        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Clean up the output - remove any non-JSON content
          const cleanOutput = stdout.trim();
          if (!cleanOutput) {
            reject(new Error('No output from Python script'));
            return;
          }

          const result = JSON.parse(cleanOutput);
          resolve(result);
        } catch (error) {
          console.error('JSON parse error:', error);
          console.error('Raw stdout:', JSON.stringify(stdout));
          console.error('Raw stderr:', JSON.stringify(stderr));
          reject(new Error(`Failed to parse Python output as JSON. STDOUT: ${JSON.stringify(stdout)}, STDERR: ${JSON.stringify(stderr)}, Error: ${error}`));
        }
      });
    });
  }

  async processText(text: string): Promise<NERResult> {
    try {
      const script = `
import sys
import os
import json
sys.path.append('${path.join(process.cwd(), 'server', 'agents')}')

from ner_agent import process_ner_text

data = json.loads(sys.stdin.read())
result = process_ner_text(data['text'])
print(json.dumps(result))
`;

      const inputData = JSON.stringify({ text });
      const result = await this.runPythonScript(script, inputData);
      return result as NERResult;
    } catch (error) {
      console.error('Error in NER agent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        entities: {
          companies: [],
          people: [],
          ratings: [],
          transactions: [],
          employments: [],
          regulatory_events: []
        },
        entitiesCount: 0
      };
    }
  }

  async test(): Promise<boolean> {
    try {
      const testText = "Acme Widgets Corporation is a technology company founded in 1995. CEO is Sarah Johnson.";
      const result = await this.processText(testText);
      return result.success;
    } catch (error) {
      console.error('NER agent test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const nerAgent = new NERAgent();

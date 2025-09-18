// Simple test script to verify the simplified implementation
const fetch = require('node-fetch');

async function testSimplifiedImplementation() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing simplified PuppyGraph implementation...\n');
  
  try {
    // Test 1: Check graph status
    console.log('1. Testing graph status...');
    const statusResponse = await fetch(`${baseUrl}/api/graph/status`);
    const status = await statusResponse.json();
    console.log('Status:', status.connected ? 'Connected' : 'Disconnected');
    console.log('Mode:', status.mode);
    console.log('');
    
    // Test 2: Test simple Cypher query
    console.log('2. Testing simple Cypher query...');
    const queryResponse = await fetch(`${baseUrl}/api/graph/query/simplified`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cypher_query: 'MATCH (n) RETURN n LIMIT 5' })
    });
    
    if (queryResponse.ok) {
      const queryResult = await queryResponse.json();
      console.log('Query successful!');
      console.log('Record count:', queryResult.recordCount);
      console.log('Execution time:', queryResult.executionTime + 'ms');
      console.log('Nodes found:', queryResult.nodes?.length || 0);
      console.log('Edges found:', queryResult.edges?.length || 0);
      console.log('');
      
      // Test 3: Test natural language query
      console.log('3. Testing natural language query...');
      const naturalResponse = await fetch(`${baseUrl}/api/graph/natural`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Show me all companies' })
      });
      
      if (naturalResponse.ok) {
        const naturalResult = await naturalResponse.json();
        console.log('Natural language query successful!');
        console.log('Generated Cypher:', naturalResult.cypher_query);
        console.log('Nodes found:', naturalResult.nodes?.length || 0);
        console.log('Edges found:', naturalResult.edges?.length || 0);
        console.log('Execution time:', naturalResult.total_execution_time + 'ms');
      } else {
        console.log('Natural language query failed:', await naturalResponse.text());
      }
      
    } else {
      console.log('Query failed:', await queryResponse.text());
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testSimplifiedImplementation();

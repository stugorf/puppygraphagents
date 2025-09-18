"""
CypherGen agent using DSPy for natural language to Cypher query generation.
This agent takes natural language questions and generates Cypher queries for the knowledge graph.
"""

import json
import logging
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
import dspy
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file (look in project root)
# Get the directory of this file, then go up two levels to project root
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.join(current_dir, '..', '..')
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CypherGenResult:
    """Result of a Cypher generation operation"""
    query: str
    cypher_query: str
    reasoning: str
    execution_time: float
    error: Optional[str] = None

class CypherGeneration(dspy.Signature):
    """
    Convert natural language queries into openCypher queries for PuppyGraph.
    
    Generate precise openCypher queries that work with PuppyGraph's openCypher implementation.
    Use MATCH, RETURN, WHERE, ORDER BY, LIMIT clauses. 
    
    IMPORTANT QUERY GUIDELINES:
    1. CRITICAL: Always return BOTH the node object AND specific properties for Graph View compatibility.
       For example, use "RETURN DISTINCT c, c.name, c.sector, c.industry" instead of just "RETURN c" or just "RETURN c.name, c.sector".
       This ensures both graph nodes are available for Graph View AND properties are available for Data View.
       The node object (c) enables graph visualization, while individual properties enable detailed data display.
       Always use DISTINCT to prevent duplicate results.
    
    2. Use case-insensitive matching for text fields to handle data inconsistencies:
       - Use toLower() function for case-insensitive comparisons: WHERE toLower(c.sector) = toLower('financial services')
       - Use CONTAINS() for partial matches: WHERE toLower(c.sector) CONTAINS toLower('financial')
       - Use IN clause with toLower() for multiple values: WHERE toLower(c.sector) IN ['financial services', 'banking', 'finance']
    
    3. Use fuzzy matching techniques for better query success:
       - For sector/industry queries: WHERE toLower(c.sector) CONTAINS toLower('financial') OR toLower(c.sector) CONTAINS toLower('banking')
       - For name searches: WHERE toLower(c.name) CONTAINS toLower('search_term')
       - For partial matches: Use CONTAINS() instead of exact equality when appropriate
    
    4. Handle common variations in data:
       - 'Financial Services' vs 'financial services' vs 'Finance'
       - 'Technology' vs 'tech' vs 'IT'
       - 'Healthcare' vs 'health care' vs 'medical'
    
    5. Use OR conditions for related terms:
       - Financial: 'financial', 'banking', 'finance', 'investment'
       - Technology: 'technology', 'tech', 'software', 'IT'
       - Healthcare: 'healthcare', 'health care', 'medical', 'pharmaceutical'
    """
    
    natural_query: str = dspy.InputField(desc="Natural language query about entities and relationships")
    schema_context: str = dspy.InputField(desc="Graph schema information including node types, properties, and relationships")
    cypher_query: str = dspy.OutputField(desc="openCypher query that retrieves the requested information from the knowledge graph")
    reasoning: str = dspy.OutputField(desc="Brief explanation of how the query maps to the graph structure")

class CypherGenAgent:
    """
    Agent that converts natural language queries to Cypher queries using DSPy
    
    This agent generates Cypher queries with case-insensitive and fuzzy matching
    capabilities to handle data inconsistencies and improve query success rates.
    """
    
    def __init__(self, openrouter_api_key: str = None, openrouter_api_base: str = None, schema_context: str = None):
        # Get API credentials from environment if not provided
        if openrouter_api_key is None:
            openrouter_api_key = os.getenv('OPEN_ROUTER_KEY')
        if openrouter_api_base is None:
            openrouter_api_base = os.getenv('OPEN_ROUTER_API_BASE', 'https://openrouter.ai/api/v1')
        
        # Validate API key
        if not openrouter_api_key or openrouter_api_key == 'your_openrouter_api_key_here':
            raise ValueError("OPEN_ROUTER_KEY environment variable not set or using placeholder value. Please set a real OpenRouter API key in the .env file.")
        
        # Configure DSPy with OpenRouter using the modern API
        os.environ['OPEN_ROUTER_KEY'] = openrouter_api_key
        os.environ['OPEN_ROUTER_API_BASE'] = openrouter_api_base
        
        lm = dspy.LM(
            'openai/gpt-4o-mini',  # OpenRouter is compatible with OpenAI API format
            api_key=openrouter_api_key,
            api_base=openrouter_api_base,
            max_tokens=2000,
            temperature=0.1
        )
        dspy.configure(lm=lm)
        
        # Initialize DSPy module
        self.cypher_generator = dspy.ChainOfThought(CypherGeneration)
        
        # Store schema context
        self.schema_context = schema_context or self._get_default_schema()
        
        logger.info("CypherGenAgent initialized with OpenRouter GPT-4o-mini")
    
    def _get_default_schema(self) -> str:
        """Get default schema as fallback when dynamic schema is not available"""
        return """
        The knowledge graph contains:
        - Company nodes (id, name, ticker, sector, industry, market_cap, founded_year, headquarters)
        - Person nodes (id, name, title, age, nationality, education) 
        - Rating nodes (id, rating, rating_agency, rating_type, valid_from, valid_to)
        - Transaction nodes (id, type, value, currency, status, announced_date, completed_date, description)
        - RegulatoryEvent nodes (id, event_type, regulator, description, amount, currency, event_date, resolution_date, status)
        
        Relationships:
        - EMPLOYED_BY: Person -> Company (with position, start_date, end_date, salary)
        - HAS_RATING: Company -> Rating
        - PARTICIPATES_IN: Company -> Transaction (as acquirer)
        - TARGET_OF: Company -> Transaction (as target)
        - SUBJECT_TO: Company -> RegulatoryEvent
        """
    
    def update_schema(self, schema_context: str):
        """Update the schema context for the agent"""
        self.schema_context = schema_context
        logger.info("Schema context updated")
    
    def generate_cypher_query(self, question: str) -> CypherGenResult:
        """
        Generate a Cypher query from a natural language question
        
        Args:
            question: Natural language question about the knowledge graph
            
        Returns:
            CypherGenResult containing the generated Cypher query and reasoning
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Generating Cypher query for: {question}")
            
            # Generate Cypher query using DSPy
            result = self.cypher_generator(
                natural_query=question,
                schema_context=self.schema_context
            )
            
            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Cypher generation completed in {execution_time:.2f}s")
            
            return CypherGenResult(
                query=question,
                cypher_query=result.cypher_query,
                reasoning=result.reasoning,
                execution_time=execution_time
            )
            
        except Exception as e:
            logger.error(f"Error in Cypher generation: {str(e)}")
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return CypherGenResult(
                query=question,
                cypher_query="",
                reasoning=f"Error during Cypher generation: {str(e)}",
                execution_time=execution_time,
                error=str(e)
            )
    
    def test(self) -> bool:
        """Test if the CypherGen agent is working"""
        try:
            test_question = "Show me all companies in the financial services sector"
            result = self.generate_cypher_query(test_question)
            return result.error is None and result.cypher_query.strip() != ""
        except Exception as e:
            logger.error(f"CypherGen agent test failed: {str(e)}")
            return False

# Example usage and testing
if __name__ == "__main__":
    try:
        # Initialize agent (will get API key from environment)
        agent = CypherGenAgent()
    except ValueError as e:
        print(f"Error: {e}")
        exit(1)
    
    # Test with example questions
    test_questions = [
        "Show me all companies in the financial services sector",
        "Find CEOs of major banks",
        "What mergers happened in 2023?",
        "Show me companies with credit rating downgrades",
        "Find regulatory fines above $1 billion",
        "Show me all people employed by technology companies",
        "Find transactions between companies in the same industry"
    ]
    
    print("🤖 Testing CypherGen Agent")
    print("=" * 50)
    
    for question in test_questions:
        print(f"\n🔍 Query: {question}")
        result = agent.generate_cypher_query(question)
        print(f"🧠 Reasoning: {result.reasoning}")
        print(f"🔗 Cypher: {result.cypher_query}")
        print(f"⏱️  Time: {result.execution_time:.2f}s")
        if result.error:
            print(f"❌ Error: {result.error}")
        print("-" * 40)
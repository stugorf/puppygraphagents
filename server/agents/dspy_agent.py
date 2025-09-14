import dspy
from typing import Dict, List, Optional, Any
import os
import json

# Configure DSPy with OpenRouter
openrouter_api_key = os.getenv("OPEN_ROUTER_KEY")
openrouter_api_base = os.getenv("OPEN_ROUTER_API_BASE", "https://openrouter.ai/api/v1")

dspy.configure(lm=dspy.LM(
    'openai/gpt-4o-mini',  # OpenRouter is compatible with OpenAI API format
    api_key=openrouter_api_key,
    api_base=openrouter_api_base,
    temperature=0.1
))

class FinancialKnowledgeGraph(dspy.Signature):
    """Convert natural language queries about financial entities into Cypher queries for a knowledge graph.
    
    The knowledge graph contains:
    - Companies (name, ticker, sector, industry, market_cap, founded_year, headquarters)
    - People (name, title, age, nationality, education) 
    - Employments (person-company relationships with positions, start_date, end_date, salary)
    - Ratings (credit ratings by agencies with rating, rating_agency, valid_from, valid_to)
    - Transactions (mergers, acquisitions with type, value, status, announced_date, completed_date)
    - RegulatoryEvents (fines, investigations with event_type, regulator, amount, event_date, status)
    
    Generate precise Cypher queries that answer the user's question about financial relationships and temporal patterns.
    """
    
    natural_query: str = dspy.InputField(desc="Natural language query about financial entities and relationships")
    cypher_query: str = dspy.OutputField(desc="Cypher query that retrieves the requested information from the financial knowledge graph")
    reasoning: str = dspy.OutputField(desc="Brief explanation of how the query maps to the graph structure")

class TemporalFinancialQuery(dspy.Signature):
    """Convert temporal financial queries into time-aware Cypher queries.
    
    Handle queries involving:
    - Time ranges (e.g., "in 2023", "last quarter", "since 2020")
    - Temporal relationships (e.g., "before merger", "after CEO change")
    - Historical comparisons (e.g., "rating changes over time")
    - Event sequences (e.g., "mergers followed by regulatory actions")
    """
    
    natural_query: str = dspy.InputField(desc="Temporal natural language query about financial events or relationships")
    time_context: str = dspy.InputField(desc="Extracted time context and temporal constraints")
    cypher_query: str = dspy.OutputField(desc="Time-aware Cypher query with proper temporal filtering")
    temporal_reasoning: str = dspy.OutputField(desc="Explanation of temporal logic and filtering approach")

class QueryAgent(dspy.Module):
    """DSPy agent for converting natural language to Cypher queries."""
    
    def __init__(self):
        super().__init__()
        self.financial_converter = dspy.ChainOfThought(FinancialKnowledgeGraph)
        self.temporal_converter = dspy.ChainOfThought(TemporalFinancialQuery)
        
        # Schema context for the agent
        self.schema_context = {
            "nodes": {
                "Company": ["id", "name", "ticker", "sector", "industry", "market_cap", "founded_year", "headquarters"],
                "Person": ["id", "name", "title", "age", "nationality", "education"], 
                "Rating": ["id", "rating", "rating_agency", "rating_type", "valid_from", "valid_to"],
                "Transaction": ["id", "type", "value", "currency", "status", "announced_date", "completed_date", "description"],
                "RegulatoryEvent": ["id", "event_type", "regulator", "description", "amount", "event_date", "resolution_date", "status"]
            },
            "relationships": {
                "HAS_EXECUTIVE": "Company -> Person (via employments table)",
                "HAS_RATING": "Company -> Rating", 
                "PARTICIPATES_IN": "Company -> Transaction",
                "SUBJECT_TO": "Company -> RegulatoryEvent",
                "WORKS_FOR": "Person -> Company (via employments table)"
            }
        }
    
    def _detect_temporal_query(self, query: str) -> bool:
        """Detect if query contains temporal elements."""
        import re
        temporal_keywords = [
            r"\bwhen\b", r"\btime\b", r"\bdate\b", r"\byear\b", r"\bmonth\b", r"\bquarter\b", 
            r"\bsince\b", r"\bbefore\b", r"\bafter\b", r"\bduring\b", r"\bbetween\b", 
            r"\bfrom\b", r"\bto\b", r"\buntil\b", r"\brecent\b", r"\blast\b", r"\bpast\b", 
            r"\bcurrent\b", r"\b202[0-5]\b"
        ]
        query_lower = query.lower()
        return any(re.search(keyword, query_lower) for keyword in temporal_keywords)
    
    def _extract_time_context(self, query: str) -> str:
        """Extract temporal context from the query."""
        # Simple extraction - could be enhanced with NLP
        temporal_phrases = []
        query_lower = query.lower()
        
        if "2024" in query_lower:
            temporal_phrases.append("year 2024")
        if "2023" in query_lower:
            temporal_phrases.append("year 2023")
        if "last quarter" in query_lower:
            temporal_phrases.append("last quarter")
        if "since" in query_lower:
            temporal_phrases.append("since specified date")
        if "recent" in query_lower or "latest" in query_lower:
            temporal_phrases.append("recent/latest events")
            
        return "; ".join(temporal_phrases) if temporal_phrases else "general temporal context"
    
    def forward(self, natural_query: str) -> Dict[str, Any]:
        """Convert natural language query to Cypher query."""
        try:
            # Detect if this is a temporal query
            is_temporal = self._detect_temporal_query(natural_query)
            
            if is_temporal:
                time_context = self._extract_time_context(natural_query)
                result = self.temporal_converter(
                    natural_query=natural_query,
                    time_context=time_context
                )
                return {
                    "cypher_query": result.cypher_query,
                    "reasoning": result.temporal_reasoning,
                    "query_type": "temporal",
                    "time_context": time_context
                }
            else:
                result = self.financial_converter(natural_query=natural_query)
                return {
                    "cypher_query": result.cypher_query,
                    "reasoning": result.reasoning,
                    "query_type": "standard",
                    "time_context": None
                }
                
        except Exception as e:
            return {
                "cypher_query": None,
                "reasoning": f"Error processing query: {str(e)}",
                "query_type": "error",
                "time_context": None,
                "error": str(e)
            }

class MultiHopAgent(dspy.Module):
    """DSPy agent for multi-hop reasoning across the knowledge graph."""
    
    def __init__(self):
        super().__init__()
        self.hop_planner = dspy.ChainOfThought(
            "question -> reasoning: str, hops: List[str], final_query: str"
        )
    
    def forward(self, question: str, max_hops: int = 3) -> Dict[str, Any]:
        """Plan and execute multi-hop queries."""
        try:
            # For now, return a simple multi-hop structure
            # This will be enhanced when we integrate with PuppyGraph
            return {
                "hops": [
                    "Find target companies/entities",
                    "Explore relationships and connections", 
                    "Aggregate insights across connections"
                ],
                "reasoning": "Multi-hop query planned",
                "final_query": f"Multi-hop exploration for: {question}"
            }
        except Exception as e:
            return {
                "hops": [],
                "reasoning": f"Error in multi-hop planning: {str(e)}",
                "final_query": None,
                "error": str(e)
            }

# Initialize the agents
query_agent = QueryAgent()
multihop_agent = MultiHopAgent()

def process_natural_query(natural_query: str) -> Dict[str, Any]:
    """Main function to process natural language queries."""
    return query_agent.forward(natural_query)

def process_multihop_query(question: str, max_hops: int = 3) -> Dict[str, Any]:
    """Process multi-hop reasoning queries."""
    return multihop_agent.forward(question, max_hops)

def process_temporal_query(natural_query: str, start_date: Optional[str] = None, end_date: Optional[str] = None, granularity: Optional[str] = None) -> Dict[str, Any]:
    """Process temporal queries with explicit time constraints."""
    try:
        # Build time context from parameters
        time_context_parts = []
        if start_date:
            time_context_parts.append(f"from {start_date}")
        if end_date:
            time_context_parts.append(f"to {end_date}")
        if granularity:
            time_context_parts.append(f"at {granularity} granularity")
        
        time_context = " ".join(time_context_parts) if time_context_parts else "no specific time constraints"
        
        # Use temporal converter for time-aware query generation
        temporal_result = query_agent.temporal_converter(
            natural_query=natural_query,
            time_context=time_context
        )
        
        return {
            "cypher_query": temporal_result.cypher_query,
            "reasoning": temporal_result.temporal_reasoning,
            "query_type": "temporal",
            "time_context": time_context,
            "temporal_params": {
                "start_date": start_date,
                "end_date": end_date, 
                "granularity": granularity
            }
        }
        
    except Exception as e:
        # Fallback to regular processing if temporal fails
        print(f"Temporal processing failed: {e}, falling back to regular query")
        
        # Rebuild time context for fallback
        time_context_parts = []
        if start_date:
            time_context_parts.append(f"from {start_date}")
        if end_date:
            time_context_parts.append(f"to {end_date}")
        if granularity:
            time_context_parts.append(f"at {granularity} granularity")
        
        fallback_time_context = " ".join(time_context_parts) if time_context_parts else "no specific time constraints"
        
        result = query_agent.forward(natural_query)
        # Add temporal context to regular result
        if result.get("time_context") or fallback_time_context != "no specific time constraints":
            result["query_type"] = "temporal" 
            result["time_context"] = fallback_time_context
        return result

if __name__ == "__main__":
    # Test the agent
    test_queries = [
        "Show me all companies in the financial services sector",
        "Who are the CEOs of major banks?",
        "What mergers happened in 2023?",
        "Find companies with credit rating downgrades since 2024",
        "Show me regulatory fines above $1 billion"
    ]
    
    print("🤖 Testing DSPy Financial Query Agent")
    print("=" * 50)
    
    for query in test_queries:
        print(f"\n🔍 Query: {query}")
        result = process_natural_query(query)
        print(f"📊 Type: {result['query_type']}")
        print(f"🧠 Reasoning: {result['reasoning']}")
        print(f"🔗 Cypher: {result['cypher_query']}")
        if result.get('time_context'):
            print(f"⏰ Time Context: {result['time_context']}")
        print("-" * 40)
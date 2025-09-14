"""
Multi-hop retrieval agent using DSPy for temporal knowledge graph exploration.
This agent performs complex graph traversals using OpenAI tool calling.
"""

import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import dspy
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GraphNode:
    id: str
    label: str
    properties: Dict[str, Any]

@dataclass
class GraphEdge:
    id: str
    from_id: str
    to_id: str
    label: str
    properties: Dict[str, Any]

@dataclass
class MultiHopResult:
    """Result of a multi-hop retrieval operation"""
    query: str
    reasoning: str
    hops: List[Dict[str, Any]]
    final_nodes: List[GraphNode]
    final_edges: List[GraphEdge]
    execution_time: float
    cypher_queries: List[str]
    error: Optional[str] = None

class MultiHopRetrieval(dspy.Signature):
    """
    Analyze a complex question and break it down into sequential graph traversal steps.
    Each step should be a specific query that builds upon previous results.
    """
    
    question = dspy.InputField(desc="Complex multi-hop question about the knowledge graph")
    context = dspy.InputField(desc="Available entity types: Company, Person, Rating, Transaction, RegulatoryEvent. Relationships: EMPLOYED_BY, HAS_RATING, PARTICIPATES_IN, TARGET_OF, SUBJECT_TO")
    
    plan = dspy.OutputField(desc="JSON list of sequential steps, each with 'step_number', 'description', 'cypher_template', 'expected_entities'")
    reasoning = dspy.OutputField(desc="Explanation of the multi-hop strategy and why these steps will answer the question")

class CypherGeneration(dspy.Signature):
    """
    Generate a specific Cypher query for one step of multi-hop retrieval.
    """
    
    step_description = dspy.InputField(desc="Description of what this step should accomplish")
    previous_results = dspy.InputField(desc="JSON representation of nodes/edges from previous steps (empty if first step)")
    target_entities = dspy.InputField(desc="Types of entities we're looking for in this step")
    
    cypher_query = dspy.OutputField(desc="Cypher query for this specific step")
    reasoning = dspy.OutputField(desc="Brief explanation of how this query achieves the step goal")

class ResultAnalysis(dspy.Signature):
    """
    Analyze multi-hop retrieval results and determine if the question has been fully answered.
    """
    
    original_question = dspy.InputField(desc="The original complex question")
    all_results = dspy.InputField(desc="JSON representation of all nodes and edges collected from all hops")
    
    answer = dspy.OutputField(desc="Complete answer to the original question based on the retrieved data")
    completeness = dspy.OutputField(desc="Assessment of whether the question was fully answered (complete/partial/incomplete)")
    missing_info = dspy.OutputField(desc="Description of any missing information needed to fully answer the question")

class MultiHopAgent:
    """
    Agent that performs multi-hop retrieval using DSPy for complex graph queries
    """
    
    def __init__(self, openai_api_key: str):
        # Configure DSPy with OpenAI using the modern API
        import os
        os.environ['OPENAI_API_KEY'] = openai_api_key
        
        lm = dspy.LM(
            'openai/gpt-4o-mini',
            max_tokens=2000,
            temperature=0.1
        )
        dspy.configure(lm=lm)
        
        # Initialize DSPy modules
        self.planner = dspy.ChainOfThought(MultiHopRetrieval)
        self.cypher_generator = dspy.ChainOfThought(CypherGeneration)
        self.result_analyzer = dspy.ChainOfThought(ResultAnalysis)
        
        logger.info("MultiHopAgent initialized with OpenAI GPT-4o-mini")
    
    def process_complex_query(self, question: str, max_hops: int = 3) -> MultiHopResult:
        """
        Process a complex question using multi-hop retrieval
        
        Args:
            question: Complex question requiring multiple graph traversals
            max_hops: Maximum number of hops to perform
            
        Returns:
            MultiHopResult containing the complete retrieval process and results
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Processing complex query: {question}")
            
            # Step 1: Plan the multi-hop strategy
            context = """
            Available entity types: Company, Person, Rating, Transaction, RegulatoryEvent
            Relationships: EMPLOYED_BY (Person->Company), HAS_RATING (Company->Rating), 
            PARTICIPATES_IN (Company->Transaction), TARGET_OF (Company->RegulatoryEvent), 
            SUBJECT_TO (Company->RegulatoryEvent)
            """
            
            plan_result = self.planner(question=question, context=context)
            
            # Parse the plan (handle markdown code blocks)
            try:
                plan_text = plan_result.plan.strip()
                
                # Remove markdown code blocks if present
                if plan_text.startswith('```json'):
                    plan_text = plan_text[7:]  # Remove ```json
                if plan_text.startswith('```'):
                    plan_text = plan_text[3:]   # Remove ```
                if plan_text.endswith('```'):
                    plan_text = plan_text[:-3]  # Remove ending ```
                
                plan_text = plan_text.strip()
                steps = json.loads(plan_text)
                
                if not isinstance(steps, list):
                    steps = []
            except (json.JSONDecodeError, AttributeError) as e:
                logger.error(f"Failed to parse plan: {plan_result.plan}")
                logger.error(f"JSON parse error: {str(e)}")
                return MultiHopResult(
                    query=question,
                    reasoning="Failed to parse multi-hop plan",
                    hops=[],
                    final_nodes=[],
                    final_edges=[],
                    execution_time=0.0,
                    cypher_queries=[],
                    error=f"Plan parsing failed: {str(e)}"
                )
            
            logger.info(f"Generated plan with {len(steps)} steps")
            
            # Step 2: Execute each hop
            all_nodes = []
            all_edges = []
            hop_results = []
            cypher_queries = []
            
            for i, step in enumerate(steps[:max_hops]):
                try:
                    logger.info(f"Executing hop {i+1}: {step.get('description', 'Unknown step')}")
                    
                    # Generate Cypher for this step
                    previous_results = json.dumps({
                        "nodes": [self._node_to_dict(n) for n in all_nodes],
                        "edges": [self._edge_to_dict(e) for e in all_edges]
                    })
                    
                    cypher_result = self.cypher_generator(
                        step_description=step.get('description', ''),
                        previous_results=previous_results,
                        target_entities=step.get('expected_entities', 'Any')
                    )
                    
                    cypher_query = cypher_result.cypher_query
                    cypher_queries.append(cypher_query)
                    
                    # Execute the query (this would call the graph execution engine)
                    hop_nodes, hop_edges = self._execute_cypher_step(cypher_query)
                    
                    # Accumulate results
                    all_nodes.extend(hop_nodes)
                    all_edges.extend(hop_edges)
                    
                    # Record hop result
                    hop_results.append({
                        "step_number": i + 1,
                        "description": step.get('description', ''),
                        "cypher_query": cypher_query,
                        "reasoning": cypher_result.reasoning,
                        "nodes_found": len(hop_nodes),
                        "edges_found": len(hop_edges)
                    })
                    
                    logger.info(f"Hop {i+1} completed: {len(hop_nodes)} nodes, {len(hop_edges)} edges")
                    
                except Exception as e:
                    logger.error(f"Error in hop {i+1}: {str(e)}")
                    hop_results.append({
                        "step_number": i + 1,
                        "description": step.get('description', ''),
                        "error": str(e)
                    })
            
            # Step 3: Analyze final results
            all_results_json = json.dumps({
                "nodes": [self._node_to_dict(n) for n in all_nodes],
                "edges": [self._edge_to_dict(e) for e in all_edges]
            })
            
            analysis = self.result_analyzer(
                original_question=question,
                all_results=all_results_json
            )
            
            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Multi-hop retrieval completed in {execution_time:.2f}s")
            
            return MultiHopResult(
                query=question,
                reasoning=f"Multi-hop plan: {plan_result.reasoning}\n\nFinal analysis: {analysis.answer}",
                hops=hop_results,
                final_nodes=self._deduplicate_nodes(all_nodes),
                final_edges=all_edges,
                execution_time=execution_time,
                cypher_queries=cypher_queries
            )
            
        except Exception as e:
            logger.error(f"Error in multi-hop processing: {str(e)}")
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return MultiHopResult(
                query=question,
                reasoning=f"Error during multi-hop processing: {str(e)}",
                hops=[],
                final_nodes=[],
                final_edges=[],
                execution_time=execution_time,
                cypher_queries=[],
                error=str(e)
            )
    
    def _execute_cypher_step(self, cypher_query: str) -> Tuple[List[GraphNode], List[GraphEdge]]:
        """
        Execute a single Cypher query step.
        In a real implementation, this would call the PuppyGraph client.
        For now, return simulated results based on the query.
        """
        # This is a simplified simulation - in practice this would call
        # the PuppyGraph client or make an API call to execute the query
        
        nodes = []
        edges = []
        
        # Simple pattern matching to simulate query execution
        query_lower = cypher_query.lower()
        
        if "company" in query_lower and "financial services" in query_lower:
            # Simulate finding financial services companies
            nodes.append(GraphNode(
                id="company_1",
                label="Company",
                properties={
                    "name": "Goldman Sachs Group Inc",
                    "sector": "Financial Services",
                    "ticker": "GS"
                }
            ))
            
        if "person" in query_lower and "ceo" in query_lower:
            # Simulate finding CEO
            nodes.append(GraphNode(
                id="person_1",
                label="Person",
                properties={
                    "name": "David M. Solomon",
                    "title": "CEO",
                    "age": 62
                }
            ))
            
            # Add employment relationship
            edges.append(GraphEdge(
                id="emp_1",
                from_id="person_1",
                to_id="company_1",
                label="EMPLOYED_BY",
                properties={"position": "Chief Executive Officer"}
            ))
        
        if "rating" in query_lower:
            # Simulate finding ratings
            nodes.append(GraphNode(
                id="rating_1",
                label="Rating",
                properties={
                    "rating": "A+",
                    "rating_agency": "S&P Global",
                    "rating_type": "Long-term Credit"
                }
            ))
            
            edges.append(GraphEdge(
                id="rating_edge_1",
                from_id="company_1",
                to_id="rating_1",
                label="HAS_RATING",
                properties={}
            ))
        
        return nodes, edges
    
    def _node_to_dict(self, node: GraphNode) -> Dict[str, Any]:
        """Convert GraphNode to dictionary for JSON serialization"""
        return {
            "id": node.id,
            "label": node.label,
            "properties": node.properties
        }
    
    def _edge_to_dict(self, edge: GraphEdge) -> Dict[str, Any]:
        """Convert GraphEdge to dictionary for JSON serialization"""
        return {
            "id": edge.id,
            "from_id": edge.from_id,
            "to_id": edge.to_id,
            "label": edge.label,
            "properties": edge.properties
        }
    
    def _deduplicate_nodes(self, nodes: List[GraphNode]) -> List[GraphNode]:
        """Remove duplicate nodes based on ID"""
        seen_ids = set()
        unique_nodes = []
        
        for node in nodes:
            if node.id not in seen_ids:
                seen_ids.add(node.id)
                unique_nodes.append(node)
        
        return unique_nodes
    
    def test(self) -> bool:
        """Test if the multi-hop agent is working"""
        try:
            test_question = "Find companies and their executives"
            result = self.process_complex_query(test_question, max_hops=1)
            return result.error is None
        except Exception as e:
            logger.error(f"Multi-hop agent test failed: {str(e)}")
            return False

# Example usage and testing
if __name__ == "__main__":
    import os
    
    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY environment variable not set")
        exit(1)
    
    # Initialize agent
    agent = MultiHopAgent(api_key)
    
    # Test with a complex question
    test_question = "Show me financial services companies, their CEOs, and any credit ratings they have received in the last year"
    
    print(f"Testing multi-hop retrieval with: {test_question}")
    result = agent.process_complex_query(test_question)
    
    print(f"\nReasoning: {result.reasoning}")
    print(f"Hops executed: {len(result.hops)}")
    print(f"Final nodes: {len(result.final_nodes)}")
    print(f"Final edges: {len(result.final_edges)}")
    print(f"Execution time: {result.execution_time:.2f}s")
    
    if result.error:
        print(f"Error: {result.error}")
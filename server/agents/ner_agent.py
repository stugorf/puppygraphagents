import dspy
from typing import Dict, List, Optional, Any
import os
import json
import re
from datetime import datetime

# Use the same DSPy configuration as the existing dspy_agent.py
openrouter_api_key = os.getenv("OPEN_ROUTER_KEY")
openrouter_api_base = os.getenv("OPEN_ROUTER_API_BASE", "https://openrouter.ai/api/v1")

dspy.configure(lm=dspy.LM(
    'openai/gpt-4o-mini',  # OpenRouter is compatible with OpenAI API format
    api_key=openrouter_api_key,
    api_base=openrouter_api_base,
    temperature=0.1
))

class NERExtraction(dspy.Signature):
    """Extract named entities from company reports and structure them according to the database schema.
    
    Extract companies, people, ratings, transactions, employments, and regulatory events from text.
    Return structured JSON data that can be directly inserted into the PostgreSQL tables.
    """
    
    text: str = dspy.InputField(desc="Company report text to extract entities from")
    schema_context: str = dspy.InputField(desc="Database schema information for entity extraction")
    extracted_entities: str = dspy.OutputField(desc="JSON object containing extracted entities structured for database insertion")

class NERAgent(dspy.Module):
    """DSPy agent for Named Entity Recognition and database entity extraction."""
    
    def __init__(self):
        super().__init__()
        self.ner_extractor = dspy.ChainOfThought(NERExtraction)
        self.schema_context = self._get_database_schema()
    
    def _get_database_schema(self) -> str:
        """Get the database schema context for entity extraction."""
        return """
        Database Schema for Entity Extraction:
        
        COMPANIES table:
        - name (text, required): Company name
        - ticker (varchar, optional): Stock ticker symbol
        - sector (text, required): Business sector (e.g., "Technology", "Financial Services", "Healthcare")
        - industry (text, required): Specific industry (e.g., "Software", "Banking", "Medical Devices")
        - marketCap (numeric, optional): Market capitalization
        - foundedYear (integer, optional): Year company was founded
        - headquarters (text, optional): Headquarters location
        - employeeCount (integer, optional): Number of employees
        
        PEOPLE table:
        - name (text, required): Person's full name
        - title (text, optional): Job title or position
        - age (integer, optional): Age if mentioned
        - nationality (text, optional): Nationality if mentioned
        - education (text, optional): Educational background
        
        RATINGS table:
        - companyId (varchar, required): Reference to company
        - rating (text, required): Credit rating (e.g., "AAA", "AA+", "BBB-")
        - ratingAgency (text, required): Rating agency (e.g., "Moody's", "S&P", "Fitch")
        - ratingType (text, required): Type of rating (e.g., "credit", "debt", "outlook")
        - validFrom (timestamp, required): When rating became valid
        - validTo (timestamp, optional): When rating expires
        
        TRANSACTIONS table:
        - type (text, required): Transaction type (e.g., "merger", "acquisition", "spinoff")
        - acquirerId (varchar, optional): Company making the acquisition
        - targetId (varchar, optional): Company being acquired
        - value (numeric, optional): Transaction value
        - currency (varchar, optional): Currency (default "USD")
        - status (text, required): Transaction status (e.g., "announced", "completed", "cancelled")
        - announcedDate (timestamp, optional): When transaction was announced
        - completedDate (timestamp, optional): When transaction was completed
        - description (text, optional): Transaction description
        
        EMPLOYMENTS table:
        - personId (varchar, required): Reference to person
        - companyId (varchar, required): Reference to company
        - position (text, required): Job position
        - startDate (timestamp, required): Employment start date
        - endDate (timestamp, optional): Employment end date (NULL for current)
        - salary (numeric, optional): Salary if mentioned
        
        REGULATORY_EVENTS table:
        - companyId (varchar, required): Reference to company
        - eventType (text, required): Type of event (e.g., "fine", "investigation", "approval")
        - regulator (text, required): Regulatory body (e.g., "SEC", "CFTC", "FINRA", "FDA")
        - description (text, required): Event description
        - amount (numeric, optional): Fine amount or value
        - currency (varchar, optional): Currency (default "USD")
        - eventDate (timestamp, required): When event occurred
        - resolutionDate (timestamp, optional): When event was resolved
        - status (text, required): Event status (e.g., "pending", "resolved", "ongoing")
        """
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse various date formats and return ISO format."""
        if not date_str:
            return None
        
        # Common date patterns
        patterns = [
            r'(\d{4})',  # Year only
            r'(\w+)\s+(\d{4})',  # Month Year
            r'(\d{1,2})/(\d{1,2})/(\d{4})',  # MM/DD/YYYY
            r'(\d{4})-(\d{1,2})-(\d{1,2})',  # YYYY-MM-DD
        ]
        
        try:
            # Try to extract year first
            year_match = re.search(r'(\d{4})', date_str)
            if year_match:
                year = int(year_match.group(1))
                if 1900 <= year <= 2030:
                    return f"{year}-01-01T00:00:00Z"
        except:
            pass
        
        return None
    
    def _extract_numeric_value(self, text: str) -> Optional[float]:
        """Extract numeric value from text (handles millions, billions, etc.)."""
        if not text:
            return None
        
        # Convert to string if not already
        text_str = str(text)
        
        # Remove common currency symbols and text
        clean_text = re.sub(r'[$,\s]', '', text_str.lower())
        
        # Extract number and multiplier
        match = re.search(r'(\d+(?:\.\d+)?)\s*(million|billion|thousand|k|m|b)?', clean_text)
        if match:
            value = float(match.group(1))
            multiplier = match.group(2) or ''
            
            if multiplier in ['billion', 'b']:
                return value * 1_000_000_000
            elif multiplier in ['million', 'm']:
                return value * 1_000_000
            elif multiplier in ['thousand', 'k']:
                return value * 1_000
            else:
                return value
        
        return None
    
    def _normalize_entity_keys(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize entity keys to lowercase for consistency."""
        normalized = {}
        key_mapping = {
            'COMPANIES': 'companies',
            'PEOPLE': 'people', 
            'RATINGS': 'ratings',
            'TRANSACTIONS': 'transactions',
            'EMPLOYMENTS': 'employments',
            'REGULATORY_EVENTS': 'regulatory_events'
        }
        
        for key, value in entities.items():
            # Ensure key is a string before calling string methods
            if isinstance(key, str):
                normalized_key = key_mapping.get(key.upper(), key.lower())
            else:
                # If key is not a string, convert to string first
                key_str = str(key)
                normalized_key = key_mapping.get(key_str.upper(), key_str.lower())
            normalized[normalized_key] = value
            
        return normalized
    
    def forward(self, text: str) -> Dict[str, Any]:
        """Extract entities from company report text."""
        try:
            # Use DSPy to extract entities
            result = self.ner_extractor(
                text=text,
                schema_context=self.schema_context
            )
            
            # Parse the extracted JSON
            try:
                entities = json.loads(result.extracted_entities)
                # Normalize keys to lowercase for consistency
                entities = self._normalize_entity_keys(entities)
            except json.JSONDecodeError as e:
                return {
                    "success": False,
                    "error": f"Failed to parse DSPy output as JSON: {str(e)}",
                    "entities": {},
                    "entitiesCount": 0,
                    "raw_extraction": result.extracted_entities
                }
            
            # Process and validate the extracted entities
            processed_entities = self._process_extracted_entities(entities, text)
            
            return {
                "success": True,
                "entities": processed_entities,
                "entitiesCount": self._count_entities(processed_entities),
                "raw_extraction": result.extracted_entities
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "entities": {},
                "entitiesCount": 0
            }
    
    
    def _process_extracted_entities(self, entities: Dict[str, Any], original_text: str) -> Dict[str, Any]:
        """Process and validate extracted entities."""
        processed = {
            "companies": [],
            "people": [],
            "ratings": [],
            "transactions": [],
            "employments": [],
            "regulatory_events": []
        }
        
        # Process companies
        for company in entities.get("companies", []):
            if company.get("name"):
                processed["companies"].append({
                    "name": company["name"],
                    "ticker": company.get("ticker"),
                    "sector": company.get("sector", "Unknown"),
                    "industry": company.get("industry", "Unknown"),
                    "marketCap": self._extract_numeric_value(company.get("marketCap", "")),
                    "foundedYear": company.get("foundedYear"),
                    "headquarters": company.get("headquarters"),
                    "employeeCount": company.get("employeeCount")
                })
        
        # Process people
        for person in entities.get("people", []):
            if person.get("name"):
                processed["people"].append({
                    "name": person["name"],
                    "title": person.get("title"),
                    "age": person.get("age"),
                    "nationality": person.get("nationality"),
                    "education": person.get("education")
                })
        
        # Process ratings
        for rating in entities.get("ratings", []):
            if rating.get("rating") and rating.get("ratingAgency"):
                processed["ratings"].append({
                    "rating": rating["rating"],
                    "ratingAgency": rating["ratingAgency"],
                    "ratingType": rating.get("ratingType", "credit"),
                    "validFrom": self._parse_date(rating.get("validFrom", "")),
                    "validTo": self._parse_date(rating.get("validTo", ""))
                })
        
        # Process transactions
        for transaction in entities.get("transactions", []):
            if transaction.get("type"):
                processed["transactions"].append({
                    "type": transaction["type"],
                    "value": self._extract_numeric_value(transaction.get("value", "")),
                    "currency": transaction.get("currency", "USD"),
                    "status": transaction.get("status", "announced"),
                    "announcedDate": self._parse_date(transaction.get("announcedDate", "")),
                    "completedDate": self._parse_date(transaction.get("completedDate", "")),
                    "description": transaction.get("description")
                })
        
        # Process employments
        for employment in entities.get("employments", []):
            if employment.get("personName") and employment.get("companyName"):
                processed["employments"].append({
                    "personName": employment["personName"],
                    "companyName": employment["companyName"],
                    "position": employment.get("position", "Unknown"),
                    "startDate": self._parse_date(employment.get("startDate", "")),
                    "endDate": self._parse_date(employment.get("endDate", "")),
                    "salary": self._extract_numeric_value(employment.get("salary", ""))
                })
        
        # Process regulatory events
        for event in entities.get("regulatory_events", []):
            if event.get("eventType") and event.get("regulator"):
                processed["regulatory_events"].append({
                    "companyName": event.get("companyName"),
                    "eventType": event["eventType"],
                    "regulator": event["regulator"],
                    "description": event.get("description", ""),
                    "amount": self._extract_numeric_value(event.get("amount", "")),
                    "currency": event.get("currency", "USD"),
                    "eventDate": self._parse_date(event.get("eventDate", "")),
                    "resolutionDate": self._parse_date(event.get("resolutionDate", "")),
                    "status": event.get("status", "pending")
                })
        
        return processed
    
    def _count_entities(self, entities: Dict[str, Any]) -> int:
        """Count total number of extracted entities."""
        total = 0
        for entity_type, entity_list in entities.items():
            if isinstance(entity_list, list):
                total += len(entity_list)
        return total

# Initialize the NER agent
ner_agent = NERAgent()

def process_ner_text(text: str) -> Dict[str, Any]:
    """Main function to process text for NER extraction."""
    return ner_agent.forward(text)

if __name__ == "__main__":
    # Test the NER agent
    test_text = """
    Acme Widgets Corporation (AWC) is a leading technology manufacturing company founded in 1995 and headquartered in San Francisco, California. 
    The company operates in the technology sector with a focus on industrial automation and robotics.
    
    Key Leadership:
    - CEO: Sarah Johnson, 45, MBA from Stanford University
    - CFO: Michael Chen, 42, CPA with 15 years experience
    
    Financial Performance:
    - Market Cap: $2.3 billion
    - Revenue (2023): $450 million
    - Employee Count: 2,500 employees
    
    Recent Developments:
    - Acquired TechFlow Solutions in March 2024 for $180 million
    - Received AAA credit rating from Moody's in January 2024
    - Fined $2.5 million by SEC in December 2023 for regulatory compliance issues
    """
    
    print("🤖 Testing NER Agent")
    print("=" * 50)
    
    result = process_ner_text(test_text)
    print(f"Success: {result['success']}")
    print(f"Entities Count: {result['entitiesCount']}")
    print(f"Extracted Entities: {json.dumps(result['entities'], indent=2)}")

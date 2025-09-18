# Temporal Knowledge Graph Analytics

A sophisticated temporal knowledge graph application that combines DSPy agents, PuppyGraph engine, and PostgreSQL for analyzing financial data over time. Built with React frontend and Express backend.

## Features

- **Natural Language to Cypher**: Convert plain English queries to graph queries using DSPy agents
- **Multi-Hop Retrieval**: Complex graph traversal with OpenAI-powered reasoning
- **Temporal Analysis**: Time-based graph filtering and temporal queries
- **Graph Visualization**: Interactive knowledge graph exploration
- **Financial Domain Data**: Pre-seeded with companies, executives, ratings, and relationships
- **Docker Support**: Complete containerized setup for local development

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Graph Engine**: PuppyGraph for Cypher query execution
- **Database**: PostgreSQL 16 for data persistence
- **AI Agents**: DSPy framework with OpenAI GPT-4o-mini for NL processing
- **Visualization**: SVG-based graph rendering with interactive controls

## Quick Start with Docker

### Development Mode (Recommended for Development)
```bash
# Clone the repository
git clone [repository-url]
cd temporal-knowledge-graph

# Set up environment
cp env.example .env
# Edit .env with your API keys

# Start development mode with hot reloading
./dev.sh dev
```

### Production Mode (For Testing/Deployment)
```bash
# Start production mode
./dev.sh prod
```

### Access the Application
- **Web App**: http://localhost:5000
- **PuppyGraph UI**: http://localhost:8081
- **PostgreSQL**: localhost:5432

### Development vs Production
- **Development Mode**: Hot reloading, no rebuilds needed for code changes
- **Production Mode**: Optimized build, requires rebuild for changes

For detailed development instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.template .env
   # Add your OpenAI API key to .env
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /api/graph/natural` - Natural language to graph query
- `POST /api/graph/multi-hop` - Multi-hop retrieval queries
- `POST /api/graph/query` - Direct Cypher query execution
- `GET /api/graph/status` - Graph engine status
- `GET /api/agent/status` - DSPy agent status
- `GET /api/agent/multi-hop/status` - Multi-hop agent status

## Docker Services

- **app**: Main application (React + Express)
- **postgres**: PostgreSQL 16 database
- **puppygraph**: PuppyGraph engine for Cypher queries

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for DSPy agents | Required |
| `DATABASE_URL` | PostgreSQL connection string | Auto-configured |
| `PUPPYGRAPH_URL` | PuppyGraph engine URL | Auto-configured |
| `SESSION_SECRET` | Session encryption secret | Auto-generated |
| `NODE_ENV` | Application environment | development |
| `PORT` | Application port | 5000 |

## Sample Queries

**Natural Language:**
- "Show me companies in the financial services sector with their executives"
- "Find financial services companies, their CEOs, and any credit ratings"
- "What companies have employees and what are their credit ratings?"

**Cypher:**
- `MATCH (c:Company {sector: 'Financial Services'})<-[:EMPLOYED_BY]-(p:Person) RETURN c, p`
- `MATCH (c:Company)-[:HAS_RATING]->(r:Rating) RETURN c, r`

## Tech Stack

**Backend:**
- Express.js, TypeScript
- DSPy (Stanford) for LLM orchestration
- OpenAI GPT-4o-mini
- PostgreSQL with Drizzle ORM
- PuppyGraph for graph queries

**Frontend:**
- React 18, TypeScript
- Tailwind CSS, shadcn/ui
- TanStack Query for state management
- Wouter for routing
- Lucide React icons

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL 16
- PuppyGraph engine
- Neon database integration

## License

MIT License
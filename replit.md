# Temporal Knowledge Graph Analytics

## Overview

This is a sophisticated temporal knowledge graph application that combines AI agents, graph databases, and time-based analytics for financial data exploration. The platform enables users to query complex financial relationships using natural language, which is then converted to graph queries for deep insights into companies, executives, transactions, and regulatory events over time.

The application serves as a comprehensive financial intelligence platform, allowing analysts to explore multi-hop relationships, temporal patterns, and complex financial connections through an intuitive interface that abstracts away the complexity of graph database queries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI with type safety
- **Tailwind CSS**: Utility-first styling for responsive design
- **shadcn/ui Components**: Professional design system with Radix UI primitives
- **Vite Build System**: Fast development and optimized production builds
- **TanStack Query**: Server state management and caching
- **Wouter Router**: Lightweight client-side routing

The frontend follows a component-driven architecture with reusable UI components, centralized state management, and responsive design patterns optimized for data-heavy financial interfaces.

### Backend Architecture
- **Express.js with TypeScript**: RESTful API server with type safety
- **Modular Route Structure**: Organized API endpoints for different functionalities
- **Agent-Based Processing**: Dedicated agents for natural language processing and multi-hop retrieval
- **Session Management**: PostgreSQL-backed session storage for user state

The backend implements a microservice-like approach with separate agents handling different aspects of query processing, from natural language understanding to complex graph traversals.

### AI Agent System
- **DSPy Framework**: Structured prompting and agent orchestration for reliable AI interactions
- **OpenAI GPT-4o-mini**: Natural language to Cypher query conversion
- **Multi-Hop Retrieval**: Complex graph traversal with reasoning capabilities
- **Python Integration**: Dedicated Python processes for AI agent execution

The AI system uses DSPy to create reliable, structured interactions with language models, enabling consistent conversion of natural language queries into precise graph database queries.

### Database and Graph Engine
- **PostgreSQL 16**: Primary data store with full ACID compliance
- **Drizzle ORM**: Type-safe database operations with migration support
- **PuppyGraph Engine**: Specialized graph query execution over relational data
- **Zero-ETL Architecture**: Direct graph queries over existing relational structure

The data layer enables querying relational data as a graph without data duplication, using PuppyGraph to provide graph capabilities over PostgreSQL tables.

### Data Model
The system models financial entities and relationships including:
- **Companies**: Market data, sectors, financial metrics
- **People**: Executives, board members, biographical information
- **Employments**: Person-company relationships with temporal validity
- **Ratings**: Credit ratings with agency attribution and time ranges
- **Transactions**: Mergers, acquisitions with status tracking
- **Regulatory Events**: Compliance events, fines, investigations

### Temporal Analytics
- **Time-Range Filtering**: Query data within specific temporal windows
- **Event Sequencing**: Track chronological relationships between events
- **Temporal Visualization**: Interactive timeline controls for data exploration
- **Historical Comparisons**: Analysis of changes over time periods

## External Dependencies

### AI and Language Models
- **OpenAI API**: GPT-4o-mini for natural language processing and reasoning
- **DSPy Framework**: Structured prompting and agent orchestration
- **Python Runtime**: Separate Python environment for AI agent execution

### Graph Technology
- **PuppyGraph**: Graph query engine for Cypher execution over relational data
- **Graph Schema Configuration**: JSON-based vertex and edge definitions

### Database Systems
- **PostgreSQL**: Primary data persistence with session storage
- **Neon Database**: Cloud PostgreSQL with serverless capabilities
- **Drizzle Kit**: Database migration and schema management

### Frontend Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Data fetching and state management
- **Wouter**: Lightweight routing solution

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **Docker Compose**: Local development environment orchestration
- **ESBuild**: Fast JavaScript bundling for production
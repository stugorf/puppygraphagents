# Design Guidelines: Temporal Knowledge Graph Analytics Platform

## Design Approach
**Selected Approach:** Design System (Material Design + Custom Financial Styling)
**Justification:** This is a utility-focused, data-heavy application requiring information density, efficiency, and enterprise-grade reliability. The complex nature of graph visualization and financial data analysis demands consistent patterns and clear information hierarchy.

## Core Design Principles
- **Data Clarity:** Prioritize readability of complex financial relationships and temporal data
- **Professional Trust:** Convey reliability through clean, structured layouts
- **Query Efficiency:** Support rapid iteration between natural language and Cypher queries
- **Visual Hierarchy:** Clear distinction between data input, processing, and visualization areas

## Color Palette

### Primary Colors
- **Primary Blue:** 210 85% 25% (Deep financial blue for trust and stability)
- **Secondary Blue:** 210 60% 45% (Lighter blue for interactive elements)

### Supporting Colors
- **Success Green:** 142 76% 36% (For successful queries and positive financial indicators)
- **Warning Amber:** 45 93% 47% (For data warnings and temporal highlights)
- **Error Red:** 0 84% 60% (For query errors and negative indicators)
- **Neutral Gray:** 220 9% 46% (For secondary text and borders)

### Dark Mode Palette
- **Background:** 222 84% 5% (Rich dark background)
- **Surface:** 217 33% 17% (Card and panel backgrounds)
- **Primary Light:** 210 85% 65% (Adjusted primary for dark mode)

## Typography
- **Primary Font:** Inter (Clean, readable for data-heavy interfaces)
- **Monospace Font:** JetBrains Mono (For Cypher queries and code)
- **Font Weights:** 400 (regular), 500 (medium), 600 (semibold)

## Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8 for consistent rhythm
- Small gaps: p-2, m-2
- Standard spacing: p-4, m-4  
- Section spacing: p-6, m-6
- Large spacing: p-8, m-8

## Component Library

### Navigation
- **Top Navigation:** Dark header with logo, main sections, and user profile
- **Sidebar:** Collapsible left panel for query history and saved queries
- **Breadcrumbs:** Clear path indication for nested graph explorations

### Query Interface
- **Dual Query Panel:** Split interface with natural language input on left, generated Cypher on right
- **Query Builder:** Visual query construction with drag-and-drop relationship building
- **Query History:** Expandable panel showing recent queries with timestamps

### Data Visualization
- **Graph Canvas:** Large central area for interactive node-edge visualization
- **Temporal Slider:** Bottom-mounted timeline control for temporal data exploration
- **Data Tables:** Clean, sortable tables for detailed financial record viewing
- **Metrics Cards:** Key performance indicators displayed in card format

### Forms & Inputs
- **Search Bars:** Prominent search with autocomplete for entity discovery
- **Filter Panels:** Collapsible filter options with clear apply/reset actions
- **Date Pickers:** Specialized temporal range selectors for financial time series

### Overlays
- **Entity Details:** Modal panels showing detailed information about selected graph nodes
- **Query Results:** Expandable results panel with export capabilities
- **Settings Modal:** Configuration options for graph display and query preferences

## Visual Treatment

### Graph Visualization
- **Node Styling:** Circular nodes with color-coded entity types (companies=blue, transactions=green, people=purple)
- **Edge Styling:** Varied line weights and colors representing relationship strength and type
- **Temporal Indicators:** Animated pulsing for time-based changes, timeline scrubbing

### Financial Data Presentation
- **Currency Formatting:** Consistent number formatting with proper decimal alignment
- **Trend Indicators:** Subtle arrow icons and color coding for positive/negative changes
- **Risk Levels:** Color-coded badges (low=green, medium=amber, high=red)

### Interactive Elements
- **Hover States:** Subtle elevation and color shifts for clickable elements
- **Loading States:** Professional skeleton screens and progress indicators
- **Empty States:** Helpful illustrations and actionable guidance for empty query results

## Information Architecture
- **Primary Navigation:** Query Builder, Graph Explorer, Data Browser, Analytics Dashboard
- **Secondary Actions:** Export, Save Query, Share Results, Settings
- **Status Indicators:** Connection status, query execution time, data freshness timestamps

This design system emphasizes clarity, trust, and efficiency while providing the sophisticated tooling needed for complex financial graph analysis and temporal data exploration.
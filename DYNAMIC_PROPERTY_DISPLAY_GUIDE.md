# Dynamic Property Display and Column Management Guide

## Overview

This guide explains the improvements made to the Graph View and Data View components to dynamically handle properties returned from queries, especially for scalar queries like the examples provided.

## Key Improvements

### 1. Enhanced DataTable Component

The `DataTable.tsx` component has been significantly improved to handle dynamic columns based on query results:

#### Dynamic Column Detection
- **Smart Row Detection**: The component now intelligently detects row boundaries in scalar results by looking for common prefixes (`c.`, `p.`, `r.`, `company`, `person`, `rating`) and duplicate keys.
- **Dynamic Column Generation**: Columns are automatically generated based on the actual properties returned from queries.
- **Flexible Data Structure**: Supports both graph data (nodes/edges) and scalar data with different column layouts.

#### Key Features
- **Automatic Column Headers**: Column headers are generated dynamically based on the query results
- **Sortable Columns**: All dynamically generated columns are sortable
- **Responsive Layout**: The table adapts to different data structures
- **Fallback Handling**: Graceful fallback to generic display when dynamic columns can't be determined

### 2. Graph Visualization Component

The `GraphVisualization.tsx` component already had good property display functionality:

#### Property Panel
- **Click to View**: Click on any node to see its properties in a detailed panel
- **Dynamic Properties**: Shows all properties returned from the query
- **Clean Layout**: Properties are displayed in a structured, readable format
- **Interactive**: Easy to close and reopen property panels

## Usage Examples

### Example 1: Company and Person Query
```cypher
MATCH (c:Company {sector: 'Financial Services'})<-[:EMPLOYED_BY]-(p:Person) 
RETURN c.name, c.ticker, c.sector, p.name, p.title
```

**Result**: The DataTable will automatically create columns for:
- `c.name` (Company Name)
- `c.ticker` (Company Ticker)
- `c.sector` (Company Sector)
- `p.name` (Person Name)
- `p.title` (Person Title)

### Example 2: Company and Rating Query
```cypher
MATCH (c:Company)-[:HAS_RATING]->(r:Rating) 
RETURN c.name, c.ticker, r.rating, r.rating_agency
```

**Result**: The DataTable will automatically create columns for:
- `c.name` (Company Name)
- `c.ticker` (Company Ticker)
- `r.rating` (Rating Value)
- `r.rating_agency` (Rating Agency)

## Technical Implementation

### DataTable Improvements

#### 1. Enhanced Scalar Transformation
```typescript
const transformScalarToTable = (scalarResults: Array<{key: string, value: any}>): { records: GraphRecord[], columns: string[] } => {
  // Smart row detection logic
  // Dynamic column generation
  // Flexible data structure handling
}
```

#### 2. Dynamic Column Rendering
```typescript
const renderScalarColumns = () => {
  // Renders column headers dynamically
  // Includes sorting functionality
  // Handles empty states gracefully
}
```

#### 3. Dynamic Cell Rendering
```typescript
const renderScalarCells = (record: GraphRecord) => {
  // Renders cells based on dynamic columns
  // Handles missing values gracefully
  // Maintains consistent formatting
}
```

### Graph Visualization Features

#### 1. Property Display
- Properties are shown in a collapsible panel when nodes are clicked
- All properties from the query are displayed
- Clean, structured layout with proper formatting

#### 2. Interactive Elements
- Click nodes to view properties
- Easy to close property panels
- Responsive design that works in both normal and fullscreen modes

## Benefits

### 1. Dynamic Adaptation
- **No Hardcoded Columns**: The system automatically adapts to any query structure
- **Flexible Data Handling**: Works with any combination of properties
- **Future-Proof**: New query types will work without code changes

### 2. Better User Experience
- **Clear Data Presentation**: Properties are displayed in a structured, readable format
- **Interactive Exploration**: Users can click on nodes to explore properties
- **Consistent Interface**: Same interaction patterns across different data types

### 3. Developer Benefits
- **Maintainable Code**: Less hardcoded logic, more flexible architecture
- **Extensible Design**: Easy to add new features or data types
- **Type Safety**: Proper TypeScript interfaces for all data structures

## Configuration

### Query Result Structure
The system expects query results in the following format:

```typescript
interface QueryResult {
  nodes: any[];
  edges: any[];
  scalarResults?: Array<{key: string, value: any}>;
  reasoning?: string;
  execution_time?: number;
  query_type?: string;
  cypher_query?: string;
}
```

### DataTable Props
```typescript
interface DataTableProps {
  data?: FinancialRecord[];
  nodes?: any[];
  queryResult?: QueryResult | null;
  onRowClick?: (record: FinancialRecord | GraphRecord) => void;
}
```

## Best Practices

### 1. Query Design
- Use descriptive property names in your Cypher queries
- Group related properties together
- Consider the visual layout when designing queries

### 2. Data Structure
- Ensure consistent property naming across queries
- Use meaningful labels for better user experience
- Handle null/undefined values gracefully

### 3. User Interaction
- Provide clear visual feedback for interactive elements
- Use consistent styling across different data types
- Implement proper loading states for better UX

## Troubleshooting

### Common Issues

1. **Columns Not Appearing**: Check that scalar results are properly formatted with `key` and `value` properties
2. **Data Not Displaying**: Ensure the query result structure matches the expected format
3. **Sorting Issues**: Verify that the sort field names match the column names

### Debug Information
The DataTable component includes comprehensive debug logging:
- Query result structure
- Column detection results
- Data transformation details
- Display data samples

## Future Enhancements

### Potential Improvements
1. **Column Customization**: Allow users to hide/show specific columns
2. **Data Export**: Export dynamic tables to CSV/Excel
3. **Advanced Filtering**: Filter by specific property values
4. **Column Resizing**: Allow users to resize columns
5. **Data Visualization**: Add charts for numeric properties

### Integration Opportunities
1. **Graph-Table Sync**: Highlight table rows when graph nodes are selected
2. **Property Search**: Search across all properties in the table
3. **Data Relationships**: Show relationships between different data types
4. **Temporal Views**: Display time-based data with temporal controls

## Conclusion

The enhanced DataTable and Graph Visualization components provide a flexible, dynamic way to display query results. The system automatically adapts to different data structures while maintaining a consistent user experience. This makes it easy to explore and understand complex graph data through both visual and tabular representations.

import { GraphVisualization } from '../GraphVisualization';

export default function GraphVisualizationExample() {
  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node);
  };

  const handleEdgeClick = (edge: any) => {
    console.log('Edge clicked:', edge);
  };

  return (
    <div className="p-4 bg-background min-h-screen">
      <div className="max-w-4xl">
        <GraphVisualization 
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
        />
      </div>
    </div>
  );
}
import { QueryInterface } from '../QueryInterface';

export default function QueryInterfaceExample() {
  const handleExecuteQuery = (query: string, type: 'natural' | 'cypher') => {
    console.log(`Executing ${type} query:`, query);
  };

  return (
    <div className="p-4 bg-background min-h-screen">
      <div className="max-w-2xl">
        <QueryInterface onExecuteQuery={handleExecuteQuery} />
      </div>
    </div>
  );
}
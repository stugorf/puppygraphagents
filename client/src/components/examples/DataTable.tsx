import { DataTable } from '../DataTable';

export default function DataTableExample() {
  const handleRowClick = (record: any) => {
    console.log('Record clicked:', record);
  };

  return (
    <div className="p-4 bg-background min-h-screen">
      <div className="max-w-6xl">
        <DataTable onRowClick={handleRowClick} />
      </div>
    </div>
  );
}
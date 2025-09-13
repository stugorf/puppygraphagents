import { ThemeToggle } from '../ThemeToggle';

export default function ThemeToggleExample() {
  return (
    <div className="p-4 bg-background min-h-screen">
      <div className="flex items-center gap-4">
        <span className="text-sm">Theme Toggle:</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
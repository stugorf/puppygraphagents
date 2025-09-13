import { TemporalControls } from '../TemporalControls';

export default function TemporalControlsExample() {
  const handleTimeRangeChange = (startDate: string, endDate: string) => {
    console.log('Time range changed:', { startDate, endDate });
  };

  const handlePlaybackSpeed = (speed: number) => {
    console.log('Playback speed changed:', speed);
  };

  return (
    <div className="p-4 bg-background min-h-screen">
      <div className="max-w-md">
        <TemporalControls 
          onTimeRangeChange={handleTimeRangeChange}
          onPlaybackSpeed={handlePlaybackSpeed}
        />
      </div>
    </div>
  );
}
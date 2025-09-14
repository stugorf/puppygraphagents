import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, SkipBack, SkipForward, Calendar, Clock } from "lucide-react";

interface TemporalControlsProps {
  onTimeRangeChange?: (startDate: string, endDate: string) => void;
  onPlaybackSpeed?: (speed: number) => void;
  onGranularityChange?: (granularity: string) => void;
}

export function TemporalControls({ onTimeRangeChange, onPlaybackSpeed, onGranularityChange }: TemporalControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(50); // Percentage through timeline
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [playbackSpeed, setPlaybackSpeedState] = useState("1x");
  const [granularity, setGranularity] = useState("month");

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    console.log(isPlaying ? 'Pausing temporal playback' : 'Starting temporal playback');
  };

  const handleTimelineChange = (value: number[]) => {
    setCurrentTime(value[0]);
    console.log('Timeline position changed to:', value[0]);
  };

  const handleDateRangeChange = () => {
    onTimeRangeChange?.(startDate, endDate);
    console.log('Date range changed:', { startDate, endDate });
  };

  const handleSpeedChange = (speed: string) => {
    setPlaybackSpeedState(speed);
    const speedValue = parseFloat(speed.replace('x', ''));
    onPlaybackSpeed?.(speedValue);
    console.log('Playback speed changed to:', speed);
  };

  const getCurrentDate = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start.getTime() + (end.getTime() - start.getTime()) * (currentTime / 100));
    return current.toISOString().split('T')[0];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Temporal Controls
          </span>
          <Badge variant="outline" className="text-xs">
            {getCurrentDate()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Date Range Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Time Range</label>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
                data-testid="input-start-date"
              />
            </div>
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
              data-testid="input-end-date"
            />
            <Button onClick={handleDateRangeChange} size="sm" data-testid="button-apply-range">
              Apply
            </Button>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Timeline Position</label>
          <div className="space-y-3">
            <Slider
              value={[currentTime]}
              onValueChange={handleTimelineChange}
              max={100}
              step={1}
              className="w-full"
              data-testid="slider-timeline"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{startDate}</span>
              <span className="font-mono">{getCurrentDate()}</span>
              <span>{endDate}</span>
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Playback</label>
          <div className="flex gap-2 items-center">
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
              data-testid="button-skip-back"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button 
              size="icon"
              onClick={handlePlay}
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setCurrentTime(Math.min(100, currentTime + 10))}
              data-testid="button-skip-forward"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            <Select value={playbackSpeed} onValueChange={handleSpeedChange}>
              <SelectTrigger className="w-20" data-testid="select-playback-speed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25x">0.25x</SelectItem>
                <SelectItem value="0.5x">0.5x</SelectItem>
                <SelectItem value="1x">1x</SelectItem>
                <SelectItem value="2x">2x</SelectItem>
                <SelectItem value="4x">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Granularity Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Time Granularity</label>
          <Select value={granularity} onValueChange={(value) => {
            setGranularity(value);
            onGranularityChange?.(value);
          }}>
            <SelectTrigger data-testid="select-granularity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Current Status */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Position:</span>
            <span className="font-mono">{getCurrentDate()}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Progress:</span>
            <span>{currentTime.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
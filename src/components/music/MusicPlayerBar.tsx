'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, X, Music, SkipBack, SkipForward } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';

interface MusicPlayerBarProps {
  trackUrl: string;
  trackTitle: string;
  trackVersion: string;
  bookCoverUrl?: string;
  genre?: string | null;
  mood?: string | null;
  onClose: () => void;
  // Playlist mode props
  playlistMode?: boolean;
  currentTrackIndex?: number;
  totalTracks?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  // Controlled playback state (for playlist mode)
  externalIsPlaying?: boolean;
  externalCurrentTime?: number;
  externalDuration?: number;
  onTogglePlayPause?: () => void;
  onSeek?: (seconds: number) => void;
}

export function MusicPlayerBar({
  trackUrl,
  trackTitle,
  trackVersion,
  bookCoverUrl,
  genre,
  mood,
  onClose,
  playlistMode = false,
  currentTrackIndex = 0,
  totalTracks = 0,
  onPrevious,
  onNext,
  hasNext = false,
  hasPrevious = false,
  externalIsPlaying,
  externalCurrentTime,
  externalDuration,
  onTogglePlayPause,
  onSeek,
}: MusicPlayerBarProps) {
  // ✅ Critical Issue #12: useMusicPlayer에서 볼륨 상태 가져오기
  const { volume, isMuted, setVolume, toggleMute } = useMusicPlayer();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 외부 상태를 로컬 상태에 반영 (슬라이더 즉각 반응용)
  useEffect(() => {
    if (externalCurrentTime !== undefined) {
      setCurrentTime(externalCurrentTime);
    }
  }, [externalCurrentTime]);

  useEffect(() => {
    if (externalDuration !== undefined) {
      setDuration(externalDuration);
    }
  }, [externalDuration]);

  // ✅ UNIFIED: 항상 외부 상태를 사용 (useMusicPlayer가 모든 재생 관리)
  useEffect(() => {
    setIsLoading(false);
    // AudioCrossfadeManager 또는 useMusicPlayer가 모든 Audio 관리를 담당
    // MusicPlayerBar는 순수한 UI 컴포넌트로 동작
  }, [trackUrl]);

  const togglePlayPause = () => {
    // ✅ UNIFIED: 항상 외부 핸들러 호출 (useMusicPlayer가 모든 재생 제어)
    if (onTogglePlayPause) {
      onTogglePlayPause();
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (!onSeek) {
      toast.info('재생 컴트롤이 아직 연결되지 않았습니다.');
      return;
    }
    setCurrentTime(newTime);
    onSeek(newTime);
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  const handleVolumeChange = (value: number[]) => {
    // ✅ Critical Issue #12 해결: 실제 볼륨 변경
    const newVolume = value[0];
    setVolume(newVolume);
  };

  const handleToggleMute = () => {
    // ✅ Critical Issue #12 해결: 실제 음소거 토글
    toggleMute();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ UNIFIED: 항상 외부 상태 사용 (useMusicPlayer가 모든 상태 관리)
  const displayIsPlaying = externalIsPlaying ?? false;
  const displayCurrentTime = externalCurrentTime ?? currentTime;
  const displayDuration = externalDuration ?? duration;

  return (
    <AnimatePresence>
      <m.div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/98 backdrop-blur-xl supports-[backdrop-filter]:bg-background/95"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4 md:gap-6 py-4">
            {/* Left: Book Cover + Info */}
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              {/* Book Cover - 56x56px on desktop, 48x48px on mobile */}
              <m.div
                className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-accent shadow-md"
                animate={displayIsPlaying ? {
                  boxShadow: [
                    '0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06)',
                    '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)',
                    '0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06)'
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {bookCoverUrl ? (
                  <Image
                    src={bookCoverUrl}
                    alt={trackTitle}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                )}
              </m.div>

              {/* Track Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm md:text-base font-bold truncate leading-tight">{trackTitle}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-xs text-muted-foreground/70">{trackVersion}</span>
                  {genre && (
                    <Badge variant="secondary" className="text-[10px] md:text-xs h-4 md:h-5 px-1.5 md:px-2">
                      {genre}
                    </Badge>
                  )}
                  {mood && (
                    <Badge variant="secondary" className="text-[10px] md:text-xs h-4 md:h-5 px-1.5 md:px-2">
                      {mood}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Center: Playback Controls */}
            <div className="flex flex-col items-center gap-1">
              {/* Playlist Progress (only in playlist mode) */}
              {playlistMode && totalTracks > 0 && (
                <div className="text-xs text-muted-foreground/70 font-medium mb-1">
                  {currentTrackIndex + 1} / {totalTracks} 트랙
                </div>
              )}
              
              <div className="flex items-center gap-3 md:gap-4">
                {/* Previous Button (only in playlist mode) */}
                {playlistMode && (
                  <m.button
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    className="relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 bg-accent/50 hover:bg-accent"
                    whileHover={{ scale: hasPrevious ? 1.05 : 1 }}
                    whileTap={{ scale: hasPrevious ? 0.95 : 1 }}
                  >
                    <SkipBack className="size-4 md:size-5" />
                  </m.button>
                )}
                
                {/* Play/Pause Button - Spotify style (48x48px, hover scale) */}
                <m.button
                  onClick={togglePlayPause}
                  disabled={isLoading}
                  className="relative w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 bg-gradient-accent"
                  whileHover={{ scale: isLoading ? 1 : 1.06 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {displayIsPlaying ? (
                    <Pause className="size-5 md:size-6 text-white" fill="white" />
                  ) : (
                    <Play className="size-5 md:size-6 text-white ml-0.5" fill="white" />
                  )}
                </m.button>
                
                {/* Next Button (only in playlist mode) */}
                {playlistMode && (
                  <m.button
                    onClick={onNext}
                    disabled={!hasNext}
                    className="relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 bg-accent/50 hover:bg-accent"
                    whileHover={{ scale: hasNext ? 1.05 : 1 }}
                    whileTap={{ scale: hasNext ? 0.95 : 1 }}
                  >
                    <SkipForward className="size-4 md:size-5" />
                  </m.button>
                )}
              </div>

              {/* Progress Bar + Time - Spotify style with hover effects */}
              <div className="hidden md:flex items-center gap-3 min-w-[300px] lg:min-w-[400px]">
                <span className="text-xs text-muted-foreground/70 tabular-nums font-medium">
                  {formatTime(displayCurrentTime)}
                </span>
                <div
                  className="flex-1 relative group"
                  onMouseEnter={() => setIsHoveringProgress(true)}
                  onMouseLeave={() => setIsHoveringProgress(false)}
                >
                  <Slider
                    value={[displayCurrentTime]}
                    max={displayDuration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    onPointerDown={handleSeekStart}
                    onPointerUp={handleSeekEnd}
                    className={`
                      flex-1 cursor-pointer
                      [&>span:first-child]:bg-slate-300/30
                      [&>span:first-child]:transition-[height] [&>span:first-child]:duration-200
                      ${isHoveringProgress || isDragging ? '[&>span:first-child]:h-1.5' : '[&>span:first-child]:h-1'}
                      [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-primary [&>span:last-child]:to-purple-600
                      [&>span:last-child]:transition-all [&>span:last-child]:duration-150
                      ${isDragging ? '[&>span:last-child]:brightness-110' : ''}
                      [&_[role=slider]]:bg-white
                      [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary
                      [&_[role=slider]]:shadow-lg
                      [&_[role=slider]]:ring-2 [&_[role=slider]]:ring-primary/20
                      [&_[role=slider]]:transition-all [&_[role=slider]]:duration-150
                      ${isHoveringProgress || isDragging ? '[&_[role=slider]]:w-3 [&_[role=slider]]:h-3' : '[&_[role=slider]]:w-0 [&_[role=slider]]:h-0'}
                      ${isDragging ? '[&_[role=slider]]:w-3.5 [&_[role=slider]]:h-3.5' : ''}
                    `}
                  />
                </div>
                <span className="text-xs text-muted-foreground/70 tabular-nums font-medium">
                  {formatTime(displayDuration)}
                </span>
              </div>
            </div>

            {/* Right: Volume + Close */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Volume Control - Spotify style (always visible on md+) */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleToggleMute}
                  className="size-9 hover:bg-accent transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="w-20 md:w-24 lg:w-28 [&>span:first-child]:bg-slate-300/30 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-primary [&>span:last-child]:to-purple-600 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-md [&_[role=slider]]:w-2.5 [&_[role=slider]]:h-2.5 [&_[role=slider]]:transition-all [&_[role=slider]]:hover:w-3 [&_[role=slider]]:hover:h-3"
                />
              </div>

              {/* Close Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="size-9 hover:bg-accent transition-colors"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Progress Bar - Enhanced touch area */}
          <div className="md:hidden pb-3 pt-2">
            <Slider
              value={[displayCurrentTime]}
              max={displayDuration || 100}
              step={0.1}
              onValueChange={handleSeek}
              onPointerDown={handleSeekStart}
              onPointerUp={handleSeekEnd}
              className={`
                w-full cursor-pointer
                [&>span:first-child]:bg-slate-300/30
                [&>span:first-child]:h-2
                [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-primary [&>span:last-child]:to-purple-600
                [&>span:last-child]:transition-all
                ${isDragging ? '[&>span:last-child]:brightness-110' : ''}
                [&_[role=slider]]:bg-white
                [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary
                [&_[role=slider]]:shadow-lg
                [&_[role=slider]]:w-4 [&_[role=slider]]:h-4
                [&_[role=slider]]:transition-all
                ${isDragging ? '[&_[role=slider]]:w-5 [&_[role=slider]]:h-5' : ''}
              `}
            />
            <div className="flex justify-between text-xs text-muted-foreground/70 mt-1.5 font-medium tabular-nums">
              <span>{formatTime(displayCurrentTime)}</span>
              <span>{formatTime(displayDuration)}</span>
            </div>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}

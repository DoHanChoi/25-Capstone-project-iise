'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, X, Music, SkipBack, SkipForward } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';

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
}: MusicPlayerBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!trackUrl) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const audio = new Audio(trackUrl);
    audioRef.current = audio;

    // Event handlers
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);

      // 자동 재생 시작
      audio.play()
        .then(() => {
          setIsPlaying(true);
          console.log('✅ Auto-play started');
        })
        .catch((error) => {
          console.warn('❌ Auto-play blocked by browser:', error);
          setIsPlaying(false);
          toast.info('재생 버튼을 눌러 음악을 시작하세요.');
        });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      toast.error('음악 파일을 불러올 수 없습니다.');
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Set initial volume
    audio.volume = volume / 100;

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';  // Release memory
    };
  }, [trackUrl]);  // ✅ volume 제거

  // ✅ CustomEvent 수신 (타임라인 버튼에서 토글 요청 시)
  useEffect(() => {
    const handleToggleEvent = () => {
      console.log('🔔 Received togglePlayPause event');
      togglePlayPause();
    };

    window.addEventListener('togglePlayPause', handleToggleEvent);

    return () => {
      window.removeEventListener('togglePlayPause', handleToggleEvent);
    };
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    // ✅ 실제 재생 상태 확인 (isPlaying 상태 대신)
    if (audioRef.current.paused) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('▶️ Playback started');
        })
        .catch((error) => {
          console.error('❌ Playback failed:', error);
          setIsPlaying(false);
          toast.error('재생에 실패했습니다.');
        });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log('⏸️ Playback paused');
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    setVolume(newVolume);
    audioRef.current.volume = newVolume / 100;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume / 100;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
                animate={isPlaying ? {
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
                  className="relative w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  }}
                  whileHover={{ scale: isLoading ? 1 : 1.06 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isPlaying ? (
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
                  {formatTime(currentTime)}
                </span>
                <div
                  className="flex-1 relative group"
                  onMouseEnter={() => setIsHoveringProgress(true)}
                  onMouseLeave={() => setIsHoveringProgress(false)}
                >
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    onPointerDown={handleSeekStart}
                    onPointerUp={handleSeekEnd}
                    className={`
                      flex-1 cursor-pointer
                      [&>span:first-child]:bg-slate-300/30 dark:[&>span:first-child]:bg-slate-700/40
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
                  {formatTime(duration)}
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
                  onClick={toggleMute}
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
                  className="w-20 md:w-24 lg:w-28 [&>span:first-child]:bg-slate-300/30 dark:[&>span:first-child]:bg-slate-700/40 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-primary [&>span:last-child]:to-purple-600 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-md [&_[role=slider]]:w-2.5 [&_[role=slider]]:h-2.5 [&_[role=slider]]:transition-all [&_[role=slider]]:hover:w-3 [&_[role=slider]]:hover:h-3"
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
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              onPointerDown={handleSeekStart}
              onPointerUp={handleSeekEnd}
              className={`
                w-full cursor-pointer
                [&>span:first-child]:bg-slate-300/30 dark:[&>span:first-child]:bg-slate-700/40
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
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}

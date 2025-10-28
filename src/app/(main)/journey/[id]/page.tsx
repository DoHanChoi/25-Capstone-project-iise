'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { JourneyHeader } from '@/components/journey/JourneyHeader';
import { LogForm, type LogFormData } from '@/components/journey/LogForm';
import { LogList } from '@/components/journey/LogList';
import { MusicPlayer } from '@/components/music/MusicPlayer';
import { MusicPlayerBar } from '@/components/music/MusicPlayerBar';
import { Playlist } from '@/components/music/Playlist';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, CheckCircle2, Clock, Music2, BookOpen, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { m } from 'framer-motion';

interface Journey {
  id: string;
  book_title: string;
  book_author?: string;
  book_cover_url?: string;
  book_description?: string;
  status: 'reading' | 'completed';
  started_at: string;
  completed_at?: string;
}

interface MusicTrack {
  id: string;
  prompt: string;
  genre: string | null;
  mood: string | null;
  tempo: string | null;
  file_url: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface ReadingLog {
  id: string;
  version: number;
  log_type: string;
  quote: string | null;
  memo: string | null;
  emotions: string[];
  is_public: boolean;
  created_at: string;
  music_track: MusicTrack | null;
}

interface PlaylistTrack {
  id: string;
  version: number;
  logType: string;
  title: string;
  fileUrl: string;
  prompt: string;
  genre: string;
  mood: string;
  tempo: number;
  duration: number;
  description: string | null;
  createdAt: string;
  quote?: string | null;
  memo?: string | null;
}

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;

  const [journey, setJourney] = useState<Journey | null>(null);
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [generatingTracks, setGeneratingTracks] = useState<Set<string>>(new Set());
  const [isSharingToFeed, setIsSharingToFeed] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);

  const { triggerGeneration } = useMusicGeneration();

  // Fetch journey and logs
  useEffect(() => {
    fetchJourney();
  }, [journeyId]);

  // Update music status only (lightweight polling)
  const updateMusicStatus = async () => {
    if (isPolling) return; // Prevent overlapping updates
    
    setIsPolling(true);
    try {
      const response = await fetch(`/api/journeys/${journeyId}/music-status`);
      if (!response.ok) return;

      const { musicTracks } = await response.json();
      
      // Update logs with new music track status only
      setLogs((prevLogs) => {
        return prevLogs.map((log) => {
          const updatedTrack = musicTracks.find((mt: any) => mt.logId === log.id);
          if (updatedTrack?.track && log.music_track) {
            // Only update if status actually changed
            if (log.music_track.status !== updatedTrack.track.status) {
              return {
                ...log,
                music_track: {
                  ...log.music_track,
                  status: updatedTrack.track.status,
                  file_url: updatedTrack.track.file_url || log.music_track.file_url
                }
              };
            }
          }
          return log;
        });
      });

      // Update generating tracks set
      const newGeneratingTracks = new Set<string>();
      const now = new Date();
      const TIMEOUT_MINUTES = 10;
      
      musicTracks.forEach((mt: any) => {
        if (mt.track && (mt.track.status === 'pending' || mt.track.status === 'generating')) {
          const createdAt = new Date(mt.track.created_at);
          const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60;
          
          if (minutesElapsed < TIMEOUT_MINUTES) {
            newGeneratingTracks.add(mt.track.id);
          }
        }
      });
      
      setGeneratingTracks(newGeneratingTracks);

      // Update current track if needed
      const completedTracks = musicTracks
        .filter((mt: any) => mt.track?.status === 'completed')
        .sort((a: any, b: any) => b.version - a.version);
      
      if (completedTracks.length > 0 && completedTracks[0].track) {
        setCurrentTrack(completedTracks[0].track);
      }
    } catch (error) {
      console.error('Failed to update music status:', error);
    } finally {
      setIsPolling(false);
    }
  };

  // ✅ OPTIMIZED: Poll for generating tracks with adaptive interval
  const generatingTracksRef = useRef(generatingTracks);
  generatingTracksRef.current = generatingTracks;

  useEffect(() => {
    // Start with 3s interval, increase to 5s after 30s
    let pollInterval = 3000;
    let elapsedTime = 0;
    
    const poll = async () => {
      if (generatingTracksRef.current.size > 0) {
        await updateMusicStatus();
        
        // Adaptive polling: slow down after 30 seconds
        elapsedTime += pollInterval;
        if (elapsedTime > 30000 && pollInterval === 3000) {
          pollInterval = 5000; // Slow down to 5s
          clearInterval(intervalId);
          intervalId = setInterval(poll, pollInterval);
        }
      }
    };
    
    let intervalId = setInterval(poll, pollInterval);
    return () => clearInterval(intervalId);
  }, []); // Empty dependency - only run once on mount

  const fetchJourney = async (skipLoading = false) => {
    if (!skipLoading) {
      setIsLoading(true);
    }
    try {
      const response = await fetch(`/api/journeys/${journeyId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch journey');
      }

      const data = await response.json();
      setJourney(data.journey);
      
      // Set playlist if journey is completed
      if (data.playlist && data.playlist.length > 0) {
        setPlaylist(data.playlist);
      }

      // Check if already shared to feed
      if (data.journey.status === 'completed') {
        const postsResponse = await fetch(`/api/posts?limit=100`);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          const alreadyShared = postsData.posts.some(
            (post: any) => post.journey.id === journeyId
          );
          setHasShared(alreadyShared);
        }
      }

      // Fetch logs
      const logsResponse = await fetch(`/api/journeys/${journeyId}/logs`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);

        // Update generating tracks set (only if changed)
        const newGeneratingTracks = new Set<string>();
        const now = new Date();
        const TIMEOUT_MINUTES = 10; // 10분 이상 pending이면 타임아웃으로 간주
        
        (logsData.logs || []).forEach((log: ReadingLog) => {
          if (log.music_track && (log.music_track.status === 'pending' || log.music_track.status === 'generating')) {
            const createdAt = new Date(log.music_track.created_at);
            const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60;
            
            // 10분 이내의 pending/generating 트랙만 폴링 대상으로 추가
            if (minutesElapsed < TIMEOUT_MINUTES) {
              newGeneratingTracks.add(log.music_track.id);
            } else {
              // 타임아웃된 트랙은 에러 상태로 자동 업데이트 (한 번만)
              if (!isLoading) {
                console.warn(`음악 생성 타임아웃: ${log.music_track.id} (${Math.round(minutesElapsed)}분 경과)`);
              }
            }
          }
        });
        
        // Only update if the set content actually changed
        setGeneratingTracks(prev => {
          if (prev.size !== newGeneratingTracks.size) {
            return newGeneratingTracks;
          }
          for (const id of newGeneratingTracks) {
            if (!prev.has(id)) {
              return newGeneratingTracks;
            }
          }
          return prev; // No change, return previous to avoid re-render
        });

        // Set current track to the latest completed one
        const completedLogs = (logsData.logs || []).filter(
          (log: ReadingLog) => log.music_track?.status === 'completed'
        );
        if (completedLogs.length > 0) {
          setCurrentTrack(completedLogs[completedLogs.length - 1].music_track);
        }
      }
    } catch (error) {
      console.error('Failed to fetch journey:', error);
      toast.error('독서 여정을 불러오는데 실패했습니다.');
    } finally {
      if (!skipLoading) {
        setIsLoading(false);
      }
    }
  };

  // ✅ OPTIMIZED: Memoize callbacks
  const handleShareToFeed = useCallback(async () => {
    if (!journey || journey.status !== 'completed') {
      toast.error('완독한 여정만 공유할 수 있습니다.');
      return;
    }

    setIsSharingToFeed(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId: journey.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to share to feed');
      }

      const result = await response.json();
      toast.success('독서 여정이 피드에 공유되었습니다!');
      setHasShared(true);

      // Navigate to the post
      setTimeout(() => {
        router.push(`/feed/${result.post.id}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to share to feed:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        toast.error('이미 피드에 공유된 여정입니다.');
        setHasShared(true);
      } else {
        toast.error('피드 공유에 실패했습니다.');
      }
    } finally {
      setIsSharingToFeed(false);
    }
  }, [journey, router]);

  const handleSubmitLog = useCallback(async (data: LogFormData, generateMusic: boolean) => {
    setIsSubmittingLog(true);
    try {
      const response = await fetch(`/api/journeys/${journeyId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, generateMusic }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create log');
      }

      const result = await response.json();

      if (generateMusic) {
        toast.success('독서 기록이 추가되었습니다! 음악 생성 중...');
        // Add to generating tracks set immediately
        if (result.musicTrack?.id) {
          setGeneratingTracks((prev) => new Set([...prev, result.musicTrack.id]));
          triggerGeneration(result.musicTrack.id);
        }
        // Add the new log with pending music track to state
        if (result.log) {
          setLogs((prev) => [...prev, result.log]);
        }
      } else {
        toast.success('독서 기록이 저장되었습니다.');
        // Only refresh if not generating music
        await fetchJourney(true); // Skip loading state
      }
      
      setShowLogForm(false);
    } catch (error) {
      console.error('Failed to submit log:', error);
      toast.error(error instanceof Error ? error.message : '독서 기록 추가에 실패했습니다.');
    } finally {
      setIsSubmittingLog(false);
    }
  }, [journeyId, triggerGeneration, fetchJourney]);

  const handlePlayMusic = useCallback((track: MusicTrack) => {
    console.log('🎵 handlePlayMusic called:', {
      trackId: track.id,
      currentTrackId,
      status: track.status,
      fileUrl: track.file_url,
      genre: track.genre
    });

    // 상태 검증
    if (track.status !== 'completed') {
      if (track.status === 'pending' || track.status === 'generating') {
        toast.error('음악이 아직 생성 중입니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('음악 생성에 실패했습니다.');
      }
      return;
    }

    // URL 검증
    if (!track.file_url || track.file_url.trim() === '') {
      console.error('❌ Invalid file_url:', track.file_url);
      toast.error('음악 파일 URL이 유효하지 않습니다.');
      return;
    }

    // ✅ 같은 트랙 클릭 시 - 하단 바의 togglePlayPause 호출
    if (currentTrackId === track.id && currentTrack) {
      console.log('🔄 Same track clicked - toggling playback');
      // 하단 바에서 처리하도록 이벤트 발생 (CustomEvent 사용)
      const event = new CustomEvent('togglePlayPause');
      window.dispatchEvent(event);
      return;
    }

    // 다른 트랙 클릭 시 - 새 트랙으로 교체
    console.log('✅ Starting new track');
    setCurrentTrack(track);
    setCurrentTrackId(track.id);
    toast.success(`${track.genre || '음악'} 재생을 시작합니다.`, {
      description: track.mood ? `분위기: ${track.mood}` : undefined,
    });
  }, [currentTrackId, currentTrack]);

  const handleClosePlayer = useCallback(() => {
    console.log('⏸️ Closing player');
    setCurrentTrack(null);
    setCurrentTrackId(null);
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" text="독서 여정을 불러오는 중..." />
        </div>
      </AppLayout>
    );
  }

  if (!journey) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <m.div className="card-elevated p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">독서 여정을 찾을 수 없습니다</h2>
            <Button onClick={() => router.push('/library')}>내 책장으로 돌아가기</Button>
          </m.div>
        </div>
      </AppLayout>
    );
  }

  const completedLogs = logs.filter((log) => log.music_track?.status === 'completed');
  const totalReadingDays = Math.floor(
    (new Date().getTime() - new Date(journey.started_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Journey Header */}
        <JourneyHeader
          bookTitle={journey.book_title}
          bookAuthor={journey.book_author}
          bookCoverUrl={journey.book_cover_url}
          status={journey.status}
          startedAt={journey.started_at}
          completedAt={journey.completed_at}
          logsCount={logs.length}
        />

        <Separator className="my-8" />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Log Form */}
            {journey.status === 'reading' && (
              <m.div
                className="card-elevated rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      }}>
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold">독서 기록</h3>
                    </div>
                    {!showLogForm && (
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => setShowLogForm(true)}
                      >
                        <Plus className="size-4 mr-1" />
                        기록 추가
                      </Button>
                    )}
                  </div>
                  {showLogForm ? (
                    <LogForm
                      onSubmit={handleSubmitLog}
                      onCancel={() => setShowLogForm(false)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      독서 중 인상 깊었던 구절이나 생각을 기록해보세요.
                    </p>
                  )}
                </div>
              </m.div>
            )}

            {/* Playlist - Only for completed journeys */}
            {journey.status === 'completed' && playlist.length > 0 && (
              <m.div
                className="card-elevated rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                        background: 'linear-gradient(135deg, #ff6b6b, #f06595)'
                      }}>
                        <Music2 className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold">독서 플레이리스트</h2>
                    </div>
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => {
                        if (playlist.length > 0 && playlist[0].fileUrl) {
                          // Play first track to start playlist
                          const firstTrack: MusicTrack = {
                            id: playlist[0].id,
                            prompt: playlist[0].prompt,
                            genre: playlist[0].genre,
                            mood: playlist[0].mood,
                            tempo: playlist[0].tempo.toString(),
                            file_url: playlist[0].fileUrl,
                            description: playlist[0].description,
                            status: 'completed',
                            created_at: playlist[0].createdAt
                          };
                          handlePlayMusic(firstTrack);
                          setIsPlayingPlaylist(true);
                        }
                      }}
                    >
                      <Music2 className="size-4 mr-1" />
                      전체 재생
                    </Button>
                  </div>
                  <Playlist
                    tracks={playlist.map(track => ({
                      id: track.id,
                      title: track.title,
                      artist: journey.book_author || 'ReadTune',
                      duration: track.duration,
                      albumCover: journey.book_cover_url,
                      fileUrl: track.fileUrl,
                      genre: track.genre,
                      mood: track.mood
                    }))}
                    currentTrackId={currentTrackId}
                    isPlaying={!!currentTrack}
                    onTrackSelect={(trackId) => {
                      const track = playlist.find(t => t.id === trackId);
                      if (track) {
                        const musicTrack: MusicTrack = {
                          id: track.id,
                          prompt: track.prompt,
                          genre: track.genre,
                          mood: track.mood,
                          tempo: track.tempo.toString(),
                          file_url: track.fileUrl,
                          description: track.description,
                          status: 'completed',
                          created_at: track.createdAt
                        };
                        handlePlayMusic(musicTrack);
                      }
                    }}
                    onPlayPause={() => {
                      const event = new CustomEvent('togglePlayPause');
                      window.dispatchEvent(event);
                    }}
                  />
                </div>
              </m.div>
            )}

            {/* Reading Logs List */}
            <m.div
              className="card-elevated rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="p-6 pb-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)'
                  }}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">독서 여정 타임라인</h2>
                </div>
                <LogList logs={logs} onPlayMusic={handlePlayMusic} currentTrackId={currentTrackId} />
              </div>
            </m.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics - Gradient Cards */}
            <m.div
              className="card-gradient text-white p-6 rounded-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-bold mb-6">독서 현황</h3>
              <div className="space-y-5">
                <m.div
                  className="flex items-center justify-between p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))'
                    }}>
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm text-white/80">독서 기간</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{totalReadingDays}일</span>
                </m.div>

                <m.div
                  className="flex items-center justify-between p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))'
                    }}>
                      <Music2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm text-white/80">생성된 음악</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{completedLogs.length}곡</span>
                </m.div>

                <m.div
                  className="flex items-center justify-between p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))'
                    }}>
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm text-white/80">독서 기록</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{logs.length}개</span>
                </m.div>
              </div>
            </m.div>

            {/* Actions */}
            {journey.status === 'reading' ? (
              <m.div
                className="card-gradient-warm text-white p-6 rounded-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-xl font-bold mb-3">여정 완료</h3>
                <p className="text-sm text-white/90 mb-4 leading-relaxed">
                  책을 다 읽으셨나요? 완독 처리하고 최종 음악을 생성하세요.
                </p>
                <Button
                  size="lg"
                  className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold shadow-lg"
                  onClick={() => router.push(`/journey/${journeyId}/complete`)}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  완독 처리하기
                </Button>
              </m.div>
            ) : (
              <m.div
                className="card-elevated p-6 rounded-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-xl font-bold mb-3">피드 공유</h3>
                {hasShared ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      이 여정은 이미 피드에 공유되었습니다.
                    </p>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push('/feed')}
                    >
                      <Share2 className="mr-2 h-5 w-5" />
                      피드 보기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      완독한 독서 여정을 다른 사람들과 공유해보세요.
                    </p>
                    <Button
                      size="lg"
                      variant="gradient"
                      className="w-full"
                      onClick={handleShareToFeed}
                      disabled={isSharingToFeed}
                    >
                      {isSharingToFeed ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          공유 중...
                        </>
                      ) : (
                        <>
                          <Share2 className="mr-2 h-5 w-5" />
                          피드에 공유하기
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </m.div>
            )}
          </div>
        </div>

        {/* Bottom Music Player Bar */}
        {currentTrack && currentTrack.status === 'completed' && (
          <MusicPlayerBar
            trackUrl={currentTrack.file_url}
            trackTitle={journey.book_title}
            trackVersion={
              logs.find((log) => log.music_track?.id === currentTrack.id)?.log_type === 'v0'
                ? 'v0 - 여정 시작'
                : logs.find((log) => log.music_track?.id === currentTrack.id)?.log_type === 'vFinal'
                ? 'vFinal - 완독'
                : `v${logs.find((log) => log.music_track?.id === currentTrack.id)?.version || ''}`
            }
            bookCoverUrl={journey.book_cover_url}
            genre={currentTrack.genre}
            mood={currentTrack.mood}
            onClose={handleClosePlayer}
          />
        )}
      </div>
    </AppLayout>
  );
}

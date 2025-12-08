'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/post/PostCard';
import { FilterBar } from '@/components/common/FilterBar';
import { Pagination } from '@/components/common/Pagination';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { PostDetailDto, PostDto } from '@/types/dto/post.dto';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { MusicPlayerBar } from '@/components/music/MusicPlayerBar';

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const CATEGORIES = [
  { value: 'all', label: '전체' },
  { value: '소설', label: '소설' },
  { value: '시/에세이', label: '시/에세이' },
  { value: '인문', label: '인문' },
  { value: '자기계발', label: '자기계발' },
  { value: '비즈니스', label: '비즈니스' },
  { value: '과학', label: '과학' },
  { value: '역사', label: '역사' },
  { value: '예술', label: '예술' },
  { value: '기타', label: '기타' },
];

// 한글 카테고리 → Google Books API 카테고리 매핑
const CATEGORY_MAPPING: Record<string, string[]> = {
  '소설': ['Fiction', 'Literary Collections'],
  '시/에세이': ['Poetry', 'Literary Collections'],
  '인문': ['Philosophy', 'Religion', 'Psychology'],
  '자기계발': ['Self-Help', 'Business & Economics'],
  '비즈니스': ['Business & Economics'],
  '과학': ['Science', 'Technology & Engineering'],
  '역사': ['History'],
  '예술': ['Art', 'Music', 'Performing Arts'],
  '기타': ['General'],
};

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
];

export default function FeedPage() {
  const router = useRouter();
  const musicPlayer = useMusicPlayer();
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('latest');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    totalCount: 0,
    totalPages: 0,
  });
  const [playerContext, setPlayerContext] = useState<{
    bookTitle: string;
    bookCoverUrl?: string | null;
    playlistLength: number;
  } | null>(null);

  // Fetch posts
  const fetchPosts = async () => {
    try {
      setLoading(true);

      // 한글 카테고리를 영어 카테고리 배열로 변환
      const params = new URLSearchParams({
        sort,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // 카테고리 매핑 적용
      if (category !== 'all') {
        const mappedCategories = CATEGORY_MAPPING[category] || [category];
        params.set('categories', JSON.stringify(mappedCategories));
      } else {
        params.set('categories', JSON.stringify([])); // 전체
      }

      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('게시물을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts when filters change
  useEffect(() => {
    fetchPosts();
  }, [category, sort, pagination.page]);

  // ✅ OPTIMIZED: Memoize callbacks to prevent child re-renders
  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePostClick = useCallback((post: PostDto) => {
    router.push(`/feed/${post.id}`);
  }, [router]);

  const handleLike = useCallback(async (postId: string) => {
    // Phase 9 will implement this
    toast.info('좋아요 기능은 Phase 9에서 구현됩니다.');
  }, []);

  const handleComment = useCallback((postId: string) => {
    router.push(`/feed/${postId}#comments`);
  }, [router]);

  const handleBookmark = useCallback(async (postId: string) => {
    // Phase 9 will implement this
    toast.info('스크랩 기능은 Phase 9에서 구현됩니다.');
  }, []);

  const handlePlay = useCallback(async (post: PostDto) => {
    try {
      const response = await fetch(`/api/posts/${post.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch post detail for playback');
      }

      const data = await response.json();
      const detail: PostDetailDto = data.post;

      if (!detail.playlist || detail.playlist.length === 0) {
        toast.warning('재생할 트랙이 없습니다.');
        return;
      }

      const playlistTracks = detail.playlist.map((track) => ({
        id: track.id,
        version: track.version,
        title: track.title,
        fileUrl: track.fileUrl,
        genre: track.genre || undefined,
        mood: track.mood || undefined,
        // duration이 없거나 0이면 최소 1초로 보정 (auto-advance 안전장치)
        duration: track.duration && track.duration > 0 ? track.duration : 180,
      }));

      await musicPlayer.playPlaylist(playlistTracks, 0);
      setPlayerContext({
        bookTitle: detail.journey.bookTitle,
        bookCoverUrl: detail.journey.bookCoverUrl ?? null,
        playlistLength: playlistTracks.length,
      });

      toast.success('플레이리스트 재생을 시작합니다.');
    } catch (error) {
      console.error('Error starting playback from feed:', error);
      toast.error('음악 재생에 실패했습니다.');
    }
  }, [musicPlayer]);

  const handleClosePlayer = useCallback(() => {
    musicPlayer.clearPlaylist();
    setPlayerContext(null);
  }, [musicPlayer]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 section-spacing" style={{ maxWidth: '1600px' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1 className="text-3xl font-bold mb-2">독서 여정 피드</h1>
          <p className="text-muted-foreground">
            다른 사람들의 독서 여정을 둘러보고 음악을 감상해보세요.
          </p>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <FilterBar
            categories={CATEGORIES}
            selectedCategory={category}
            onCategoryChange={handleCategoryChange}
            sortOptions={SORT_OPTIONS}
            selectedSort={sort}
            onSortChange={handleSortChange}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" text="게시물을 불러오는 중..." />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="게시물이 없습니다"
            description={
              category === 'all'
                ? '아직 공유된 독서 여정이 없습니다.'
                : '이 카테고리에는 게시물이 없습니다.'
            }
          />
        ) : (
          <>
            {/* Posts Grid - Suno 스타일: 반응형 5단계 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={handlePostClick}
                  onPlay={handlePlay}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {musicPlayer.currentTrack && playerContext && (
        <div className="container mx-auto px-4 pb-6">
          <MusicPlayerBar
            trackUrl={musicPlayer.currentTrack.fileUrl}
            trackTitle={`${playerContext.bookTitle} - ${musicPlayer.currentTrack.title}`}
            trackVersion={(musicPlayer.currentTrack.version ?? 1).toString()}
            bookCoverUrl={playerContext.bookCoverUrl ?? undefined}
            genre={musicPlayer.currentTrack.genre ?? undefined}
            mood={musicPlayer.currentTrack.mood ?? undefined}
            onClose={handleClosePlayer}
            playlistMode={musicPlayer.playlistMode}
            currentTrackIndex={musicPlayer.currentTrackIndex}
            totalTracks={playerContext.playlistLength}
            onPrevious={musicPlayer.skipToPrevious}
            onNext={musicPlayer.skipToNext}
            hasNext={musicPlayer.hasNext}
            hasPrevious={musicPlayer.hasPrevious}
            externalIsPlaying={musicPlayer.isPlaying}
            externalCurrentTime={musicPlayer.currentTime}
            externalDuration={musicPlayer.duration}
            onTogglePlayPause={musicPlayer.togglePlayPause}
          />
        </div>
      )}
    </AppLayout>
  );
}

// Post DTO - Unified type for all post-related components

export interface PostDto {
  id: string;
  user: {
    id: string;
    nickname: string;
    email: string;
    avatarUrl?: string;
  };
  journey: {
    id: string;
    bookIsbn?: string | null;
    bookTitle: string;
    // bookAuthor를 항상 문자열로 취급해 타입 충돌을 방지
    bookAuthor: string;
    bookCoverUrl?: string | null;
    bookCategory?: string | null;
    bookDescription?: string | null;
    rating?: number | null;
    oneLiner?: string | null;
    review?: string;
    completedAt?: string;
  };
  albumCoverUrl?: string | null;
  albumCoverThumbnailUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
}

export interface PostDetailDto extends PostDto {
  playlist: MusicTrackDto[];
  comments: CommentDto[];
}

export interface MusicTrackDto {
  id: string;
  version: number;
  logType: string;
  title: string;
  fileUrl: string;
  prompt?: string;
  genre?: string;
  mood?: string;
  tempo?: number;
  duration?: number;
  description?: string;
}

export interface CommentDto {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    nickname: string;
    email: string;
  };
}

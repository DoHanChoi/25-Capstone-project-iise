import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/posts/[id] - Get post detail with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch post with all related data
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        id,
        album_cover_url,
        album_cover_thumbnail_url,
        likes_count,
        comments_count,
        bookmarks_count,
        created_at,
        user_id,
        journey_id,
        users!inner (
          id,
          nickname,
          email
        ),
        reading_journeys!inner (
          id,
          book_title,
          book_author,
          book_cover_url,
          book_category,
          book_isbn,
          book_description,
          rating,
          one_liner,
          review,
          completed_at
        )
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Fetch reading logs first
    const { data: logsData, error: logsError } = await supabase
      .from('reading_logs')
      .select('*')
      .eq('journey_id', post.journey_id)
      .order('version', { ascending: true });

    if (logsError) {
      console.error('Error fetching logs:', logsError);
    }

    // Then fetch music tracks for each log
    let logs: any[] = [];
    if (logsData && logsData.length > 0) {
      const musicTrackIds = logsData.map(log => log.music_track_id).filter((id): id is string => id !== null);

      const { data: musicTracks, error: musicError } = await supabase
        .from('music_tracks')
        .select('*')
        .in('id', musicTrackIds);

      if (musicError) {
        console.error('Error fetching music tracks:', musicError);
      }

      // Combine logs with their music tracks
      logs = logsData.map(log => {
        const track = musicTracks?.find(t => t.id === log.music_track_id);
        return {
          ...log,
          music_tracks: track || null
        };
      });
    }

    // Fetch comments
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        users!inner (
          id,
          nickname,
          email
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: false });

    // Get current user to check if they liked/bookmarked
    const { data: { user } } = await supabase.auth.getUser();

    let isLiked = false;
    let isBookmarked = false;

    if (user) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      isLiked = !!like;

      const { data: bookmark } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      isBookmarked = !!bookmark;
    }

    // Transform music tracks
    const playlist = (logs || [])
      .filter((log: any) => log.music_tracks && log.music_tracks.file_url)
      .map((log: any) => ({
        id: log.music_tracks.id,
        version: log.version,
        logType: log.log_type,
        title: log.log_type === 'start' ? 'v0 - 여정의 시작' : 
               log.log_type === 'complete' ? 'vFinal - 여정의 완성' :
               `v${log.version} - 독서 중`,
        fileUrl: log.music_tracks.file_url,
        prompt: log.music_tracks.prompt,
        genre: log.music_tracks.genre,
        mood: log.music_tracks.mood,
        tempo: log.music_tracks.tempo,
        duration: log.music_tracks.duration,
        description: log.music_tracks.description,
      }));

    // Transform comments
    const transformedComments = (comments || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      user: {
        id: comment.users.id,
        nickname: comment.users.nickname,
        email: comment.users.email,
      },
    }));

    // Transform post data
    const transformedPost = {
      id: post.id,
      user: {
        id: post.users.id,
        nickname: post.users.nickname,
        email: post.users.email,
      },
      journey: {
        id: post.reading_journeys.id,
        bookTitle: post.reading_journeys.book_title,
        bookAuthor: post.reading_journeys.book_author || 'Unknown',
        bookCoverUrl: post.reading_journeys.book_cover_url,
        bookCategory: post.reading_journeys.book_category,
        bookIsbn: post.reading_journeys.book_isbn,
        bookDescription: post.reading_journeys.book_description,
        rating: post.reading_journeys.rating,
        oneLiner: post.reading_journeys.one_liner,
        review: post.reading_journeys.review,
        completedAt: post.reading_journeys.completed_at,
      },
      albumCoverUrl: post.album_cover_url,
      likesCount: post.likes_count || 0,
      commentsCount: post.comments_count || 0,
      bookmarksCount: post.bookmarks_count || 0,
      isLiked,
      isBookmarked,
      createdAt: post.created_at,
      playlist,
      comments: transformedComments,
    };

    return NextResponse.json({ post: transformedPost });
  } catch (error) {
    console.error('Error in GET /api/posts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id] - Delete a post (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the post exists and belongs to the user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/posts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

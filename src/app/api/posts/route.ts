import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/posts - Create a new post from completed journey
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { journeyId, albumCoverUrl } = body;

    if (!journeyId) {
      return NextResponse.json(
        { error: 'journeyId is required' },
        { status: 400 }
      );
    }

    // Verify the journey exists, is completed, and belongs to the user
    const { data: journey, error: journeyError } = await supabase
      .from('reading_journeys')
      .select('id, status, user_id')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    if (journey.status !== 'completed') {
      return NextResponse.json(
        { error: 'Journey must be completed before posting' },
        { status: 400 }
      );
    }

    // Check if a post already exists for this journey
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('journey_id', journeyId)
      .single();

    if (existingPost) {
      return NextResponse.json(
        { error: 'Post already exists for this journey' },
        { status: 409 }
      );
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        journey_id: journeyId,
        user_id: user.id,
        album_cover_url: albumCoverUrl || null,
        is_published: true,
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/posts - List posts with filtering and sorting
// ✅ UPDATED: Authentication is now OPTIONAL for reading posts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories');
    const categories: string[] = categoriesParam ? JSON.parse(categoriesParam) : [];
    const sort = searchParams.get('sort') || 'latest'; // latest | popular
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
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
          rating,
          one_liner,
          review
        )
      `)
      .eq('is_published', true);

    // Filter by categories
    // ✅ UPDATED: Support multiple categories via IN query + null handling for '기타'
    if (categories.length > 0) {
      // '기타' 카테고리는 'General'과 null 모두 포함
      if (categories.includes('General')) {
        // Build OR condition for General category and null
        query = query.or(`book_category.in.(${categories.join(',')}),book_category.is.null`, { foreignTable: 'reading_journeys' });
      } else {
        // Use IN query for filtering multiple Google Books API categories
        query = query.in('reading_journeys.book_category', categories);
      }
    }

    // Sort
    if (sort === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error, count } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Get current user to check if they liked/bookmarked posts
    // ✅ UPDATED: User may be null for unauthenticated requests
    const { data: { user } } = await supabase.auth.getUser();

    // ✅ OPTIMIZED: Batch query for likes/bookmarks to eliminate N+1 problem
    // Transform data to match PostCard interface
    let likedPostIds = new Set<string>();
    let bookmarkedPostIds = new Set<string>();

    if (user && posts && posts.length > 0) {
      // Batch query for all likes and bookmarks in parallel
      // Uses idx_likes_post_user and idx_bookmarks_post_user indexes
      const postIds = posts.map(p => p.id);

      const [likesData, bookmarksData] = await Promise.all([
        supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', user.id),
        supabase
          .from('bookmarks')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', user.id)
      ]);

      // Create Sets for O(1) lookup
      likedPostIds = new Set(likesData.data?.map(l => l.post_id) || []);
      bookmarkedPostIds = new Set(bookmarksData.data?.map(b => b.post_id) || []);
    }

    // Transform posts with pre-fetched like/bookmark data
    const transformedPosts = (posts || []).map((post: any) => ({
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
        rating: post.reading_journeys.rating,
        oneLiner: post.reading_journeys.one_liner,
        review: post.reading_journeys.review,
      },
      albumCoverUrl: post.album_cover_url,
      likesCount: post.likes_count || 0,
      commentsCount: post.comments_count || 0,
      bookmarksCount: post.bookmarks_count || 0,
      isLiked: likedPostIds.has(post.id),
      isBookmarked: bookmarkedPostIds.has(post.id),
      createdAt: post.created_at,
    }));

    // Get total count for pagination with same filters
    let countQuery = supabase
      .from('posts')
      .select('*, reading_journeys!inner(*)', { count: 'exact', head: true })
      .eq('is_published', true);

    // Apply same category filter (including null for '기타')
    if (categories.length > 0) {
      if (categories.includes('General')) {
        // Build OR condition for General category and null
        countQuery = countQuery.or(`book_category.in.(${categories.join(',')}),book_category.is.null`, { foreignTable: 'reading_journeys' });
      } else {
        countQuery = countQuery.in('reading_journeys.book_category', categories);
      }
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

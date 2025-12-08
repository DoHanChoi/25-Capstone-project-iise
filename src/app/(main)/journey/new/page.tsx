'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookSearchDialog } from '@/components/book/BookSearchDialog';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, BookOpen, Music2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';

export default function NewJourneyPage() {
  const router = useRouter();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { triggerGeneration } = useMusicGeneration();

  const handleBookSelect = async (book: any) => {
    setIsCreating(true);

    const loadingToast = toast.loading('독서 여정을 생성하고 있습니다...');

    try {
      const authorString = Array.isArray(book.author)
        ? book.author.join(', ')
        : book.author || '';

      const response = await fetch('/api/journeys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_title: book.title,
          book_author: authorString,
          book_isbn: book.isbn,
          book_description: book.description,
          book_category: book.category,
          book_cover_url: book.coverUrl,
          book_publisher: book.publisher,
          book_published_date: book.publishedDate,
        }),
      });

      if (response.status === 401) {
        toast.dismiss(loadingToast);
        toast.error('로그인이 필요합니다. 먼저 로그인해 주세요.');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.journey) {
        toast.dismiss(loadingToast);
        toast.success('독서 여정이 시작되었습니다! v0 음악을 생성하고 있습니다.');

        if (data.musicTrack?.id) {
          triggerGeneration(data.musicTrack.id);
        }

        router.push(`/journey/${data.journey.id}`);
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.error || '독서 여정 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Journey creation error:', error);
      toast.dismiss(loadingToast);
      toast.error('독서 여정 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
      setSearchDialogOpen(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)]">
        {/* Hero Section - Stripe Style */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 grid-pattern opacity-40" />
          
          <div className="relative container mx-auto px-6 py-24 md:py-32 lg:py-40">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-indigo-50 rounded-full border border-indigo-100">
                <Sparkles className="size-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">
                  AI로 만드는 독서 플레이리스트
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6">
                독서를 음악으로
                <br />
                <span className="text-indigo-600">기록하세요</span>
              </h1>

              {/* Description */}
              <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
                책을 읽으며 남긴 감정이 AI 음악으로 변환됩니다.
                <br />
                완독하면 나만의 독서 플레이리스트가 완성됩니다.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => setSearchDialogOpen(true)}
                  disabled={isCreating}
                  className="group h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  <Search className="mr-2 size-5" />
                  {isCreating ? '여정 생성 중...' : '도서 검색하기'}
                  <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              {/* Trust indicator */}
              <p className="mt-8 text-sm text-slate-500">
                무료로 시작하기 • 회원가입만으로 이용 가능
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 md:py-32 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-20">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  간단한 3단계로 시작하세요
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  복잡한 설정 없이 바로 독서 여정을 기록할 수 있습니다
                </p>
              </div>

              {/* Steps */}
              <div className="grid md:grid-cols-3 gap-12 md:gap-8">
                {/* Step 1 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 mb-6 bg-indigo-100 rounded-2xl flex items-center justify-center">
                      <Search className="size-8 text-indigo-600" />
                    </div>
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      책 선택
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      읽고 싶은 책을 검색하고 선택합니다
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 mb-6 bg-violet-100 rounded-2xl flex items-center justify-center">
                      <BookOpen className="size-8 text-violet-600" />
                    </div>
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      독서 & 기록
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      책을 읽으며 감정과 구절을 기록합니다
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 mb-6 bg-pink-100 rounded-2xl flex items-center justify-center">
                      <Music2 className="size-8 text-pink-600" />
                    </div>
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      음악 생성
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      AI가 당신의 감정을 음악으로 표현합니다
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 md:py-32 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Left - Visual */}
                <div className="relative">
                  <div className="aspect-square rounded-3xl bg-gradient-to-br from-indigo-100 via-violet-100 to-pink-100 p-12 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl blur-3xl opacity-20" />
                      <div className="relative bg-white rounded-2xl p-8 shadow-2xl">
                        <Music2 className="size-24 text-indigo-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right - Content */}
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                    독서가 음악이 되는 순간
                  </h2>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-indigo-600 rounded-full" />
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          AI 음악 생성
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          당신의 감정과 기록을 바탕으로 AI가 독서 여정을 음악으로 표현합니다
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-violet-600 rounded-full" />
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          진화하는 플레이리스트
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          책을 읽을수록 음악이 추가되어 나만의 플레이리스트가 완성됩니다
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-pink-600 rounded-full" />
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">
                          커뮤니티 공유
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          완성된 독서 플레이리스트를 공유하고 다른 독자들과 소통하세요
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 md:py-32 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                지금 바로 시작하세요
              </h2>
              <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                첫 번째 책을 선택하고 AI가 만드는 나만의 독서 플레이리스트를 경험해보세요
              </p>
              <Button
                size="lg"
                onClick={() => setSearchDialogOpen(true)}
                disabled={isCreating}
                className="group h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                <Search className="mr-2 size-5" />
                {isCreating ? '여정 생성 중...' : '도서 검색하기'}
                <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>

        {/* Book Search Dialog */}
        <BookSearchDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
          onSelectBook={handleBookSelect}
        />
      </div>
    </AppLayout>
  );
}

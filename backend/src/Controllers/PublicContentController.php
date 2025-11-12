<?php
namespace App\Controllers;

use App\Models\PublicPage;
use App\Models\PublicNewsArticle;
use App\Support\ResponseHelper;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class PublicContentController
{
    public function landing(Request $request, Response $response): Response
    {
        $locale = $this->normaliseLocale($request->getQueryParams()['locale'] ?? 'ru');
        $page = $this->resolvePage('landing', $locale);

        if ($page === null) {
            return ResponseHelper::json($response, ['error' => 'Контент не найден'], 404);
        }

        $payload = $this->decodeJson($page->payload);
        $articles = $this->mapArticleSummaries($this->resolveArticles($page->locale));

        return ResponseHelper::json($response, [
            'locale' => $page->locale,
            'content' => $payload,
            'news' => [
                'articles' => $articles,
            ],
        ]);
    }

    public function article(Request $request, Response $response, array $args): Response
    {
        $slug = (string) ($args['slug'] ?? '');
        $locale = $this->normaliseLocale($request->getQueryParams()['locale'] ?? 'ru');

        $article = $this->resolveArticle($slug, $locale);
        if ($article === null) {
            return ResponseHelper::json($response, ['error' => 'Новость не найдена'], 404);
        }

        $content = $this->decodeJson($article->content);
        $page = $this->resolvePage('landing', $locale) ?? $this->resolvePage('landing', $article->locale);
        $labels = [
            'backLabel' => '← Back',
            'publishedLabel' => 'Published',
            'dateLabel' => 'Date',
            'loginLabel' => 'Sign in',
        ];

        if ($page !== null) {
            $payload = $this->decodeJson($page->payload);
            $newsSection = is_array($payload) ? ($payload['newsSection'] ?? []) : [];
            $hero = is_array($payload) ? ($payload['hero'] ?? []) : [];
            $labels = [
                'backLabel' => $newsSection['backLabel'] ?? $labels['backLabel'],
                'publishedLabel' => $newsSection['publishedLabel'] ?? $labels['publishedLabel'],
                'dateLabel' => $newsSection['dateLabel'] ?? $labels['dateLabel'],
                'loginLabel' => $hero['loginLabel'] ?? $labels['loginLabel'],
            ];
        }

        return ResponseHelper::json($response, [
            'locale' => $article->locale,
            'article' => [
                'slug' => $article->slug,
                'title' => $article->title,
                'summary' => $article->summary,
                'imageKey' => $article->image_key,
                'imageAlt' => $article->image_alt,
                'publishedAt' => $this->formatDate($article->published_at),
                'content' => $content,
            ],
            'labels' => $labels,
        ]);
    }

    private function normaliseLocale(string $locale): string
    {
        $normalized = strtolower(substr($locale, 0, 2));
        return $normalized !== '' ? $normalized : 'ru';
    }

    private function decodeJson(string $json): array
    {
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function resolvePage(string $slug, string $locale): ?PublicPage
    {
        $page = PublicPage::where('slug', $slug)
            ->where('locale', $locale)
            ->first();

        if ($page === null && $locale !== 'en') {
            $page = PublicPage::where('slug', $slug)
                ->where('locale', 'en')
                ->first();
        }

        return $page;
    }

    private function resolveArticles(string $locale): Collection
    {
        $articles = PublicNewsArticle::where('locale', $locale)
            ->orderBy('published_at', 'desc')
            ->get();

        if ($articles->isEmpty() && $locale !== 'en') {
            $articles = PublicNewsArticle::where('locale', 'en')
                ->orderBy('published_at', 'desc')
                ->get();
        }

        return $articles;
    }

    private function resolveArticle(string $slug, string $locale): ?PublicNewsArticle
    {
        $article = PublicNewsArticle::where('slug', $slug)
            ->where('locale', $locale)
            ->first();

        if ($article === null && $locale !== 'en') {
            $article = PublicNewsArticle::where('slug', $slug)
                ->where('locale', 'en')
                ->first();
        }

        return $article;
    }

    /**
     * @param Collection<int, PublicNewsArticle> $articles
     * @return array<int, array<string, mixed>>
     */
    private function mapArticleSummaries(Collection $articles): array
    {
        return $articles->map(function (PublicNewsArticle $article): array {
            return [
                'slug' => $article->slug,
                'title' => $article->title,
                'summary' => $article->summary,
                'imageKey' => $article->image_key,
                'imageAlt' => $article->image_alt,
                'publishedAt' => $this->formatDate($article->published_at),
            ];
        })->all();
    }

    private function formatDate($value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        return (string) $value;
    }
}

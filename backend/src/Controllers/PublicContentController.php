<?php
namespace App\Controllers;

use App\Models\PublicNewsArticle;
use App\Models\PublicPage;
use App\Support\ResponseHelper;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

class PublicContentController
{
    public function landing(Request $request, Response $response): Response
    {
        $locale = $this->normaliseLocale($request->getQueryParams()['locale'] ?? 'ru');

        $landing = $this->fetchLandingPayload($locale);
        if ($landing === null) {
            return ResponseHelper::json($response, ['error' => 'Контент не найден'], 404);
        }

        $articles = $this->fetchNewsSummaries($landing['locale']);

        return ResponseHelper::json($response, [
            'locale' => $landing['locale'],
            'content' => $landing['payload'],
            'news' => [
                'articles' => $articles,
            ],
        ]);
    }

    public function article(Request $request, Response $response, array $args): Response
    {
        $slug = (string) ($args['slug'] ?? '');
        $locale = $this->normaliseLocale($request->getQueryParams()['locale'] ?? 'ru');

        $article = $this->fetchArticleData($slug, $locale);
        if ($article === null) {
            return ResponseHelper::json($response, ['error' => 'Новость не найдена'], 404);
        }

        $landing = $this->fetchLandingPayload($locale) ?? $this->fetchLandingPayload($article['locale']);
        $labelsPayload = is_array($landing) ? ($landing['payload'] ?? []) : [];
        $labels = $this->buildArticleLabels(is_array($labelsPayload) ? $labelsPayload : []);

        return ResponseHelper::json($response, [
            'locale' => $article['locale'],
            'article' => $article['article'],
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
        foreach ($this->candidateJsonStrings($json) as $candidate) {
            $decoded = json_decode($candidate, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    /**
     * @return list<string>
     */
    private function candidateJsonStrings(string $json): array
    {
        $variants = [$json];

        $stripped = stripslashes($json);
        if ($stripped !== $json) {
            $variants[] = $stripped;
        }

        $normalised = $this->normaliseJsonWhitespace($json);
        if ($normalised !== $json) {
            $variants[] = $normalised;
        }

        $strippedNormalised = $this->normaliseJsonWhitespace($stripped);
        if ($strippedNormalised !== $stripped) {
            $variants[] = $strippedNormalised;
        }

        return array_values(array_unique($variants));
    }

    private function normaliseJsonWhitespace(string $json): string
    {
        $normalised = preg_replace("/\r\n|\r|\n/", "\\n", $json);
        return $normalised ?? $json;
    }

    /**
     * @return array{locale: string, payload: array}|null
     */
    private function fetchLandingPayload(string $locale): ?array
    {
        try {
            $page = $this->resolvePage('landing', $locale);
        } catch (Throwable $e) {
            $page = null;
        }

        if ($page !== null) {
            $payload = $this->decodeJson($page->payload);

            if ($this->isValidLandingPayload($payload)) {
                return [
                    'locale' => $page->locale,
                    'payload' => $payload,
                ];
            }
        }

        $payload = $this->loadFallbackJson("landing.{$locale}.json");
        $resolvedLocale = $locale;

        if ((!is_array($payload) || !$this->isValidLandingPayload($payload)) && $locale !== 'en') {
            $payload = $this->loadFallbackJson('landing.en.json');
            $resolvedLocale = 'en';
        }

        if (!is_array($payload) || !$this->isValidLandingPayload($payload)) {
            return null;
        }

        return [
            'locale' => $resolvedLocale,
            'payload' => $payload,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchNewsSummaries(string $locale): array
    {
        try {
            $articles = $this->resolveArticles($locale);
            if ($articles->isNotEmpty()) {
                return $this->mapArticleSummaries($articles);
            }
        } catch (Throwable $e) {
            // fall through to fallback content
        }

        $fallback = $this->loadFallbackJson("news.{$locale}.json");

        if (!is_array($fallback) && $locale !== 'en') {
            $fallback = $this->loadFallbackJson('news.en.json');
        }

        if (!is_array($fallback)) {
            return [];
        }

        usort($fallback, function ($left, $right): int {
            $leftDate = (string) ($left['publishedAt'] ?? '');
            $rightDate = (string) ($right['publishedAt'] ?? '');

            return strcmp($rightDate, $leftDate);
        });

        return array_map(function (array $article): array {
            return [
                'slug' => (string) ($article['slug'] ?? ''),
                'title' => (string) ($article['title'] ?? ''),
                'summary' => (string) ($article['summary'] ?? ''),
                'imageKey' => (string) ($article['imageKey'] ?? ''),
                'imageAlt' => (string) ($article['imageAlt'] ?? ''),
                'publishedAt' => isset($article['publishedAt']) ? (string) $article['publishedAt'] : '',
            ];
        }, $fallback);
    }

    /**
     * @return array{locale: string, article: array<string, mixed>}|null
     */
    private function fetchArticleData(string $slug, string $locale): ?array
    {
        try {
            $article = $this->resolveArticle($slug, $locale);
        } catch (Throwable $e) {
            $article = null;
        }

        if ($article !== null) {
            return [
                'locale' => $article->locale,
                'article' => [
                    'slug' => $article->slug,
                    'title' => $article->title,
                    'summary' => $article->summary,
                    'imageKey' => $article->image_key,
                    'imageAlt' => $article->image_alt,
                    'publishedAt' => $this->formatDate($article->published_at),
                    'content' => $this->decodeJson($article->content),
                ],
            ];
        }

        $articles = $this->loadFallbackJson("news.{$locale}.json");
        $resolvedLocale = $locale;

        if (!is_array($articles) && $locale !== 'en') {
            $articles = $this->loadFallbackJson('news.en.json');
            $resolvedLocale = 'en';
        }

        if (!is_array($articles)) {
            return null;
        }

        foreach ($articles as $item) {
            if (!is_array($item) || ($item['slug'] ?? null) !== $slug) {
                continue;
            }

            return [
                'locale' => $resolvedLocale,
                'article' => [
                    'slug' => (string) $item['slug'],
                    'title' => (string) ($item['title'] ?? ''),
                    'summary' => (string) ($item['summary'] ?? ''),
                    'imageKey' => (string) ($item['imageKey'] ?? ''),
                    'imageAlt' => (string) ($item['imageAlt'] ?? ''),
                    'publishedAt' => isset($item['publishedAt']) ? (string) $item['publishedAt'] : '',
                    'content' => is_array($item['content'] ?? null) ? $item['content'] : [],
                ],
            ];
        }

        return null;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{backLabel: string, publishedLabel: string, dateLabel: string, loginLabel: string}
     */
    private function buildArticleLabels(array $payload): array
    {
        $defaults = [
            'backLabel' => '← Back',
            'publishedLabel' => 'Published',
            'dateLabel' => 'Date',
            'loginLabel' => 'Sign in',
        ];

        $newsSection = is_array($payload['newsSection'] ?? null) ? $payload['newsSection'] : [];
        $hero = is_array($payload['hero'] ?? null) ? $payload['hero'] : [];

        return [
            'backLabel' => (string) ($newsSection['backLabel'] ?? $defaults['backLabel']),
            'publishedLabel' => (string) ($newsSection['publishedLabel'] ?? $defaults['publishedLabel']),
            'dateLabel' => (string) ($newsSection['dateLabel'] ?? $defaults['dateLabel']),
            'loginLabel' => (string) ($hero['loginLabel'] ?? $defaults['loginLabel']),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function isValidLandingPayload(array $payload): bool
    {
        if ($payload === []) {
            return false;
        }

        $requiredSections = [
            'hero',
            'introduction',
            'pillars',
            'journey',
            'stories',
            'metrics',
            'support',
            'closing',
        ];

        foreach ($requiredSections as $section) {
            if (!isset($payload[$section]) || !is_array($payload[$section])) {
                return false;
            }
        }

        if (isset($payload['newsSection']) && !is_array($payload['newsSection'])) {
            return false;
        }

        return true;
    }

    private function loadFallbackJson(string $fileName): ?array
    {
        $path = $this->fallbackPath($fileName);
        if (!is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);
        if ($contents === false || $contents === '') {
            return null;
        }

        $decoded = json_decode($contents, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function fallbackPath(string $fileName): string
    {
        return dirname(__DIR__, 1) . '/../resources/public-content/' . $fileName;
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

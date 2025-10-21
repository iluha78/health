<?php
namespace App\Services;

use App\Support\Env;

class OpenAiService
{
    private ?string $apiKey;
    private string $baseUrl;
    private string $model;

    public function __construct(?string $apiKey = null, ?string $baseUrl = null, ?string $model = null)
    {
        Env::bootstrap();

        $key = $apiKey ?? Env::string('OPENAI_API_KEY');
        $key = $key !== null ? trim($key) : null;
        $this->apiKey = $key === '' ? null : $key;

        $resolvedBase = $baseUrl ?? Env::string('OPENAI_BASE_URL');
        if ($resolvedBase === null || $resolvedBase === '') {
            $resolvedBase = 'https://api.openai.com';
        }
        $this->baseUrl = rtrim($resolvedBase, '/');

        $resolvedModel = $model ?? Env::string('OPENAI_MODEL');
        if ($resolvedModel === null || $resolvedModel === '') {
            $resolvedModel = 'gpt-4o-mini';
        }
        $this->model = $resolvedModel;
    }

    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }

    /**
     * @param array<int, array<string, mixed>> $messages
     */
    public function chat(array $messages, array $options = []): string
    {
        $payload = array_merge([
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => 0.4,
        ], $options);

        $data = $this->post('/v1/chat/completions', $payload);

        if (isset($data['choices'][0]['message']['content'])) {
            return trim((string) $data['choices'][0]['message']['content']);
        }

        throw new \RuntimeException('Пустой ответ от модели OpenAI');
    }

    /**
     * @param array<int, mixed> $input
     */
    public function respond(array $input, array $options = []): string
    {

        $options = $this->normalizeResponseOptions($options);
        $payload = array_merge([
            'model' => $this->model,
            'input' => $input,
            'max_output_tokens' => 800,
        ], $options);

        unset($payload['response_format']);

        $data = $this->post('/v1/responses', $payload);

        if (isset($data['output']) && is_array($data['output'])) {
            $chunks = [];
            foreach ($data['output'] as $item) {
                if (($item['type'] ?? null) !== 'message' || !is_array($item['content'] ?? null)) {
                    continue;
                }
                foreach ($item['content'] as $content) {
                    $type = $content['type'] ?? null;
                    if ($type === 'output_text' && isset($content['text'])) {
                        $chunks[] = (string) $content['text'];
                    } elseif ($type === 'output_json' && isset($content['json'])) {
                        $chunks[] = is_string($content['json'])
                            ? $content['json']
                            : json_encode($content['json'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    }
                }
            }
            if ($chunks) {
                return trim(implode("\n", $chunks));
            }
        }

        if (isset($data['choices'][0]['message']['content'])) {
            return trim((string) $data['choices'][0]['message']['content']);
        }

        throw new \RuntimeException('Пустой ответ от модели OpenAI');
    }

    /**
     * @param mixed $responseFormat
     * @return array<string, mixed>|null
     */
    private function convertResponseFormatToText($responseFormat): ?array
    {
        if (is_string($responseFormat)) {
            return ['format' => $responseFormat];
        }

        if (!is_array($responseFormat)) {
            return null;
        }

        $format = $responseFormat['type'] ?? $responseFormat['format'] ?? null;
        if (!is_string($format) || $format === '') {
            return null;
        }

        $textOptions = ['format' => $format];

        if (isset($responseFormat['json_schema'])) {
            $textOptions['json_schema'] = $responseFormat['json_schema'];
        }

        if (isset($responseFormat['schema']) && !isset($textOptions['json_schema'])) {
            $textOptions['json_schema'] = $responseFormat['schema'];
        }

        return $this->normalizeTextOptions($textOptions);
    }

    /**
     * @param array<string, mixed>|string|null $text
     * @return array<string, mixed>|null
     */
    private function normalizeTextOptions($text): ?array
    {
        if ($text === null) {
            return null;
        }

        if (is_string($text)) {
            $text = trim($text);
            if ($text === '') {
                return null;
            }

            return ['format' => $text];
        }

        if (!is_array($text)) {
            return null;
        }

        $normalized = $text;

        if (isset($normalized['response_format']) && !isset($normalized['format'])) {
            $normalized['format'] = $normalized['response_format'];
        }

        if (isset($normalized['type']) && !isset($normalized['format'])) {
            $normalized['format'] = $normalized['type'];
        }

        if (isset($normalized['schema']) && !isset($normalized['json_schema'])) {
            $normalized['json_schema'] = $normalized['schema'];
        }

        if (isset($normalized['json_schema']) && $normalized['json_schema'] === null) {
            unset($normalized['json_schema']);
        }

        if (isset($normalized['format'])) {
            $normalized['format'] = trim((string) $normalized['format']);
            if ($normalized['format'] === '') {
                unset($normalized['format']);
            }
        }

        unset($normalized['schema'], $normalized['response_format'], $normalized['type']);

        return $normalized ?: null;
    }

    /**
     * @param array<string, mixed>|null $base
     * @param array<string, mixed>|null $override
     * @return array<string, mixed>|null
     */
    private function mergeTextOptions(?array $base, ?array $override): ?array
    {
        if (empty($override)) {
            return $base ?: null;
        }

        if (empty($base)) {
            return $override;
        }

        return array_merge($base, $override);
    }

    /**
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    private function normalizeResponseOptions(array $options): array
    {
        $responseBlock = [];
        if (isset($options['response']) && is_array($options['response'])) {
            $responseBlock = $options['response'];
            unset($options['response']);
        }

        $textOptions = null;

        if (array_key_exists('response_format', $options)) {
            $converted = $this->convertResponseFormatToText($options['response_format']);
            unset($options['response_format']);
            $textOptions = $this->mergeTextOptions($textOptions, $converted);
        }

        if (array_key_exists('text', $options)) {
            $textOptions = $this->mergeTextOptions($textOptions, $this->normalizeTextOptions($options['text']));
            unset($options['text']);
        }

        if (isset($responseBlock['response_format'])) {
            $textOptions = $this->mergeTextOptions(
                $this->convertResponseFormatToText($responseBlock['response_format']),
                $textOptions
            );
            unset($responseBlock['response_format']);
        }

        if (isset($responseBlock['text'])) {
            $textOptions = $this->mergeTextOptions($this->normalizeTextOptions($responseBlock['text']), $textOptions);
        }

        if (isset($responseBlock['format']) && !isset($responseBlock['text'])) {
            $candidate = $this->normalizeTextOptions([
                'format' => $responseBlock['format'],
                'json_schema' => $responseBlock['json_schema'] ?? ($responseBlock['schema'] ?? null),
            ]);

            $textOptions = $this->mergeTextOptions($candidate, $textOptions);
        }

        unset($responseBlock['format'], $responseBlock['json_schema'], $responseBlock['schema'], $responseBlock['text']);

        if (!empty($textOptions)) {
            $responseBlock['text'] = $textOptions;

            $modalities = $responseBlock['modalities'] ?? null;
            if (is_string($modalities)) {
                $modalities = [$modalities];
            } elseif (!is_array($modalities) || !$modalities) {
                $modalities = [];
            }

            if (!in_array('text', $modalities, true)) {
                $modalities[] = 'text';
            }

            $responseBlock['modalities'] = array_values(array_unique($modalities));
        }

        if (!empty($responseBlock)) {
            $options['response'] = $responseBlock;
        }

        return $options;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function post(string $path, array $payload): array
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('OpenAI API-ключ не настроен');
        }

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            throw new \RuntimeException('Не удалось подготовить запрос к OpenAI');
        }

        $url = $this->baseUrl . $path;

        if (function_exists('curl_init')) {
            return $this->postWithCurl($url, $payloadJson);
        }

        return $this->postWithStream($url, $payloadJson);
    }

    /**
     * @return array<string, mixed>
     */
    private function postWithCurl(string $url, string $payloadJson): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Не удалось инициализировать HTTP-запрос к OpenAI');
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
                'OpenAI-Beta: responses=v1',
            ],
            CURLOPT_POSTFIELDS => $payloadJson,
            CURLOPT_TIMEOUT => 30,
        ]);

        $raw = curl_exec($ch);
        $error = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 0;
        curl_close($ch);

        if ($raw === false) {
            throw new \RuntimeException('Ошибка запроса к OpenAI: ' . $error);
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Не удалось декодировать ответ OpenAI');
        }

        if ($status >= 400) {
            $message = $decoded['error']['message'] ?? ('HTTP ' . $status);
            throw new \RuntimeException('OpenAI вернул ошибку: ' . $message);
        }

        return $decoded;
    }

    /**
     * @return array<string, mixed>
     */
    private function postWithStream(string $url, string $payloadJson): array
    {
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
            'OpenAI-Beta: responses=v1',
        ];

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $payloadJson,
                'timeout' => 30,
                'ignore_errors' => true,
            ],
        ]);

        $stream = @fopen($url, 'r', false, $context);
        if ($stream === false) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Не удалось открыть поток HTTP';
            throw new \RuntimeException('Ошибка запроса к OpenAI: ' . $message);
        }

        $raw = stream_get_contents($stream);
        $meta = stream_get_meta_data($stream);
        fclose($stream);

        if ($raw === false) {
            throw new \RuntimeException('Не удалось прочитать ответ OpenAI');
        }

        $status = 0;
        if (isset($meta['wrapper_data']) && is_array($meta['wrapper_data'])) {
            foreach ($meta['wrapper_data'] as $line) {
                if (is_string($line) && preg_match('/^HTTP\/\S+\s+(\d{3})/', $line, $matches)) {
                    $status = (int) $matches[1];
                }
            }
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Не удалось декодировать ответ OpenAI');
        }

        if ($status >= 400) {
            $message = $decoded['error']['message'] ?? ('HTTP ' . $status);
            throw new \RuntimeException('OpenAI вернул ошибку: ' . $message);
        }

        return $decoded;
    }
}

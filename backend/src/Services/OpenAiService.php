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
        $payload = array_merge([
            'model' => $this->model,
            'input' => $input,
            'max_output_tokens' => 800,
        ], $options);

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
                'OpenAI-Beta: assistants=v2',
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
            'OpenAI-Beta: assistants=v2',
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

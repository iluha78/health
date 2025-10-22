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
        $originalOptions = $options;

        $options = $this->normalizeResponseOptions($options);
        $this->log('debug', 'Normalized options for Responses API call', [
            'original_keys' => array_keys($originalOptions),
            'normalized_keys' => array_keys($options),
            'has_text_block' => array_key_exists('text', $options),
            'has_response_block' => array_key_exists('response', $options),
        ]);
        $payload = array_merge([
            'model' => $this->model,
            'input' => $input,
            'max_output_tokens' => 800,
        ], $options);

        $hadResponseFormat = array_key_exists('response_format', $payload);
        if ($hadResponseFormat) {
            $this->log('warning', 'Legacy response_format detected in payload, removing before request', [
                'response_format' => $payload['response_format'],
            ]);
            unset($payload['response_format']);
        }

        $this->log('info', 'Dispatching Responses API request', [
            'payload' => $this->sanitizePayloadForLogging($payload),
            'had_response_format' => $hadResponseFormat,
        ]);

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
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    private function normalizeResponseOptions(array $options): array
    {
        $responseBlock = null;

        if (isset($options['response']) && is_array($options['response'])) {
            $responseBlock = $options['response'];
            unset($options['response']);
        }

        $textOptions = null;

        if ($responseBlock !== null) {
            if (array_key_exists('response_format', $responseBlock)) {
                $textOptions = $this->mergeTextBlocks($textOptions, $this->normalizeTextBlock($responseBlock['response_format']));
                unset($responseBlock['response_format']);
            }

            if (array_key_exists('text', $responseBlock)) {
                $textOptions = $this->mergeTextBlocks($textOptions, $this->normalizeTextBlock($responseBlock['text']));
                unset($responseBlock['text']);
            }

            if ($textOptions === null) {
                $candidate = $this->normalizeTextBlock($responseBlock);
                if ($candidate !== null) {
                    $textOptions = $this->mergeTextBlocks($textOptions, $candidate);
                    unset(
                        $responseBlock['format'],
                        $responseBlock['json_schema'],
                        $responseBlock['schema'],
                        $responseBlock['type']
                    );
                }
            }
        }

        if (array_key_exists('response_format', $options)) {
            $textOptions = $this->mergeTextBlocks($textOptions, $this->normalizeTextBlock($options['response_format']));
            unset($options['response_format']);
        }

        if (array_key_exists('text', $options)) {
            $textOptions = $this->mergeTextBlocks($textOptions, $this->normalizeTextBlock($options['text']));
            unset($options['text']);
        }

        if ($textOptions !== null) {
            $options['text'] = $textOptions;
        }

        if ($responseBlock !== null && !empty($responseBlock)) {
            $options['response'] = $responseBlock;
        }

        return $options;
    }

    /**
     * @param array<string, mixed>|null $base
     * @param array<string, mixed>|null $override
     * @return array<string, mixed>|null
     */
    private function mergeTextBlocks(?array $base, ?array $override): ?array
    {
        if ($override === null) {
            return $base;
        }

        if ($base === null) {
            return $override;
        }

        return array_merge($base, $override);
    }

    /**
     * @param array<string, mixed>|string|null $value
     * @return array<string, mixed>|null
     */
    private function normalizeTextBlock($value): ?array
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $value = ['format' => $value];
        } elseif (!is_array($value)) {
            return null;
        }

        if (isset($value['response_format']) && !isset($value['format'])) {
            $value['format'] = $value['response_format'];
        }

        if (isset($value['type']) && !isset($value['format'])) {
            $value['format'] = $value['type'];
        }

        if (isset($value['schema']) && !isset($value['json_schema'])) {
            $value['json_schema'] = $value['schema'];
        }

        $format = isset($value['format']) ? trim((string) $value['format']) : '';

        $normalized = [];

        if ($format !== '') {
            $normalized['format'] = $format;
        }

        if (array_key_exists('json_schema', $value) && $value['json_schema'] !== null) {
            $normalized['json_schema'] = $value['json_schema'];
        }

        return $normalized ?: null;
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

        $this->log('debug', 'Preparing POST request to OpenAI', [
            'url' => $this->baseUrl . $path,
            'payload' => $this->sanitizePayloadForLogging($payload),
        ]);

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            $this->log('error', 'Failed to encode payload for OpenAI request');
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
            $this->log('error', 'cURL request to OpenAI failed', [
                'error' => $error,
            ]);
            throw new \RuntimeException('Ошибка запроса к OpenAI: ' . $error);
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $this->log('error', 'Unable to decode OpenAI response via cURL', [
                'raw' => $raw,
            ]);
            throw new \RuntimeException('Не удалось декодировать ответ OpenAI');
        }

        if ($status >= 400) {
            $message = $decoded['error']['message'] ?? ('HTTP ' . $status);
            $this->log('error', 'OpenAI returned error status via cURL', [
                'status' => $status,
                'response' => $decoded,
            ]);
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
            $this->log('error', 'Stream context request to OpenAI failed to open', [
                'message' => $message,
            ]);
            throw new \RuntimeException('Ошибка запроса к OpenAI: ' . $message);
        }

        $raw = stream_get_contents($stream);
        $meta = stream_get_meta_data($stream);
        fclose($stream);

        if ($raw === false) {
            $this->log('error', 'Failed to read OpenAI response via stream');
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
            $this->log('error', 'Unable to decode OpenAI response via stream', [
                'raw' => $raw,
            ]);
            throw new \RuntimeException('Не удалось декодировать ответ OpenAI');
        }

        if ($status >= 400) {
            $message = $decoded['error']['message'] ?? ('HTTP ' . $status);
            $this->log('error', 'OpenAI returned error status via stream', [
                'status' => $status,
                'response' => $decoded,
            ]);
            throw new \RuntimeException('OpenAI вернул ошибку: ' . $message);
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function sanitizePayloadForLogging(array $payload): array
    {
        $sanitized = $payload;

        if (array_key_exists('input', $sanitized)) {
            if (is_array($sanitized['input'])) {
                $sanitized['input'] = '[array:' . count($sanitized['input']) . ']';
            } elseif (is_string($sanitized['input'])) {
                $length = function_exists('mb_strlen')
                    ? mb_strlen($sanitized['input'])
                    : strlen($sanitized['input']);
                $sanitized['input'] = '[string:' . $length . ']';
            } else {
                $sanitized['input'] = '[hidden]';
            }
        }

        if (array_key_exists('messages', $sanitized)) {
            if (is_array($sanitized['messages'])) {
                $sanitized['messages'] = '[array:' . count($sanitized['messages']) . ']';
            } else {
                $sanitized['messages'] = '[hidden]';
            }
        }

        return $sanitized;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function log(string $level, string $message, array $context = []): void
    {
        $prefix = '[OpenAiService][' . strtoupper($level) . '] ' . $message;
        if ($context === []) {
            error_log($prefix);
            return;
        }

        $encoded = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            error_log($prefix . ' ' . var_export($context, true));
            return;
        }

        error_log($prefix . ' ' . $encoded);
    }
}

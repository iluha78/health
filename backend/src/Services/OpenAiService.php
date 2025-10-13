<?php
namespace App\Services;

class OpenAiService
{
    private ?string $apiKey;
    private string $baseUrl;
    private string $model;

    public function __construct(?string $apiKey = null, ?string $baseUrl = null, ?string $model = null)
    {
        $this->apiKey = $apiKey ?? ($_ENV['OPENAI_API_KEY'] ?? null);
        $this->baseUrl = rtrim($baseUrl ?? ($_ENV['OPENAI_BASE_URL'] ?? 'https://api.openai.com'), '/');
        $this->model = $model ?? ($_ENV['OPENAI_MODEL'] ?? 'gpt-4o-mini');
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

        $url = $this->baseUrl . $path;
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Не удалось инициализировать HTTP-запрос к OpenAI');
        }

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            throw new \RuntimeException('Не удалось подготовить запрос к OpenAI');
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
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
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
}

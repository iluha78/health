<?php
namespace App\Services;

class SubscriptionException extends \RuntimeException
{
    private int $status;

    public function __construct(string $message, int $status = 400, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->status = $status;
    }

    public function getStatus(): int
    {
        return $this->status;
    }
}

# syntax=docker/dockerfile:1.6

FROM composer:2 AS vendor
WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-progress \
    --no-interaction

COPY . .
RUN composer dump-autoload --optimize

FROM php:8.2-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
    && docker-php-ext-install pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=vendor /app /app

EXPOSE 8080

CMD ["php", "-S", "0.0.0.0:8080", "-t", "public", "public/index.php"]

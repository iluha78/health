SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE nutrition_photo_estimates
  ADD COLUMN description TEXT NULL AFTER notes;

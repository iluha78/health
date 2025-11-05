ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `plan` ENUM('free','advisor','premium') NOT NULL DEFAULT 'free' AFTER pass_hash,
  ADD COLUMN IF NOT EXISTS `balance_cents` INT NOT NULL DEFAULT 0 AFTER plan,
  ADD COLUMN IF NOT EXISTS `ai_cycle_started_at` DATE NULL AFTER balance_cents,
  ADD COLUMN IF NOT EXISTS `ai_cycle_requests` INT NOT NULL DEFAULT 0 AFTER ai_cycle_started_at,
  ADD COLUMN IF NOT EXISTS `ai_cycle_spent_cents` INT NOT NULL DEFAULT 0 AFTER ai_cycle_requests,
  ADD COLUMN IF NOT EXISTS `ai_cycle_advice_requests` INT NOT NULL DEFAULT 0 AFTER ai_cycle_spent_cents,
  ADD COLUMN IF NOT EXISTS `ai_cycle_assistant_requests` INT NOT NULL DEFAULT 0 AFTER ai_cycle_advice_requests;

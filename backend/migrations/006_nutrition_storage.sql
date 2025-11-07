SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE nutrition_advices
  ADD COLUMN weight_kg DECIMAL(6,2) NULL AFTER user_id,
  ADD COLUMN height_cm INT NULL AFTER weight_kg,
  ADD COLUMN calories_goal INT NULL AFTER height_cm,
  ADD COLUMN activity VARCHAR(100) NULL AFTER calories_goal,
  ADD COLUMN question TEXT NULL AFTER focus,
  ADD COLUMN comment TEXT NULL AFTER question;

CREATE TABLE IF NOT EXISTS nutrition_photo_estimates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  calories DECIMAL(7,2) NULL,
  confidence VARCHAR(190) NULL,
  notes TEXT,
  ingredients JSON,
  original_filename VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_nutrition_photo_user (user_id, created_at),
  CONSTRAINT fk_nutrition_photo_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

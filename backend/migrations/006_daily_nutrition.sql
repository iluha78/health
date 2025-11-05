-- Таблица для фото еды с калориями (по дням)
CREATE TABLE IF NOT EXISTS daily_food_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  photo_date DATE NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT,
  estimated_calories INT,
  photo_time TIME,
  note VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, photo_date DESC)
);

-- Добавляем дату к консультациям нутрициолога
ALTER TABLE nutrition_advices
  ADD COLUMN advice_date DATE NULL AFTER user_id,
  ADD INDEX idx_user_date (user_id, advice_date DESC);

-- Обновляем существующие записи - ставим дату из created_at
UPDATE nutrition_advices 
SET advice_date = DATE(created_at) 
WHERE advice_date IS NULL;

-- Делаем поле обязательным после заполнения
ALTER TABLE nutrition_advices
  MODIFY COLUMN advice_date DATE NOT NULL;

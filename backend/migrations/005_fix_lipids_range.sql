-- Исправление типа данных для липидного профиля
-- Изменяем DECIMAL(4,2) на DECIMAL(6,2) для поддержки значений в мг/дл

ALTER TABLE lipids
  MODIFY COLUMN chol DECIMAL(6,2),
  MODIFY COLUMN hdl DECIMAL(6,2),
  MODIFY COLUMN ldl DECIMAL(6,2),
  MODIFY COLUMN trig DECIMAL(6,2);

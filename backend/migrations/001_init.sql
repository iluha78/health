-- База: создание всей основной схемы с нуля.
-- Движок/кодировка везде одинаковые.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  pass_hash VARCHAR(255) NOT NULL,

  -- billing-поля сразу в users
  plan ENUM('free','advisor','premium') NOT NULL DEFAULT 'free',
  balance_cents INT NOT NULL DEFAULT 0,
  ai_cycle_started_at DATE NULL,
  ai_cycle_requests INT NOT NULL DEFAULT 0,
  ai_cycle_spent_cents INT NOT NULL DEFAULT 0,
  ai_cycle_advice_requests INT NOT NULL DEFAULT 0,
  ai_cycle_assistant_requests INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY,
  sex ENUM('male','female'),
  age INT,
  height_cm INT,
  weight_kg DECIMAL(5,2),
  activity ENUM('sed','light','mod','high','ath'),
  kcal_goal INT,
  sfa_limit_g INT,
  fiber_goal_g INT,
  CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS foods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source ENUM('local','off') NOT NULL DEFAULT 'local',
  off_id VARCHAR(64),
  name VARCHAR(190) NOT NULL,
  kcal INT NOT NULL,
  protein_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  sfa_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fiber_g DECIMAL(6,2),
  soluble_fiber_g DECIMAL(6,2) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS diary_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  d DATE NOT NULL,
  UNIQUE KEY uq_diary_days_user_d (user_id, d),
  CONSTRAINT fk_diary_days_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS diary_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_id INT NOT NULL,
  food_id INT NOT NULL,
  grams INT NOT NULL,
  note VARCHAR(255),
  KEY idx_diary_items_day (day_id),
  KEY idx_diary_items_food (food_id),
  CONSTRAINT fk_diary_items_day
    FOREIGN KEY (day_id) REFERENCES diary_days(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_diary_items_food
    FOREIGN KEY (food_id) REFERENCES foods(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lipids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  dt DATE NOT NULL,
  chol DECIMAL(4,2),
  hdl  DECIMAL(4,2),
  ldl  DECIMAL(4,2),
  trig DECIMAL(4,2),
  note VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lipids_user_dt (user_id, dt),
  CONSTRAINT fk_lipids_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Давление/пульс — сразу в базовой схеме
CREATE TABLE IF NOT EXISTS pressure_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  measured_at DATETIME NOT NULL,
  systolic INT NOT NULL,
  diastolic INT NOT NULL,
  pulse INT NOT NULL,
  advice TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pressure_user_time (user_id, measured_at),
  CONSTRAINT fk_pressure_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

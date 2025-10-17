CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) UNIQUE NOT NULL,
  pass_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY,
  sex ENUM('male','female'),
  age INT, height_cm INT,
  weight_kg DECIMAL(5,2),
  activity ENUM('sed','light','mod','high','ath'),
  kcal_goal INT, sfa_limit_g INT, fiber_goal_g INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lipids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  dt DATE NOT NULL,
  chol DECIMAL(4,2), hdl DECIMAL(4,2), ldl DECIMAL(4,2), trig DECIMAL(4,2),
  note VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS foods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source ENUM('local','off') DEFAULT 'local',
  off_id VARCHAR(64),
  name VARCHAR(190) NOT NULL,
  kcal INT NOT NULL,
  protein_g DECIMAL(6,2), fat_g DECIMAL(6,2), sfa_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2), fiber_g DECIMAL(6,2), soluble_fiber_g DECIMAL(6,2) NULL
);

CREATE TABLE IF NOT EXISTS diary_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, d DATE NOT NULL,
  UNIQUE(user_id,d),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS diary_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_id INT NOT NULL, food_id INT NOT NULL, grams INT NOT NULL,
  note VARCHAR(255),
  FOREIGN KEY (day_id) REFERENCES diary_days(id),
  FOREIGN KEY (food_id) REFERENCES foods(id)
);

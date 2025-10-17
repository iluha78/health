CREATE TABLE nutrition_advices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  focus VARCHAR(255),
  advice TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE photo_analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT,
  estimated_calories INT,
  healthiness ENUM('healthy','balanced','caution') NOT NULL,
  reasoning TEXT,
  tips JSON,
  original_filename VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE assistant_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_reply TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blood_pressure_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  systolic INT NULL,
  diastolic INT NULL,
  pulse INT NULL,
  question TEXT NULL,
  comment TEXT NULL,
  advice TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

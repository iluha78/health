CREATE TABLE IF NOT EXISTS blood_pressure_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  measured_at DATETIME NOT NULL,
  systolic INT,
  diastolic INT,
  pulse INT,
  glucose DECIMAL(5,2),
  note VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_measured (user_id, measured_at DESC)
);

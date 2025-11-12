ALTER TABLE assistant_interactions
  ADD COLUMN user_image_path VARCHAR(255) NULL AFTER user_message,
  ADD COLUMN user_image_name VARCHAR(255) NULL AFTER user_image_path;

ALTER TABLE users
    ADD COLUMN password_reset_code_hash VARCHAR(255) NULL DEFAULT NULL AFTER email_verification_sent_at;
ALTER TABLE users
    ADD COLUMN password_reset_sent_at TIMESTAMP NULL DEFAULT NULL AFTER password_reset_code_hash;

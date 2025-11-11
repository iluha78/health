ALTER TABLE users
    ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL AFTER created_at;
ALTER TABLE users
    ADD COLUMN email_verification_code_hash VARCHAR(255) NULL DEFAULT NULL AFTER email_verified_at;
ALTER TABLE users
    ADD COLUMN email_verification_sent_at TIMESTAMP NULL DEFAULT NULL AFTER email_verification_code_hash;

CREATE DATABASE IF NOT EXISTS smartinbox;
USE smartinbox;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry BIGINT,
  last_history_id VARCHAR(255),
  last_sync_timestamp BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emails (
  id VARCHAR(255),                  -- Gmail Message ID
  user_id INT,
  subject VARCHAR(500),
  from_address VARCHAR(500),
  sender_domain VARCHAR(255),
  snippet TEXT,
  body LONGTEXT,                    -- Full decoded email body
  received_at DATETIME,             -- Actual email sent/received date
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_classifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_id VARCHAR(255),
  user_id INT,
  classification VARCHAR(50),
  confidence INT,
  initial_confidence INT,
  llm_verified BOOLEAN DEFAULT FALSE,
  reason TEXT,
  matched_keywords JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_user (email_id, user_id),
  FOREIGN KEY (email_id, user_id) REFERENCES emails(id, user_id) ON DELETE CASCADE
);

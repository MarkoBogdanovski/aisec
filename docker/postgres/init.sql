-- PostgreSQL initialization script for AI Web3 Security Platform

-- Create additional databases if needed
-- CREATE DATABASE ai_web3_security_test;
-- CREATE DATABASE ai_web3_security_dev;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
-- CREATE SCHEMA IF NOT EXISTS audit;
-- CREATE SCHEMA IF NOT EXISTS security;

-- Set default permissions
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

-- Create indexes for common queries (these will be created by Prisma migrations)
-- This is just a placeholder for any custom SQL needed during initialization

-- Log initialization
\echo 'AI Web3 Security Platform PostgreSQL initialized successfully'

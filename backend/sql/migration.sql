-- Migration: Add domain column to links table
-- Run this to fix the missing domain column issue

ALTER TABLE links ADD COLUMN IF NOT EXISTS domain VARCHAR(255) DEFAULT 'localhost:8001'; 
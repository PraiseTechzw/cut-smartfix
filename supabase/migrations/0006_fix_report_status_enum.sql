-- ============================================================
-- Migration 0006: Add missing values to report_status enum.
--
-- PostgreSQL constraint: ALTER TYPE ... ADD VALUE cannot be
-- used in the same transaction as queries that reference the
-- new values (error 55P04). This migration ONLY adds the enum
-- values so they are committed. Migration 0007 then performs
-- the data backfill and remaining DDL in a separate transaction.
-- ============================================================

alter type report_status add value if not exists 'under_review'          after 'submitted';
alter type report_status add value if not exists 'accepted'              after 'assigned';
alter type report_status add value if not exists 'waiting_for_materials' after 'in_progress';
alter type report_status add value if not exists 'repair_completed'      after 'waiting_for_materials';
alter type report_status add value if not exists 'under_verification'    after 'repair_completed';
alter type report_status add value if not exists 'rejected'              after 'closed';
alter type report_status add value if not exists 'duplicate'             after 'rejected';
alter type report_status add value if not exists 'cancelled'             after 'duplicate';

-- Add 'approved' status to order_status enum
ALTER TYPE order_status ADD VALUE 'approved' BEFORE 'processing';

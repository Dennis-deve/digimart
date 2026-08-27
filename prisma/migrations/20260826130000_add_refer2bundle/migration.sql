-- Refer2Bundle as a data-bundle provider (additive, idempotent)
ALTER TYPE "ProductSource" ADD VALUE IF NOT EXISTS 'REFER2BUNDLE';

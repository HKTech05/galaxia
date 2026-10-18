-- AlterTable: Add special_discount column to staycation_bookings
ALTER TABLE "staycation_bookings" ADD COLUMN "special_discount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "staycation_bookings" ADD COLUMN IF NOT EXISTS "extra_adult_charge" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "staycation_bookings" ADD COLUMN IF NOT EXISTS "extra_kids_charge" INTEGER NOT NULL DEFAULT 0;

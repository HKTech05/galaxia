-- Update Celebration minHours from 2 to 1
UPDATE dd_packages SET min_hours = 1 WHERE slug = 'celebration';

-- Add 1-hour pricing tier for Celebration
INSERT INTO dd_package_pricing (package_id, hours, label, weekday_price, weekend_price)
SELECT id, 1, '1 Hour', 2200, 2200
FROM dd_packages WHERE slug = 'celebration'
AND NOT EXISTS (
    SELECT 1 FROM dd_package_pricing
    WHERE package_id = (SELECT id FROM dd_packages WHERE slug = 'celebration')
    AND hours = 1
);

-- Insert Users (1 admin, 2 clients)
-- Using pgcrypto to hash passwords
INSERT INTO users (name, email, password_hash, user_role) VALUES
(
    'Admin User',
    'admin@restaurant.com',
    crypt('admin123', gen_salt('bf',10)),
    'admin'
),
(
    'John Doe',
    'john.doe@email.com',
    crypt('client123', gen_salt('bf',10)),
    'user'
),
(
    'Jane Smith',
    'jane.smith@email.com',
    crypt('client456', gen_salt('bf',10)),
    'user'
);

-- Ensure valid phone number format
-- Drop the old constraint if it exists, and add a new one
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_phone_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_phone_check 
    CHECK (phone ~ '^[+0-9][0-9\s-]{7,19}$');

-- Insert Restaurant & Fetch UUID
DO $$
DECLARE
    v_restaurant_id UUID;
BEGIN
    INSERT INTO restaurants (name, address, phone) 
    VALUES ('Le Petit Bistro', '123 Gourmet Street, Foodtown, FT 12345', '+15551234567')
    RETURNING restaurant_id INTO v_restaurant_id;

    -- Insert Tables
    INSERT INTO tables (table_restaurant_id, number, seats) 
    SELECT v_restaurant_id, generate_series(1, 4), 2;

    INSERT INTO tables (table_restaurant_id, number, seats) 
    SELECT v_restaurant_id, generate_series(5, 8), 4;

    INSERT INTO tables (table_restaurant_id, number, seats) 
    SELECT v_restaurant_id, generate_series(9, 12), 6;
END $$;

-- Insert Services
DO $$
DECLARE
    v_service1 UUID;
    v_service2 UUID;
    v_service3 UUID;
BEGIN
    -- Morning Service (Not repeating)
    INSERT INTO services (start_time, end_time, is_repeting, repeating_days_bitmask)
    VALUES ('2024-02-20 08:00:00+00', '2024-02-20 10:00:00+00', FALSE, 0)
    RETURNING service_id INTO v_service1;

    -- Afternoon Service (Repeating on Monday, Wednesday, Friday)
    INSERT INTO services (start_time, end_time, is_repeting, repeating_days_bitmask)
    VALUES ('2024-02-20 12:00:00+00', '2024-02-20 14:00:00+00', TRUE, (1 | 4 | 16))
    RETURNING service_id INTO v_service2;

    -- Evening Service (Repeating on Saturday & Sunday)
    INSERT INTO services (start_time, end_time, is_repeting, repeating_days_bitmask)
    VALUES ('2024-02-20 18:00:00+00', '2024-02-20 20:00:00+00', TRUE, (32 | 64))
    RETURNING service_id INTO v_service3;
END $$;

-- Insert Reservations
DO $$
DECLARE
    v_user_id UUID;
    v_table_id UUID;
    v_service_id UUID;
BEGIN
    -- Loop through all users (excluding admin)
    FOR v_user_id IN (SELECT user_id FROM users WHERE user_role = 'user') LOOP
        -- Pick a random table
        SELECT table_id INTO v_table_id 
        FROM tables 
        ORDER BY RANDOM() 
        LIMIT 1;

        -- Pick a random service
        SELECT service_id INTO v_service_id 
        FROM services 
        ORDER BY RANDOM() 
        LIMIT 1;

        -- Insert reservation
        INSERT INTO reservations (reservation_user_id, reservation_table_id, reservation_service_id, seats_taken)
        VALUES (v_user_id, v_table_id, v_service_id, 2);
    END LOOP;
END $$;

-- Verify Data
SELECT 'Users count' AS check, count(*) AS total FROM users
UNION ALL
SELECT 'Admin users', count(*) FROM users WHERE user_role = 'admin'
UNION ALL
SELECT 'Regular users', count(*) FROM users WHERE user_role = 'user'
UNION ALL
SELECT 'Restaurants', count(*) FROM restaurants
UNION ALL
SELECT 'Tables', count(*) FROM tables
UNION ALL
SELECT 'Tables with 2 seats', count(*) FROM tables WHERE seats = 2
UNION ALL
SELECT 'Tables with 4 seats', count(*) FROM tables WHERE seats = 4
UNION ALL
SELECT 'Tables with 6 seats', count(*) FROM tables WHERE seats = 6
UNION ALL
SELECT 'Services', count(*) FROM services
UNION ALL
SELECT 'Non-repeating services', count(*) FROM services WHERE is_repeting = FALSE
UNION ALL
SELECT 'Repeating services', count(*) FROM services WHERE is_repeting = TRUE
UNION ALL
SELECT 'Reservations', count(*) FROM reservations;

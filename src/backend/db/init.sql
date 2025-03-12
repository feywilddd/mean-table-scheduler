CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
    user_role VARCHAR(255) DEFAULT 'user',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE restaurants (
    restaurant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL CHECK (phone ~ '^\+?[0-9\s-\(\)]{8,20}$'),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tables (
    table_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    number INTEGER NOT NULL CHECK (number > 0),
    seats INTEGER NOT NULL CHECK (seats > 0),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX tables_restaurant_number_unique_idx ON tables (table_restaurant_id, number) 
    WHERE is_deleted = FALSE;

CREATE TABLE service_templates (
    service_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    is_repeating BOOLEAN DEFAULT FALSE,
    repeating_days_bitmask INT NOT NULL DEFAULT 0 CHECK (repeating_days_bitmask BETWEEN 0 AND 127),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_reservation_duration CHECK (end_time - start_time <= INTERVAL '4 hours')
);

CREATE TABLE service_instances (
    service_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_template_id UUID NOT NULL REFERENCES service_templates(service_template_id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_template_id, service_date)
);

CREATE TABLE reservations (
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reservation_table_id UUID NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
    reservation_service_instance_id UUID NOT NULL REFERENCES service_instances(service_instance_id) ON DELETE CASCADE,
    seats_taken INTEGER NOT NULL CHECK (seats_taken > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_restaurants
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_tables
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_service_templates
    BEFORE UPDATE ON service_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_service_instances
    BEFORE UPDATE ON service_instances
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_reservations
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_deleted = TRUE;
    NEW.deleted_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soft_delete_users
    BEFORE UPDATE OF is_deleted ON users
    FOR EACH ROW
    WHEN (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE)
    EXECUTE FUNCTION soft_delete();

CREATE TRIGGER soft_delete_tables
    BEFORE UPDATE OF is_deleted ON tables
    FOR EACH ROW
    WHEN (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE)
    EXECUTE FUNCTION soft_delete();

CREATE TRIGGER soft_delete_service_templates
    BEFORE UPDATE OF is_deleted ON service_templates
    FOR EACH ROW
    WHEN (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE)
    EXECUTE FUNCTION soft_delete();

CREATE TRIGGER soft_delete_service_instances
    BEFORE UPDATE OF is_deleted ON service_instances
    FOR EACH ROW
    WHEN (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE)
    EXECUTE FUNCTION soft_delete();

-- Function to generate service instances from templates
CREATE OR REPLACE FUNCTION generate_service_instances(
    p_template_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
DECLARE
    v_template service_templates%ROWTYPE;
    v_date DATE := p_start_date;
    v_day_of_week INTEGER;
    v_bitmask INTEGER;
BEGIN
    -- Get template details
    SELECT * INTO v_template FROM service_templates WHERE service_template_id = p_template_id;
    
    -- For non-repeating templates, only create one instance on the start date
    IF v_template.is_repeating = FALSE THEN
        INSERT INTO service_instances (
            service_template_id,
            service_date,
            start_time,
            end_time
        ) VALUES (
            p_template_id,
            p_start_date,
            v_template.start_time,
            v_template.end_time
        )
        ON CONFLICT (service_template_id, service_date) DO NOTHING;
    ELSE
        -- For repeating templates, loop through each date in the range
        WHILE v_date <= p_end_date LOOP
            -- Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
            v_day_of_week := EXTRACT(DOW FROM v_date);
            
            -- Convert to bitmask
            IF v_day_of_week = 0 THEN
                v_bitmask := 64; -- Sunday (2^6)
            ELSE
                v_bitmask := 2 ^ (v_day_of_week - 1); -- Other days
            END IF;
            
            -- Check if service runs on this day
            IF (v_template.repeating_days_bitmask & v_bitmask) > 0 THEN
                -- Create service instance for this date
                INSERT INTO service_instances (
                    service_template_id,
                    service_date,
                    start_time,
                    end_time
                ) VALUES (
                    p_template_id,
                    v_date,
                    v_template.start_time,
                    v_template.end_time
                )
                ON CONFLICT (service_template_id, service_date) DO NOTHING;
            END IF;
            
            -- Move to next day
            v_date := v_date + 1;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;
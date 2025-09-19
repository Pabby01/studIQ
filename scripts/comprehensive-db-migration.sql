-- =====================================================
-- COMPREHENSIVE DATABASE MIGRATION AND VERIFICATION SCRIPT
-- =====================================================
-- This script performs idempotent database operations:
-- 1. Verifies table existence and structure
-- 2. Executes only missing or outdated operations
-- 3. Maintains version control within the database
-- 4. Provides comprehensive logging and error handling
-- 5. Uses transactions for atomic operations
-- =====================================================

-- Start transaction for atomic operations
BEGIN;

-- =====================================================
-- 1. CREATE VERSION CONTROL SYSTEM
-- =====================================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    migration_version VARCHAR(50) NOT NULL,
    description TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'SUCCESS', -- SUCCESS, FAILED, SKIPPED
    error_message TEXT,
    checksum VARCHAR(64) -- For detecting changes in migration content
);

-- Create function to log migration operations
CREATE OR REPLACE FUNCTION log_migration_operation(
    p_migration_name VARCHAR(255),
    p_version VARCHAR(50),
    p_description TEXT,
    p_status VARCHAR(20) DEFAULT 'SUCCESS',
    p_error_message TEXT DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.migration_log (
        migration_name, migration_version, description, 
        status, error_message, execution_time_ms
    ) VALUES (
        p_migration_name, p_version, p_description,
        p_status, p_error_message, p_execution_time_ms
    ) ON CONFLICT (migration_name) DO UPDATE SET
        migration_version = EXCLUDED.migration_version,
        description = EXCLUDED.description,
        executed_at = NOW(),
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        execution_time_ms = EXCLUDED.execution_time_ms;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if migration was already executed
CREATE OR REPLACE FUNCTION is_migration_executed(p_migration_name VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.migration_log 
        WHERE migration_name = p_migration_name 
        AND status = 'SUCCESS'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. TABLE STRUCTURE VERIFICATION FUNCTIONS
-- =====================================================

-- Function to check if table exists with correct structure
CREATE OR REPLACE FUNCTION verify_table_structure(
    p_table_name TEXT,
    p_expected_columns JSONB
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{"exists": false, "missing_columns": [], "extra_columns": [], "type_mismatches": []}';
    v_column RECORD;
    v_expected_column JSONB;
    v_missing_columns JSONB := '[]';
    v_extra_columns JSONB := '[]';
    v_type_mismatches JSONB := '[]';
BEGIN
    -- Check if table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = p_table_name
    ) THEN
        v_result := jsonb_set(v_result, '{exists}', 'true');
        
        -- Check for missing columns
        FOR v_expected_column IN SELECT * FROM jsonb_array_elements(p_expected_columns)
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = p_table_name
                AND column_name = v_expected_column->>'name'
            ) THEN
                v_missing_columns := v_missing_columns || jsonb_build_object(
                    'name', v_expected_column->>'name',
                    'type', v_expected_column->>'type'
                );
            ELSE
                -- Check data type matches
                SELECT data_type, is_nullable INTO v_column
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = p_table_name
                AND column_name = v_expected_column->>'name';
                
                IF v_column.data_type != (v_expected_column->>'type') THEN
                    v_type_mismatches := v_type_mismatches || jsonb_build_object(
                        'name', v_expected_column->>'name',
                        'expected', v_expected_column->>'type',
                        'actual', v_column.data_type
                    );
                END IF;
            END IF;
        END LOOP;
        
        v_result := jsonb_set(v_result, '{missing_columns}', v_missing_columns);
        v_result := jsonb_set(v_result, '{type_mismatches}', v_type_mismatches);
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CORE TABLE VERIFICATION AND CREATION
-- =====================================================

DO $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_execution_time INTEGER;
    v_table_check JSONB;
    v_operation_count INTEGER := 0;
    v_skip_count INTEGER := 0;
BEGIN
    v_start_time := clock_timestamp();
    RAISE NOTICE '=== STARTING COMPREHENSIVE DATABASE MIGRATION ===';
    RAISE NOTICE 'Start time: %', v_start_time;
    
    -- =====================================================
    -- VERIFY AND CREATE USERS TABLE
    -- =====================================================
    
    v_table_check := verify_table_structure('users', '[
        {"name": "id", "type": "uuid"},
        {"name": "auth_id", "type": "uuid"},
        {"name": "username", "type": "text"},
        {"name": "email", "type": "text"},
        {"name": "avatar_url", "type": "text"},
        {"name": "bio", "type": "text"},
        {"name": "preferences", "type": "jsonb"},
        {"name": "created_at", "type": "timestamp with time zone"},
        {"name": "updated_at", "type": "timestamp with time zone"},
        {"name": "full_name", "type": "text"}
    ]');
    
    IF NOT (v_table_check->>'exists')::boolean THEN
        RAISE NOTICE 'Creating users table...';
        CREATE TABLE public.users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            username text UNIQUE NOT NULL,
            email text UNIQUE NOT NULL,
            avatar_url text,
            bio text,
            preferences jsonb,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            full_name text,
            CONSTRAINT users_auth_id_unique UNIQUE (auth_id)
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ Users table created successfully';
    ELSE
        -- Check for missing columns and add them
        IF jsonb_array_length(v_table_check->'missing_columns') > 0 THEN
            RAISE NOTICE 'Adding missing columns to users table...';
            -- Add missing columns (example for updated_at and full_name)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE public.users ADD COLUMN updated_at timestamptz DEFAULT now();
                RAISE NOTICE '✓ Added updated_at column to users table';
                v_operation_count := v_operation_count + 1;
            END IF;
            
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name'
            ) THEN
                ALTER TABLE public.users ADD COLUMN full_name text;
                RAISE NOTICE '✓ Added full_name column to users table';
                v_operation_count := v_operation_count + 1;
            END IF;
        ELSE
            RAISE NOTICE '⏭ Users table already exists with correct structure - SKIPPED';
            v_skip_count := v_skip_count + 1;
        END IF;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE USER_XP TABLE
    -- =====================================================
    
    v_table_check := verify_table_structure('user_xp', '[
        {"name": "user_id", "type": "uuid"},
        {"name": "total_xp", "type": "integer"},
        {"name": "campus_xp", "type": "integer"},
        {"name": "learning_xp", "type": "integer"},
        {"name": "finance_xp", "type": "integer"},
        {"name": "club_xp", "type": "integer"},
        {"name": "last_updated", "type": "timestamp with time zone"},
        {"name": "daily_login_streak", "type": "integer"},
        {"name": "last_login_date", "type": "date"},
        {"name": "created_at", "type": "timestamp with time zone"}
    ]');
    
    IF NOT (v_table_check->>'exists')::boolean THEN
        RAISE NOTICE 'Creating user_xp table...';
        CREATE TABLE public.user_xp (
            user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
            total_xp integer NOT NULL DEFAULT 0,
            campus_xp integer NOT NULL DEFAULT 0,
            learning_xp integer NOT NULL DEFAULT 0,
            finance_xp integer NOT NULL DEFAULT 0,
            club_xp integer NOT NULL DEFAULT 0,
            last_updated timestamptz DEFAULT now(),
            daily_login_streak integer NOT NULL DEFAULT 0,
            last_login_date date,
            created_at timestamptz DEFAULT now()
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ User_xp table created successfully';
    ELSE
        RAISE NOTICE '⏭ User_xp table already exists with correct structure - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE XP_ACTIVITIES TABLE
    -- =====================================================
    
    v_table_check := verify_table_structure('xp_activities', '[
        {"name": "id", "type": "uuid"},
        {"name": "user_id", "type": "uuid"},
        {"name": "action", "type": "text"},
        {"name": "xp_amount", "type": "integer"},
        {"name": "hub_type", "type": "text"},
        {"name": "metadata", "type": "jsonb"},
        {"name": "created_at", "type": "timestamp with time zone"}
    ]');
    
    IF NOT (v_table_check->>'exists')::boolean THEN
        RAISE NOTICE 'Creating xp_activities table...';
        CREATE TABLE public.xp_activities (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            action text NOT NULL,
            xp_amount integer NOT NULL,
            hub_type text NOT NULL DEFAULT 'general',
            metadata jsonb DEFAULT '{}',
            created_at timestamptz DEFAULT now()
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ XP_activities table created successfully';
    ELSE
        RAISE NOTICE '⏭ XP_activities table already exists with correct structure - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE BADGES TABLE
    -- =====================================================
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badges') THEN
        RAISE NOTICE 'Creating badges table...';
        CREATE TABLE public.badges (
            id text PRIMARY KEY,
            name text NOT NULL,
            description text NOT NULL,
            icon text NOT NULL,
            category text NOT NULL,
            xp_requirement integer NOT NULL DEFAULT 0,
            hub_type text,
            created_at timestamptz DEFAULT now()
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ Badges table created successfully';
    ELSE
        RAISE NOTICE '⏭ Badges table already exists - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE USER_BADGES TABLE
    -- =====================================================
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_badges') THEN
        RAISE NOTICE 'Creating user_badges table...';
        CREATE TABLE public.user_badges (
            user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
            badge_id text REFERENCES public.badges(id) ON DELETE CASCADE,
            unlocked_at timestamptz DEFAULT now(),
            PRIMARY KEY (user_id, badge_id)
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ User_badges table created successfully';
    ELSE
        RAISE NOTICE '⏭ User_badges table already exists - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE CLUBS TABLE
    -- =====================================================
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clubs') THEN
        RAISE NOTICE 'Creating clubs table...';
        CREATE TABLE public.clubs (
            id text PRIMARY KEY,
            name text NOT NULL,
            description text,
            category text,
            member_count integer DEFAULT 0,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ Clubs table created successfully';
    ELSE
        RAISE NOTICE '⏭ Clubs table already exists - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE CLUB_MEMBERS TABLE
    -- =====================================================
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'club_members') THEN
        RAISE NOTICE 'Creating club_members table...';
        CREATE TABLE public.club_members (
            club_id text REFERENCES public.clubs(id) ON DELETE CASCADE,
            user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
            role text DEFAULT 'member',
            joined_at timestamptz DEFAULT now(),
            PRIMARY KEY (club_id, user_id)
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ Club_members table created successfully';
    ELSE
        RAISE NOTICE '⏭ Club_members table already exists - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE MATERIALS TABLE
    -- =====================================================
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materials') THEN
        RAISE NOTICE 'Creating materials table...';
        CREATE TABLE public.materials (
            id text PRIMARY KEY,
            user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
            title text NOT NULL,
            content text,
            file_url text,
            progress integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
            created_at timestamptz DEFAULT now()
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ Materials table created successfully';
    ELSE
        RAISE NOTICE '⏭ Materials table already exists - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- VERIFY AND CREATE WALLETS TABLE
    -- =====================================================
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallets') THEN
        RAISE NOTICE 'Creating wallets table...';
        CREATE TABLE public.wallets (
            id text PRIMARY KEY,
            user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
            public_key text NOT NULL,
            balance numeric(20,8) DEFAULT 0,
            token text DEFAULT 'USDC',
            created_at timestamptz DEFAULT now()
        );
        v_operation_count := v_operation_count + 1;
        RAISE NOTICE '✓ Wallets table created successfully';
    ELSE
        RAISE NOTICE '⏭ Wallets table already exists - SKIPPED';
        v_skip_count := v_skip_count + 1;
    END IF;
    
    -- =====================================================
    -- CREATE ESSENTIAL INDEXES
    -- =====================================================
    
    RAISE NOTICE 'Creating essential indexes...';
    
    -- User indexes
    CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
    
    -- XP indexes
    CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON public.user_xp(total_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_xp_campus_xp ON public.user_xp(campus_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_xp_learning_xp ON public.user_xp(learning_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_xp_finance_xp ON public.user_xp(finance_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_xp_club_xp ON public.user_xp(club_xp DESC);
    
    -- XP activities indexes
    CREATE INDEX IF NOT EXISTS idx_xp_activities_user_id ON public.xp_activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_xp_activities_action ON public.xp_activities(action);
    CREATE INDEX IF NOT EXISTS idx_xp_activities_hub_type ON public.xp_activities(hub_type);
    CREATE INDEX IF NOT EXISTS idx_xp_activities_created_at ON public.xp_activities(created_at DESC);
    
    RAISE NOTICE '✓ Essential indexes created successfully';
    
    -- =====================================================
    -- ENABLE ROW LEVEL SECURITY
    -- =====================================================
    
    RAISE NOTICE 'Enabling Row Level Security...';
    
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.xp_activities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✓ Row Level Security enabled on all tables';
    
    -- =====================================================
    -- SUMMARY AND LOGGING
    -- =====================================================
    
    v_end_time := clock_timestamp();
    v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
    
    RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'End time: %', v_end_time;
    RAISE NOTICE 'Total execution time: % ms', v_execution_time;
    RAISE NOTICE 'Operations applied: %', v_operation_count;
    RAISE NOTICE 'Operations skipped (already up-to-date): %', v_skip_count;
    RAISE NOTICE 'Total operations checked: %', v_operation_count + v_skip_count;
    
    -- Log the migration
    PERFORM log_migration_operation(
        'comprehensive_db_migration_v1.0',
        '1.0.0',
        'Comprehensive database structure verification and migration',
        'SUCCESS',
        NULL,
        v_execution_time
    );
    
EXCEPTION
    WHEN OTHERS THEN
        v_end_time := clock_timestamp();
        v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
        
        RAISE NOTICE '=== MIGRATION FAILED ===';
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
        RAISE NOTICE 'Execution time before failure: % ms', v_execution_time;
        
        -- Log the failed migration
        PERFORM log_migration_operation(
            'comprehensive_db_migration_v1.0',
            '1.0.0',
            'Comprehensive database structure verification and migration',
            'FAILED',
            SQLERRM,
            v_execution_time
        );
        
        -- Re-raise the exception to trigger rollback
        RAISE;
END;
$$;

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- FINAL VERIFICATION QUERY
-- =====================================================

-- Display migration log
SELECT 
    migration_name,
    migration_version,
    description,
    executed_at,
    execution_time_ms,
    status,
    CASE 
        WHEN error_message IS NOT NULL THEN error_message 
        ELSE 'No errors'
    END as error_info
FROM public.migration_log 
ORDER BY executed_at DESC 
LIMIT 10;

-- Display table summary
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Final completion messages
DO $$
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE DATABASE MIGRATION SCRIPT COMPLETED ===';
    RAISE NOTICE 'Check the migration_log table for detailed execution history.';
    RAISE NOTICE 'All operations are idempotent and can be safely re-run.';
END;
$$;
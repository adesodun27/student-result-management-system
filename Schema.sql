-- =========================================================================
-- ACADEX DATABASE SCHEMA & INITIALIZATION SCRIPT
-- =========================================================================

-- 1. PROFILES TABLE (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    course_code TEXT UNIQUE NOT NULL,
    course_title TEXT NOT NULL,
    credit_units INT NOT NULL CHECK (credit_units > 0),
    level INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. LECTURER COURSES TABLE (Many-to-Many Assignment for Lecturers)
CREATE TABLE IF NOT EXISTS lecturer_courses (
    id SERIAL PRIMARY KEY,
    lecturer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    session TEXT NOT NULL,
    semester TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_lecturer_course_session_semester UNIQUE (lecturer_id, course_id, session, semester)
);

-- 4. STUDENT REGISTRATIONS TABLE (Junction Table)
CREATE TABLE IF NOT EXISTS student_registrations (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    session TEXT NOT NULL,
    semester TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_student_course_registration UNIQUE (student_id, course_id, session, semester)
);

-- 5. RESULTS TABLE
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    ca_score NUMERIC(5,2) DEFAULT 0.00 CHECK (ca_score >= 0 AND ca_score <= 30),
    exam_score NUMERIC(5,2) DEFAULT 0.00 CHECK (exam_score >= 0 AND exam_score <= 70),
    total_score NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
    grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
    semester TEXT NOT NULL,
    session TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT results_student_course_session_semester_key UNIQUE (student_id, course_id, session, semester)
);

-- 6. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================================
-- DATABASE RPC FUNCTIONS
-- =========================================================================

CREATE OR REPLACE FUNCTION get_student_results_with_summary(p_student_id UUID)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
    total_units INT;
    cumulative_gpa NUMERIC(3,2);
BEGIN
    -- Calculate total units
    SELECT COALESCE(SUM(c.credit_units), 0) INTO total_units
    FROM student_registrations sr
    JOIN courses c ON sr.course_id = c.id
    WHERE sr.student_id = p_student_id;

    -- Calculate GPA
    SELECT COALESCE(
        ROUND(
            SUM(
                CASE r.grade 
                    WHEN 'A' THEN 5 
                    WHEN 'B' THEN 4 
                    WHEN 'C' THEN 3 
                    WHEN 'D' THEN 2 
                    WHEN 'E' THEN 1 
                    ELSE 0 
                END * c.credit_units
            )::numeric / NULLIF(SUM(c.credit_units), 0), 2
        ), 0.00
    ) INTO cumulative_gpa
    FROM student_registrations sr
    JOIN courses c ON sr.course_id = c.id
    LEFT JOIN results r ON r.course_id = c.id 
        AND r.student_id = sr.student_id 
        AND r.session = sr.session 
        AND r.semester = sr.semester
    WHERE sr.student_id = p_student_id;

    -- Build and return the final JSON object
    SELECT json_build_object(
        'courses', (
            COALESCE(json_agg(
                json_build_object(
                    'course_code', c.course_code,
                    'course_title', c.course_title,
                    'credit_units', c.credit_units,
                    'ca_score', r.ca_score,
                    'exam_score', r.exam_score,
                    'total_score', r.total_score,
                    'grade', r.grade,
                    'status', r.status
                )
            ), '[]'::json)
        ),
        'summary', json_build_object(
            'total_units', total_units,
            'gpa', cumulative_gpa
        )
    ) INTO result_json
    FROM student_registrations sr
    JOIN courses c ON sr.course_id = c.id
    LEFT JOIN results r ON r.course_id = c.id 
        AND r.student_id = sr.student_id 
        AND r.session = sr.session 
        AND r.semester = sr.semester
    WHERE sr.student_id = p_student_id;

    RETURN result_json;
END;
$$ LANGUAGE plpgsql;

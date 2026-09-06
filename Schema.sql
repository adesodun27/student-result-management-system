-- =========================================================================
-- ACADEX DATABASE SCHEMA, SECURITY & INITIALIZATION SCRIPT
-- =========================================================================

-- 1. PROFILES TABLE (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
    matric_number TEXT UNIQUE,
    staff_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    department TEXT,
    must_change_password BOOLEAN DEFAULT TRUE NOT NULL,
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
    lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    session TEXT NOT NULL,
    semester TEXT NOT NULL CHECK (semester IN ('Harmattan', 'Rain')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_lecturer_course_session_semester UNIQUE (lecturer_id, course_id, session, semester)
);

-- 4. STUDENT REGISTRATIONS TABLE (Junction Table)
CREATE TABLE IF NOT EXISTS student_registrations (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    session TEXT NOT NULL,
    semester TEXT NOT NULL CHECK (semester IN ('Harmattan', 'Rain')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_student_course_registration UNIQUE (student_id, course_id, session, semester)
);

-- 5. RESULTS TABLE
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    ca_score NUMERIC(5,2) DEFAULT 0.00 CHECK (ca_score >= 0 AND ca_score <= 30),
    exam_score NUMERIC(5,2) DEFAULT 0.00 CHECK (exam_score >= 0 AND exam_score <= 70),
    total_score NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
    grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
    semester TEXT NOT NULL CHECK (semester IN ('Harmattan', 'Rain')),
    session TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT results_student_course_session_semester_key UNIQUE (student_id, course_id, session, semester)
);

-- 6. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
-- ROW LEVEL SECURITY (RLS) IMPLEMENTATION
-- =========================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to prevent "already exists" errors on re-run
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

DROP POLICY IF EXISTS "Courses viewable by authenticated users" ON courses;
DROP POLICY IF EXISTS "Admins manage courses" ON courses;

DROP POLICY IF EXISTS "Lecturer courses viewable by authenticated users" ON lecturer_courses;
DROP POLICY IF EXISTS "Lecturers and admins manage assigned courses" ON lecturer_courses;

DROP POLICY IF EXISTS "Student registrations access" ON student_registrations;
DROP POLICY IF EXISTS "Students insert own registrations" ON student_registrations;

DROP POLICY IF EXISTS "Results view rules" ON results;
DROP POLICY IF EXISTS "Lecturers and admins modify results" ON results;

DROP POLICY IF EXISTS "Users manage support tickets" ON support_tickets;

DROP POLICY IF EXISTS "Admins view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "System inserts activity logs" ON activity_logs;

-- Re-create Policies
-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Courses Policies
CREATE POLICY "Courses viewable by authenticated users" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage courses" ON courses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Lecturer Courses Policies
CREATE POLICY "Lecturer courses viewable by authenticated users" ON lecturer_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecturers and admins manage assigned courses" ON lecturer_courses FOR ALL TO authenticated USING (
    lecturer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Student Registrations Policies
CREATE POLICY "Student registrations access" ON student_registrations FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer', 'admin'))
);
CREATE POLICY "Students insert own registrations" ON student_registrations FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- Results Policies
CREATE POLICY "Results view rules" ON results FOR SELECT TO authenticated USING (
    (student_id = auth.uid() AND status = 'approved') 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer', 'admin'))
);
CREATE POLICY "Lecturers and admins modify results" ON results FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer', 'admin'))
);

-- Support Tickets Policies
CREATE POLICY "Users manage support tickets" ON support_tickets FOR ALL TO authenticated USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Activity Logs Policies
CREATE POLICY "Admins view activity logs" ON activity_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System inserts activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================================================
-- DATABASE RPC FUNCTIONS (GPA Calculation)
-- =========================================================================

CREATE OR REPLACE FUNCTION get_student_results_with_summary(p_student_id UUID)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
    total_units INT;
    cumulative_gpa NUMERIC(3,2);
BEGIN
    SELECT COALESCE(SUM(c.credit_units), 0) INTO total_units
    FROM student_registrations sr
    JOIN courses c ON sr.course_id = c.id
    WHERE sr.student_id = p_student_id;

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
    JOIN results r ON r.course_id = c.id 
        AND r.student_id = sr.student_id 
        AND r.session = sr.session 
        AND r.semester = sr.semester
    WHERE sr.student_id = p_student_id AND r.grade IS NOT NULL;

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

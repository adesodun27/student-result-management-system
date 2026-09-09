-- =========================================================================
-- ACADEX PRODUCTION SCHEMA & SECURITY SCRIPT (v7.6 - WORKFLOW REFINEMENT)
-- =========================================================================

-- Drop functions and types safely first
DROP FUNCTION IF EXISTS submit_result(INT) CASCADE;
DROP FUNCTION IF EXISTS approve_result(INT) CASCADE;
DROP FUNCTION IF EXISTS reopen_result(INT) CASCADE;
DROP FUNCTION IF EXISTS get_student_results_with_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS prevent_unauthorized_profile_updates() CASCADE;
DROP FUNCTION IF EXISTS prevent_result_registration_change() CASCADE;
DROP FUNCTION IF EXISTS calculate_result_grade() CASCADE;
DROP FUNCTION IF EXISTS enforce_result_status_transition() CASCADE;

-- Drop existing tables cleanly in correct dependency order
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS student_registrations CASCADE;
DROP TABLE IF EXISTS lecturer_courses CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 0. SECURITY, TRIGGER & HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES TABLE
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL CHECK (BTRIM(full_name) <> ''),
    role TEXT NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
    matric_number TEXT UNIQUE,
    staff_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL CHECK (email = LOWER(BTRIM(email))),
    department TEXT CHECK (department IS NULL OR BTRIM(department) <> ''),
    level INT CHECK (level IS NULL OR level IN (100, 200, 300, 400, 500)),
    must_change_initial_password BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT role_identifier_check CHECK (
        (role = 'student' AND matric_number IS NOT NULL AND staff_id IS NULL)
        OR
        (role = 'lecturer' AND staff_id IS NOT NULL AND matric_number IS NULL)
        OR
        (role = 'admin' AND staff_id IS NULL AND matric_number IS NULL)
    )
);

CREATE OR REPLACE FUNCTION prevent_unauthorized_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        IF NEW.role <> OLD.role 
           OR NEW.matric_number IS DISTINCT FROM OLD.matric_number 
           OR NEW.staff_id IS DISTINCT FROM OLD.staff_id 
           OR NEW.email IS DISTINCT FROM OLD.email 
           OR NEW.must_change_initial_password IS DISTINCT FROM OLD.must_change_initial_password THEN
            RAISE EXCEPTION 'Unauthorized: You cannot modify sensitive profile fields.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_unauthorized_profile_updates();

-- 2. COURSES TABLE
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_code TEXT UNIQUE NOT NULL CHECK (course_code = UPPER(BTRIM(course_code)) AND BTRIM(course_code) <> ''),
    course_title TEXT NOT NULL CHECK (BTRIM(course_title) <> ''),
    credit_units INT NOT NULL CHECK (credit_units BETWEEN 1 AND 10),
    level INT NOT NULL CHECK (level IN (100, 200, 300, 400, 500)),
    department TEXT NOT NULL CHECK (BTRIM(department) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. LECTURER COURSES TABLE
CREATE TABLE lecturer_courses (
    id SERIAL PRIMARY KEY,
    lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    session TEXT NOT NULL CHECK (session ~ '^\d{4}/\d{4}$'),
    semester TEXT NOT NULL CHECK (semester IN ('Harmattan', 'Rain')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_lecturer_course_session_semester UNIQUE (lecturer_id, course_id, session, semester)
);

-- 4. STUDENT REGISTRATIONS TABLE
CREATE TABLE student_registrations (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    session TEXT NOT NULL CHECK (session ~ '^\d{4}/\d{4}$'),
    semester TEXT NOT NULL CHECK (semester IN ('Harmattan', 'Rain')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_course_registration UNIQUE (student_id, course_id, session, semester)
);

-- 5. RESULTS TABLE
CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL UNIQUE REFERENCES student_registrations(id) ON DELETE RESTRICT,
    ca_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (ca_score >= 0 AND ca_score <= 30),
    exam_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (exam_score >= 0 AND exam_score <= 70),
    total_score NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
    grade TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for Results table
CREATE OR REPLACE FUNCTION prevent_result_registration_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.registration_id <> OLD.registration_id THEN
        RAISE EXCEPTION 'Unauthorized: Registration ID cannot be changed once a result is created.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_result_registration
    BEFORE UPDATE ON results
    FOR EACH ROW
    EXECUTE FUNCTION prevent_result_registration_change();

CREATE OR REPLACE FUNCTION calculate_result_grade()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(5,2);
BEGIN
    v_total := NEW.ca_score + NEW.exam_score;

    IF v_total >= 70 THEN
        NEW.grade := 'A';
    ELSIF v_total >= 60 THEN
        NEW.grade := 'B';
    ELSIF v_total >= 50 THEN
        NEW.grade := 'C';
    ELSIF v_total >= 45 THEN
        NEW.grade := 'D';
    ELSIF v_total >= 40 THEN
        NEW.grade := 'E';
    ELSE
        NEW.grade := 'F';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_calculate_grade
    BEFORE INSERT OR UPDATE OF ca_score, exam_score ON results
    FOR EACH ROW
    EXECUTE FUNCTION calculate_result_grade();

CREATE OR REPLACE FUNCTION enforce_result_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF (OLD.status = 'draft' AND NEW.status = 'submitted')
           OR (OLD.status = 'submitted' AND NEW.status = 'approved')
           OR (OLD.status = 'submitted' AND NEW.status = 'draft')
           OR (OLD.status = 'approved' AND NEW.status = 'draft') THEN
            NULL;
        ELSE
            RAISE EXCEPTION 'Invalid result status transition from % to %.', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_result_workflow
    BEFORE UPDATE ON results
    FOR EACH ROW
    EXECUTE FUNCTION enforce_result_status_transition();

CREATE TRIGGER trg_results_updated_at
    BEFORE UPDATE ON results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. SUPPORT TICKETS TABLE
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    subject TEXT NOT NULL CHECK (BTRIM(subject) <> ''),
    message TEXT NOT NULL CHECK (BTRIM(message) <> ''),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. ACTIVITY LOGS TABLE
CREATE TABLE activity_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- PERFORMANCE INDEXES
-- =========================================================================

CREATE INDEX idx_registrations_student ON student_registrations(student_id, session, semester);

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

CREATE POLICY "Users view own profile or staff view all" ON profiles FOR SELECT TO authenticated USING (
    auth.uid() = id OR public.get_user_role() IN ('lecturer', 'admin')
);

CREATE POLICY "Users update own basic profile" ON profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL TO authenticated USING (
    public.get_user_role() = 'admin'
);

CREATE POLICY "Courses viewable by authenticated users" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage courses" ON courses FOR ALL TO authenticated USING (
    public.get_user_role() = 'admin'
);

CREATE POLICY "Lecturer courses viewable by authenticated users" ON lecturer_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage lecturer courses" ON lecturer_courses FOR ALL TO authenticated USING (
    public.get_user_role() = 'admin'
);

CREATE POLICY "Student registrations access" ON student_registrations FOR SELECT TO authenticated USING (
    student_id = auth.uid() 
    OR public.get_user_role() = 'admin'
    OR (
        public.get_user_role() = 'lecturer' AND EXISTS (
            SELECT 1 FROM lecturer_courses lc
            WHERE lc.lecturer_id = auth.uid()
              AND lc.course_id = student_registrations.course_id
              AND lc.session = student_registrations.session
              AND lc.semester = student_registrations.semester
        )
    )
);

CREATE POLICY "Students insert own registrations" ON student_registrations FOR INSERT TO authenticated WITH CHECK (
    student_id = auth.uid() AND public.get_user_role() = 'student'
);

CREATE POLICY "Results view rules" ON results FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM student_registrations sr
        WHERE sr.id = results.registration_id AND (
            (sr.student_id = auth.uid() AND results.status = 'approved')
            OR public.get_user_role() = 'admin'
            OR (
                public.get_user_role() = 'lecturer' AND EXISTS (
                    SELECT 1 FROM lecturer_courses lc
                    WHERE lc.lecturer_id = auth.uid()
                      AND lc.course_id = sr.course_id
                      AND lc.session = sr.session
                      AND lc.semester = sr.semester
                )
            )
        )
    )
);

CREATE POLICY "Lecturers insert assigned course results" ON results FOR INSERT TO authenticated WITH CHECK (
    public.get_user_role() = 'admin'
    OR (
        status = 'draft'
        AND EXISTS (
            SELECT 1 FROM student_registrations sr
            JOIN lecturer_courses lc ON lc.course_id = sr.course_id 
                AND lc.session = sr.session 
                AND lc.semester = sr.semester
            WHERE sr.id = results.registration_id 
              AND lc.lecturer_id = auth.uid()
        )
    )
);

CREATE POLICY "Lecturers update assigned course results" ON results FOR UPDATE TO authenticated USING (
    public.get_user_role() = 'admin'
    OR (
        results.status = 'draft'
        AND EXISTS (
            SELECT 1 FROM student_registrations sr
            JOIN lecturer_courses lc ON lc.course_id = sr.course_id 
                AND lc.session = sr.session 
                AND lc.semester = sr.semester
            WHERE sr.id = results.registration_id 
              AND lc.lecturer_id = auth.uid()
        )
    )
) WITH CHECK (
    public.get_user_role() = 'admin'
    OR (
        status = 'draft'
        AND EXISTS (
            SELECT 1 FROM student_registrations sr
            JOIN lecturer_courses lc ON lc.course_id = sr.course_id 
                AND lc.session = sr.session 
                AND lc.semester = sr.semester
            WHERE sr.id = results.registration_id 
              AND lc.lecturer_id = auth.uid()
        )
    )
);

CREATE POLICY "Admins delete results" ON results FOR DELETE TO authenticated USING (
    public.get_user_role() = 'admin'
);

CREATE POLICY "Students insert support tickets" ON support_tickets FOR INSERT TO authenticated WITH CHECK (
    student_id = auth.uid() AND public.get_user_role() = 'student'
);

CREATE POLICY "Users view support tickets" ON support_tickets FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR public.get_user_role() = 'admin'
);

CREATE POLICY "Admins manage support tickets" ON support_tickets FOR UPDATE TO authenticated USING (
    public.get_user_role() = 'admin'
);

CREATE POLICY "Admins view activity logs" ON activity_logs FOR SELECT TO authenticated USING (
    public.get_user_role() = 'admin'
);

-- =========================================================================
-- WORKFLOW & REPORTING RPC FUNCTIONS (Fully Schema-Qualified)
-- =========================================================================

CREATE OR REPLACE FUNCTION submit_result(p_result_id INT)
RETURNS VOID AS $$
DECLARE
    v_course_id INT;
    v_session TEXT;
    v_semester TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT sr.course_id, sr.session, sr.semester INTO v_course_id, v_session, v_semester
    FROM public.results r
    JOIN public.student_registrations sr ON sr.id = r.registration_id
    WHERE r.id = p_result_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Result not found.';
    END IF;

    IF public.get_user_role() <> 'admin' AND NOT EXISTS (
        SELECT 1 FROM public.lecturer_courses lc
        WHERE lc.lecturer_id = auth.uid()
          AND lc.course_id = v_course_id
          AND lc.session = v_session
          AND lc.semester = v_semester
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You are not assigned to this course.';
    END IF;

    UPDATE public.results
    SET status = 'submitted'
    WHERE id = p_result_id AND status = 'draft';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Result must be in draft status to be submitted.';
    END IF;

    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'SUBMIT_RESULT', 'results', p_result_id::TEXT, jsonb_build_object('status', 'submitted'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION approve_result(p_result_id INT)
RETURNS VOID AS $$
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can approve results.';
    END IF;

    UPDATE public.results
    SET status = 'approved'
    WHERE id = p_result_id AND status = 'submitted';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Result must be in submitted status to be approved.';
    END IF;

    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'APPROVE_RESULT', 'results', p_result_id::TEXT, jsonb_build_object('status', 'approved'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION reopen_result(p_result_id INT)
RETURNS VOID AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can reopen or return results.';
    END IF;

    SELECT status INTO v_current_status
    FROM public.results
    WHERE id = p_result_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Result not found.';
    END IF;

    IF v_current_status NOT IN ('submitted', 'approved') THEN
        RAISE EXCEPTION 'Result must be in submitted or approved status to be returned to draft.';
    END IF;

    UPDATE public.results
    SET status = 'draft'
    WHERE id = p_result_id;

    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'REOPEN_RESULT', 'results', p_result_id::TEXT, jsonb_build_object('previous_status', v_current_status, 'status', 'draft'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION get_student_results_with_summary(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
    result_json JSONB;
    total_completed_units INT;
    cumulative_cgpa NUMERIC(3,2);
    caller_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    caller_role := public.get_user_role();

    IF auth.uid() <> p_student_id AND caller_role = 'student' THEN
        RAISE EXCEPTION 'Unauthorized access to student results.';
    END IF;

    IF caller_role = 'lecturer' AND NOT EXISTS (
        SELECT 1 FROM public.student_registrations sr
        JOIN public.lecturer_courses lc ON lc.course_id = sr.course_id AND lc.session = sr.session AND lc.semester = sr.semester
        WHERE sr.student_id = p_student_id AND lc.lecturer_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Lecturer is not assigned to any courses for this student.';
    END IF;

    SELECT COALESCE(SUM(c.credit_units), 0) INTO total_completed_units
    FROM public.student_registrations sr
    JOIN public.courses c ON sr.course_id = c.id
    JOIN public.results r ON r.registration_id = sr.id
    WHERE sr.student_id = p_student_id AND r.status = 'approved' AND r.grade IS NOT NULL;

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
    ) INTO cumulative_cgpa
    FROM public.student_registrations sr
    JOIN public.courses c ON sr.course_id = c.id
    JOIN public.results r ON r.registration_id = sr.id
    WHERE sr.student_id = p_student_id AND r.status = 'approved' AND r.grade IS NOT NULL;

    SELECT jsonb_build_object(
        'courses', (
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'course_code', c.course_code,
                    'course_title', c.course_title,
                    'credit_units', c.credit_units,
                    'ca_score', r.ca_score,
                    'exam_score', r.exam_score,
                    'total_score', r.total_score,
                    'grade', r.grade,
                    'session', sr.session,
                    'semester', sr.semester,
                    'status', r.status
                )
            ), '[]'::jsonb)
        ),
        'summary', CASE 
            WHEN caller_role = 'lecturer' THEN NULL
            ELSE jsonb_build_object(
                'completed_units', total_completed_units,
                'cgpa', cumulative_cgpa
            )
        END
    ) INTO result_json
    FROM public.student_registrations sr
    JOIN public.courses c ON sr.course_id = c.id
    LEFT JOIN public.results r ON r.registration_id = sr.id
        AND (
            (caller_role = 'student' AND r.status = 'approved')
            OR caller_role = 'admin'
            OR (
                caller_role = 'lecturer' AND EXISTS (
                    SELECT 1 FROM public.lecturer_courses lc 
                    WHERE lc.lecturer_id = auth.uid() 
                      AND lc.course_id = c.id 
                      AND lc.session = sr.session 
                      AND lc.semester = sr.semester
                )
            )
        )
    WHERE sr.student_id = p_student_id
      AND (
          caller_role <> 'lecturer' 
          OR EXISTS (
              SELECT 1 FROM public.lecturer_courses lc 
              WHERE lc.lecturer_id = auth.uid() 
                AND lc.course_id = c.id 
                AND lc.session = sr.session 
                AND lc.semester = sr.semester
          )
      );

    RETURN result_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION submit_result(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION approve_result(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reopen_result(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_student_results_with_summary(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION submit_result(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_result(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_result(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_results_with_summary(UUID) TO authenticated;    

-- 1. Admin Policy for Student Registrations
DROP POLICY IF EXISTS "Admins insert registrations" ON student_registrations;
CREATE POLICY "Admins insert registrations" ON student_registrations 
FOR INSERT TO authenticated 
WITH CHECK (public.get_user_role() = 'admin');

-- 2. Updated Profile Protection Trigger Function
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admins to change anything
  IF public.get_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Check if user is updating their own profile
  IF auth.uid() = NEW.id THEN
    -- Lock sensitive fields from user tampering
    IF OLD.role IS DISTINCT FROM NEW.role OR
       OLD.matric_number IS DISTINCT FROM NEW.matric_number OR
       OLD.staff_id IS DISTINCT FROM NEW.staff_id OR
       OLD.email IS DISTINCT FROM NEW.email THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify protected profile fields.';
    END IF;

    -- Allow changing must_change_initial_password only downwards (true -> false)
    IF OLD.must_change_initial_password = false AND NEW.must_change_initial_password = true THEN
      RAISE EXCEPTION 'Cannot re-enable initial password change requirement.';
    END IF;

    RETURN NEW;
  END IF;

  -- Default block for updates to other profiles
  RAISE EXCEPTION 'Permission denied to update profile.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

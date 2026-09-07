/* LECTURER COURSES — all assigned courses. Reuses dashboard loading logic. */

const $ = (s) => document.querySelector(s);

async function loadCourses() {
  const {
    data: { user },
  } = await db.auth.getUser();
  const section = $("#coursesSection");
  if (!user) {
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>Please log in.</p></div></div>`;
    return;
  }

  const { data: assignments, error } = await db
    .from("lecturer_courses")
    .select(
      `id, session, semester, courses ( id, course_code, course_title, credit_units, level )`,
    )
    .eq("lecturer_id", user.id);

  if (error || !assignments || assignments.length === 0) {
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>No assigned courses yet.</p></div></div>`;
    return;
  }

  const courses = [];
  for (const a of assignments) {
    const c = a.courses;
    const { count: total } = await db
      .from("student_registrations")
      .select("*", { count: "exact", head: true })
      .eq("course_id", c.id)
      .eq("session", a.session)
      .eq("semester", a.semester);

    // count scored results via registrations for this course
    const { data: regs } = await db
      .from("student_registrations")
      .select("id")
      .eq("course_id", c.id)
      .eq("session", a.session)
      .eq("semester", a.semester);
    const regIds = (regs || []).map((r) => r.id);
    let results = [];
    if (regIds.length) {
      const { data: res } = await db
        .from("results")
        .select("status")
        .in("registration_id", regIds);
      results = res || [];
    }

    courses.push({
      id: c.id,
      code: c.course_code,
      title: c.course_title,
      level: c.level,
      units: c.credit_units,
      semester: a.semester,
      session: a.session,
      total: total || 0,
      scored: results.length,
      status: deriveStatus(results),
    });
  }

  renderCourses(courses);
}

function deriveStatus(results) {
  if (!results || results.length === 0) return "not-started";
  if (results.some((r) => r.status === "approved")) return "approved";
  if (results.some((r) => r.status === "submitted")) return "submitted";
  return "draft";
}
function statusBadge(status) {
  const map = {
    "not-started": ["status-not-started", "Not Started"],
    draft: ["status-draft", "Draft"],
    submitted: ["status-submitted", "Submitted"],
    approved: ["status-approved", "Approved"],
  };
  const [cls, label] = map[status] || map["not-started"];
  return `<span class="status-badge ${cls}">${label}</span>`;
}
function actionLabel(status) {
  if (status === "not-started") return "Enter Scores";
  if (status === "draft") return "Continue";
  return "View";
}
function progressClass(scored, total) {
  if (total === 0 || scored === 0) return "progress-danger";
  if (scored >= total) return "progress-success";
  return "progress-warning";
}

function renderCourses(courses) {
  const section = $("#coursesSection");
  section.innerHTML = courses
    .map((c) => {
      const pct = c.total ? Math.round((c.scored / c.total) * 100) : 0;
      return `
      <div class="course-card">
        <div class="course-info">
          <h3>${c.code} · ${c.title}</h3>
          <p>${c.level} Level · ${c.units} Units · ${c.semester} Semester · ${c.total} Students</p>
        </div>
        <div class="course-progress">
          <div class="progress-bar">
            <div class="progress-fill ${progressClass(c.scored, c.total)}" style="width:${pct}%"></div>
          </div>
          <p>${c.scored} / ${c.total} scored</p>
        </div>
        ${statusBadge(c.status)}
        <button class="course-button" onclick="location.href='score-entry.html?course=${c.id}&session=${encodeURIComponent(c.session)}&semester=${c.semester}'">
          ${actionLabel(c.status)}
        </button>
      </div>`;
    })
    .join("");
}

loadCourses();

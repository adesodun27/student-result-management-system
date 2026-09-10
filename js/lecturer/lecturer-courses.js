/* LECTURER COURSES — all assigned courses, filterable by semester (All / Harmattan / Rain). */

const $ = (s) => document.querySelector(s);

let allCourses = []; // holds every assigned course; we filter this for display

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

async function loadCourses() {
  const section = $("#coursesSection");
  const {
    data: { user },
  } = await db.auth.getUser();

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

  if (error) {
    console.error(error);
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>Couldn't load your courses. Please refresh the page.</p></div></div>`;
    return;
  }

  if (!assignments || assignments.length === 0) {
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>No assigned courses yet.</p></div></div>`;
    return;
  }

  allCourses = [];
  for (const a of assignments) {
    const c = a.courses;
    if (!c) continue;

    const { data: regs } = await db
      .from("student_registrations")
      .select("id")
      .eq("course_id", c.id)
      .eq("session", a.session)
      .eq("semester", a.semester);

    const regIds = (regs || []).map((r) => r.id);
    const total = regIds.length;

    let results = [];
    if (regIds.length) {
      const { data: res } = await db
        .from("results")
        .select("status")
        .in("registration_id", regIds);
      results = res || [];
    }

    allCourses.push({
      id: c.id,
      code: c.course_code,
      title: c.course_title,
      level: c.level,
      units: c.credit_units,
      semester: a.semester,
      session: a.session,
      total,
      scored: results.length,
      status: deriveStatus(results),
    });
  }

  applyFilter();
}

function applyFilter() {
  const filter = $("#semesterFilter").value; // "all" | "Harmattan" | "Rain"
  const list =
    filter === "all"
      ? allCourses
      : allCourses.filter((c) => c.semester === filter);
  renderCourses(list);
}

function renderCourses(courses) {
  const section = $("#coursesSection");

  if (courses.length === 0) {
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>No courses for this semester.</p></div></div>`;
    return;
  }

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

$("#semesterFilter").addEventListener("change", applyFilter);
loadCourses();

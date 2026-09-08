/* LECTURER DASHBOARD — wired to Supabase.
   Loads the logged-in lecturer's assigned courses + result progress. */

const $ = (s) => document.querySelector(s);

async function loadDashboard() {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    console.warn("No logged-in user yet");
    renderCourses([]);
    renderSummary([]);
    return;
  }

  // header profile
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, staff_id, department")
    .eq("id", user.id)
    .single();

  if (profile) {
    const welcome = document.querySelector(".welcome-message");
    const info = document.querySelector(".lecturer-info");
    if (welcome) welcome.textContent = `Welcome, ${profile.full_name} 👋`;
    if (info)
      info.textContent = `Staff ID · ${profile.staff_id || "—"} · ${profile.department || "—"}`;
  }

  // assigned courses
  const { data: assignments, error } = await db
    .from("lecturer_courses")
    .select(
      `id, session, semester, courses ( id, course_code, course_title, credit_units, level )`,
    )
    .eq("lecturer_id", user.id);

  if (error) {
    console.error(error);
    renderCourses([]);
    renderSummary([]);
    return;
  }

  const courses = [];
  for (const a of assignments || []) {
    const c = a.courses;

    // registrations for this course/session/semester
    const { data: regs } = await db
      .from("student_registrations")
      .select("id")
      .eq("course_id", c.id)
      .eq("session", a.session)
      .eq("semester", a.semester);

    const regIds = (regs || []).map((r) => r.id);
    const total = regIds.length;

    // results for those registrations
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
      total,
      scored: results.length,
      status: deriveStatus(results),
    });
  }

  renderCourses(courses);
  renderSummary(courses);
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
  const wrap = document.querySelector(".courses-section");
  wrap.querySelectorAll(".course-card").forEach((el) => el.remove());

  if (courses.length === 0) {
    const empty = document.createElement("div");
    empty.className = "course-card";
    empty.innerHTML = `<div class="course-info"><p>No assigned courses yet.</p></div>`;
    wrap.appendChild(empty);
    return;
  }

  const priority = { "not-started": 0, draft: 1, submitted: 2, approved: 3 };
  const shortlist = [...courses]
    .sort((a, b) => priority[a.status] - priority[b.status])
    .slice(0, 2);

  shortlist.forEach((c) => {
    const pct = c.total ? Math.round((c.scored / c.total) * 100) : 0;
    const card = document.createElement("div");
    card.className = "course-card";
    card.innerHTML = `
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
      </button>`;
    wrap.appendChild(card);
  });
}

function renderSummary(courses) {
  const assigned = courses.length;
  const pending = courses.filter(
    (c) => c.status === "not-started" || c.status === "draft",
  ).length;
  const submitted = courses.filter((c) => c.status === "submitted").length;
  const approved = courses.filter((c) => c.status === "approved").length;

  const cards = document.querySelectorAll(".summary-card h3");
  if (cards.length >= 4) {
    cards[0].textContent = assigned;
    cards[1].textContent = pending;
    cards[2].textContent = submitted;
    cards[3].textContent = approved;
  }
}

loadDashboard();

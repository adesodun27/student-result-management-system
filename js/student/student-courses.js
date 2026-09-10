/* STUDENT COURSES — registrations + result status, filterable by semester. */

const $ = (s) => document.querySelector(s);

let allRegs = []; // every registration; filtered for display

async function loadCourses() {
  const {
    data: { user },
  } = await db.auth.getUser();
  const section = $("#coursesSection");

  if (!user) {
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>Please log in.</p></div></div>`;
    return;
  }

  const { data: regs, error } = await db
    .from("student_registrations")
    .select(
      `
      id, session, semester,
      courses ( course_code, course_title, credit_units, level ),
      results ( status )
    `,
    )
    .eq("student_id", user.id);

  if (error) {
    console.error(error);
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>Couldn't load your courses. Please refresh the page.</p></div></div>`;
    return;
  }

  if (!regs || regs.length === 0) {
    $("#unitCount").textContent = "0 units";
    $("#unitLabel").textContent =
      "registered — you have no registered courses yet.";
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>No registered courses yet.</p></div></div>`;
    return;
  }

  allRegs = regs;
  applyFilter();
}

function applyFilter() {
  const filter = $("#semesterFilter").value; // "all" | "Harmattan" | "Rain"
  const list =
    filter === "all" ? allRegs : allRegs.filter((r) => r.semester === filter);

  const section = $("#coursesSection");

  // total units for the filtered view
  const totalUnits = list.reduce(
    (sum, r) => sum + (r.courses?.credit_units || 0),
    0,
  );
  $("#unitCount").textContent = `${totalUnits} units`;
  $("#unitLabel").textContent =
    filter === "all"
      ? "registered across all semesters."
      : `registered for ${filter} semester.`;

  if (list.length === 0) {
    section.innerHTML = `<div class="course-card"><div class="course-info"><p>No registered courses for this semester.</p></div></div>`;
    return;
  }

  section.innerHTML = list
    .map((r) => {
      const c = r.courses;
      const result = Array.isArray(r.results) ? r.results[0] : r.results;
      const status = result ? result.status : null;

      let badge, note, fill;
      if (status === "approved") {
        badge = `<span class="status-badge status-approved">Completed</span>`;
        note = "Result available";
        fill = "progress-success";
      } else if (status === "submitted") {
        badge = `<span class="status-badge status-submitted">Awaiting Approval</span>`;
        note = "Result submitted";
        fill = "progress-warning";
      } else if (status === "draft") {
        badge = `<span class="status-badge status-draft">In Progress</span>`;
        note = "Being graded";
        fill = "progress-warning";
      } else {
        badge = `<span class="status-badge status-not-started">Registered</span>`;
        note = "No result yet";
        fill = "progress-danger";
      }

      return `
      <div class="course-card">
        <div class="course-info">
          <h3>${c ? c.course_code + " · " + c.course_title : "—"}</h3>
          <p>${c ? c.level + " Level · " + c.credit_units + " Units" : ""} · ${r.semester} Semester</p>
        </div>
        <div class="course-progress">
          <div class="progress-bar"><div class="progress-fill ${fill}"></div></div>
          <p>${note}</p>
        </div>
        ${badge}
      </div>`;
    })
    .join("");
}

$("#semesterFilter").addEventListener("change", applyFilter);
loadCourses();

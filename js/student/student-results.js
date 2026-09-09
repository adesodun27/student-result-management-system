/* STUDENT RESULTS — wired to Supabase (get_student_results_with_summary). */

const $ = (s) => document.querySelector(s);

function gradeClass(g) {
  if (g === "A" || g === "B") return "grade-high";
  if (g === "C" || g === "D") return "grade-mid";
  return "grade-low";
}

// overall class from CGPA
function classOfDegree(cgpa) {
  const g = Number(cgpa) || 0;
  if (g >= 4.5) return "First Class";
  if (g >= 3.5) return "Second Class Upper";
  if (g >= 2.0) return "Second Class Lower";
  if (g >= 1.0) return "Third Class";
  return "Failed";
}

// individual course status from score
function courseStatus(score) {
  return Number(score) >= 40 ? "Passed" : "Carry Over";
}
function gradePoint(g) {
  return { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }[g] ?? 0;
}
// safe setter — won't crash if an element is missing
function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadResults() {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    $("#resultsBody").innerHTML =
      `<tr><td colspan="7" style="text-align:center;color:#999;padding:26px">Please log in.</td></tr>`;
    return;
  }

  const { data, error } = await db.rpc("get_student_results_with_summary", {
    p_student_id: user.id,
  });

  if (error) {
    console.error(error);
    $("#resultsBody").innerHTML =
      `<tr><td colspan="7" style="text-align:center;color:#d9534f;padding:26px">Couldn't load: ${error.message}</td></tr>`;
    return;
  }

  const courses = (data && data.courses) || [];
  const summary = (data && data.summary) || { cgpa: 0, completed_units: 0 };
  const approved = courses.filter((c) => c.status === "approved");

  // summary cards
  set("cardGpa", summary.cgpa ?? "—");
  set("cardCount", approved.length);
  set("cardUnits", summary.completed_units ?? "—");
set("cardStatus", classOfDegree(summary.cgpa));

  // results table
  if (approved.length === 0) {
    $("#resultsBody").innerHTML =
      `<tr><td colspan="7" style="text-align:center;color:#999;padding:26px">No approved results yet.</td></tr>`;
    return;
  }

  $("#resultsBody").innerHTML = approved
    .map((c) => {
      const status = courseStatus(c.total_score);
      const badge =
        status === "Passed"
          ? `<span class="status-badge status-approved">Passed</span>`
          : `<span class="status-badge status-not-started">Carry Over</span>`;
      return `
    <tr>
      <td class="name">${c.course_code}</td>
      <td>${c.course_title}</td>
      <td class="r">${c.credit_units}</td>
      <td class="r">${c.total_score ?? "—"}</td>
      <td><span class="grade-tag ${gradeClass(c.grade)}">${c.grade || "—"}</span></td>
      <td class="r">${gradePoint(c.grade).toFixed(2)}</td>
      <td>${badge}</td>
    </tr>`;
    })
    .join("");
}

loadResults();

/* STUDENT RESULTS — wired to Supabase (get_student_results_with_summary). */

const $ = (s) => document.querySelector(s);

function gradeClass(g) {
  if (g === "A" || g === "B") return "grade-high";
  if (g === "C" || g === "D") return "grade-mid";
  return "grade-low";
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
  set("cardStatus", summary.cgpa >= 1.5 ? "Good Standing" : "—");

  // results table
  if (approved.length === 0) {
    $("#resultsBody").innerHTML =
      `<tr><td colspan="7" style="text-align:center;color:#999;padding:26px">No approved results yet.</td></tr>`;
    return;
  }

  $("#resultsBody").innerHTML = approved
    .map(
      (c) => `
    <tr>
      <td class="name">${c.course_code}</td>
      <td>${c.course_title}</td>
      <td class="r">${c.credit_units}</td>
      <td class="r">${c.total_score ?? "—"}</td>
      <td><span class="grade-tag ${gradeClass(c.grade)}">${c.grade || "—"}</span></td>
      <td class="r">${gradePoint(c.grade).toFixed(2)}</td>
      <td><span class="status-badge status-approved">Approved</span></td>
    </tr>`,
    )
    .join("");
}

loadResults();

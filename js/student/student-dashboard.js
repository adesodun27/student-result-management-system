/* STUDENT DASHBOARD — wired to Supabase. */

const $ = (s) => document.querySelector(s);

function gradeClass(g) {
  if (g === "A" || g === "B") return "grade-high";
  if (g === "C" || g === "D") return "grade-mid";
  return "grade-low";
}
function classOfDegree(cgpa) {
  const g = Number(cgpa) || 0;
  if (g >= 4.5) return "First Class";
  if (g >= 3.5) return "Second Class Upper";
  if (g >= 2.0) return "Second Class Lower";
  if (g >= 1.0) return "Third Class";
  return "Failed";
}
function courseStatus(score) {
  return Number(score) >= 40 ? "Passed" : "Carry Over";
}
function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadDashboard() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    $("#recentResults").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:26px">Please log in.</td></tr>`;
    return;
  }

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, matric_number, department, level")
    .eq("id", user.id)
    .single();

  if (profile) {
    set("welcomeName", `Welcome, ${profile.full_name} 👋`);
    set("studentInfo", `Matric No · ${profile.matric_number || "—"} · ${profile.department || "—"}`);
    set("cardLevel", profile.level || "—");
  }

  const { data, error } = await db.rpc("get_student_results_with_summary", {
    p_student_id: user.id,
  });

  if (error) {
    console.error(error);
    $("#recentResults").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:26px">Couldn't load results: ${error.message}</td></tr>`;
    return;
  }

  const courses = (data && data.courses) || [];
  const summary = (data && data.summary) || { cgpa: 0, completed_units: 0 };
  const approved = courses.filter((c) => c.status === "approved");

  // summary cards
  set("cardGpa", summary.cgpa ?? "—");
  set("cardCompleted", approved.length);
  set("cardStatus", classOfDegree(summary.cgpa));

  // academic overview
  set("ovCgpa", (summary.cgpa ?? 0) + " / 5.00");
  set("ovUnits", summary.completed_units ?? "—");

  // recent results
  if (approved.length === 0) {
    $("#recentResults").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:26px">No approved results yet.</td></tr>`;
    return;
  }

  $("#recentResults").innerHTML = approved.slice(0, 5).map((c) => {
    const status = courseStatus(c.total_score);
    const badge = status === "Passed"
      ? `<span class="status-badge status-approved">Passed</span>`
      : `<span class="status-badge status-not-started">Carry Over</span>`;
    return `
      <tr>
        <td class="name">${c.course_code}</td>
        <td>${c.course_title}</td>
        <td class="r">${c.credit_units}</td>
        <td class="r">${c.total_score ?? "—"}</td>
        <td><span class="grade-tag ${gradeClass(c.grade)}">${c.grade || "—"}</span></td>
        <td>${badge}</td>
      </tr>`;
  }).join("");
}

loadDashboard();
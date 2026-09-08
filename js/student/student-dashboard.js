/* STUDENT DASHBOARD — wired to Supabase.
   Uses get_student_results_with_summary() → courses + GPA summary. */

const $ = (s) => document.querySelector(s);

function gradeClass(g) {
  if (g === "A" || g === "B") return "grade-high";
  if (g === "C" || g === "D") return "grade-mid";
  return "grade-low";
}

async function loadDashboard() {
  const {
    data: { user },
  } = await db.auth.getUser();
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
    $("#welcomeName").textContent = `Welcome, ${profile.full_name} 👋`;
    $("#studentInfo").textContent =
      `Matric No · ${profile.matric_number || "—"} · ${profile.department || "—"}`;
    $("#cardLevel").textContent = profile.level || "—";
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
  $("#cardCompleted").textContent = approved.length;
  $("#cardStatus").textContent = summary.cgpa >= 1.5 ? "Good Standing" : "—";

  // academic overview
  $("#ovCgpa").textContent = (summary.cgpa ?? 0) + " / 5.00";
  $("#ovUnits").textContent = summary.completed_units ?? "—";
  $("#ovGrad").textContent = "—"; // no graduation data in DB

  // recent results (approved)
  if (approved.length === 0) {
    $("#recentResults").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:26px">No approved results yet.</td></tr>`;
    return;
  }
  $("#recentResults").innerHTML = approved
    .slice(0, 5)
    .map(
      (c) => `
    <tr>
      <td class="name">${c.course_code}</td>
      <td>${c.course_title}</td>
      <td class="r">${c.credit_units}</td>
      <td class="r">${c.total_score ?? "—"}</td>
      <td><span class="grade-tag ${gradeClass(c.grade)}">${c.grade || "—"}</span></td>
      <td><span class="status-badge status-approved">Approved</span></td>
    </tr>`,
    )
    .join("");
}

loadDashboard();

/* ADMIN APPROVALS — wired to Supabase.
   Lists courses with SUBMITTED results, lets admin review + approve.
   Approve = update results set status='approved' for that course/session/semester. */

const $ = (s) => document.querySelector(s);
let groups = []; // [{ key, course, session, semester, count, rows }]
let current = null;

async function loadSubmitted() {
  // get all submitted results, joined to student + course info
  const { data, error } = await db
    .from("results")
    .select(
      `
      id, student_id, course_id, ca_score, exam_score, total_score, grade, session, semester, status,
      courses ( course_code, course_title ),
      profiles ( full_name, matric_number )
    `,
    )
    .eq("status", "submitted");

  if (error) {
    console.error(error);
    $("#submittedList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:30px">
        Couldn't load: ${error.message}
      </td></tr>`;
    return;
  }

  // group the result rows by course + session + semester
  const map = {};
  (data || []).forEach((r) => {
    const key = `${r.course_id}|${r.session}|${r.semester}`;
    if (!map[key]) {
      map[key] = {
        key,
        course_id: r.course_id,
        code: r.courses?.course_code || "—",
        title: r.courses?.course_title || "—",
        session: r.session,
        semester: r.semester,
        rows: [],
      };
    }
    map[key].rows.push({
      name: r.profiles?.full_name || "—",
      matric: r.profiles?.matric_number || "—",
      ca: r.ca_score,
      exam: r.exam_score,
      total: r.total_score,
      grade: r.grade,
    });
  });

  groups = Object.values(map);

  // look up the lecturer for each group (course + session + semester)
  const { data: assignments } = await db
    .from("lecturer_courses")
    .select(`course_id, session, semester, profiles ( full_name )`);

  groups.forEach((g) => {
    const match = (assignments || []).find(
      (a) =>
        a.course_id === g.course_id &&
        a.session === g.session &&
        a.semester === g.semester,
    );
    g.lecturer = match?.profiles?.full_name || "—";
  });

  renderList();
}

function gradeClass(g) {
  if (g === "A" || g === "B") return "grade-high";
  if (g === "C" || g === "D") return "grade-mid";
  return "grade-low";
}

/* ---- list view ---- */
function renderList() {
  if (groups.length === 0) {
    $("#submittedList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">
        No results waiting for approval.
      </td></tr>`;
    return;
  }
  $("#submittedList").innerHTML = groups
    .map(
      (g, i) => `
    <tr>
      <td class="name">${g.code} · ${g.title}</td>
            <td>${g.lecturer || "—"}</td>
      <td class="r">${g.rows.length}</td>
      <td>${g.session} · ${g.semester}</td>
      <td><span class="status-badge status-submitted">Submitted</span></td>
      <td class="r"><button class="btn-sm" data-i="${i}">Review</button></td>
    </tr>`,
    )
    .join("");

  document
    .querySelectorAll("[data-i]")
    .forEach((b) =>
      b.addEventListener("click", () => openDetail(+b.dataset.i)),
    );
}

/* ---- detail view ---- */
function openDetail(i) {
  current = groups[i];

  $("#detailTitle").textContent = current.code + " · " + current.title;
  $("#detailMeta").innerHTML =
    current.session +
    " <span class='dot'>·</span> " +
    current.semester +
    " <span class='dot'>·</span> " +
    current.rows.length +
    " Students";

  $("#detailRoster").innerHTML = current.rows
    .map(
      (r, n) => `
    <tr>
      <td class="idx">${n + 1}</td>
      <td class="name">${r.name}</td>
      <td class="r">${r.ca}</td>
      <td class="r">${r.exam}</td>
      <td class="r"><span class="total-val">${r.total}</span></td>
      <td><span class="grade-tag ${gradeClass(r.grade)}">${r.grade}</span></td>
    </tr>`,
    )
    .join("");

  $("#actionHint").textContent =
    `Approving publishes all ${current.rows.length} results to students.`;

  $("#listView").classList.add("hidden");
  $("#detailView").classList.remove("hidden");
  $("#actionBar").classList.remove("hidden");
}

function backToList() {
  $("#detailView").classList.add("hidden");
  $("#actionBar").classList.add("hidden");
  $("#listView").classList.remove("hidden");
  current = null;
}

/* ---- approve ---- */
async function approve() {
  if (!current) return;

  const { error } = await db
    .from("results")
    .update({ status: "approved" })
    .eq("course_id", current.course_id)
    .eq("session", current.session)
    .eq("semester", current.semester)
    .eq("status", "submitted"); // only flip the submitted ones

  if (error) {
    toast("Couldn't approve: " + error.message, true);
    return;
  }
  toast(`${current.code} approved — published to students`);
  backToList();
  await loadSubmitted(); // refresh list (approved ones drop off)
}

function returnToLecturer() {
  // schema has no 'returned' state — not available
  toast(
    "Return isn't available — needs a 'returned' status in the database",
    true,
  );
}

/* ---- toast ---- */
let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2600);
}

/* ---- go ---- */
$("#backToList").addEventListener("click", (e) => {
  e.preventDefault();
  backToList();
});
$("#approveBtn").addEventListener("click", approve);
$("#returnBtn").addEventListener("click", returnToLecturer);
loadSubmitted();

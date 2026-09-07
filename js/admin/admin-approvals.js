/* ADMIN APPROVALS — wired to Supabase (new schema).
   Results attach to registration_id. Approve uses approve_result() RPC per row.
   Lists submitted results grouped by course. */

const $ = (s) => document.querySelector(s);
let groups = [];
let current = null;

async function loadSubmitted() {
  // submitted results → join through registration → student + course
  const { data, error } = await db
    .from("results")
    .select(
      `
      id, ca_score, exam_score, total_score, grade, status,
      student_registrations (
        course_id, session, semester,
        profiles ( full_name, matric_number ),
        courses ( course_code, course_title )
      )
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

  // group by course + session + semester
  const map = {};
  (data || []).forEach((r) => {
    const reg = r.student_registrations;
    if (!reg) return;
    const key = `${reg.course_id}|${reg.session}|${reg.semester}`;
    if (!map[key]) {
      map[key] = {
        key,
        course_id: reg.course_id,
        code: reg.courses?.course_code || "—",
        title: reg.courses?.course_title || "—",
        session: reg.session,
        semester: reg.semester,
        rows: [],
      };
    }
    map[key].rows.push({
      result_id: r.id,
      name: reg.profiles?.full_name || "—",
      matric: reg.profiles?.matric_number || "—",
      ca: r.ca_score,
      exam: r.exam_score,
      total: r.total_score,
      grade: r.grade,
    });
  });

  groups = Object.values(map);

  // lecturer name per group
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

/* approve — call approve_result() RPC for each result row */
async function approve() {
  if (!current) return;

  let failed = 0;
  for (const r of current.rows) {
    const { error } = await db.rpc("approve_result", {
      p_result_id: r.result_id,
    });
    if (error) {
      console.error(error);
      failed++;
    }
  }

  if (failed > 0) {
    toast(`Approved with ${failed} error(s) — check console`, true);
  } else {
    toast(`${current.code} approved — published to students`);
  }
  backToList();
  await loadSubmitted();
}

/* return to lecturer — reopen_result() only works on APPROVED results,
   so it can't return a 'submitted' one. Not usable from here. */
function returnToLecturer() {
  toast(
    "Return isn't available for submitted results — only admin can reopen approved ones",
    true,
  );
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2600);
}

$("#backToList").addEventListener("click", (e) => {
  e.preventDefault();
  backToList();
});
$("#approveBtn").addEventListener("click", approve);
$("#returnBtn").addEventListener("click", returnToLecturer);
loadSubmitted();

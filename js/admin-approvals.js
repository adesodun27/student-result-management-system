/* ADMIN APPROVALS — mock data, wire to Supabase later.
   Real query: results where status = 'submitted', grouped by course.
   Approve → update results set status = 'approved' where course + session. */

const SUBMITTED = {
  CSC401: {
    code: "CSC 401",
    title: "Software Engineering",
    lecturer: "Dr. Adesodun",
    session: "2024/2025 · Harmattan",
    roster: [
      { name: "Adebayo Chidinma", ca: 24, exam: 58 },
      { name: "Okonkwo Emeka", ca: 18, exam: 41 },
      { name: "Ibrahim Fatima", ca: 29, exam: 66 },
      { name: "Nwosu Kelechi", ca: 20, exam: 45 },
    ],
  },
  CSC302: {
    code: "CSC 302",
    title: "Operating Systems",
    lecturer: "Dr. Okafor",
    session: "2024/2025 · Harmattan",
    roster: [
      { name: "Ahmed Yusuf", ca: 26, exam: 60 },
      { name: "Obi Ngozi", ca: 20, exam: 52 },
      { name: "Lawal Aisha", ca: 28, exam: 63 },
    ],
  },
  MTH201: {
    code: "MTH 201",
    title: "Linear Algebra",
    lecturer: "Prof. Bello",
    session: "2024/2025 · Harmattan",
    roster: [
      { name: "Musa Ibrahim", ca: 22, exam: 55 },
      { name: "Grace John", ca: 27, exam: 61 },
    ],
  },
};

/* grade preview — mirrors SQL 5.0 scale */
function computeGrade(total) {
  if (total >= 70) return { grade: "A", cls: "grade-high" };
  if (total >= 60) return { grade: "B", cls: "grade-high" };
  if (total >= 50) return { grade: "C", cls: "grade-mid" };
  if (total >= 45) return { grade: "D", cls: "grade-mid" };
  if (total >= 40) return { grade: "E", cls: "grade-low" };
  return { grade: "F", cls: "grade-low" };
}

const $ = (s) => document.querySelector(s);
let currentCode = null;

/* ---- list view ---- */
function renderList() {
  const rows = Object.entries(SUBMITTED);
  if (rows.length === 0) {
    $("#submittedList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">
        No results waiting for approval.
      </td></tr>`;
    return;
  }
  $("#submittedList").innerHTML = rows
    .map(
      ([id, c]) => `
    <tr>
      <td class="name">${c.code} · ${c.title}</td>
      <td>${c.lecturer}</td>
      <td class="r">${c.roster.length}</td>
      <td>${c.session}</td>
      <td><span class="status-badge status-submitted">Submitted</span></td>
      <td class="r"><button class="btn-sm" data-open="${id}">Review</button></td>
    </tr>`,
    )
    .join("");

  document
    .querySelectorAll("[data-open]")
    .forEach((b) =>
      b.addEventListener("click", () => openDetail(b.dataset.open)),
    );
}

/* ---- detail view ---- */
function openDetail(code) {
  currentCode = code;
  const c = SUBMITTED[code];

  $("#detailTitle").textContent = c.code + " · " + c.title;
  $("#detailMeta").innerHTML =
    c.lecturer +
    " <span class='dot'>·</span> " +
    c.session +
    " <span class='dot'>·</span> " +
    c.roster.length +
    " Students";

  $("#detailRoster").innerHTML = c.roster
    .map((r, i) => {
      const total = r.ca + r.exam;
      const g = computeGrade(total);
      return `
      <tr>
        <td class="idx">${i + 1}</td>
        <td class="name">${r.name}</td>
        <td class="r">${r.ca}</td>
        <td class="r">${r.exam}</td>
        <td class="r"><span class="total-val">${total}</span></td>
        <td><span class="grade-tag ${g.cls}">${g.grade}</span></td>
      </tr>`;
    })
    .join("");

  $("#actionHint").textContent =
    `Approving publishes all ${c.roster.length} results to students.`;

  $("#listView").classList.add("hidden");
  $("#detailView").classList.remove("hidden");
  $("#actionBar").classList.remove("hidden");
}

function backToList() {
  $("#detailView").classList.add("hidden");
  $("#actionBar").classList.add("hidden");
  $("#listView").classList.remove("hidden");
  currentCode = null;
}

/* ---- actions ---- */
function approve() {
  const c = SUBMITTED[currentCode];
  // → Supabase: update results set status='approved'
  //   where course_id = ... and session = ... and status = 'submitted'
  toast(`${c.code} approved — results published to students`);
  delete SUBMITTED[currentCode]; // remove from pending list
  backToList();
  renderList();
}

function returnToLecturer() {
  // NOTE: schema has no 'returned' state (only draft/submitted/approved).
  // To make this real, Rodiyat must add a status like 'returned'.
  // For now it just informs — no DB change possible.
  toast(
    "Return isn't available yet — needs a 'returned' status in the database",
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
renderList();

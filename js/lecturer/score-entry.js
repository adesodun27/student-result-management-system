/* SCORE ENTRY — wired to Supabase (new registration_id model).
   Results attach to student_registrations.id (registration_id).
   Grade is auto-computed by the DB. Submit uses submit_result() RPC.
   URL: ?course=ID&session=2024/2025&semester=Harmattan */

const $ = (s) => document.querySelector(s);

/* grade preview only — DB is the source of truth */
function computeGrade(total) {
  if (total >= 70) return { grade: "A", point: 5 };
  if (total >= 60) return { grade: "B", point: 4 };
  if (total >= 50) return { grade: "C", point: 3 };
  if (total >= 45) return { grade: "D", point: 2 };
  if (total >= 40) return { grade: "E", point: 1 };
  return { grade: "F", point: 0 };
}
function gradeClass(g) {
  if (g === "A" || g === "B") return "grade-high";
  if (g === "C" || g === "D") return "grade-mid";
  return "grade-low";
}
const CA_MAX = 30,
  EXAM_MAX = 70;

const params = new URLSearchParams(location.search);
const COURSE_ID = params.get("course");
const SESSION = params.get("session");
const SEMESTER = params.get("semester");

let course = null;
let roster = []; // [{ registration_id, result_id, name, matric, ca, exam, status }]
let courseStatus = "not-started";

async function load() {
  if (!COURSE_ID || !SESSION || !SEMESTER) {
    $("#courseTitle").textContent = "Missing course info";
    $("#courseMeta").textContent = "Open this page from the dashboard.";
    $("#lockedNote").classList.add("hidden");
    return;
  }

  // course details
  const { data: c } = await db
    .from("courses")
    .select("*")
    .eq("id", COURSE_ID)
    .single();
  if (!c) {
    $("#courseTitle").textContent = "Course not found";
    return;
  }
  course = c;

  // registrations for this course/session/semester + student profile
  const { data: regs } = await db
    .from("student_registrations")
    .select(`id, student_id, profiles ( full_name, matric_number )`)
    .eq("course_id", COURSE_ID)
    .eq("session", SESSION)
    .eq("semester", SEMESTER);

  // existing results for those registrations
  const regIds = (regs || []).map((r) => r.id);
  let existing = [];
  if (regIds.length) {
    const { data: res } = await db
      .from("results")
      .select("id, registration_id, ca_score, exam_score, status")
      .in("registration_id", regIds);
    existing = res || [];
  }

  roster = (regs || []).map((reg) => {
    const found = existing.find((e) => e.registration_id === reg.id);
    return {
      registration_id: reg.id,
      result_id: found ? found.id : null,
      name: reg.profiles?.full_name || "—",
      matric: reg.profiles?.matric_number || "—",
      ca: found ? found.ca_score : null,
      exam: found ? found.exam_score : null,
      status: found ? found.status : null,
    };
  });

  if (existing.some((e) => e.status === "approved")) courseStatus = "approved";
  else if (existing.some((e) => e.status === "submitted"))
    courseStatus = "submitted";
  else if (existing.length) courseStatus = "draft";
  else courseStatus = "not-started";

  render();
}

function fieldError(v, max) {
  if (v === null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return "must be a number";
  if (n < 0) return "no negatives";
  if (n > max) return "max " + max;
  return null;
}

function render() {
  const locked = courseStatus === "submitted" || courseStatus === "approved";

  $("#courseTitle").textContent =
    course.course_code + " · " + course.course_title;
  $("#courseMeta").innerHTML =
    course.level +
    " Level <span class='dot'>·</span> " +
    course.credit_units +
    " Units <span class='dot'>·</span> " +
    SEMESTER +
    " Semester <span class='dot'>·</span> " +
    roster.length +
    " Students";

  const map = {
    "not-started": ["status-not-started", "Not Started"],
    draft: ["status-draft", "Draft"],
    submitted: ["status-submitted", "Submitted"],
    approved: ["status-approved", "Approved"],
  };
  const [cls, label] = map[courseStatus] || map["not-started"];
  const badge = $("#statusBadge");
  badge.className = "status-badge " + cls;
  badge.textContent = label;

  $("#lockedNote").classList.toggle("hidden", !locked);

  if (roster.length === 0) {
    $("#roster").innerHTML =
      `<tr><td colspan="8" style="text-align:center;color:#999;padding:30px">
        No students registered for this course yet.
      </td></tr>`;
    updateFooter();
    return;
  }

  $("#roster").innerHTML = roster
    .map((r, i) => {
      const caErr = fieldError(r.ca, CA_MAX);
      const exErr = fieldError(r.exam, EXAM_MAX);
      const done =
        r.ca !== null &&
        r.ca !== "" &&
        r.exam !== null &&
        r.exam !== "" &&
        !caErr &&
        !exErr;
      const total = done ? Number(r.ca) + Number(r.exam) : null;
      const g = total === null ? null : computeGrade(total);
      return `
      <tr>
        <td class="idx">${i + 1}</td>
        <td class="matric">${r.matric}</td>
        <td class="name">${r.name}</td>
        <td class="r">
          <input class="score-input ${caErr ? "invalid" : ""}" data-i="${i}" data-f="ca"
                 inputmode="decimal" placeholder="—" value="${r.ca ?? ""}" ${locked ? "disabled" : ""}>
          ${caErr ? `<div class="row-msg">${caErr}</div>` : ""}
        </td>
        <td class="r">
          <input class="score-input ${exErr ? "invalid" : ""}" data-i="${i}" data-f="exam"
                 inputmode="decimal" placeholder="—" value="${r.exam ?? ""}" ${locked ? "disabled" : ""}>
          ${exErr ? `<div class="row-msg">${exErr}</div>` : ""}
        </td>
        <td class="r"><span class="total-val ${total === null ? "empty" : ""}">${total === null ? "—" : total}</span></td>
        <td>${g ? `<span class="grade-tag ${gradeClass(g.grade)}">${g.grade}</span>` : `<span class="grade-tag grade-none">—</span>`}</td>
        <td class="r"><span class="gp-val">${g ? g.point.toFixed(1) : "—"}</span></td>
      </tr>`;
    })
    .join("");

  $("#roster")
    .querySelectorAll(".score-input")
    .forEach((inp) => inp.addEventListener("input", onEdit));
  updateFooter();
}

function onEdit(e) {
  const i = +e.target.dataset.i,
    f = e.target.dataset.f;
  const raw = e.target.value.trim();
  roster[i][f] = raw === "" ? null : raw;
  render();
  const again = document.querySelector(
    `.score-input[data-i="${i}"][data-f="${f}"]`,
  );
  if (again) {
    again.focus();
    again.setSelectionRange(again.value.length, again.value.length);
  }
}

function rosterState() {
  let scored = 0,
    invalid = 0,
    blank = 0;
  roster.forEach((r) => {
    const caErr = fieldError(r.ca, CA_MAX),
      exErr = fieldError(r.exam, EXAM_MAX);
    if (caErr || exErr) invalid++;
    const hasCa = r.ca !== null && r.ca !== "";
    const hasEx = r.exam !== null && r.exam !== "";
    if (hasCa && hasEx && !caErr && !exErr) scored++;
    if (!hasCa || !hasEx) blank++;
  });
  return { scored, invalid, blank, total: roster.length };
}

function updateFooter() {
  const locked = courseStatus === "submitted" || courseStatus === "approved";
  const st = rosterState();
  $("#progress").innerHTML =
    `<b>${st.scored}</b> of <b>${st.total}</b> students scored`;

  const hint = $("#actionHint"),
    submitBtn = $("#submitBtn"),
    saveBtn = $("#saveBtn");
  if (locked) {
    saveBtn.disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitted";
    hint.className = "action-hint";
    hint.textContent = "Locked — already submitted.";
    return;
  }
  submitBtn.textContent = "Submit Results";
  saveBtn.disabled = false;
  if (st.invalid > 0) {
    submitBtn.disabled = true;
    hint.className = "action-hint blocked";
    hint.textContent = `${st.invalid} row(s) out of range — fix before submitting.`;
  } else if (st.blank > 0) {
    submitBtn.disabled = true;
    hint.className = "action-hint";
    hint.textContent = `${st.blank} student(s) still need scores. You can save a draft anytime.`;
  } else {
    submitBtn.disabled = false;
    hint.className = "action-hint";
    hint.textContent = "All students scored — ready to submit.";
  }
}

/* rows to upsert — registration_id + scores only. No grade (DB computes). */
function buildRows() {
  return roster
    .filter(
      (r) => r.ca !== null && r.ca !== "" && r.exam !== null && r.exam !== "",
    )
    .map((r) => ({
      registration_id: r.registration_id,
      ca_score: Number(r.ca),
      exam_score: Number(r.exam),
    }));
}

async function saveDraft() {
  const rows = buildRows();
  if (rows.length === 0) {
    toast("Nothing to save yet", true);
    return;
  }

  const { error } = await db
    .from("results")
    .upsert(rows, { onConflict: "registration_id" });
  if (error) {
    toast("Couldn't save: " + error.message, true);
    return;
  }
  toast("Draft saved");
  await load(); // reload to pick up new result_ids
}

async function submitResults() {
  const submitBtn = $("#submitBtn");
  submitBtn.disabled = true; // prevent double-click

  const st = rosterState();
  if (st.invalid > 0 || st.blank > 0) {
    submitBtn.disabled = false; // re-enable if we bail out here
    toast("Fix errors / fill all scores first", true);
    return;
  }

  // 1. make sure all rows are saved first (so every result has an id)
  const rows = buildRows();
  const { error: saveErr } = await db
    .from("results")
    .upsert(rows, { onConflict: "registration_id" });
  if (saveErr) {
    toast("Couldn't save before submit: " + saveErr.message, true);
    return;
  }

  // 2. reload to get the result ids
  await load();

  // 3. call submit_result() for each result row
  let failed = 0;
  for (const r of roster) {
    if (!r.result_id) {
      failed++;
      continue;
    }
    const { error } = await db.rpc("submit_result", {
      p_result_id: r.result_id,
    });
    if (error) {
      console.error(error);
      failed++;
    }
  }

  if (failed > 0) {
    toast(`Submitted with ${failed} error(s) — check console`, true);
  } else {
    toast("Results submitted");
  }
  await load();
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2400);
}

$("#saveBtn").addEventListener("click", saveDraft);
$("#submitBtn").addEventListener("click", submitResults);
load();

/* SCORE ENTRY — wired to Supabase.
   Loads roster (students registered for this course) + any existing results.
   Save Draft / Submit write to the results table.
   URL params: ?course=ID&session=2024/2025&semester=Harmattan */

const $ = (s) => document.querySelector(s);

/* grade engine — mirrors GPA function's 5.0 scale */
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

/* read URL params */
const params = new URLSearchParams(location.search);
const COURSE_ID = params.get("course");
const SESSION = params.get("session");
const SEMESTER = params.get("semester");

let course = null; // course details
let roster = []; // [{ student_id, matric, name, ca, exam }]
let courseStatus = "not-started";

async function load() {
  if (!COURSE_ID || !SESSION || !SEMESTER) {
    $("#courseTitle").textContent = "Missing course info";
    $("#courseMeta").textContent = "Open this page from the dashboard.";
    return;
  }

  // 1. course details
  const { data: c, error: cErr } = await db
    .from("courses")
    .select("*")
    .eq("id", COURSE_ID)
    .single();

  if (cErr || !c) {
    $("#courseTitle").textContent = "Course not found";
    console.error(cErr);
    return;
  }
  course = c;

  // 2. students registered for this course/session/semester (+ their profile)
  const { data: regs, error: rErr } = await db
    .from("student_registrations")
    .select(`student_id, profiles ( full_name, matric_number )`)
    .eq("course_id", COURSE_ID)
    .eq("session", SESSION)
    .eq("semester", SEMESTER);

  if (rErr) {
    console.error(rErr);
  }

  // 3. existing results for this course/session/semester
  const { data: existing } = await db
    .from("results")
    .select("student_id, ca_score, exam_score, status")
    .eq("course_id", COURSE_ID)
    .eq("session", SESSION)
    .eq("semester", SEMESTER);

  // build roster, merging in any existing scores
  roster = (regs || []).map((reg) => {
    const found = (existing || []).find((e) => e.student_id === reg.student_id);
    return {
      student_id: reg.student_id,
      name: reg.profiles?.full_name || "—",
      matric: reg.profiles?.matric_number || "—",
      ca: found ? found.ca_score : null,
      exam: found ? found.exam_score : null,
    };
  });

  // overall status from existing results
  if (existing && existing.length) {
    if (existing.some((e) => e.status === "approved"))
      courseStatus = "approved";
    else if (existing.some((e) => e.status === "submitted"))
      courseStatus = "submitted";
    else courseStatus = "draft";
  }

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

/* build rows to write to the results table */
function buildRows(status) {
  return roster
    .filter(
      (r) => r.ca !== null && r.ca !== "" && r.exam !== null && r.exam !== "",
    )
    .map((r) => {
      const total = Number(r.ca) + Number(r.exam);
      const g = computeGrade(total);
      return {
        student_id: r.student_id,
        course_id: Number(COURSE_ID),
        ca_score: Number(r.ca),
        exam_score: Number(r.exam),
        grade: g.grade, // total_score is auto-computed by the DB
        session: SESSION,
        semester: SEMESTER,
        status: status,
      };
    });
}

async function saveDraft() {
  const rows = buildRows("draft");
  if (rows.length === 0) {
    toast("Nothing to save yet", true);
    return;
  }

  // upsert: insert or update on the unique (student, course, session, semester) key
  const { error } = await db.from("results").upsert(rows, {
    onConflict: "student_id,course_id,session,semester",
  });
  if (error) {
    toast("Couldn't save: " + error.message, true);
    return;
  }
  courseStatus = "draft";
  render();
  toast("Draft saved");
}

async function submitResults() {
  const st = rosterState();
  if (st.invalid > 0 || st.blank > 0) {
    toast("Fix errors / fill all scores first", true);
    return;
  }

  const rows = buildRows("submitted");
  const { error } = await db.from("results").upsert(rows, {
    onConflict: "student_id,course_id,session,semester",
  });
  if (error) {
    toast("Couldn't submit: " + error.message, true);
    return;
  }
  courseStatus = "submitted";
  render();
  toast("Results submitted");
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

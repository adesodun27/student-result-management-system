/* ADMIN ASSIGNMENTS — wired to Supabase. */

const $ = (s) => document.querySelector(s);
const SESSION = "2024/2025";

let lecturers = [],
  students = [],
  courses = [];

async function loadRefData() {
  const [lecRes, stuRes, crsRes] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, staff_id")
      .eq("role", "lecturer"),
    db
      .from("profiles")
      .select("id, full_name, matric_number")
      .eq("role", "student"),
    db
      .from("courses")
      .select("id, course_code, course_title")
      .order("course_code"),
  ]);

  lecturers = lecRes.data || [];
  students = stuRes.data || [];
  courses = crsRes.data || [];

  fillSelect(
    $("#lecSelect"),
    lecturers,
    "id",
    (x) => `${x.full_name} (${x.staff_id || "—"})`,
  );
  fillSelect(
    $("#lecCourse"),
    courses,
    "id",
    (x) => `${x.course_code} · ${x.course_title}`,
  );
  fillSelect(
    $("#stuSelect"),
    students,
    "id",
    (x) => `${x.full_name} (${x.matric_number || "—"})`,
  );
  fillSelect(
    $("#stuCourse"),
    courses,
    "id",
    (x) => `${x.course_code} · ${x.course_title}`,
  );
}

function fillSelect(el, items, valueKey, labelFn) {
  if (!el) return;
  if (items.length === 0) {
    el.innerHTML = `<option value="">— none —</option>`;
    return;
  }
  el.innerHTML = items
    .map((x) => `<option value="${x[valueKey]}">${labelFn(x)}</option>`)
    .join("");
}

/* ---- lecturer → course ---- */
async function loadLecAssignments() {
  const { data, error } = await db
    .from("lecturer_courses")
    .select(
      `id, session, semester, profiles ( full_name ), courses ( course_code, course_title )`,
    )
    .order("id", { ascending: false });

  const body = $("#lecAssignList");
  if (error) {
    console.error(error);
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#d9534f;padding:24px">Couldn't load assignments. Please refresh.</td></tr>`;
    return;
  }
  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#999;padding:24px">No assignments yet.</td></tr>`;
    return;
  }
  body.innerHTML = data
    .map(
      (a) => `
    <tr>
      <td class="name">${a.profiles?.full_name || "—"}</td>
      <td>${a.courses ? a.courses.course_code + " · " + a.courses.course_title : "—"}</td>
      <td>${a.semester}</td>
      <td class="r"><button class="btn-del" data-id="${a.id}">Remove</button></td>
    </tr>`,
    )
    .join("");

  body
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeLecAssignment(b.dataset.id)),
    );
}

async function assign() {
  const lecturer_id = $("#lecSelect").value;
  const course_id = $("#lecCourse").value;
  const semester = $("#lecSemester").value;
  const err = $("#lecError");

  if (!lecturer_id || !course_id) {
    err.textContent = "Please pick a lecturer and a course.";
    return;
  }
  err.textContent = "";

  const { error } = await db.from("lecturer_courses").insert({
    lecturer_id,
    course_id: Number(course_id),
    session: SESSION,
    semester,
  });

  if (error) {
    console.error(error);
    const raw = (error.message || "").toLowerCase();
    err.textContent =
      raw.includes("duplicate") || raw.includes("already")
        ? "That lecturer is already assigned to this course this semester."
        : "Couldn't assign the course. Please try again.";
    return;
  }
  await loadLecAssignments();
  toast("Course assigned");
}

async function removeLecAssignment(id) {
  const { error } = await db.from("lecturer_courses").delete().eq("id", id);
  if (error) {
    console.error(error);
    toast("Couldn't remove this assignment. Please try again.", true);
    return;
  }
  await loadLecAssignments();
  toast("Assignment removed");
}

/* ---- student → course ---- */
async function loadStuRegistrations() {
  const { data, error } = await db
    .from("student_registrations")
    .select(
      `id, session, semester, profiles ( full_name, matric_number ), courses ( course_code, course_title )`,
    )
    .order("id", { ascending: false });

  const body = $("#stuRegList");
  if (error) {
    console.error(error);
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#d9534f;padding:24px">Couldn't load registrations. Please refresh.</td></tr>`;
    return;
  }
  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#999;padding:24px">No registrations yet.</td></tr>`;
    return;
  }
  body.innerHTML = data
    .map(
      (r) => `
    <tr>
      <td class="name">${r.profiles ? r.profiles.full_name + " (" + (r.profiles.matric_number || "—") + ")" : "—"}</td>
      <td>${r.courses ? r.courses.course_code + " · " + r.courses.course_title : "—"}</td>
      <td>${r.semester}</td>
      <td class="r"><button class="btn-del" data-id="${r.id}">Remove</button></td>
    </tr>`,
    )
    .join("");

  body
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeStuRegistration(b.dataset.id)),
    );
}

async function register() {
  const student_id = $("#stuSelect").value;
  const course_id = $("#stuCourse").value;
  const semester = $("#stuSemester").value;
  const err = $("#stuError");

  if (!student_id || !course_id) {
    err.textContent = "Please pick a student and a course.";
    return;
  }
  err.textContent = "";

  const { error } = await db.from("student_registrations").insert({
    student_id,
    course_id: Number(course_id),
    session: SESSION,
    semester,
  });

  if (error) {
    console.error(error);
    const raw = (error.message || "").toLowerCase();
    err.textContent =
      raw.includes("duplicate") || raw.includes("already")
        ? "That student is already registered for this course this semester."
        : "Couldn't register the student. Please try again.";
    return;
  }
  await loadStuRegistrations();
  toast("Student registered");
}

async function removeStuRegistration(id) {
  const { error } = await db
    .from("student_registrations")
    .delete()
    .eq("id", id);
  if (error) {
    console.error(error);
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("foreign key") || error.code === "23503") {
      toast(
        "Can't remove — this student already has a result for this course.",
        true,
      );
    } else {
      toast("Couldn't remove this registration. Please try again.", true);
    }
    return;
  }
  await loadStuRegistrations();
  toast("Registration removed");
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#assignBtn").addEventListener("click", assign);
$("#registerBtn").addEventListener("click", register);
loadRefData();
loadLecAssignments();
loadStuRegistrations();

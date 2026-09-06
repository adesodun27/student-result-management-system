/* ADMIN ASSIGNMENTS — mock data, wire to Supabase later.
   Lecturer→course: insert into lecturer_courses (lecturer_id, course_id, session, semester)
   Student→course:  insert into student_registrations (student_id, course_id, session, semester)
   Dropdowns come from: profiles (role='lecturer'/'student') and courses. */

// mock reference data (in real app: fetched from the DB)
const LECTURERS = [
  { id: "L1", name: "Dr. Adesodun Oladipo" },
  { id: "L2", name: "Dr. Okafor Chinwe" },
  { id: "L3", name: "Prof. Bello Adamu" },
];
const STUDENTS = [
  { id: "S1", name: "Adebayo Chidinma (CSC/2021/001)" },
  { id: "S2", name: "Okonkwo Emeka (CSC/2021/014)" },
  { id: "S3", name: "Ibrahim Fatima (CSC/2021/027)" },
];
const COURSES = [
  { id: "C1", label: "CSC 401 · Software Engineering" },
  { id: "C2", label: "CSC 415 · Database Systems" },
  { id: "C3", label: "CSC 302 · Operating Systems" },
];

const SESSION = "2024/2025"; // in real app: from a session selector

let lecAssignments = [
  {
    lec: "Dr. Adesodun Oladipo",
    course: "CSC 401 · Software Engineering",
    semester: "Harmattan",
  },
];
let stuRegistrations = [
  {
    stu: "Adebayo Chidinma (CSC/2021/001)",
    course: "CSC 401 · Software Engineering",
    semester: "Harmattan",
  },
];

const $ = (s) => document.querySelector(s);

/* ---- fill dropdowns ---- */
function fillSelect(el, items, valueKey, labelKey) {
  el.innerHTML = items
    .map((x) => `<option value="${x[valueKey]}">${x[labelKey]}</option>`)
    .join("");
}
function initSelects() {
  fillSelect($("#lecSelect"), LECTURERS, "id", "name");
  fillSelect($("#lecCourse"), COURSES, "id", "label");
  fillSelect($("#stuSelect"), STUDENTS, "id", "name");
  fillSelect($("#stuCourse"), COURSES, "id", "label");
}

/* ---- lecturer → course ---- */
function renderLecList() {
  if (lecAssignments.length === 0) {
    $("#lecAssignList").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#999;padding:24px">No assignments yet.</td></tr>`;
    return;
  }
  $("#lecAssignList").innerHTML = lecAssignments
    .map(
      (a, i) => `
    <tr>
      <td class="name">${a.lec}</td>
      <td>${a.course}</td>
      <td>${a.semester}</td>
      <td class="r"><button class="btn-del" data-i="${i}">Remove</button></td>
    </tr>`,
    )
    .join("");
  document.querySelectorAll("#lecAssignList .btn-del").forEach((b) =>
    b.addEventListener("click", () => {
      lecAssignments.splice(+b.dataset.i, 1);
      renderLecList();
      toast("Assignment removed");
    }),
  );
}

function assign() {
  const lec = $("#lecSelect").selectedOptions[0].text;
  const course = $("#lecCourse").selectedOptions[0].text;
  const semester = $("#lecSemester").value;
  const err = $("#lecError");

  if (
    lecAssignments.some(
      (a) => a.lec === lec && a.course === course && a.semester === semester,
    )
  ) {
    err.textContent =
      "That lecturer is already assigned to this course this semester.";
    return;
  }
  err.textContent = "";
  // → Supabase: insert into lecturer_courses (...)
  lecAssignments.push({ lec, course, semester });
  renderLecList();
  toast("Course assigned");
}

/* ---- student → course ---- */
function renderStuList() {
  if (stuRegistrations.length === 0) {
    $("#stuRegList").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#999;padding:24px">No registrations yet.</td></tr>`;
    return;
  }
  $("#stuRegList").innerHTML = stuRegistrations
    .map(
      (r, i) => `
    <tr>
      <td class="name">${r.stu}</td>
      <td>${r.course}</td>
      <td>${r.semester}</td>
      <td class="r"><button class="btn-del" data-i="${i}">Remove</button></td>
    </tr>`,
    )
    .join("");
  document.querySelectorAll("#stuRegList .btn-del").forEach((b) =>
    b.addEventListener("click", () => {
      stuRegistrations.splice(+b.dataset.i, 1);
      renderStuList();
      toast("Registration removed");
    }),
  );
}

function register() {
  const stu = $("#stuSelect").selectedOptions[0].text;
  const course = $("#stuCourse").selectedOptions[0].text;
  const semester = $("#stuSemester").value;
  const err = $("#stuError");

  if (
    stuRegistrations.some(
      (r) => r.stu === stu && r.course === course && r.semester === semester,
    )
  ) {
    err.textContent =
      "That student is already registered for this course this semester.";
    return;
  }
  err.textContent = "";
  // → Supabase: insert into student_registrations (...)
  stuRegistrations.push({ stu, course, semester });
  renderStuList();
  toast("Student registered");
}

/* ---- toast ---- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

/* ---- go ---- */
initSelects();
renderLecList();
renderStuList();
$("#assignBtn").addEventListener("click", assign);
$("#registerBtn").addEventListener("click", register);

/* ADMIN COURSES — mock data, wire to Supabase later.
   List:   select * from courses
   Add:    insert into courses (course_code, course_title, credit_units, level)
   Delete: delete from courses where id = ... */

let COURSES = [
  { code: "CSC 401", title: "Software Engineering", unit: 3, level: 400 },
  { code: "CSC 415", title: "Database Systems", unit: 3, level: 400 },
  { code: "CSC 302", title: "Operating Systems", unit: 3, level: 300 },
  { code: "GST 301", title: "Entrepreneurship", unit: 2, level: 300 },
];

const $ = (s) => document.querySelector(s);

function renderList() {
  if (COURSES.length === 0) {
    $("#courseList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">
        No courses yet. Add one above.
      </td></tr>`;
    return;
  }
  $("#courseList").innerHTML = COURSES.map(
    (c, i) => `
    <tr>
      <td class="name">${c.code}</td>
      <td>${c.title}</td>
      <td class="r">${c.unit}</td>
      <td class="r">${c.level}</td>
      <td class="r"><button class="btn-del" data-i="${i}">Delete</button></td>
    </tr>`,
  ).join("");

  document
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeCourse(+b.dataset.i)),
    );
}

function addCourse() {
  const code = $("#code").value.trim();
  const title = $("#title").value.trim();
  const unit = $("#unit").value.trim();
  const level = $("#level").value;
  const err = $("#formError");

  if (!code || !title || !unit || !level) {
    err.textContent = "Fill in all fields.";
    return;
  }
  if (COURSES.some((c) => c.code.toLowerCase() === code.toLowerCase())) {
    err.textContent = "That course code already exists.";
    return;
  }
  err.textContent = "";

  // → Supabase: insert into courses (...)
  COURSES.push({ code, title, unit: Number(unit), level: Number(level) });

  // clear form
  $("#code").value = "";
  $("#title").value = "";
  $("#unit").value = "";
  $("#level").value = "";

  renderList();
  toast("Course added");
}

function removeCourse(i) {
  // → Supabase: delete from courses where id = ...
  const c = COURSES[i];
  COURSES.splice(i, 1);
  renderList();
  toast(`${c.code} deleted`);
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#addBtn").addEventListener("click", addCourse);
renderList();

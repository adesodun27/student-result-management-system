/* ADMIN COURSES — wired to Supabase.
   courses: id, course_code (UPPERCASE), course_title, credit_units, level, department */

const $ = (s) => document.querySelector(s);

async function loadCourses() {
  const { data, error } = await db
    .from("courses")
    .select("*")
    .order("course_code", { ascending: true });

  if (error) {
    $("#courseList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:30px">
        Couldn't load courses: ${error.message}
      </td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#courseList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">
        No courses yet. Add one above.
      </td></tr>`;
    return;
  }

  $("#courseList").innerHTML = data
    .map(
      (c) => `
    <tr>
      <td class="name">${c.course_code}</td>
      <td>${c.course_title}</td>
      <td>${c.department || "—"}</td>
      <td class="r">${c.credit_units}</td>
      <td class="r">${c.level}</td>
      <td class="r"><button class="btn-del" data-id="${c.id}">Delete</button></td>
    </tr>`,
    )
    .join("");

  document
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeCourse(b.dataset.id)),
    );
}

async function addCourse() {
  const code = $("#code").value.trim().toUpperCase(); // DB requires uppercase
  const title = $("#title").value.trim();
  const unit = $("#unit").value.trim();
  const level = $("#level").value;
  const department = $("#department").value.trim();
  const err = $("#formError");

  if (!code || !title || !unit || !level || !department) {
    err.textContent = "Fill in all fields.";
    return;
  }

    if (Number(unit) < 1 || Number(unit) > 10) {
    err.textContent = "Units must be between 1 and 10.";
    return;
  }
  
  err.textContent = "";

  const { error } = await db.from("courses").insert({
    course_code: code,
    course_title: title,
    credit_units: Number(unit),
    level: Number(level),
    department: department,
  });

  if (error) {
    err.textContent = error.message.includes("duplicate")
      ? "That course code already exists."
      : "Couldn't add course: " + error.message;
    return;
  }

  $("#code").value = "";
  $("#title").value = "";
  $("#unit").value = "";
  $("#level").value = "";
  $("#department").value = "";
  await loadCourses();
  toast("Course added");
}

async function removeCourse(id) {
  const { error } = await db.from("courses").delete().eq("id", id);
  if (error) {
    toast("Couldn't delete: " + error.message, true);
    return;
  }
  await loadCourses();
  toast("Course deleted");
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#addBtn").addEventListener("click", addCourse);
loadCourses();

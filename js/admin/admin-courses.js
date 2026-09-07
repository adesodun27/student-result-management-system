/* ADMIN COURSES — wired to Supabase.
   Table: courses (id, course_code, course_title, credit_units, level) */

const $ = (s) => document.querySelector(s);

/* ---- LOAD courses from DB ---- */
async function loadCourses() {
  const { data, error } = await db
    .from("courses")
    .select("*")
    .order("course_code", { ascending: true });

  if (error) {
    console.error(error);
    $("#courseList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#d9534f;padding:30px">
        Couldn't load courses: ${error.message}
      </td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#courseList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">
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

/* ---- ADD a course ---- */
async function addCourse() {
  const code = $("#code").value.trim();
  const title = $("#title").value.trim();
  const unit = $("#unit").value.trim();
  const level = $("#level").value;
  const err = $("#formError");

  if (!code || !title || !unit || !level) {
    err.textContent = "Fill in all fields.";
    return;
  }
  err.textContent = "";

  const { error } = await db.from("courses").insert({
    course_code: code,
    course_title: title,
    credit_units: Number(unit),
    level: Number(level),
  });

  if (error) {
    // e.g. duplicate course_code hits the UNIQUE constraint
    err.textContent = error.message.includes("duplicate")
      ? "That course code already exists."
      : "Couldn't add course: " + error.message;
    return;
  }

  // clear form + reload list from DB
  $("#code").value = "";
  $("#title").value = "";
  $("#unit").value = "";
  $("#level").value = "";
  await loadCourses();
  toast("Course added");
}

/* ---- DELETE a course ---- */
async function removeCourse(id) {
  const { error } = await db.from("courses").delete().eq("id", id);
  if (error) {
    toast("Couldn't delete: " + error.message, true);
    return;
  }
  await loadCourses();
  toast("Course deleted");
}

/* ---- toast ---- */
let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

/* ---- go ---- */
$("#addBtn").addEventListener("click", addCourse);
loadCourses();

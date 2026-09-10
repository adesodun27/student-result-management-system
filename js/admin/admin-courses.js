/* ADMIN COURSES — wired to Supabase.
   courses: id, course_code (UPPERCASE), course_title, credit_units, level, department */

const $ = (s) => document.querySelector(s);

async function loadCourses() {
  const { data, error } = await db
    .from("courses")
    .select("*")
    .order("course_code", { ascending: true });

  if (error) {
    console.error(error);
    $("#courseList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:30px">Couldn't load courses. Please refresh the page.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#courseList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No courses yet. Add one above.</td></tr>`;
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
    err.textContent = "Please fill in all fields.";
    return;
  }

  if (Number(unit) < 1 || Number(unit) > 10) {
    err.textContent = "Units must be between 1 and 10.";
    return;
  }

  err.textContent = "";

  const btn = $("#addBtn");
  btn.disabled = true;

  const { error } = await db.from("courses").insert({
    course_code: code,
    course_title: title,
    credit_units: Number(unit),
    level: Number(level),
    department: department,
  });

  btn.disabled = false;

  if (error) {
    console.error(error);
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("duplicate") || raw.includes("already")) {
      err.textContent = "That course code already exists. Use a different one.";
    } else if (raw.includes("permission") || raw.includes("403")) {
      err.textContent =
        "You don't have permission to add courses. Please log in as an admin.";
    } else if (
      raw.includes("network") ||
      raw.includes("fetch") ||
      raw.includes("failed to")
    ) {
      err.textContent = "Network problem. Check your connection and try again.";
    } else {
      err.textContent =
        "Couldn't add this course. Please check the details and try again.";
    }
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
    console.error(error);
    toast("Couldn't delete this course. Please try again.", true);
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

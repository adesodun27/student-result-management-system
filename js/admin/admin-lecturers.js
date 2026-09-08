/* ADMIN LECTURERS — wired to Supabase (create-user Edge Function). */

const $ = (s) => document.querySelector(s);

async function loadLecturers() {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, staff_id, email, department")
    .eq("role", "lecturer")
    .order("full_name");

  if (error) {
    $("#lecturerList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#d9534f;padding:30px">Couldn't load: ${error.message}</td></tr>`;
    return;
  }
  if (!data || data.length === 0) {
    $("#lecturerList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">No lecturers yet.</td></tr>`;
    return;
  }
  $("#lecturerList").innerHTML = data
    .map(
      (l) => `
    <tr>
      <td class="matric">${l.staff_id || "—"}</td>
      <td class="name">${l.full_name}</td>
      <td>${l.email || "—"}</td>
      <td>${l.department || "—"}</td>
      <td class="r"><button class="btn-del" data-id="${l.id}">Delete</button></td>
    </tr>`,
    )
    .join("");

  document
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeLecturer(b.dataset.id)),
    );
}

async function addLecturer() {
  const name = $("#name").value.trim();
  const staffId = $("#staffId").value.trim();
  const department = $("#department").value.trim();
  const err = $("#formError");

  if (!name || !staffId || !department) {
    err.textContent = "Fill in name, staff ID, and department.";
    return;
  }
  err.textContent = "";

  const loginEmail =
    staffId.toLowerCase().replace(/\//g, "") + "@acadex.internal";
  const surname = name.trim().split(" ").pop().toLowerCase();

  const btn = $("#addBtn");
  btn.disabled = true;

  const { error } = await db.functions.invoke("create-user", {
    body: {
      email: loginEmail,
      password: surname,
      full_name: name,
      role: "lecturer",
      staff_id: staffId,
      department: department,
    },
  });

  btn.disabled = false;

  if (error) {
    err.textContent =
      "Couldn't add lecturer: " + (error.message || "unknown error");
    console.error(error);
    return;
  }

  $("#name").value = "";
  $("#staffId").value = "";
  if ($("#email")) $("#email").value = "";
  $("#department").value = "";
  await loadLecturers();
  toast(`Lecturer added — login: ${staffId}, password: their surname`);
}

async function removeLecturer(id) {
  const { error } = await db.from("profiles").delete().eq("id", id);
  if (error) {
    toast("Couldn't delete: " + error.message, true);
    return;
  }
  await loadLecturers();
  toast("Lecturer removed");
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#addBtn").addEventListener("click", addLecturer);
loadLecturers();

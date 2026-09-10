/* ADMIN LECTURERS — wired to Supabase (create-user Edge Function). */

const $ = (s) => document.querySelector(s);

async function loadLecturers() {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, staff_id, email, department")
    .eq("role", "lecturer")
    .order("full_name");

  if (error) {
    console.error(error);
    $("#lecturerList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#d9534f;padding:30px">Couldn't load lecturers. Please refresh the page.</td></tr>`;
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
    err.textContent = "Please fill in name, staff ID, and department.";
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
    console.error(error);
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("duplicate") || raw.includes("already")) {
      err.textContent =
        "This staff ID or email is already in use. Use a different one.";
    } else if (
      raw.includes("permission") ||
      raw.includes("not allowed") ||
      raw.includes("403")
    ) {
      err.textContent =
        "You don't have permission to add lecturers. Please log in as an admin.";
    } else if (
      raw.includes("network") ||
      raw.includes("fetch") ||
      raw.includes("failed to")
    ) {
      err.textContent = "Network problem. Check your connection and try again.";
    } else {
      err.textContent =
        "Couldn't add this lecturer. Please check the details and try again.";
    }
    return;
  }

  $("#name").value = "";
  $("#staffId").value = "";
  if ($("#email")) $("#email").value = "";
  $("#department").value = "";
  await loadLecturers();
  toast(`Lecturer added — login ID: ${staffId}, password: their surname`);
}

async function removeLecturer(id) {
  const { error } = await db.from("profiles").delete().eq("id", id);
  if (error) {
    console.error(error);
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("foreign key") || error.code === "23503") {
      toast(
        "Can't delete — this lecturer is still assigned to a course. Remove their course assignments first.",
        true,
      );
    } else {
      toast("Couldn't remove this lecturer. Please try again.", true);
    }
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

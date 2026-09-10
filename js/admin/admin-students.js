/* ADMIN STUDENTS — wired to Supabase (create-user Edge Function). */

const $ = (s) => document.querySelector(s);

async function loadStudents() {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, matric_number, email, department, level")
    .eq("role", "student")
    .order("full_name");

  if (error) {
    console.error(error);
    $("#studentList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:30px">Couldn't load students. Please refresh the page.</td></tr>`;
    return;
  }
  if (!data || data.length === 0) {
    $("#studentList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No students yet.</td></tr>`;
    return;
  }
  $("#studentList").innerHTML = data
    .map(
      (s) => `
    <tr>
      <td class="matric">${s.matric_number || "—"}</td>
      <td class="name">${s.full_name}</td>
      <td>${s.email || "—"}</td>
      <td>${s.department || "—"}</td>
      <td class="r">${s.level || "—"}</td>
      <td class="r"><button class="btn-del" data-id="${s.id}">Delete</button></td>
    </tr>`,
    )
    .join("");

  document
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeStudent(b.dataset.id)),
    );
}

async function addStudent() {
  const name = $("#name").value.trim();
  const matric = $("#matric").value.trim();
  const department = $("#department").value.trim();
  const level = $("#level").value;
  const err = $("#formError");

  if (!name || !matric || !department || !level) {
    err.textContent =
      "Please fill in name, matric number, department, and level.";
    return;
  }
  err.textContent = "";

  const loginEmail =
    matric.toLowerCase().replace(/\//g, "") + "@acadex.internal";
  const surname = name.trim().split(" ").pop().toLowerCase();

  const btn = $("#addBtn");
  btn.disabled = true;

  const { error } = await db.functions.invoke("create-user", {
    body: {
      email: loginEmail,
      password: surname,
      full_name: name,
      role: "student",
      matric_number: matric,
      department: department,
      level: Number(level),
    },
  });

  btn.disabled = false;

  if (error) {
    console.error(error);
    const raw = (error.message || "").toLowerCase();

    if (raw.includes("duplicate") || raw.includes("already")) {
      err.textContent =
        "This matric number or email is already in use. Use a different one.";
    } else if (
      raw.includes("permission") ||
      raw.includes("not allowed") ||
      raw.includes("403")
    ) {
      err.textContent =
        "You don't have permission to add students. Please log in as an admin.";
    } else if (
      raw.includes("network") ||
      raw.includes("fetch") ||
      raw.includes("failed to")
    ) {
      err.textContent = "Network problem. Check your connection and try again.";
    } else {
      err.textContent =
        "Couldn't add this student. Please check the details and try again.";
    }
    return;
  }

  $("#name").value = "";
  $("#matric").value = "";
  if ($("#email")) $("#email").value = "";
  $("#department").value = "";
  $("#level").value = "";
  await loadStudents();
  toast(`Student added — login ID: ${matric}, password: their surname`);
}

async function removeStudent(id) {
  const { error } = await db.from("profiles").delete().eq("id", id);
  if (error) {
    console.error(error);
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("foreign key") || error.code === "23503") {
      toast(
        "Can't delete — this student is registered in a course. Remove their registrations first.",
        true,
      );
    } else {
      toast("Couldn't remove this student. Please try again.", true);
    }
    return;
  }
  await loadStudents();
  toast("Student removed");
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#addBtn").addEventListener("click", addStudent);
loadStudents();

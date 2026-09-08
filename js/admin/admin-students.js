/* ADMIN STUDENTS — partial wire.
   LIST + DELETE wired to Supabase.
   ADD needs an Edge Function (login-account creation needs the service key,
   which can't run in the browser). Until Rodiyat builds it, Add shows a notice. */

const $ = (s) => document.querySelector(s);

async function loadStudents() {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, matric_number, email, department, level")
    .eq("role", "student")
    .order("full_name");

  if (error) {
    $("#studentList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:30px">
        Couldn't load: ${error.message}
      </td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#studentList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">
        No students yet.
      </td></tr>`;
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

function addStudent() {
  const err = $("#formError");
  err.textContent =
    "Adding students isn't available yet — the account-creation function is still being set up.";
}

async function removeStudent(id) {
  const { error } = await db.from("profiles").delete().eq("id", id);
  if (error) {
    toast("Couldn't delete: " + error.message, true);
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

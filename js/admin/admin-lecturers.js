/* ADMIN LECTURERS — partial wire.
   LIST + DELETE are wired to Supabase.
   ADD needs an Edge Function (creating a login account needs the service key,
   which can't run from the browser). Until Rodiyat builds it, Add shows a notice. */

const $ = (s) => document.querySelector(s);

async function loadLecturers() {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, staff_id, email, department")
    .eq("role", "lecturer")
    .order("full_name");

  if (error) {
    $("#lecturerList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#d9534f;padding:30px">
        Couldn't load: ${error.message}
      </td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#lecturerList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">
        No lecturers yet.
      </td></tr>`;
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

function addLecturer() {
  // Creating a login account can't be done from the browser (needs service key).
  // This will call an Edge Function once it exists.
  const err = $("#formError");
  err.textContent =
    "Adding lecturers isn't available yet — the account-creation function is still being set up.";
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

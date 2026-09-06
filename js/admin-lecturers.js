/* ADMIN LECTURERS — mock data, wire to Supabase later.
   NOTE (for Rodiyat): profiles needs staff_id, email, department columns.
   Add lecturer = create auth user (username=staff_id, temp password=surname,
   must_change_password=true) + insert profile (role='lecturer').
   List = select from profiles where role='lecturer'. */

let LECTURERS = [
  {
    name: "Dr. Adesodun Oladipo",
    staffId: "LEC/2019/0142",
    email: "adesodun@acadex.edu",
    department: "Computer Science",
  },
  {
    name: "Dr. Okafor Chinwe",
    staffId: "LEC/2018/0091",
    email: "okafor@acadex.edu",
    department: "Computer Science",
  },
  {
    name: "Prof. Bello Adamu",
    staffId: "LEC/2010/0033",
    email: "bello@acadex.edu",
    department: "Mathematics",
  },
];

const $ = (s) => document.querySelector(s);

function renderList() {
  if (LECTURERS.length === 0) {
    $("#lecturerList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">
        No lecturers yet. Add one above.
      </td></tr>`;
    return;
  }
  $("#lecturerList").innerHTML = LECTURERS.map(
    (l, i) => `
    <tr>
      <td class="matric">${l.staffId}</td>
      <td class="name">${l.name}</td>
      <td>${l.email}</td>
      <td>${l.department}</td>
      <td class="r"><button class="btn-del" data-i="${i}">Delete</button></td>
    </tr>`,
  ).join("");

  document
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeLecturer(+b.dataset.i)),
    );
}

function addLecturer() {
  const name = $("#name").value.trim();
  const staffId = $("#staffId").value.trim();
  const email = $("#email").value.trim();
  const department = $("#department").value.trim();
  const err = $("#formError");

  if (!name || !staffId || !email || !department) {
    err.textContent = "Fill in all fields.";
    return;
  }
  if (
    LECTURERS.some((l) => l.staffId.toLowerCase() === staffId.toLowerCase())
  ) {
    err.textContent = "That staff ID already exists.";
    return;
  }
  err.textContent = "";

  // → Supabase: create auth user + insert into profiles (role='lecturer', staff_id, ...)
  LECTURERS.push({ name, staffId, email, department });

  $("#name").value = "";
  $("#staffId").value = "";
  $("#email").value = "";
  $("#department").value = "";

  renderList();
  toast("Lecturer added");
}

function removeLecturer(i) {
  // → Supabase: delete lecturer profile (and auth user)
  const l = LECTURERS[i];
  LECTURERS.splice(i, 1);
  renderList();
  toast(`${l.name} removed`);
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#addBtn").addEventListener("click", addLecturer);
renderList();

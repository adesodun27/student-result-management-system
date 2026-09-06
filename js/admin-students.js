/* ADMIN STUDENTS — mock data, wire to Supabase later.
   NOTE: profiles table has NO matric_number column yet.
   Rodiyat must add: ALTER TABLE profiles ADD COLUMN matric_number TEXT UNIQUE;
   (and email, if the student record should store it)
   Add student = create auth user + insert profile (role='student').
   List = select from profiles where role='student'. */

let STUDENTS = [
  {
    name: "Adebayo Chidinma",
    matric: "CSC/2021/001",
    email: "chidinma@acadex.edu",
    level: 400,
  },
  {
    name: "Okonkwo Emeka",
    matric: "CSC/2021/014",
    email: "emeka@acadex.edu",
    level: 400,
  },
  {
    name: "Ibrahim Fatima",
    matric: "CSC/2021/027",
    email: "fatima@acadex.edu",
    level: 400,
  },
  {
    name: "Ahmed Yusuf",
    matric: "CSC/2020/003",
    email: "yusuf@acadex.edu",
    level: 300,
  },
];

const $ = (s) => document.querySelector(s);

function renderList() {
  if (STUDENTS.length === 0) {
    $("#studentList").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">
        No students yet. Add one above.
      </td></tr>`;
    return;
  }
  $("#studentList").innerHTML = STUDENTS.map(
    (s, i) => `
    <tr>
      <td class="matric">${s.matric}</td>
      <td class="name">${s.name}</td>
      <td>${s.email}</td>
      <td class="r">${s.level}</td>
      <td class="r"><button class="btn-del" data-i="${i}">Delete</button></td>
    </tr>`,
  ).join("");

  document
    .querySelectorAll(".btn-del")
    .forEach((b) =>
      b.addEventListener("click", () => removeStudent(+b.dataset.i)),
    );
}

function addStudent() {
  const name = $("#name").value.trim();
  const matric = $("#matric").value.trim();
  const email = $("#email").value.trim();
  const level = $("#level").value;
  const err = $("#formError");

  if (!name || !matric || !email || !level) {
    err.textContent = "Fill in all fields.";
    return;
  }
  if (STUDENTS.some((s) => s.matric.toLowerCase() === matric.toLowerCase())) {
    err.textContent = "That matric number already exists.";
    return;
  }
  err.textContent = "";

  // → Supabase: create auth user + insert into profiles (role='student', matric_number, ...)
  STUDENTS.push({ name, matric, email, level: Number(level) });

  $("#name").value = "";
  $("#matric").value = "";
  $("#email").value = "";
  $("#level").value = "";

  renderList();
  toast("Student added");
}

function removeStudent(i) {
  // → Supabase: delete student profile (and auth user)
  const s = STUDENTS[i];
  STUDENTS.splice(i, 1);
  renderList();
  toast(`${s.name} removed`);
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#addBtn").addEventListener("click", addStudent);
renderList();

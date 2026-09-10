/* CHANGE PASSWORD — first-login flow.
   Uses the complete_password_change() DB function, which updates the
   password AND clears the must-change flag in one secure step. */

const form = document.querySelector("#changeForm");
const newPass = document.querySelector("#newPassword");
const confirmPass = document.querySelector("#confirmPassword");
const errEl = document.querySelector("#changeError");

function showError(msg) {
  errEl.textContent = msg;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    showError("Your session expired. Please log in again.");
    setTimeout(() => (location.href = "login.html"), 1500);
    return;
  }

  const p1 = newPass.value;
  const p2 = confirmPass.value;

  if (p1.length < 6) {
    showError("Password must be at least 6 characters.");
    return;
  }
  if (p1 !== p2) {
    showError("The two passwords don't match.");
    return;
  }

  const btn = form.querySelector(".submit-btn");
  btn.disabled = true;

  // call the DB function — updates password AND clears the must-change flag
  const { error } = await db.rpc("complete_password_change", {
    new_password: p1,
  });

  if (error) {
    console.error(error);
    btn.disabled = false;
    showError("Couldn't update your password. Please try again.");
    return;
  }

  // flag is cleared — now redirect by role
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role === "student") location.href = "student/student-dashboard.html";
  else if (role === "lecturer")
    location.href = "lecturer/lecturer-dashboard.html";
  else if (role === "admin") location.href = "admin/admin-dashboard.html";
  else location.href = "login.html";
});

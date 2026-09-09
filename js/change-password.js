/* CHANGE PASSWORD — first-login flow.
   Updates the auth password + clears must_change_initial_password,
   then sends the user to their dashboard. */

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

  // must be logged in to change password
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    showError("Session expired. Please log in again.");
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
    showError("Passwords don't match.");
    return;
  }

  const btn = form.querySelector(".submit-btn");
  btn.disabled = true;

  // 1. update the auth password
  const { error: pwError } = await db.auth.updateUser({ password: p1 });
  if (pwError) {
    btn.disabled = false;
    showError("Couldn't update password: " + pwError.message);
    return;
  }

  // 2. clear the must-change flag on their profile
  const { error: flagError } = await db
    .from("profiles")
    .update({ must_change_initial_password: false })
    .eq("id", user.id);

  if (flagError) {
    // password changed but flag didn't — not fatal, log it
    console.error(flagError);
  }

  // 3. look up role → go to the right dashboard
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

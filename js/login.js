/* LOGIN — wired to Supabase auth.
   User types matric/staff ID → build internal email → sign in →
   look up role → redirect to the right dashboard. */

const form = document.querySelector(".login-form");
const idInput = document.querySelector("#id-number");
const passInput = document.querySelector("#password");

// turn "CSC/2021/001" → "csc2021001@acadex.internal"
function idToEmail(id) {
  const clean = id.trim().toLowerCase().replace(/\//g, "");
  return clean + "@acadex.internal";
}

// show an error message under the form
function showError(msg) {
  let el = document.querySelector("#login-error");
  if (!el) {
    el = document.createElement("p");
    el.id = "login-error";
    el.style.color = "#d9534f";
    el.style.fontSize = "0.85rem";
    el.style.marginTop = "10px";
    form.appendChild(el);
  }
  el.textContent = msg;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const id = idInput.value.trim();
  const password = passInput.value;
  if (!id || !password) {
    showError("Enter your ID and password.");
    return;
  }

  const email = idToEmail(id);

  // 1. sign in
  const { data: authData, error: authError } = await db.auth.signInWithPassword(
    {
      email,
      password,
    },
  );

  if (authError) {
    showError("Invalid ID or password.");
    console.error(authError);
    return;
  }

  // 2. look up role + must-change flag
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role, must_change_initial_password")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    showError("Couldn't load your profile. Contact the admin.");
    console.error(profileError);
    return;
  }

  // 3. first login → change password first
  if (profile.must_change_initial_password) {
    location.href = "change-password.html";
    return;
  }

  // 4. redirect by role
  if (profile.role === "student") {
    location.href = "student/student-dashboard.html";
  } else if (profile.role === "lecturer") {
    location.href = "lecturer/lecturer-dashboard.html";
  } else if (profile.role === "admin") {
    location.href = "admin/admin-dashboard.html";
  } else {
    showError("Unknown account type. Contact the admin.");
  }
});

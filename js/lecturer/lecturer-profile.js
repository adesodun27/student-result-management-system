/* LECTURER PROFILE — wired to Supabase.
   Loads the logged-in lecturer's own details from profiles. */

const $ = (s) => document.querySelector(s);

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function loadProfile() {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    console.warn("No logged-in user yet");
    return;
  }

  const { data: profile, error } = await db
    .from("profiles")
    .select("full_name, staff_id, email, department")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error(error);
    // clear the placeholders so no fake data shows
    set("lecturerName", "—");
    set("fullName", "—");
    set("staffId", "—");
    set("department", "—");
    set("email", "—");
    set("avatar", "—");
    return;
  }

  const initials = profile.full_name
    .replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  set("avatar", initials);
  set("lecturerName", profile.full_name);
  set("fullName", profile.full_name);
  set("staffId", profile.staff_id || "—");
  set("department", profile.department || "—");
  set("email", profile.email || "—");
}

loadProfile();

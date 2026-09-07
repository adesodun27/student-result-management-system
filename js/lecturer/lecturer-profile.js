/* LECTURER PROFILE — wired to Supabase.
   Loads the logged-in lecturer's own details from profiles. */

const $ = (s) => document.querySelector(s);

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
    return;
  }

  // initials for the avatar (e.g. "Dr. Adesodun Oladipo" → "AO")
  const initials = profile.full_name
    .replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s*/i, "") // drop title
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const set = (id, val) => {
    const el = $("#" + id);
    if (el) el.textContent = val;
  };

  set("avatar", initials);
  set("lecturerName", profile.full_name);
  set("fullName", profile.full_name);
  set("staffId", profile.staff_id || "—");
  set("department", profile.department || "—");
  // if you added an email row to the profile card, this fills it:
  set("email", profile.email || "—");
}

loadProfile();

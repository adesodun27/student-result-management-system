/* STUDENT PROFILE — wired to Supabase. Shows the logged-in student's details. */

const $ = (s) => document.querySelector(s);

async function loadProfile() {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    console.warn("No logged-in user");
    return;
  }

  const { data: p, error } = await db
    .from("profiles")
    .select("full_name, matric_number, department, level, email")
    .eq("id", user.id)
    .single();

  if (error || !p) {
    console.error(error);
    return;
  }

  const initials = p.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const set = (id, v) => {
    const el = $("#" + id);
    if (el) el.textContent = v;
  };

  set("avatar", initials);
  set("pName", p.full_name);
  set("pFullName", p.full_name);
  set("pMatric", p.matric_number || "—");
  set("pDept", p.department || "—");
  set("pLevel", p.level ? p.level + " Level" : "—");
  set("pEmail", p.email || "—");
}

loadProfile();

/* ADMIN DASHBOARD — counts + pending approvals, filtered by session/semester. */

const $ = (s) => document.querySelector(s);

function getSelected() {
  const val = $("#sessionSelect").value;
  const [session, semester] = val.split("|");
  return { session, semester };
}

async function loadCounts() {
  try {
    const [stu, lec, crs] = await Promise.all([
      db
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student"),
      db
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "lecturer"),
      db.from("courses").select("*", { count: "exact", head: true }),
    ]);

    const cards = document.querySelectorAll(".summary-card h3");
    if (cards.length >= 4) {
      cards[0].textContent = stu.count ?? 0;
      cards[1].textContent = lec.count ?? 0;
      cards[2].textContent = crs.count ?? 0;
    }
  } catch (e) {
    console.error(e);
    const cards = document.querySelectorAll(".summary-card h3");
    cards.forEach((c) => (c.textContent = "—"));
  }
}

async function loadPending() {
  const { session, semester } = getSelected();
  const body = document.querySelector(".scores tbody");

  const { data: submitted, error } = await db
    .from("results")
    .select(
      `
      id,
      student_registrations ( course_id, session, semester, courses ( course_code, course_title ) )
    `,
    )
    .eq("status", "submitted");

  if (error) {
    console.error(error); // real error for you
    if (body)
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:26px">Couldn't load pending results. Please refresh the page.</td></tr>`;
    return;
  }

  const groups = {};
  (submitted || []).forEach((r) => {
    const reg = r.student_registrations;
    if (!reg) return;
    if (reg.session !== session || reg.semester !== semester) return;
    const key = `${reg.course_id}|${reg.session}|${reg.semester}`;
    if (!groups[key]) {
      groups[key] = {
        code: reg.courses?.course_code || "—",
        title: reg.courses?.course_title || "—",
        session: reg.session,
        semester: reg.semester,
        count: 0,
      };
    }
    groups[key].count++;
  });
  const pending = Object.values(groups);

  const cards = document.querySelectorAll(".summary-card h3");
  if (cards.length >= 4) cards[3].textContent = pending.length;

  if (!body) return;
  if (pending.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#999;padding:26px">No results waiting for approval this semester.</td></tr>`;
    return;
  }
  body.innerHTML = pending
    .map(
      (g) => `
    <tr>
      <td class="name">${g.code} · ${g.title}</td>
      <td>—</td>
      <td class="r">${g.count}</td>
      <td>${g.session} · ${g.semester}</td>
      <td><span class="status-badge status-submitted">Submitted</span></td>
      <td class="r"><a class="btn-sm" href="admin-approvals.html">Review</a></td>
    </tr>`,
    )
    .join("");
}

$("#sessionSelect").addEventListener("change", loadPending);

loadCounts();
loadPending();

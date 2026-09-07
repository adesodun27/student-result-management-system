/* ADMIN DASHBOARD — wired to Supabase. Read-only counts + pending approvals. */

const $ = (s) => document.querySelector(s);

async function loadDashboard() {
  // counts (head:true returns just the count, no rows)
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

  // submitted results → group by course to count pending + build table
  const { data: submitted } = await db
    .from("results")
    .select(
      `course_id, session, semester, courses ( course_code, course_title )`,
    )
    .eq("status", "submitted");

  // group into distinct course/session/semester
  const groups = {};
  (submitted || []).forEach((r) => {
    const key = `${r.course_id}|${r.session}|${r.semester}`;
    if (!groups[key]) {
      groups[key] = {
        code: r.courses?.course_code || "—",
        title: r.courses?.course_title || "—",
        session: r.session,
        semester: r.semester,
        count: 0,
      };
    }
    groups[key].count++;
  });
  const pending = Object.values(groups);

  // update the summary cards (order matches your HTML)
  const cards = document.querySelectorAll(".summary-card h3");
  if (cards.length >= 4) {
    cards[0].textContent = stu.count ?? 0;
    cards[1].textContent = lec.count ?? 0;
    cards[2].textContent = crs.count ?? 0;
    cards[3].textContent = pending.length;
  }

  // update pending approvals table
  const body = document.querySelector(".scores tbody");
  if (!body) return;
  if (pending.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#999;padding:26px">No results waiting for approval.</td></tr>`;
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

loadDashboard();

/* STUDENT SUPPORT — submit tickets + view own with status. */

const $ = (s) => document.querySelector(s);

function statusBadge(status) {
  const map = {
    open: ["status-not-started", "Open"],
    in_progress: ["status-draft", "In Progress"],
    resolved: ["status-approved", "Resolved"],
    closed: ["status-submitted", "Closed"],
  };
  const [cls, label] = map[status] || map.open;
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

async function loadTickets() {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    $("#ticketList").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#999;padding:26px">Please log in.</td></tr>`;
    return;
  }

  const { data, error } = await db
    .from("support_tickets")
    .select("subject, message, status, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    $("#ticketList").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#d9534f;padding:26px">Couldn't load: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#ticketList").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#999;padding:26px">No requests yet.</td></tr>`;
    return;
  }

  $("#ticketList").innerHTML = data
    .map(
      (t) => `
    <tr>
      <td class="name">${t.subject}</td>
      <td>${t.message}</td>
      <td>${fmtDate(t.created_at)}</td>
      <td>${statusBadge(t.status)}</td>
    </tr>`,
    )
    .join("");
}

async function submitTicket() {
  const subject = $("#subject").value.trim();
  const message = $("#message").value.trim();
  const err = $("#formError");

  if (!subject || !message) {
    err.textContent = "Fill in both subject and message.";
    return;
  }
  err.textContent = "";

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    err.textContent = "Please log in.";
    return;
  }

  const btn = $("#submitBtn");
  btn.disabled = true;

  const { error } = await db.from("support_tickets").insert({
    student_id: user.id,
    subject,
    message,
  });

  btn.disabled = false;

  if (error) {
    err.textContent = "Couldn't submit: " + error.message;
    console.error(error);
    return;
  }

  $("#subject").value = "";
  $("#message").value = "";
  await loadTickets();
  toast("Request submitted");
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

$("#submitBtn").addEventListener("click", submitTicket);
loadTickets();

/* STUDENT SUPPORT — submit tickets + view own with status + AI response. */

const $ = (s) => document.querySelector(s);

function statusBadge(status) {
  const map = {
    open: ["status-not-started", "Open"],
    ai_resolved: ["status-approved", "AI Resolved"],
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
    .select("subject, message, status, ai_response, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    $("#ticketList").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#d9534f;padding:26px">Couldn't load your requests. Please refresh the page.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#ticketList").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:#999;padding:26px">No requests yet.</td></tr>`;
    return;
  }

  $("#ticketList").innerHTML = data
    .map((t) => {
      const aiBlock = t.ai_response
        ? `<div style="margin-top:8px;padding:10px 12px;background:#e8f5ec;border-left:4px solid #2e8b57;border-radius:0 6px 6px 0;">
           <p style="font-size:11px;font-weight:700;color:#2e8b57;text-transform:uppercase;margin:0 0 4px;">Acadex Support AI</p>
           <p style="font-size:13px;color:#2e6b47;margin:0;white-space:pre-line;">${t.ai_response}</p>
         </div>`
        : "";
      return `
      <tr>
        <td class="name">${t.subject}</td>
        <td>${t.message}${aiBlock}</td>
        <td>${fmtDate(t.created_at)}</td>
        <td>${statusBadge(t.status)}</td>
      </tr>`;
    })
    .join("");
}

async function submitTicket() {
  const subject = $("#subject").value.trim();
  const message = $("#message").value.trim();
  const err = $("#formError");

  if (!subject || !message) {
    err.textContent = "Please fill in both the subject and message.";
    return;
  }
  err.textContent = "";

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    err.textContent = "Please log in first.";
    return;
  }

  const btn = $("#submitBtn");
  btn.disabled = true;

  // insert the ticket and get the created row back
  const { data: ticket, error } = await db
    .from("support_tickets")
    .insert({ student_id: user.id, subject, message })
    .select()
    .single();

  if (error) {
    console.error(error);
    err.textContent = "Couldn't submit your request. Please try again.";
    btn.disabled = false;
    return;
  }

  $("#subject").value = "";
  $("#message").value = "";
  toast("Request submitted — checking for an instant answer…");

  // ask the AI to answer this ticket right away
  try {
    await db.functions.invoke("support-ai", { body: { record: ticket } });
  } catch (e) {
    console.error("AI function error:", e);
    // not fatal — the ticket is saved either way
  }

  btn.disabled = false;

  // poll a few times so the AI response has time to land
  loadTickets();
  setTimeout(loadTickets, 2500);
  setTimeout(loadTickets, 5000);
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2600);
}

$("#submitBtn").addEventListener("click", submitTicket);
loadTickets();

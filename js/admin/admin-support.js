/* ADMIN SUPPORT — view all tickets + change status. */

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
  return d ? new Date(d).toLocaleDateString() : "—";
}

async function loadTickets() {
  const { data, error } = await db
    .from("support_tickets")
    .select(
      `id, subject, message, status, created_at, profiles ( full_name, matric_number )`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    $("#ticketList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#d9534f;padding:26px">Couldn't load support requests. Please refresh the page.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    $("#ticketList").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:26px">No support requests.</td></tr>`;
    return;
  }

  $("#ticketList").innerHTML = data
    .map((t) => {
      const student = t.profiles
        ? `${t.profiles.full_name} (${t.profiles.matric_number || "—"})`
        : "—";
      return `
      <tr>
        <td class="name">${student}</td>
        <td>${t.subject}</td>
        <td>${t.message}</td>
        <td>${fmtDate(t.created_at)}</td>
        <td>${statusBadge(t.status)}</td>
        <td class="r">
          <select class="status-select" data-id="${t.id}" title="Update status">
            <option value="open" ${t.status === "open" ? "selected" : ""}>Open</option>
            <option value="in_progress" ${t.status === "in_progress" ? "selected" : ""}>In Progress</option>
            <option value="resolved" ${t.status === "resolved" ? "selected" : ""}>Resolved</option>
            <option value="closed" ${t.status === "closed" ? "selected" : ""}>Closed</option>
          </select>
        </td>
      </tr>`;
    })
    .join("");

  document
    .querySelectorAll(".status-select")
    .forEach((sel) =>
      sel.addEventListener("change", () =>
        updateStatus(sel.dataset.id, sel.value),
      ),
    );
}

async function updateStatus(id, status) {
  const { error } = await db
    .from("support_tickets")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error(error);
    toast("Couldn't update the status. Please try again.", true);
    return;
  }
  await loadTickets();
  toast("Status updated");
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}

loadTickets();

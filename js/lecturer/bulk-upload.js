/* UPLOAD RESULTS — sends a CSV to the FastAPI backend's /upload-csv endpoint. */

const $ = (s) => document.querySelector(s);

const API_BASE = "https://acadex-backend-engine.onrender.com";
const UPLOAD_URL = `${API_BASE}/api/v1/results/upload-csv`;

async function uploadCsv() {
  const fileInput = $("#csvFile");
  const err = $("#formError");
  err.textContent = "";

  const file = fileInput.files[0];
  if (!file) {
    err.textContent = "Please choose a CSV file first.";
    return;
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    err.textContent = "The file must be a .csv file.";
    return;
  }

  const btn = $("#uploadBtn");
  btn.disabled = true;
  btn.textContent = "Uploading…";

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const data = await res.json(); // { success_count, failed_count, errors }
    showResult(data);
    toast(`Done — ${data.success_count} added, ${data.failed_count} failed`);
  } catch (e) {
    console.error(e);
    err.textContent =
      "Couldn't upload the file. Check your connection and try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Upload";
  }
}

function showResult(data) {
  $("#uploadResult").classList.remove("hidden");
  $("#successCount").textContent = data.success_count ?? 0;
  $("#failedCount").textContent = data.failed_count ?? 0;

  const errors = data.errors || [];
  const wrap = $("#errorTableWrap");
  if (errors.length === 0) {
    wrap.classList.add("hidden");
  } else {
    wrap.classList.remove("hidden");
    $("#errorList").innerHTML = errors
      .map((e) => `<tr><td style="color:#d9534f;">${e}</td></tr>`)
      .join("");
  }
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 3000);
}

$("#uploadBtn").addEventListener("click", uploadCsv);

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

    const text = await file.text(); // read the CSV we just sent
    const rows = parseCsv(text); // parse into a table
    showResult(rows);

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

function parseCsv(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => line.split(",").map((c) => c.trim()));
}

function showResult(rows) {
  $("#uploadResult").classList.remove("hidden");

  const wrap = $("#errorTableWrap");
  wrap.classList.remove("hidden");

  if (!rows || rows.length === 0) {
    wrap.innerHTML = `<p style="color:#999;">No rows found in file.</p>`;
    return;
  }

  const [header, ...body] = rows;

  const thead = `<tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const tbody = body
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");

  wrap.innerHTML = `
    <table class="scores">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>`;
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

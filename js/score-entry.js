
      /* GRADING ENGINE — mirrors SQL compute_grade() (5.0 scale)
         A>=70=5 B>=60=4 C>=50=3 D>=45=2 E>=40=1 F<40=0 */
      function computeGrade(total) {
        if (total >= 70) return { grade: "A", point: 5 };
        if (total >= 60) return { grade: "B", point: 4 };
        if (total >= 50) return { grade: "C", point: 3 };
        if (total >= 45) return { grade: "D", point: 2 };
        if (total >= 40) return { grade: "E", point: 1 };
        return { grade: "F", point: 0 };
      }
      function gradeClass(g) {
        if (g === "A" || g === "B") return "grade-high";
        if (g === "C" || g === "D") return "grade-mid";
        return "grade-low";
      }
      const CA_MAX = 30, EXAM_MAX = 70;

      /* MOCK DATA → replace with Supabase later */
      const COURSES = {
        CSC401: {
          code: "CSC 401", title: "Software Engineering",
          level: "400", units: 3, semester: "First", status: "draft",
          roster: [
            { matric: "CSC/2021/001", name: "Adebayo Chidinma", ca: 24, exam: 58 },
            { matric: "CSC/2021/014", name: "Okonkwo Emeka",    ca: 18, exam: 41 },
            { matric: "CSC/2021/027", name: "Ibrahim Fatima",   ca: 29, exam: 66 },
            { matric: "CSC/2021/033", name: "Nwosu Kelechi",    ca: 12, exam: 25 },
            { matric: "CSC/2021/045", name: "Balogun Tunde",    ca: null, exam: null },
            { matric: "CSC/2021/052", name: "Eze Chiamaka",     ca: 21, exam: null },
          ],
        },
        CSC415: {
          code: "CSC 415", title: "Database Systems",
          level: "400", units: 3, semester: "First", status: "not-started",
          roster: [
            { matric: "CSC/2021/001", name: "Adebayo Chidinma", ca: null, exam: null },
            { matric: "CSC/2021/014", name: "Okonkwo Emeka",    ca: null, exam: null },
            { matric: "CSC/2021/027", name: "Ibrahim Fatima",   ca: null, exam: null },
            { matric: "CSC/2021/033", name: "Nwosu Kelechi",    ca: null, exam: null },
          ],
        },
        CSC302: {
          code: "CSC 302", title: "Operating Systems",
          level: "300", units: 3, semester: "First", status: "submitted",
          roster: [
            { matric: "CSC/2020/003", name: "Ahmed Yusuf", ca: 26, exam: 60 },
            { matric: "CSC/2020/009", name: "Obi Ngozi",   ca: 20, exam: 52 },
            { matric: "CSC/2020/021", name: "Lawal Aisha",  ca: 28, exam: 63 },
          ],
        },
        CSC410: {
          code: "CSC 410", title: "Computer Networks",
          level: "400", units: 3, semester: "First", status: "not-started",
          roster: [
            { matric: "CSC/2021/001", name: "Adebayo Chidinma", ca: null, exam: null },
            { matric: "CSC/2021/014", name: "Okonkwo Emeka",    ca: null, exam: null },
            { matric: "CSC/2021/027", name: "Ibrahim Fatima",   ca: null, exam: null },
          ],
        },
      };

      const params = new URLSearchParams(location.search);
      const code = params.get("course") || "CSC401";
      const course = COURSES[code] || COURSES.CSC401;

      const $ = (s) => document.querySelector(s);

      function fieldError(v, max) {
        if (v === null || v === "") return null;
        const n = Number(v);
        if (Number.isNaN(n)) return "must be a number";
        if (n < 0) return "no negatives";
        if (n > max) return "max " + max;
        return null;
      }

      function render() {
        const locked = course.status === "submitted" || course.status === "approved";

        $("#courseTitle").textContent = course.code + " · " + course.title;
        $("#courseMeta").innerHTML =
          course.level + " Level <span class='dot'>·</span> " +
          course.units + " Units <span class='dot'>·</span> " +
          course.semester + " Semester <span class='dot'>·</span> " +
          course.roster.length + " Students";

        const map = {
          "not-started": ["status-not-started", "Not Started"],
          draft: ["status-draft", "Draft"],
          submitted: ["status-submitted", "Submitted"],
          approved: ["status-approved", "Approved"],
        };
        const [cls, label] = map[course.status] || map["not-started"];
        const badge = $("#statusBadge");
        badge.className = "status-badge " + cls;
        badge.textContent = label;

        $("#lockedNote").style.display = locked ? "block" : "none";

        $("#roster").innerHTML = course.roster.map((r, i) => {
          const caErr = fieldError(r.ca, CA_MAX);
          const exErr = fieldError(r.exam, EXAM_MAX);
          const done = r.ca !== null && r.ca !== "" && r.exam !== null && r.exam !== "" && !caErr && !exErr;
          const total = done ? Number(r.ca) + Number(r.exam) : null;
          const g = total === null ? null : computeGrade(total);
          return `
            <tr>
              <td class="idx">${i + 1}</td>
              <td class="matric">${r.matric}</td>
              <td class="name">${r.name}</td>
              <td class="r">
                <input class="score-input ${caErr ? "invalid" : ""}" data-i="${i}" data-f="ca"
                       inputmode="decimal" placeholder="—" value="${r.ca ?? ""}" ${locked ? "disabled" : ""}>
                ${caErr ? `<div class="row-msg">${caErr}</div>` : ""}
              </td>
              <td class="r">
                <input class="score-input ${exErr ? "invalid" : ""}" data-i="${i}" data-f="exam"
                       inputmode="decimal" placeholder="—" value="${r.exam ?? ""}" ${locked ? "disabled" : ""}>
                ${exErr ? `<div class="row-msg">${exErr}</div>` : ""}
              </td>
              <td class="r"><span class="total-val ${total === null ? "empty" : ""}">${total === null ? "—" : total}</span></td>
              <td>${g ? `<span class="grade-tag ${gradeClass(g.grade)}">${g.grade}</span>` : `<span class="grade-tag grade-none">—</span>`}</td>
              <td class="r"><span class="gp-val">${g ? g.point.toFixed(1) : "—"}</span></td>
            </tr>`;
        }).join("");

        $("#roster").querySelectorAll(".score-input").forEach((inp) => inp.addEventListener("input", onEdit));
        updateFooter();
      }

      function onEdit(e) {
        const i = +e.target.dataset.i, f = e.target.dataset.f;
        const raw = e.target.value.trim();
        course.roster[i][f] = raw === "" ? null : raw;
        render();
        const again = document.querySelector(`.score-input[data-i="${i}"][data-f="${f}"]`);
        if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
      }

      function rosterState() {
        let scored = 0, invalid = 0, blank = 0;
        course.roster.forEach((r) => {
          const caErr = fieldError(r.ca, CA_MAX), exErr = fieldError(r.exam, EXAM_MAX);
          if (caErr || exErr) invalid++;
          const hasCa = r.ca !== null && r.ca !== "";
          const hasEx = r.exam !== null && r.exam !== "";
          if (hasCa && hasEx && !caErr && !exErr) scored++;
          if (!hasCa || !hasEx) blank++;
        });
        return { scored, invalid, blank, total: course.roster.length };
      }

      function updateFooter() {
        const locked = course.status === "submitted" || course.status === "approved";
        const st = rosterState();
        $("#progress").innerHTML = `<b>${st.scored}</b> of <b>${st.total}</b> students scored`;

        const hint = $("#actionHint"), submitBtn = $("#submitBtn"), saveBtn = $("#saveBtn");
        if (locked) {
          saveBtn.disabled = true; submitBtn.disabled = true;
          submitBtn.textContent = "Submitted";
          hint.className = "action-hint"; hint.textContent = "Locked — already submitted.";
          return;
        }
        submitBtn.textContent = "Submit Results"; saveBtn.disabled = false;
        if (st.invalid > 0) {
          submitBtn.disabled = true; hint.className = "action-hint blocked";
          hint.textContent = `${st.invalid} row(s) out of range — fix before submitting.`;
        } else if (st.blank > 0) {
          submitBtn.disabled = true; hint.className = "action-hint";
          hint.textContent = `${st.blank} student(s) still need scores. You can save a draft anytime.`;
        } else {
          submitBtn.disabled = false; hint.className = "action-hint";
          hint.textContent = "All students scored — ready to submit.";
        }
      }

      function saveDraft() {
        course.status = "draft";
        // → Supabase: upsert results rows (status = 'draft')
        render();
        toast("Draft saved");
      }

      function submitResults() {
        const st = rosterState();
        if (st.invalid > 0 || st.blank > 0) { toast("Fix errors / fill all scores first", true); return; }
        course.status = "submitted";
        // → Supabase: flip draft→submitted.
        //   ADMIN DECISION PLUGS IN HERE:
        //   - With admin: stays 'submitted' until admin approves, then students see it.
        //   - No admin:   treat 'submitted' as final/visible to students immediately.
        render();
        toast("Results submitted");
      }

      let toastTimer;
      function toast(msg, isErr) {
        const t = $("#toast");
        t.textContent = msg;
        t.className = "show" + (isErr ? " err" : "");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (t.className = ""), 2200);
      }

      $("#saveBtn").addEventListener("click", saveDraft);
      $("#submitBtn").addEventListener("click", submitResults);
      render();

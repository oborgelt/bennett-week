(function () {
  let baseWeek = null;
  let week = null;
  let pack = null;
  let roster = null;
  let family = null;
  let baseSeed = null;
  let seed = null;

  function classIdForTitle(title) {
    return Game.classIdForTitle(title) || null;
  }

  function stripClassPrefix(title) {
    return String(title || "")
      .replace(/^TEST:\s*/i, "")
      .replace(/^English 10:\s*/i, "")
      .replace(/^Marching Band:\s*/i, "")
      .replace(/^Band:\s*/i, "")
      .replace(/^Sociology:\s*/i, "")
      .replace(/^Web Design I:\s*/i, "")
      .replace(/^Academic Intervention:\s*/i, "")
      .replace(/^Chemistry:\s*/i, "")
      .replace(/^Strength & Conditioning I:\s*/i, "")
      .replace(/^Geometry:\s*/i, "")
      .trim();
  }

  function wantedClass() {
    try {
      return String(new URLSearchParams(location.search).get("class") || "").toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function mergeClasses() {
    const map = new Map();
    (seed.classes || []).forEach((cls) => {
      map.set(cls.id, {
        id: cls.id,
        name: cls.name,
        period: cls.period || "",
        code: cls.code || "",
        periods: cls.periods,
        time: cls.time || "",
        room: cls.room || "",
        teacher: cls.teacher || "",
        test: !!cls.test,
        khan: cls.khan,
        grade: cls.grade || null,
        items: (cls.items || []).map((item) => Object.assign({}, item))
      });
    });

    (week.work || []).forEach((w) => {
      const cid = Game.classIdForWork(w);
      if (!cid || !map.has(cid)) return;
      const cls = map.get(cid);
      const extra = {
        feed: w,
        due: w.due,
        note: w.note,
        status: w.status,
        school_status: w.school_status,
        student_status: w.student_status,
        discrepancy: w.discrepancy,
        followup: w.followup,
        submitted_at: w.submitted_at,
        score: w.score,
        points: w.points,
        late: w.late,
        canvas: w.canvas
      };
      const idx = cls.items.findIndex((item) => item.id === w.id);
      if (idx >= 0) {
        cls.items[idx] = Object.assign({}, cls.items[idx], extra, {
          title: cls.items[idx].title || stripClassPrefix(w.title)
        });
        return;
      }
      cls.items.push(Object.assign({
        id: w.id,
        title: stripClassPrefix(w.title),
        kind: "assignment"
      }, extra));
    });

    return [...map.values()];
  }

  function notesForIds(ids) {
    return (family.notes || []).filter((n) => ids.includes(n.targetId));
  }

  function classStats(cls) {
    const ids = cls.items.map((item) => item.id);
    let started = 0;
    let done = 0;
    let help = 0;
    ids.forEach((id) => {
      const st = Game.workState(id);
      if (st.started) started += 1;
      if (st.done) done += 1;
      help += Game.helpOpens(id).length;
    });
    const notes = notesForIds(ids);
    const asked = notes.filter((n) => n.from === "bennett").length;
    const parentNotes = notes.filter((n) => n.from === "parent").length;
    return { started, done, help, asked, parentNotes };
  }

  function actionBits(stats) {
    const bits = [];
    bits.push(stats.started ? stats.started + " started" : "0 started");
    bits.push(stats.done ? stats.done + " done" : "0 done");
    bits.push(stats.asked ? stats.asked + " asked" : "0 asked");
    bits.push(stats.help ? stats.help + " help" : "0 help");
    if (stats.parentNotes) {
      bits.push(stats.parentNotes + (stats.parentNotes === 1 ? " note" : " notes"));
    }
    return bits.join(" · ");
  }

  function feedOf(item) {
    return (item && item.feed) || item || {};
  }

  function wantedWork() {
    try {
      return String(new URLSearchParams(location.search).get("work") || "");
    } catch (_) {
      return "";
    }
  }

  function itemStatus(item) {
    const st = Game.workState(item.id);
    if (st.done) {
      const when = st.startedAt ? " · Started " + Game.fmtStamp(st.startedAt) : "";
      return { label: "Done here" + when, kind: "done" };
    }
    if (st.started) {
      return { label: "Started " + (st.startedAt ? Game.fmtStamp(st.startedAt) : ""), kind: "started" };
    }
    if (item.kind === "event") return { label: "On the calendar", kind: "event" };
    return { label: "", kind: "idle" };
  }

  function gradeHtml(grade, extraTest) {
    if (!grade || (!grade.display && !grade.detail)) {
      return "";
    }
    const test = !!(grade.test || extraTest);
    return `<span class="grade-pill${test ? " is-test" : ""}">${test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(grade.display || "—")}${grade.detail && grade.detail !== grade.display ? `<span class="grade-detail">${Game.esc(grade.detail)}</span>` : ""}</span>`;
  }

  function kindLabel(kind) {
    if (kind === "quiz" || kind === "test") return "Test";
    if (kind === "event") return "Calendar";
    return "Assignment";
  }

  function openSource() {
    const real = Game.getOpens();
    if (real.length) {
      return { stamps: real, test: false };
    }
    const sample = (seed.sampleOpens || [])
      .map((row) => row.at)
      .filter(Boolean);
    return { stamps: sample, test: sample.length > 0 };
  }

  function weekOpenCount(stamps) {
    const days = new Set(Game.lastNChicagoDays(7));
    return stamps.filter((iso) => {
      const d = Game.parseStamp(iso);
      return d && days.has(Game.chicagoYmd(d));
    }).length;
  }

  function sparkDays(stamps) {
    const days = Game.lastNChicagoDays(7);
    const counts = Object.fromEntries(days.map((d) => [d, 0]));
    stamps.forEach((iso) => {
      const d = Game.parseStamp(iso);
      if (!d) return;
      const key = Game.chicagoYmd(d);
      if (key in counts) counts[key] += 1;
    });
    const max = Math.max(1, ...days.map((d) => counts[d]));
    return days.map((d) => ({
      day: d,
      count: counts[d],
      pct: Math.round((counts[d] / max) * 100)
    }));
  }

  function recentOpens(stamps, limit) {
    return stamps
      .slice()
      .reverse()
      .slice(0, limit)
      .map((iso) => Game.fmtStamp(iso))
      .filter(Boolean);
  }

  function activityTotals(classes) {
    const progress = Game.getProgress();
    let started = 0;
    let done = 0;
    let help = 0;
    const startedAt = [];
    Object.keys(progress).forEach((id) => {
      const st = Game.workState(id);
      if (st.started) {
        started += 1;
        if (st.startedAt) startedAt.push({ id, at: st.startedAt });
      }
      if (st.done) done += 1;
      help += Game.helpOpens(id).length;
    });
    classes.forEach((cls) => {
      cls.items.forEach((item) => {
        if (progress[item.id]) return;
        const st = Game.workState(item.id);
        if (st.started) started += 1;
        if (st.done) done += 1;
      });
    });
    const notes = family.notes || [];
    const asked = notes.filter((n) => n.from === "bennett").length;
    const parentNotes = notes.filter((n) => n.from === "parent").length;
    const reflections = ((family.reflections && family.reflections.answers) || []).length;
    const trophies = (pack.achievements || []).filter((ach) => Game.alreadyUnlocked(ach.id));
    const eggs = Game.foundEggs(seed.eggNames);
    return {
      started,
      startedAt: startedAt.sort((a, b) => String(b.at).localeCompare(String(a.at))),
      done,
      help,
      asked,
      parentNotes,
      reflections,
      trophies,
      mates: roster ? Game.unlockedTeammates(roster) : [],
      eggs,
      bananas: Game.getBananas(pack, family)
    };
  }

  function workTitle(id) {
    const w = (week.work || []).find((x) => x.id === id);
    if (w) return stripClassPrefix(w.title);
    for (let i = 0; i < (seed.classes || []).length; i += 1) {
      const hit = (seed.classes[i].items || []).find((item) => item.id === id);
      if (hit) return hit.title;
    }
    return id;
  }

  function renderOpens(opens) {
    const last = opens.stamps.length ? Game.fmtStamp(opens.stamps[opens.stamps.length - 1]) : "—";
    const weekCount = weekOpenCount(opens.stamps);
    const spark = sparkDays(opens.stamps);
    const recent = recentOpens(opens.stamps, 5);
    const test = opens.test ? '<span class="test-tag">TEST</span> ' : "";
    return `
      <article class="stat-card opens-card">
        <h3>Lobby opens</h3>
        <p class="stat-lead">${test}${opens.stamps.length ? Game.esc(last) : "No opens yet"}</p>
        <p class="stat-sub">${opens.stamps.length ? "Last open · America/Chicago" : "Open This week to start the log"}</p>
        <div class="stat-row">
          <div>
            <div class="stat-num">${weekCount}</div>
            <div class="stat-label">this week</div>
          </div>
          <div>
            <div class="stat-num">${opens.stamps.length}</div>
            <div class="stat-label">all time</div>
          </div>
        </div>
        <div class="spark" aria-hidden="true">
          ${spark.map((d) => `<span class="spark-bar" style="height:${Math.max(8, d.pct)}%" title="${Game.esc(d.day)} · ${d.count}"></span>`).join("")}
        </div>
        <ul class="open-list">
          ${recent.length ? recent.map((t) => `<li>${test}${Game.esc(t)}</li>`).join("") : `<li class="empty">No lobby opens on this device yet.</li>`}
        </ul>
      </article>`;
  }

  function renderActions(totals) {
    const startBits = totals.startedAt.slice(0, 3).map((row) => {
      return `<li>${Game.esc(workTitle(row.id))} · ${Game.esc(Game.fmtStamp(row.at))}</li>`;
    });
    return `
      <article class="stat-card actions-card">
        <h3>Actions</h3>
        <div class="metric-grid">
          <div class="metric"><span class="stat-num">${totals.started}</span><span class="stat-label">started</span></div>
          <div class="metric"><span class="stat-num">${totals.done}</span><span class="stat-label">done</span></div>
          <div class="metric"><span class="stat-num">${totals.asked}</span><span class="stat-label">asked</span></div>
          <div class="metric"><span class="stat-num">${totals.parentNotes}</span><span class="stat-label">parent notes</span></div>
          <div class="metric"><span class="stat-num">${totals.reflections}</span><span class="stat-label">check-ins</span></div>
          <div class="metric"><span class="stat-num">${totals.help}</span><span class="stat-label">help opened</span></div>
        </div>
        ${startBits.length ? `<ul class="open-list">${startBits.join("")}</ul>` : `<p class="empty">No “I started this” stamps yet — tap that on a week card.</p>`}
      </article>`;
  }

  function renderFinds(totals) {
    const cur = Game.currency(pack);
    const eggs = totals.eggs;
    const trophies = totals.trophies;
    const eggList = eggs.length
      ? eggs.map((e) => `<li>${Game.esc(e.name)}${e.at ? " · " + Game.esc(Game.fmtStamp(e.at)) : ""}</li>`).join("")
      : `<li class="empty">None found yet. The lobby has a few wholesome surprises.</li>`;
    const trophyList = Game.progressTrophyListHtml(pack.achievements);
    const mateList = totals.mates.length
      ? totals.mates.map((ch) => `<li><a href="characters.html">${Game.esc(Game.characterLabel(ch))}</a>${ch.talent ? " · " + Game.esc(ch.talent) : ""}</li>`).join("")
      : `<li class="empty">${Game.siteViewHidesAdult() ? "No teammates yet — keep the streak going." : "No teammates yet — parents award a streak to unlock Ace."}</li>`;
    return `
      <article class="stat-card finds-card">
        <h3>Bananas &amp; finds</h3>
        <div class="stat-row">
          <div>
            <div class="stat-num">${cur.emoji} ${totals.bananas}</div>
            <div class="stat-label">${cur.name}</div>
          </div>
          <div>
            <div class="stat-num">${trophies.length}</div>
            <div class="stat-label">trophies</div>
          </div>
          <div>
            <div class="stat-num">${eggs.length}</div>
            <div class="stat-label">eggs found</div>
          </div>
          <div>
            <div class="stat-num">${totals.mates.length}</div>
            <div class="stat-label">teammates</div>
          </div>
        </div>
        <h4>Eggs found</h4>
        <ul class="open-list">${eggList}</ul>
        <h4>Trophies awarded</h4>
        <ul class="open-list">${trophyList}</ul>
        <h4>Teammates unlocked</h4>
        <ul class="open-list">${mateList}</ul>
      </article>`;
  }

  function renderClass(cls, open) {
    const stats = classStats(cls);
    const items = (cls.items || []).slice().sort((a, b) => {
      const as = Game.workFeedStatus(feedOf(a));
      const bs = Game.workFeedStatus(feedOf(b));
      const rank = (s) => (s.needsYou ? 0 : s.notDone ? 1 : 2);
      return rank(as) - rank(bs);
    });
    const khan = Game.khanStripHtmlForClass(cls);
    const summaryKhan = !items.length ? Game.khanInlineHtml(Game.khanLinksForClass(cls)) : "";
    const askHref = `basecamp.html?class=${encodeURIComponent(cls.id)}&title=${encodeURIComponent(cls.name)}`;
    const itemHtml = items.length
      ? items.map((item) => {
        const status = itemStatus(item);
        const feed = feedOf(item);
        const feedSt = Game.workFeedStatus(feed);
        const local = status.label ? `<div class="meta">${Game.esc(kindLabel(item.kind))}${status.label ? " · " + Game.esc(status.label) : ""}</div>` : `<div class="meta">${Game.esc(kindLabel(item.kind))}${feed.due ? " · due " + Game.esc(Game.fmtStamp(feed.due)) : ""}</div>`;
        return `
          <li class="class-item${feedSt.needsYou ? " needs" : ""}${feedSt.discrepancy ? " discrepancy" : ""}${status.kind === "done" ? " done" : (status.kind === "started" ? " started" : "")}" id="work-${Game.esc(item.id)}">
            <div class="class-item-top">
              <div>
                <div class="title">${item.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(item.title)}</div>
                ${local}
                ${Game.workStatusChipsHtml(feed)}
              </div>
              ${item.grade ? gradeHtml(item.grade, item.test) : (feedSt.score ? `<span class="grade-pill">${Game.esc(feedSt.score)}</span>` : "")}
            </div>
            <div class="entry-tools">
              ${item.kind === "event" ? "" : `<button type="button" class="tiny" data-dispute-item="${Game.esc(item.id)}">This looks wrong</button>`}
              <button type="button" class="tiny" data-note-item="${Game.esc(item.id)}">Note</button>
              ${item.kind === "event" ? "" : `<button type="button" class="tiny" data-edit-work="${Game.esc(item.id)}">Edit</button>`}
              ${Game.progressCanMutate() ? Game.entryButtons("pitem:" + item.id, "pitem:" + item.id) : ""}
            </div>
          </li>`;
      }).join("")
      : `<li class="empty">No assignments yet</li>`;

    return `
      <details class="class-card" ${open ? "open" : ""} data-class="${Game.esc(cls.id)}">
        <summary>
          <span class="chev" aria-hidden="true"></span>
          <span class="class-copy">
            <span class="class-name">${cls.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(Game.classPeriodLine(cls))}</span>
            <span class="class-actions">${cls.time ? Game.esc(cls.time) + " · " : ""}${items.length ? Game.esc(actionBits(stats)) : "No assignments yet"}</span>
            ${summaryKhan ? `<span class="class-summary-khan">${summaryKhan}</span>` : ""}
          </span>
          ${gradeHtml(cls.grade, cls.test)}
        </summary>
        <ul class="class-items">${itemHtml}</ul>
        ${khan}
        <p class="ask-help-link class-ask"><a href="${Game.esc(askHref)}">Base Camp · Ask AI</a></p>
        <div class="class-card-tools">
          <button type="button" class="mini" data-add-item="${Game.esc(cls.id)}">Add assignment</button>
          ${Game.progressCanMutate() ? Game.entryButtons("pclass:" + cls.id, "pclass:" + cls.id) : ""}
        </div>
      </details>`;
  }

  function syncViews() {
    week = Game.applyWeekOverlay(baseWeek, family);
    seed = Game.applyProgressOverlay(baseSeed, family);
  }

  function openSheet(title, html) {
    document.getElementById("sheet-title").textContent = title;
    document.getElementById("sheet-body").innerHTML = html;
    document.getElementById("sheet").classList.add("open");
  }

  function closeSheet() {
    document.getElementById("sheet").classList.remove("open");
  }

  function editForm(fields) {
    return fields.map((f) => {
      if (f.type === "textarea") {
        return `<label class="edit-label">${Game.esc(f.label)}<textarea id="ef-${Game.esc(f.name)}" maxlength="${f.max || 120}">${Game.esc(f.value || "")}</textarea></label>`;
      }
      if (f.type === "checkbox") {
        return `<label class="check"><input id="ef-${Game.esc(f.name)}" type="checkbox"${f.value ? " checked" : ""}> ${Game.esc(f.label)}</label>`;
      }
      return `<label class="edit-label">${Game.esc(f.label)}<input id="ef-${Game.esc(f.name)}" type="${Game.esc(f.type || "text")}" value="${Game.esc(f.value || "")}"></label>`;
    }).join("") + `<button type="button" class="btn primary" id="edit-save">Save</button>`;
  }

  function fieldValue(name, type) {
    const el = document.getElementById("ef-" + name);
    if (!el) return "";
    if (type === "checkbox") return el.checked;
    return (el.value || "").trim();
  }

  function findClassItem(id) {
    const classes = mergeClasses();
    for (let i = 0; i < classes.length; i += 1) {
      const hit = (classes[i].items || []).find((item) => item.id === id);
      if (hit) return { cls: classes[i], item: hit };
    }
    return null;
  }

  function classSelectHtml(selected) {
    const classes = mergeClasses();
    const opts = [`<option value="">Class</option>`].concat(classes.map((cls) => {
      const on = cls.id === selected ? " selected" : "";
      return `<option value="${Game.esc(cls.id)}"${on}>${Game.esc(Game.classPeriodLine(cls))}</option>`;
    }));
    return `<label class="edit-label">Class<select id="ef-classId">${opts.join("")}</select></label>`;
  }

  function openWorkPlan(id) {
    const key = String(id || "").trim();
    const w = workFromId(key) || ((findClassItem(key) || {}).item);
    if (!w) {
      Game.toast("That assignment is not on the board yet.");
      return;
    }
    const cur = Game.workPlanFor(family, w.id || key);
    openSheet("Plan", `
      <p class="plan-kicker">${Game.esc(w.title || "This item")}</p>
      <p class="plan-hint">What's your plan? Mom and Dad will see this.</p>
      ${editForm([
        { name: "plan", label: "Plan", value: (cur && cur.text) || "", type: "textarea", max: 2000 }
      ])}
    `);
    const save = document.getElementById("edit-save");
    if (save) save.textContent = "Save plan";
    save.addEventListener("click", () => {
      const text = fieldValue("plan");
      if (!String(text || "").trim()) {
        Game.toast("Write the plan first.");
        return;
      }
      family = Game.saveWorkPlan(family, w, text);
      closeSheet();
      Game.familySavedToast("Plan saved");
      renderFollowupPane();
      renderNeedsYouPane();
      Game.flushFamilyNotes(family).catch(() => {});
    });
  }

  function openWorkEdit(id) {
    const key = String(id || "").trim();
    const w = workFromId(key);
    const found = findClassItem(key);
    if (!w && !found) {
      Game.toast("That assignment is not on the board yet.");
      return;
    }
    const src = w || (found && found.item) || {};
    const title = stripClassPrefix(src.title || "");
    const due = src.due || "";
    const note = src.note || "";
    const classId = Game.classIdForWork(src) || (found && found.cls && found.cls.id) || "";
    openSheet("Edit assignment", `
      ${classSelectHtml(classId)}
      ${editForm([
        { name: "title", label: "Title", value: title },
        { name: "due", label: "Due", value: Game.toLocalInput(due), type: "datetime-local" },
        { name: "note", label: "Note (optional)", value: note, type: "textarea" }
      ])}
    `);
    document.getElementById("edit-save").addEventListener("click", () => {
      const nextTitle = fieldValue("title");
      if (!nextTitle) {
        Game.toast("Add a title first.");
        return;
      }
      const nextDue = Game.fromLocalInput(fieldValue("due"));
      if (!nextDue) {
        Game.toast("Pick a due date.");
        return;
      }
      family = Game.updateAssignment(family, seed || baseSeed, key, {
        title: nextTitle,
        classId: fieldValue("classId"),
        due: nextDue,
        note: fieldValue("note")
      });
      closeSheet();
      Game.familySavedToast("Saved");
      syncViews();
      render();
    });
  }

  function openEdit(token) {
    if (!Game.progressCanMutate()) return;
    const i = (token || "").indexOf(":");
    const kind = i < 0 ? token : token.slice(0, i);
    const id = i < 0 ? "" : token.slice(i + 1);
    if (kind === "pitem") {
      const found = findClassItem(id);
      if (!found) return;
      const item = found.item;
      const grade = item.grade || {};
      openSheet("Edit class item", editForm([
        { name: "title", label: "Title", value: item.title || "" },
        { name: "kind", label: "Kind (assignment, quiz, test, event)", value: item.kind || "assignment" },
        { name: "grade", label: "Grade", value: grade.display || "" },
        { name: "detail", label: "Detail", value: grade.detail || "" },
        { name: "test", label: "TEST label", type: "checkbox", value: !!item.test || !!(grade.test) }
      ]));
      document.getElementById("edit-save").addEventListener("click", () => {
        const title = fieldValue("title");
        if (!title) {
          Game.toast("Add a title first.");
          return;
        }
        family = Game.editProgressItem(family, id, {
          title,
          kind: fieldValue("kind") || "assignment",
          test: fieldValue("test", "checkbox"),
          grade: {
            display: fieldValue("grade") || "—",
            detail: fieldValue("detail"),
            test: fieldValue("test", "checkbox")
          }
        });
        closeSheet();
        Game.toast("Saved on this device. Export the family pack to share.");
        syncViews();
        render();
      });
      return;
    }
    if (kind === "pclass") {
      const cls = mergeClasses().find((c) => c.id === id);
      if (!cls) return;
      const grade = cls.grade || {};
      openSheet("Edit class", editForm([
        { name: "name", label: "Class name", value: cls.name || "" },
        { name: "grade", label: "Overall grade", value: grade.display || "" },
        { name: "detail", label: "Detail", value: grade.detail || "" },
        { name: "test", label: "TEST label", type: "checkbox", value: !!cls.test || !!(grade.test) }
      ]));
      document.getElementById("edit-save").addEventListener("click", () => {
        const name = fieldValue("name");
        if (!name) {
          Game.toast("Add a class name first.");
          return;
        }
        const gradeDisplay = fieldValue("grade");
        const gradeDetail = fieldValue("detail");
        family = Game.editProgressClass(family, id, {
          name,
          test: fieldValue("test", "checkbox"),
          grade: gradeDisplay || gradeDetail
            ? {
              display: gradeDisplay,
              detail: gradeDetail,
              test: fieldValue("test", "checkbox")
            }
            : null
        });
        closeSheet();
        Game.toast("Saved on this device. Export the family pack to share.");
        syncViews();
        render();
      });
      return;
    }
    if (kind === "trophy") {
      const ach = (pack.achievements || []).find((x) => x.id === id);
      if (!ach) return;
      openSheet("Edit trophy", editForm([
        { name: "title", label: "Title", value: ach.title || "" },
        { name: "description", label: "Description", value: ach.description || "", type: "textarea" },
        { name: "incentive", label: "Incentive", value: ach.incentive || "" }
      ]));
      document.getElementById("edit-save").addEventListener("click", () => {
        const title = fieldValue("title");
        if (!title) {
          Game.toast("Add a title first.");
          return;
        }
        const idx = pack.achievements.findIndex((x) => x.id === id);
        if (idx >= 0) {
          pack.achievements[idx] = Object.assign({}, pack.achievements[idx], {
            title,
            description: fieldValue("description"),
            incentive: fieldValue("incentive")
          });
          Game.saveMomDraft(pack);
        }
        closeSheet();
        Game.toast("Saved on this device. Export the family pack to share.");
        render();
      });
    }
  }

  function deleteEntry(token) {
    if (!Game.progressCanMutate()) return;
    const i = (token || "").indexOf(":");
    const kind = i < 0 ? token : token.slice(0, i);
    const id = i < 0 ? "" : token.slice(i + 1);
    if (kind === "pitem") {
      if (!Game.confirmDelete("class item")) return;
      family = Game.deleteProgressItem(family, id);
    } else if (kind === "pclass") {
      if (!Game.confirmDelete("class")) return;
      family = Game.deleteProgressClass(family, id);
    } else {
      return;
    }
    Game.toast("Deleted on this device. Export the family pack to share.");
    syncViews();
    render();
  }

  function openAddItem(classId) {
    const cls = mergeClasses().find((c) => c.id === classId);
    if (!cls) return;
    const today = Game.chicagoYmd(new Date());
    openSheet("Add assignment · " + (cls.name || ""), editForm([
      { name: "title", label: "Title", value: "" },
      { name: "due", label: "Due", value: today + "T23:59", type: "datetime-local" },
      { name: "note", label: "Note (optional)", value: "", type: "textarea" }
    ]).replace(">Save<", ">Add<"));
    document.getElementById("edit-save").addEventListener("click", () => {
      const title = fieldValue("title");
      if (!title) {
        Game.toast("Add a title first.");
        return;
      }
      const due = Game.fromLocalInput(fieldValue("due"));
      if (!due) {
        Game.toast("Pick a due date.");
        return;
      }
      const result = Game.addAssignment(family, seed || baseSeed, {
        title,
        classId,
        due,
        note: fieldValue("note"),
        addedBy: "bennett"
      });
      family = result.family;
      closeSheet();
      Game.familySavedToast("Added");
      syncViews();
      render();
    });
  }

  function openItemNote(id) {
    const found = findClassItem(id);
    const classId = found ? found.cls.id : "";
    const termId = Game.termOf(seed || baseSeed).id;
    openSheet("Add a note", `
      <p class="empty">A reminder or fact on this assignment — not a question for parents.</p>
      <textarea id="note-text" maxlength="280" placeholder="What should stay on this assignment?"></textarea>
      <button type="button" class="btn primary" id="note-send">Save note</button>
    `);
    document.getElementById("note-send").addEventListener("click", () => {
      const text = (document.getElementById("note-text").value || "").trim();
      if (!text) {
        Game.toast("Write a note first.");
        return;
      }
      family = Game.addNote(family, {
        id: Game.uid("n"),
        targetType: "work",
        targetId: id,
        from: "bennett",
        kind: "note",
        text,
        at: Game.nowIso(),
        classId: classId || undefined,
        termId
      });
      closeSheet();
      Game.toast("Note saved on this device.");
      syncViews();
      render();
    });
    document.getElementById("note-text").focus();
  }

  function bindDash() {
    document.querySelectorAll(".class-summary-khan a, .class-card .khan-strip a").forEach((a) => {
      a.addEventListener("click", (e) => e.stopPropagation());
    });
    document.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openEdit(btn.dataset.edit);
      });
    });
    document.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteEntry(btn.dataset.del);
      });
    });
    document.querySelectorAll("[data-undo-trophy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!Game.progressCanMutate()) return;
        const result = Game.revokeAchievement(pack, family, btn.dataset.undoTrophy);
        family = result.family;
        Game.toast("Award undone. That trophy leaves the room.");
        render();
      });
    });
    document.querySelectorAll("[data-add-item]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openAddItem(btn.dataset.addItem);
      });
    });
    document.querySelectorAll("[data-note-item]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openItemNote(btn.dataset.noteItem);
      });
    });
    document.querySelectorAll("[data-dispute-item]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openLooksWrong(btn.dataset.disputeItem);
      });
    });
    document.querySelectorAll("[data-copy-contact]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const text = btn.getAttribute("data-copy-contact") || "";
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
        } catch (_) {}
        Game.toast("Copied. Paste into a message to the teacher.");
      });
    });
  }

  function workFromId(id) {
    return (week.work || []).find((w) => w.id === id) || null;
  }

  function openLooksWrong(id) {
    const w = workFromId(id);
    if (!w) {
      Game.toast("That assignment is not on the week feed.");
      return;
    }
    const existing = Game.workDisputeOf(w);
    openSheet("This looks wrong", `
      <p class="empty">Marks this assignment if Canvas does not match what happened.</p>
      <textarea id="dispute-text" maxlength="280" placeholder="We think this was turned in">${existing && existing.reason ? Game.esc(existing.reason) : ""}</textarea>
      <button type="button" class="btn primary" id="dispute-save">Save</button>
    `);
    document.getElementById("dispute-save").addEventListener("click", () => {
      const reason = (document.getElementById("dispute-text").value || "").trim();
      Game.markWorkLooksWrong(w, reason);
      closeSheet();
      Game.toast("Flagged on this assignment.");
      render();
    });
    document.getElementById("dispute-text").focus();
  }

  function renderCheckinsPane() {
    const host = document.getElementById("checkins-pane");
    if (!host) return;
    host.innerHTML = `<h2>Check-ins</h2>${Game.checkinsListHtml(family)}<p class="checkin-more"><a href="messages.html">All asks and check-ins</a></p>`;
  }

  function renderFollowupPane(classes) {
    const host = document.getElementById("followup-pane");
    if (!host) return;
    const mode = Game.resolvedCheckinMode(location.search, new Date());
    document.body.classList.toggle("checkin-after-school", mode === "after-school");
    document.body.classList.toggle("checkin-bedtime", mode === "bedtime");
    host.innerHTML = Game.followupSectionHtml(week, classes || mergeClasses(), new Date(), {
      mode,
      page: "progress.html"
    });
  }

  function renderNeedsYouPane() {
    const host = document.getElementById("needs-you");
    if (!host) return;
    const list = Game.needsYouSectionHtml(week, new Date(), { empty: true, family });
    host.innerHTML = list;
    host.classList.toggle("collapsed", Game.needsYouCollapsed());
    host.querySelectorAll("[data-needs-work]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = document.getElementById("work-" + btn.dataset.needsWork);
        const card = document.querySelector(`.class-card[data-class="${CSS.escape(btn.dataset.needsClass || "")}"]`);
        if (card) card.open = true;
        if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
      });
    });
  }

  function renderGradesPane(classes) {
    const host = document.getElementById("grades-pane");
    if (!host) return;
    const rows = classes.map((cls) => {
      const scored = (cls.items || []).filter((item) => {
        if (item.kind === "event") return false;
        const st = Game.workFeedStatus(feedOf(item));
        return !!st.score;
      });
      if (!scored.length) {
        return `<article class="grade-class"><h3>${Game.esc(cls.name)}</h3><p class="empty">No score yet</p></article>`;
      }
      const items = scored.map((item) => {
        const st = Game.workFeedStatus(feedOf(item));
        return `<li><span>${Game.esc(item.title)}</span><span class="grade-pill">${Game.esc(st.score)}</span></li>`;
      }).join("");
      return `<article class="grade-class"><h3>${Game.esc(cls.name)}</h3><ul class="grade-list">${items}</ul></article>`;
    }).join("");
    host.innerHTML = `<h2>Grades</h2>${rows}`;
  }

  function render() {
    const classes = mergeClasses();
    const opens = openSource();
    const totals = activityTotals(classes);
    document.getElementById("bananas").textContent = `${Game.currency(pack).emoji} ${totals.bananas}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    Game.paintStoryChip(roster);
    renderFollowupPane(classes);
    renderNeedsYouPane();
    renderCheckinsPane();
    const want = wantedClass();
    const workId = wantedWork();
    const workClass = workId ? Game.classIdForWork(workFromId(workId) || { id: workId }) : "";
    document.getElementById("class-list").innerHTML = classes.map((cls) => {
      const hasNeed = (cls.items || []).some((item) => Game.workFeedStatus(feedOf(item)).needsYou);
      const open = want
        ? cls.id === want
        : (workClass ? cls.id === workClass : hasNeed);
      return renderClass(cls, open && (cls.items || []).length);
    }).join("");
    renderGradesPane(classes);
    document.getElementById("stat-strip").innerHTML =
      renderOpens(opens) + renderActions(totals) + renderFinds(totals);
    if (want) {
      const card = document.querySelector(`.class-card[data-class="${CSS.escape(want)}"]`);
      if (card && card.scrollIntoView) card.scrollIntoView({ block: "nearest" });
    }
    if (workId) {
      const row = document.getElementById("work-" + workId);
      if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
    }
    bindDash();
    if (location.hash === "#needs-you") {
      const needs = document.getElementById("needs-you");
      if (needs && needs.scrollIntoView) needs.scrollIntoView({ block: "start" });
    }
    if (location.hash === "#followup-pane") {
      const follow = document.getElementById("followup-pane");
      if (follow && follow.scrollIntoView) follow.scrollIntoView({ block: "start" });
    }
  }

  async function boot() {
    baseWeek = Game.ensureWeekIds(await Game.loadWeek() || { work: [], events: [] });
    pack = await Game.loadAchievements() || { currency: Game.currency({}), achievements: [] };
    roster = await Game.loadCharacters();
    family = await Game.loadFamily();
    family = Game.ensureReflectionPool(family);
    family = Game.maybeAutoPreviewAll(pack, family).family;
    baseSeed = await Game.loadProgress();
    syncViews();
    document.getElementById("close-sheet").addEventListener("click", closeSheet);
    document.getElementById("sheet").addEventListener("click", (e) => {
      if (e.target.id === "sheet") closeSheet();
    });
    document.addEventListener("click", (e) => {
      const plan = e.target && e.target.closest && e.target.closest("[data-plan-work]");
      if (plan) {
        e.preventDefault();
        e.stopPropagation();
        openWorkPlan(plan.getAttribute("data-plan-work"));
        return;
      }
      const edit = e.target && e.target.closest && e.target.closest("[data-edit-work]");
      if (!edit) return;
      e.preventDefault();
      e.stopPropagation();
      openWorkEdit(edit.getAttribute("data-edit-work"));
    });
    document.addEventListener("bw-site-view", () => {
      if (!pack) return;
      render();
    });
    render();
    try {
      const synced = await Game.syncFamilyBoard(family);
      family = synced.family;
      syncViews();
      render();
    } catch (_) {}
  }

  boot();
})();

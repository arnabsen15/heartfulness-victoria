/**
 * Heartfulness Victoria — load and render events from data/events.json
 */
(function () {
  "use strict";

  const EVENTS_URL = "data/events.json";

  const DAY_ORDER = ["Saturday", "Sunday", "Tuesday", "Other"];

  /* Map weekday name → JS getDay() (0=Sun … 6=Sat) */
  const WEEKDAY_JS = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const open = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* —— Scroll-spy: mark current section nav link with .is-active —— */
  function initScrollSpy() {
    const links = Array.from(
      document.querySelectorAll('.site-nav a[href^="#"]')
    );
    if (links.length === 0) return;

    const sections = links
      .map(function (a) {
        const id = a.getAttribute("href").slice(1);
        const el = document.getElementById(id);
        return el ? { id: id, el: el, link: a } : null;
      })
      .filter(Boolean);

    if (sections.length === 0) return;

    function setActive(id) {
      links.forEach(function (a) {
        const match = a.getAttribute("href") === "#" + id;
        a.classList.toggle("is-active", match);
        if (match) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }

    function onScroll() {
      const offset = getHeaderOffset() + 8;
      let current = sections[0].id;
      for (let i = 0; i < sections.length; i++) {
        const top = sections[i].el.getBoundingClientRect().top;
        if (top - offset <= 0) current = sections[i].id;
      }
      /* Near page bottom → prefer last section (Contact) */
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 48;
      if (nearBottom) current = sections[sections.length - 1].id;
      setActive(current);
    }

    let ticking = false;
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          onScroll();
          ticking = false;
        });
      },
      { passive: true }
    );
    onScroll();
  }

  function getHeaderOffset() {
    const header = document.querySelector(".site-header");
    return header ? header.offsetHeight : 76;
  }

  function parseLocalDate(isoDate) {
    if (!isoDate) return null;
    const parts = isoDate.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function formatDisplayDate(isoDate) {
    const d = parseLocalDate(isoDate);
    if (!d) return "Date TBC";
    return d.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function isPastEvent(event) {
    if (event.category === "past") return true;
    if (event.status === "series-ended" || event.status === "ended") return true;
    if (!event.date) return false;
    const d = parseLocalDate(event.date);
    if (!d) return false;
    return d < startOfToday();
  }

  function sortByDateAsc(a, b) {
    const ta = String(a.time || "");
    const tb = String(b.time || "");
    if (a.date && b.date) {
      return a.date.localeCompare(b.date) || ta.localeCompare(tb);
    }
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    const sa = String(a.suburb || a.title || "");
    const sb = String(b.suburb || b.title || "");
    return ta.localeCompare(tb) || sa.localeCompare(sb);
  }

  function sortByDateDesc(a, b) {
    return -sortByDateAsc(a, b);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function recurrenceDay(event) {
    const rec = String(event.recurrence || "").toLowerCase();
    if (rec.indexOf("saturday") !== -1) return "Saturday";
    if (rec.indexOf("sunday") !== -1) return "Sunday";
    if (rec.indexOf("tuesday") !== -1) return "Tuesday";
    return "Other";
  }

  /**
   * Parse a rough start hour (0–23) from time strings like
   * "2:00 – 3:00 PM", "8:15 AM", "11:30 AM – 1:30 PM IST".
   * Returns null if unparseable.
   */
  function parseStartHour(timeStr) {
    if (!timeStr) return null;
    const m = String(timeStr).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const ampm = (m[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    if (!ampm && h > 23) return null;
    return h;
  }

  /** Short display time for chip, e.g. "2:00 PM" from "2:00 – 3:00 PM". */
  function shortTime(timeStr) {
    if (!timeStr) return "";
    const m = String(timeStr).match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
    return m ? m[1].trim() : String(timeStr).split(/[–—-]/)[0].trim();
  }

  function shortWeekday(d) {
    return d.toLocaleDateString("en-AU", { weekday: "short" });
  }

  /**
   * Next occurrence of a weekly session.
   * Heuristic (documented):
   * - Find the session weekday from recurrence ("Every Saturday" etc.).
   * - If today is that weekday AND current local hour is before the session
   *   start hour, treat as this week; otherwise the next matching weekday.
   * - If weekday unknown, return null.
   */
  function nextWeeklyOccurrence(event, now) {
    const dayName = recurrenceDay(event);
    if (dayName === "Other" || WEEKDAY_JS[dayName] === undefined) return null;
    const targetDow = WEEKDAY_JS[dayName];
    const todayDow = now.getDay();
    const startHour = parseStartHour(event.time);
    let daysAhead = (targetDow - todayDow + 7) % 7;
    if (daysAhead === 0) {
      /* Same weekday: this week if still before session time, else next week */
      if (startHour !== null && now.getHours() < startHour) {
        daysAhead = 0;
      } else if (startHour === null && now.getHours() < 12) {
        daysAhead = 0;
      } else {
        daysAhead = 7;
      }
    }
    const occ = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysAhead
    );
    return occ;
  }

  /**
   * Build ordered list of upcoming "next sessions" for chip + footer.
   * Prefer dated specials (soonest first), then fill with weekly heuristics.
   */
  function computeNextSessions(events, limit) {
    const now = new Date();
    const today = startOfToday();
    const candidates = [];

    events.forEach(function (ev) {
      if (isPastEvent(ev)) return;

      if (ev.category === "special" && ev.date) {
        const d = parseLocalDate(ev.date);
        if (!d || d < today) return;
        /* If special is today and time already passed, skip */
        if (d.getTime() === today.getTime()) {
          const h = parseStartHour(ev.time);
          if (h !== null && now.getHours() >= h + 3) return;
        }
        candidates.push({
          event: ev,
          when: d,
          kind: "special",
          sortKey: d.toISOString().slice(0, 10) + "T" + String(ev.time || ""),
        });
        return;
      }

      if (ev.category === "weekly" || (!ev.category && ev.recurrence)) {
        const occ = nextWeeklyOccurrence(ev, now);
        if (!occ) return;
        candidates.push({
          event: ev,
          when: occ,
          kind: "weekly",
          sortKey:
            occ.getFullYear() +
            "-" +
            String(occ.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(occ.getDate()).padStart(2, "0") +
            "T" +
            String(ev.time || ""),
        });
      }
    });

    candidates.sort(function (a, b) {
      return a.sortKey.localeCompare(b.sortKey);
    });

    return candidates.slice(0, limit || 2);
  }

  function chipLabel(item) {
    const ev = item.event;
    const day = shortWeekday(item.when);
    const place =
      ev.suburb ||
      (ev.venue ? String(ev.venue).split(",")[0].trim() : "") ||
      "Session";
    /* Prefer short suburb / area — truncate long place names */
    const placeShort =
      place.length > 18 ? place.slice(0, 16).trim() + "…" : place;
    const time = shortTime(ev.time);
    if (time) return day + " · " + placeShort + " · " + time;
    return day + " · " + placeShort;
  }

  function footerNextLabel(item) {
    const ev = item.event;
    const day = shortWeekday(item.when);
    const dateNum = item.when.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
    const time = shortTime(ev.time);
    const when =
      day +
      " " +
      dateNum +
      (time ? " · " + time : "");
    const title =
      ev.category === "special"
        ? ev.title
        : ev.suburb || ev.title || "Weekly session";
    return { when: when, title: title };
  }

  function populateNextSessionUI(events) {
    const chip = document.getElementById("next-session-chip");
    const footerNext = document.getElementById("footer-next");
    const nexts = computeNextSessions(events, 2);

    if (chip) {
      if (nexts.length === 0) {
        chip.hidden = true;
        chip.textContent = "";
      } else {
        const first = nexts[0];
        const href = first.event.id
          ? "#" + first.event.id
          : "#events";
        chip.hidden = false;
        chip.href = href;
        chip.textContent = chipLabel(first);
        chip.setAttribute(
          "aria-label",
          "Next session: " + chipLabel(first)
        );
      }
    }

    if (footerNext) {
      if (nexts.length === 0) {
        footerNext.innerHTML =
          '<p class="footer-next-empty">No upcoming sessions listed right now.</p>';
      } else {
        footerNext.innerHTML = nexts
          .map(function (item) {
            const labels = footerNextLabel(item);
            const href = item.event.id ? "#" + item.event.id : "#events";
            return (
              '<a class="footer-next-item" href="' +
              escapeHtml(href) +
              '">' +
              '<span class="fn-when">' +
              escapeHtml(labels.when) +
              "</span>" +
              '<span class="fn-title">' +
              escapeHtml(labels.title) +
              "</span>" +
              "</a>"
            );
          })
          .join("");
      }
    }
  }

  function eventActions(event) {
    const parts = [];
    const join = (event.joinUrl || "").trim();
    if (join && join !== "#") {
      let joinLabel = "Open link";
      if (/zoom\.us/i.test(join)) joinLabel = "Join Zoom";
      else if (
        /bit\.ly|register|yourlibrary|square\.site/i.test(join) ||
        event.category === "special"
      )
        joinLabel = "Register";
      parts.push(
        '<a class="btn btn-card" href="' +
          escapeHtml(join) +
          '" target="_blank" rel="noopener noreferrer">' +
          joinLabel +
          "</a>"
      );
    }
    const url = (event.eventbriteUrl || "").trim();
    if (url && url !== "#") {
      parts.push(
        '<a class="btn btn-card" href="' +
          escapeHtml(url) +
          '" target="_blank" rel="noopener noreferrer">View on Eventbrite</a>'
      );
    }
    const maps = (event.mapsUrl || "").trim();
    if (maps && maps !== "#") {
      parts.push(
        '<a class="btn btn-card btn-card-secondary" href="' +
          escapeHtml(maps) +
          '" target="_blank" rel="noopener noreferrer">Map</a>'
      );
    }
    return parts.join(" ");
  }

  function badgeFor(event, past) {
    if (event.status === "series-ended" || event.status === "ended") {
      return '<span class="event-badge ended">Series ended / check dates</span>';
    }
    if (past) {
      return '<span class="event-badge past">Past</span>';
    }
    if (event.category === "special") {
      return '<span class="event-badge special">Special</span>';
    }
    const rec = (event.recurrence || "").toLowerCase();
    if (rec.indexOf("every sunday") !== -1) {
      return '<span class="event-badge weekly">Every Sunday</span>';
    }
    if (rec.indexOf("every tuesday") !== -1) {
      return '<span class="event-badge weekly">Every Tuesday</span>';
    }
    if (rec.indexOf("every ") === 0) {
      return (
        '<span class="event-badge weekly">' +
        escapeHtml(event.recurrence) +
        "</span>"
      );
    }
    return '<span class="event-badge">Upcoming</span>';
  }

  function cardIdAttr(event) {
    const id = (event.id || "").trim();
    if (!id) return "";
    return (
      ' id="' +
      escapeHtml(id) +
      '" data-event-id="' +
      escapeHtml(id) +
      '"'
    );
  }

  function renderSpecialCard(event, past) {
    const ended = event.status === "series-ended" || event.status === "ended";
    const classes = ["event-card", "is-special"];
    if (past || ended) classes.push(past && !ended ? "is-past" : "is-ended");

    const recurrence = (event.recurrence || "").trim();
    let dateLine;
    if (event.date && event.endDate && event.endDate !== event.date) {
      dateLine =
        formatDisplayDate(event.date) + " – " + formatDisplayDate(event.endDate);
    } else if (event.date) {
      dateLine = formatDisplayDate(event.date);
    } else if (recurrence) {
      dateLine = recurrence;
    } else {
      dateLine = "Date to be confirmed";
    }
    const timeLine = event.time || "";
    const scheduleNote =
      recurrence &&
      event.date &&
      recurrence.toLowerCase().indexOf("october") !== -1
        ? '<li><span class="label">Schedule</span><span>' +
          escapeHtml(recurrence) +
          "</span></li>"
        : "";

    const notes =
      event.notes && String(event.notes).trim()
        ? '<p class="event-notes">' + escapeHtml(event.notes) + "</p>"
        : "";

    const registerBy =
      event.registerBy && String(event.registerBy).trim()
        ? '<li><span class="label">Register by</span><span>' +
          escapeHtml(formatDisplayDate(event.registerBy)) +
          "</span></li>"
        : "";

    const contact =
      event.contactEmail && String(event.contactEmail).trim()
        ? '<li><span class="label">Contact</span><span><a href="mailto:' +
          escapeHtml(event.contactEmail) +
          '">' +
          escapeHtml(event.contactEmail) +
          "</a></span></li>"
        : "";

    /* Flyer only when an image exists — no empty placeholder block */
    const hasImage = event.image && String(event.image).trim();
    const image = hasImage
      ? '<div class="event-flyer"><img src="' +
        escapeHtml(event.image) +
        '" alt="' +
        escapeHtml(event.title) +
        ' flyer" loading="lazy" /></div>'
      : "";

    const whenDetail =
      escapeHtml(dateLine) +
      (timeLine ? "<br />" + escapeHtml(timeLine) : "");

    return (
      '<article class="' +
      classes.join(" ") +
      '"' +
      cardIdAttr(event) +
      ">" +
      image +
      '<div class="event-body">' +
      badgeFor(event, past) +
      "<h3>" +
      escapeHtml(event.title) +
      "</h3>" +
      '<ul class="event-meta">' +
      '<li><span class="label">When</span><span>' +
      whenDetail +
      "</span></li>" +
      '<li><span class="label">Where</span><span>' +
      escapeHtml(event.venue) +
      "</span></li>" +
      scheduleNote +
      registerBy +
      contact +
      "</ul>" +
      notes +
      '<div class="event-actions">' +
      eventActions(event) +
      "</div>" +
      "</div></article>"
    );
  }

  function renderWeeklyCompact(event) {
    const suburb = event.suburb || event.title || "Session";
    const time = event.time || "Time TBC";
    const venue = event.venue || "";
    const when = (event.recurrence || "Weekly").trim() + " · " + time;
    const notes =
      event.notes && String(event.notes).trim()
        ? '<p class="weekly-notes">' + escapeHtml(event.notes) + "</p>"
        : "";
    const actions = eventActions(event);

    return (
      '<article class="event-card is-weekly-compact' +
      (actions ? "" : " no-actions") +
      '"' +
      cardIdAttr(event) +
      ' role="listitem">' +
      '<div class="weekly-main">' +
      '<p class="weekly-suburb">' +
      escapeHtml(suburb) +
      "</p>" +
      '<p class="weekly-time">' +
      escapeHtml(when) +
      "</p>" +
      (venue
        ? '<p class="weekly-venue">' + escapeHtml(venue) + "</p>"
        : "") +
      notes +
      "</div>" +
      (actions ? '<div class="event-actions">' + actions + "</div>" : "") +
      "</article>"
    );
  }

  function renderPastCard(event) {
    const ended = event.status === "series-ended" || event.status === "ended";
    const classes = ["event-card"];
    if (ended) classes.push("is-ended");
    else classes.push("is-past");

    const dateLine = event.date
      ? formatDisplayDate(event.date)
      : event.recurrence || "Past session";

    const notes =
      event.notes && String(event.notes).trim()
        ? '<p class="event-notes">' + escapeHtml(event.notes) + "</p>"
        : "";

    const link = (event.joinUrl || event.eventbriteUrl || "").trim();
    const actions =
      link && link !== "#"
        ? '<div class="event-actions"><a class="btn btn-card" href="' +
          escapeHtml(link) +
          '" target="_blank" rel="noopener noreferrer">Event page</a></div>'
        : "";

    return (
      '<article class="' +
      classes.join(" ") +
      '"' +
      cardIdAttr(event) +
      ">" +
      '<div class="event-body">' +
      badgeFor(event, true) +
      "<h3>" +
      escapeHtml(event.title) +
      "</h3>" +
      '<ul class="event-meta">' +
      '<li><span class="label">When</span><span>' +
      escapeHtml(dateLine) +
      (event.time ? " · " + escapeHtml(event.time) : "") +
      "</span></li>" +
      '<li><span class="label">Where</span><span>' +
      escapeHtml(event.venue || "") +
      (event.suburb ? " — " + escapeHtml(event.suburb) : "") +
      "</span></li>" +
      "</ul>" +
      notes +
      actions +
      "</div></article>"
    );
  }

  function groupWeeklyByDay(weekly) {
    const groups = {};
    DAY_ORDER.forEach(function (d) {
      groups[d] = [];
    });
    weekly.forEach(function (ev) {
      const day = recurrenceDay(ev);
      if (!groups[day]) groups[day] = [];
      groups[day].push(ev);
    });
    DAY_ORDER.forEach(function (d) {
      groups[d].sort(sortByDateAsc);
    });
    return groups;
  }

  function renderWeeklyGrouped(weekly) {
    if (weekly.length === 0) {
      return '<p class="events-empty">No weekly sessions listed right now.</p>';
    }

    const groups = groupWeeklyByDay(weekly);
    const parts = [];

    DAY_ORDER.forEach(function (day) {
      const items = groups[day];
      if (!items || items.length === 0) return;
      const heading = day === "Other" ? "Other weekly" : day + "s";
      parts.push(
        '<div class="day-group">' +
          '<h4 class="day-group-heading">' +
          escapeHtml(heading) +
          "</h4>" +
          '<div class="weekly-list" role="list">' +
          items.map(renderWeeklyCompact).join("") +
          "</div></div>"
      );
    });

    return parts.join("");
  }


  function renderVenuesOverview(events) {
    const root = document.getElementById("venues-list");
    if (!root) return;

    const weekly = events.filter(function (ev) {
      return !isPastEvent(ev) && ev.category !== "special" && ev.category !== "past";
    });

    const bySuburb = {};
    weekly.forEach(function (ev) {
      const suburb = (ev.suburb || "").trim() || "Other";
      if (suburb === "Virtual" || suburb === "APAC Online") return;
      if (!bySuburb[suburb]) {
        bySuburb[suburb] = {
          suburb: suburb,
          venue: ev.venue || "",
          mapsUrl: ev.mapsUrl || "",
          recurrence: ev.recurrence || "",
          time: ev.time || "",
        };
      }
    });

    const rows = Object.keys(bySuburb)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .map(function (key) {
        return bySuburb[key];
      });

    if (rows.length === 0) {
      root.innerHTML = '<p class="venues-empty">Venue list coming soon.</p>';
      return;
    }

    root.innerHTML = rows
      .map(function (row) {
        const when = [row.recurrence, row.time].filter(Boolean).join(" · ");
        const map =
          row.mapsUrl
            ? '<a class="venues-map" href="' +
              escapeHtml(row.mapsUrl) +
              '" target="_blank" rel="noopener noreferrer">Map</a>'
            : "";
        return (
          '<li class="venues-item">' +
          '<div class="venues-text">' +
          '<p class="venues-suburb">' +
          escapeHtml(row.suburb) +
          "</p>" +
          '<p class="venues-address">' +
          escapeHtml(row.venue) +
          "</p>" +
          (when
            ? '<p class="venues-when">' + escapeHtml(when) + "</p>"
            : "") +
          "</div>" +
          map +
          "</li>"
        );
      })
      .join("");
  }

  function renderEvents(events) {
    const upcomingRoot = document.getElementById("events-upcoming");
    const specialRoot = document.getElementById("events-special");
    const specialSection = document.getElementById("special-events-section");
    const pastRoot = document.getElementById("events-past");
    const pastSection =
      document.getElementById("past") ||
      document.getElementById("past-events-section");
    const statusEl = document.getElementById("events-status");

    if (!upcomingRoot) return;

    const special = [];
    const weekly = [];
    const past = [];

    events.forEach(function (ev) {
      if (isPastEvent(ev)) {
        past.push(ev);
        return;
      }
      if (ev.category === "special") special.push(ev);
      else weekly.push(ev);
    });

    special.sort(sortByDateAsc);
    weekly.sort(sortByDateAsc);
    past.sort(sortByDateDesc);

    renderVenuesOverview(events);

    if (statusEl) {
      statusEl.textContent =
        special.length +
        " special · " +
        weekly.length +
        " weekly · " +
        past.length +
        " past or ended";
    }

    if (specialRoot && specialSection) {
      if (special.length === 0) {
        specialSection.hidden = true;
      } else {
        specialSection.hidden = false;
        specialRoot.innerHTML = special
          .map(function (e) {
            return renderSpecialCard(e, false);
          })
          .join("");
      }
    }

    upcomingRoot.innerHTML = renderWeeklyGrouped(weekly);

    if (pastRoot && pastSection) {
      if (past.length === 0) {
        pastSection.hidden = true;
      } else {
        pastSection.hidden = false;
        pastRoot.innerHTML = past
          .map(function (e) {
            return renderPastCard(e);
          })
          .join("");
      }
    }

    populateNextSessionUI(events);
  }

  function showError(message) {
    const upcomingRoot = document.getElementById("events-upcoming");
    const statusEl = document.getElementById("events-status");
    const footerNext = document.getElementById("footer-next");
    if (statusEl) statusEl.textContent = "Could not load events";
    if (upcomingRoot) {
      upcomingRoot.innerHTML =
        '<p class="events-error" role="alert">' +
        escapeHtml(message) +
        " Please try again later, or contact melbourne@heartfulness.org.</p>";
    }
    if (footerNext) {
      footerNext.innerHTML =
        '<p class="footer-next-empty">Events could not be loaded.</p>';
    }
  }

  function init() {
    initScrollSpy();

    fetch(EVENTS_URL)
      .then(function (res) {
        if (!res.ok)
          throw new Error("Failed to fetch events (" + res.status + ").");
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data))
          throw new Error("Events data must be an array.");
        renderEvents(data);
      })
      .catch(function (err) {
        console.error(err);
        showError(err.message || "Unable to load events.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

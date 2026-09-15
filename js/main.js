/**
 * Heartfulness Victoria — load and render events from data/events.json
 */
(function () {
  "use strict";

  const EVENTS_URL = "data/events.json";

  const DAY_ORDER = ["Saturday", "Sunday", "Tuesday", "Other"];

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

  function eventActions(event) {
    const parts = [];
    const join = (event.joinUrl || "").trim();
    if (join && join !== "#") {
      let joinLabel = "Open link";
      if (/zoom\.us/i.test(join)) joinLabel = "Join Zoom";
      else if (/bit\.ly|register|yourlibrary|square\.site/i.test(join) || event.category === "special")
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
      return '<span class="event-badge weekly">' + escapeHtml(event.recurrence) + "</span>";
    }
    return '<span class="event-badge">Upcoming</span>';
  }

  function renderSpecialCard(event, past) {
    const ended = event.status === "series-ended" || event.status === "ended";
    const classes = ["event-card", "is-special"];
    if (past || ended) classes.push(past && !ended ? "is-past" : "is-ended");

    const recurrence = (event.recurrence || "").trim();
    let dateLine;
    if (event.date && event.endDate && event.endDate !== event.date) {
      dateLine = formatDisplayDate(event.date) + " – " + formatDisplayDate(event.endDate);
    } else if (event.date) {
      dateLine = formatDisplayDate(event.date);
    } else if (recurrence) {
      dateLine = recurrence;
    } else {
      dateLine = "Date to be confirmed";
    }
    const timeLine = event.time || "";
    const scheduleNote =
      recurrence && event.date && recurrence.toLowerCase().indexOf("october") !== -1
        ? '<li><span class="label">Schedule</span><span>' + escapeHtml(recurrence) + "</span></li>"
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

    const image =
      event.image && String(event.image).trim()
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
      '" data-event-id="' +
      escapeHtml(event.id || "") +
      '">' +
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
      '" data-event-id="' +
      escapeHtml(event.id || "") +
      '" role="listitem">' +
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
    const actions = link
      ? '<div class="event-actions"><a class="btn btn-card" href="' +
        escapeHtml(link) +
        '" target="_blank" rel="noopener noreferrer">Event page</a></div>'
      : "";

    return (
      '<article class="' +
      classes.join(" ") +
      '" data-event-id="' +
      escapeHtml(event.id || "") +
      '">' +
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
      const heading =
        day === "Other" ? "Other weekly" : day + "s";
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

  function renderEvents(events) {
    const upcomingRoot = document.getElementById("events-upcoming");
    const specialRoot = document.getElementById("events-special");
    const specialSection = document.getElementById("special-events-section");
    const pastRoot = document.getElementById("events-past");
    const pastSection = document.getElementById("past") || document.getElementById("past-events-section");
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
  }

  function showError(message) {
    const upcomingRoot = document.getElementById("events-upcoming");
    const statusEl = document.getElementById("events-status");
    if (statusEl) statusEl.textContent = "Could not load events";
    if (upcomingRoot) {
      upcomingRoot.innerHTML =
        '<p class="events-error" role="alert">' +
        escapeHtml(message) +
        " Please try again later, or contact melbourne@heartfulness.org.</p>";
    }
  }

  function init() {
    fetch(EVENTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to fetch events (" + res.status + ").");
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("Events data must be an array.");
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

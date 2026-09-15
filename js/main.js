/**
 * Heartfulness Victoria — load and render events from data/events.json
 */
(function () {
  "use strict";

  const EVENTS_URL = "data/events.json";

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

  function eventbriteCta(event) {
    const parts = [];
    const join = (event.joinUrl || "").trim();
    if (join && join !== "#") {
      const joinLabel =
        /zoom\.us/i.test(join) ? "Join Zoom" :
        /bit\.ly|register/i.test(join) || (event.category === "special") ? "Register" :
        "Open link";
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
    } else if (!join) {
      parts.push(
        '<a class="btn btn-card is-placeholder" href="#" data-eventbrite="" aria-disabled="true" ' +
          'onclick="return false;" title="Eventbrite link to be added">' +
          "View on Eventbrite</a>"
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

  function renderCard(event, past) {
    const ended = event.status === "series-ended" || event.status === "ended";
    const isSpecial = event.category === "special";
    const classes = ["event-card"];
    if (isSpecial) classes.push("is-special");
    if (past || ended) classes.push(past && !ended ? "is-past" : "is-ended");

    const recurrence = (event.recurrence || "").trim();
    let dateLine;
    if (isSpecial && recurrence && event.date) {
      dateLine = recurrence;
    } else if (event.date && event.endDate && event.endDate !== event.date) {
      dateLine = formatDisplayDate(event.date) + " – " + formatDisplayDate(event.endDate);
    } else if (event.date) {
      dateLine = formatDisplayDate(event.date);
    } else {
      dateLine = recurrence || "Weekly session";
    }
    const timeLine = event.time || "Time TBC";

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

    const whenDetail = isSpecial
      ? escapeHtml(dateLine) + (event.time ? "<br />" + escapeHtml(timeLine) : "")
      : escapeHtml(dateLine) + (event.time ? " · " + escapeHtml(timeLine) : "");

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
      (event.suburb && !isSpecial ? " — " + escapeHtml(event.suburb) : "") +
      "</span></li>" +
      registerBy +
      contact +
      "</ul>" +
      notes +
      '<div class="event-actions">' +
      eventbriteCta(event) +
      "</div>" +
      "</div></article>"
    );
  }

  function renderEvents(events) {
    const upcomingRoot = document.getElementById("events-upcoming");
    const specialRoot = document.getElementById("events-special");
    const specialSection = document.getElementById("special-events-section");
    const pastRoot = document.getElementById("events-past");
    const pastSection = document.getElementById("past-events-section");
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
        specialRoot.innerHTML = special.map(function (e) {
          return renderCard(e, false);
        }).join("");
      }
    }

    if (weekly.length === 0) {
      upcomingRoot.innerHTML =
        '<p class="events-empty">No weekly Sunday sessions listed right now.</p>';
    } else {
      upcomingRoot.innerHTML = weekly.map(function (e) {
        return renderCard(e, false);
      }).join("");
    }

    if (pastRoot && pastSection) {
      if (past.length === 0) {
        pastSection.hidden = true;
      } else {
        pastSection.hidden = false;
        pastRoot.innerHTML = past.map(function (e) {
          return renderCard(e, true);
        }).join("");
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
        " Serve this folder with a local static server (see README) so events.json can load.</p>";
    }
  }

  function init() {
    fetch(EVENTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to fetch events (" + res.status + ").");
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("events.json must be an array.");
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

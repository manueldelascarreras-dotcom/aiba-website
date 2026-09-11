// Renders CMS-managed events from Firestore into the events list on events.html.
// New events appear as rows alongside the hand-built featured event above them.
import { db } from "./firebase-init.js?v=2";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var TYPE_LABEL = { talk: "Talk", workshop: "Workshop", social: "Social" };

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function dateParts(iso) {
  if (!iso) return { m: "", d: "", dateObj: null };
  var bits = iso.split("-");
  var dt = new Date(+bits[0], +bits[1] - 1, +bits[2]);
  return { m: MONTHS[dt.getMonth()], d: String(dt.getDate()).padStart(2, "0"), dateObj: dt };
}

async function renderEvents() {
  var container = document.getElementById("event-list-body");
  if (!container) return;
  try {
    var q = query(collection(db, "events"), orderBy("date"));
    var snap = await getDocs(q);
    if (snap.empty) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var emptyEl = container.querySelector("[data-empty]");
    var frag = document.createDocumentFragment();

    snap.forEach(function (docSnap) {
      var d = docSnap.data();
      var parts = dateParts(d.date);
      var isUpcoming = parts.dateObj ? parts.dateObj >= today : true;
      var tags = [d.type || "workshop"];
      if (isUpcoming) tags.push("upcoming");

      var row = document.createElement("article");
      row.className = "event-row" + (d.photoUrl ? " has-thumb" : "");
      row.setAttribute("data-tags", tags.join(" "));

      var thumb = d.photoUrl
        ? '<div class="event-row-thumb"><img src="' + escapeHtml(d.photoUrl) + '" alt=""></div>'
        : "";

      var metaBits = "";
      if (d.time) {
        metaBits += '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> ' + escapeHtml(d.time) + "</span>";
      }
      if (d.location) {
        metaBits += '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg> ' + escapeHtml(d.location) + "</span>";
      }

      var rsvp = d.rsvpLink
        ? '<a class="btn btn-orange btn-sm" href="' + escapeHtml(d.rsvpLink) + '" target="_blank" rel="noopener">RSVP</a>'
        : '<a class="btn btn-orange btn-sm" href="join.html">RSVP</a>';

      row.innerHTML =
        thumb +
        '<div class="date-block"><div class="m">' + escapeHtml(parts.m) + '</div><div class="d">' + escapeHtml(parts.d) + "</div></div>" +
        "<div>" +
          '<span class="tag">' + escapeHtml(TYPE_LABEL[d.type] || "Event") + "</span>" +
          "<h3>" + escapeHtml(d.title || "Untitled event") + "</h3>" +
          (d.description ? '<p style="color:var(--muted);font-size:.86rem;margin:2px 0 6px">' + escapeHtml(d.description) + "</p>" : "") +
          '<div class="row-meta">' + metaBits + "</div>" +
        "</div>" +
        rsvp;

      frag.appendChild(row);
    });

    if (emptyEl) container.insertBefore(frag, emptyEl);
    else container.appendChild(frag);

    if (window.AIBA_refreshFilters) {
      window.AIBA_refreshFilters.forEach(function (fn) { fn(); });
    }
  } catch (e) {
    console.warn("Live events unavailable.", e);
  }
}

renderEvents();

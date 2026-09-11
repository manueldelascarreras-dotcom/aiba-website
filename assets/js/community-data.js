// Renders the live E-Board from Firestore on community.html, and wires up
// the click-to-expand detail modal (photo, email, LinkedIn, hometown).
// If Firestore is empty/unreachable, the static HTML already in the page stays as-is.
import { db } from "./firebase-init.js?v=2";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

function initials(name) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function (w) { return w[0].toUpperCase(); })
    .join("");
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* ---------- member detail modal ---------- */
var overlay = document.getElementById("eboardModalOverlay");
var modalPhoto = document.getElementById("eboardModalPhoto");
var modalName = document.getElementById("eboardModalName");
var modalPos = document.getElementById("eboardModalPos");
var modalSub = document.getElementById("eboardModalSub");
var modalInfo = document.getElementById("eboardModalInfo");
var modalCloseBtn = document.getElementById("eboardModalClose");

var ICONS = {
  email:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.97 1.97 0 1 0 0 3.93A1.97 1.97 0 0 0 5.25 3ZM20.44 20h-3.37v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20H9.68V8.5h3.24v1.57h.05c.45-.86 1.55-1.76 3.19-1.76 3.41 0 4.04 2.25 4.04 5.17V20Z"/></svg>',
  hometown:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
};

function openEboardModal(d) {
  var photo = d.photoUrl || d.photoPath || "";
  modalPhoto.innerHTML = photo
    ? '<img src="' + escapeHtml(photo) + '" alt="" onerror="this.remove()">' + '<span class="eboard-initials">' + escapeHtml(initials(d.name)) + "</span>"
    : '<span class="eboard-initials">' + escapeHtml(initials(d.name)) + "</span>";

  modalName.textContent = d.name || "";
  modalPos.textContent = d.position || "";
  modalSub.textContent = [d.classYear, d.major].filter(Boolean).join(" · ");

  var rows = "";
  if (d.email) {
    rows += '<a class="eboard-modal-row" href="mailto:' + escapeHtml(d.email) + '">' + ICONS.email + "<span>" + escapeHtml(d.email) + "</span></a>";
  }
  if (d.linkedin) {
    rows += '<a class="eboard-modal-row" href="' + escapeHtml(d.linkedin) + '" target="_blank" rel="noopener">' + ICONS.linkedin + "<span>LinkedIn profile</span></a>";
  }
  if (d.hometown) {
    rows += '<div class="eboard-modal-row">' + ICONS.hometown + "<span>" + escapeHtml(d.hometown) + "</span></div>";
  }
  modalInfo.innerHTML = rows || '<p class="eboard-modal-empty">No contact info added yet.</p>';

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeEboardModal() {
  overlay.hidden = true;
  document.body.style.overflow = "";
}

modalCloseBtn.addEventListener("click", closeEboardModal);
overlay.addEventListener("click", function (e) {
  if (e.target === overlay) closeEboardModal();
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !overlay.hidden) closeEboardModal();
});
// Force-close on back/forward-cache restore so a stale open modal can never
// get stuck on screen (see: community modal, earlier version of this page).
window.addEventListener("pageshow", closeEboardModal);

function wireCard(card, d) {
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.addEventListener("click", function () { openEboardModal(d); });
  card.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEboardModal(d); }
  });
}

async function renderEboard() {
  var grid = document.querySelector(".eboard-grid");
  if (!grid) return;
  try {
    var q = query(collection(db, "eboard"), orderBy("order"));
    var snap = await getDocs(q);
    if (snap.empty) { wireStaticFallback(); return; }

    grid.innerHTML = "";
    snap.forEach(function (docSnap) {
      var d = docSnap.data();
      var photo = d.photoUrl || d.photoPath || "";
      var sub = [d.classYear, d.major].filter(Boolean).join(" · ");
      var card = document.createElement("article");
      card.className = "eboard-card";
      card.innerHTML =
        '<div class="eboard-photo"><span class="eboard-initials">' + escapeHtml(initials(d.name)) + "</span>" +
        (photo ? '<img src="' + escapeHtml(photo) + '" alt="' + escapeHtml(d.name) + '" onerror="this.remove()">' : "") +
        "</div>" +
        "<h3>" + escapeHtml(d.name) + "</h3>" +
        '<div class="eboard-pos">' + escapeHtml(d.position) + "</div>" +
        '<div class="eboard-sub">' + escapeHtml(sub) + "</div>";
      wireCard(card, d);
      grid.appendChild(card);
    });
  } catch (e) {
    console.warn("E-Board live data unavailable, showing fallback content.", e);
    wireStaticFallback();
  }
}

// Firestore failed/empty — wire up the static cards already in the HTML
// using whatever's in the markup (name, position, sub-line, email if set).
function wireStaticFallback() {
  document.querySelectorAll(".eboard-grid .eboard-card").forEach(function (card) {
    var d = {
      name: (card.querySelector("h3") || {}).textContent || "",
      position: (card.querySelector(".eboard-pos") || {}).textContent || "",
      email: card.getAttribute("data-email") || ""
    };
    var sub = (card.querySelector(".eboard-sub") || {}).textContent || "";
    var parts = sub.split("·").map(function (s) { return s.trim(); });
    d.classYear = parts[0] || "";
    d.major = parts[1] || "";
    wireCard(card, d);
  });
}

renderEboard();

// Renders the live E-Board from Firestore on community.html.
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

async function renderEboard() {
  var grid = document.querySelector(".eboard-grid");
  if (!grid) return;
  try {
    var q = query(collection(db, "eboard"), orderBy("order"));
    var snap = await getDocs(q);
    if (snap.empty) return;

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
      grid.appendChild(card);
    });
  } catch (e) {
    console.warn("E-Board live data unavailable, showing fallback content.", e);
  }
}

renderEboard();

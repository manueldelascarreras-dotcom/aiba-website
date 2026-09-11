import { auth, db, storage, firebaseConfig } from "./firebase-init.js?v=2";
import {
  onAuthStateChanged, signOut, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection, doc, addDoc, setDoc, deleteDoc, getDoc, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth as getSecondaryAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ---------- helpers ---------- */
function setStatus(el, msg, isError) {
  el.textContent = msg;
  el.className = "admin-status " + (isError ? "err" : "ok");
  if (msg) setTimeout(function () { el.textContent = ""; el.className = "admin-status"; }, 4500);
}
function initials(name) {
  return (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
async function uploadPhoto(file, folder, id) {
  var path = folder + "/" + id + "-" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  var storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/* ---------- modals ---------- */
function openModal(name) {
  var overlay = document.querySelector('.modal-overlay[data-modal="' + name + '"]');
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(name) {
  var overlay = document.querySelector('.modal-overlay[data-modal="' + name + '"]');
  overlay.hidden = true;
  document.body.style.overflow = "";
}
document.querySelectorAll("[data-modal-close]").forEach(function (btn) {
  btn.addEventListener("click", function () { closeModal(btn.getAttribute("data-modal-close")); });
});
document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal(overlay.getAttribute("data-modal"));
  });
});
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
    if (!overlay.hidden) closeModal(overlay.getAttribute("data-modal"));
  });
});

/* ---------- auth guard ---------- */
var authGate = document.getElementById("authGate");
var dash = document.getElementById("dash");

onAuthStateChanged(auth, async function (user) {
  if (!user) { window.location.href = "admin.html"; return; }
  var adminSnap = await getDoc(doc(db, "admins", user.uid));
  if (!adminSnap.exists()) {
    await signOut(auth);
    window.location.href = "admin.html?denied=1";
    return;
  }
  var adminData = adminSnap.data() || {};
  var displayName = adminData.name || user.email.split("@")[0];
  document.getElementById("userAvatar").textContent = initials(displayName);
  document.getElementById("userName").textContent = displayName;
  document.getElementById("userEmail").textContent = user.email;
  authGate.hidden = true;
  dash.hidden = false;
  loadEboard();
  loadMembers();
  loadEvents();
  loadAdmins();
});

document.getElementById("logoutBtn").addEventListener("click", function () {
  signOut(auth).then(function () { window.location.href = "admin.html"; });
});

/* ---------- tabs ---------- */
var TAB_META = {
  eboard: { title: "E-Board", sub: "Shown on the Community page and homepage, in this order." },
  members: { title: "Members", sub: "Private directory — not shown publicly on the site." },
  events: { title: "Events", sub: "Shown on the Events page, below the featured event." },
  admins: { title: "Admins", sub: "Anyone listed here can sign in and manage E-Board, Members, and Events." }
};
document.querySelectorAll(".dash-nav-item").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".dash-nav-item").forEach(function (b) { b.classList.remove("is-active"); });
    document.querySelectorAll(".admin-panel").forEach(function (p) { p.hidden = true; });
    document.querySelectorAll("[data-add]").forEach(function (b) { b.hidden = b.getAttribute("data-add") !== tab; });
    btn.classList.add("is-active");
    document.querySelector('.admin-panel[data-panel="' + tab + '"]').hidden = false;
    document.getElementById("pageTitle").textContent = TAB_META[tab].title;
    document.getElementById("pageSub").textContent = TAB_META[tab].sub;
  });
});

/* ================= E-BOARD ================= */
var eboardForm = document.getElementById("eboardForm");
var eboardList = document.getElementById("eboardList");
var eboardStatus = document.getElementById("eboardStatus");

function resetEboardForm() {
  eboardForm.reset();
  document.getElementById("eboardId").value = "";
  document.getElementById("eboardFormTitle").textContent = "Add a member";
  document.getElementById("eboardSaveBtn").textContent = "Save member";
}
document.querySelector('[data-add="eboard"]').addEventListener("click", function () {
  resetEboardForm();
  openModal("eboard");
});

async function loadEboard() {
  eboardList.innerHTML = '<tr class="table-empty"><td colspan="4">Loading…</td></tr>';
  var snap = await getDocs(query(collection(db, "eboard"), orderBy("order")));
  if (snap.empty) { eboardList.innerHTML = '<tr class="table-empty"><td colspan="4">No E-Board members yet — add the first one.</td></tr>'; return; }
  eboardList.innerHTML = "";
  var i = 0;
  snap.forEach(function (docSnap) {
    i++;
    var d = docSnap.data();
    var row = document.createElement("tr");
    row.innerHTML =
      '<td class="col-num">' + i + "</td>" +
      '<td class="cell-name">' + esc(d.name) + "</td>" +
      "<td>" + esc(d.position) + "</td>" +
      '<td><div class="table-actions"><button type="button" data-act="edit">Edit</button><button type="button" class="danger" data-act="del">Delete</button></div></td>';
    row.querySelector('[data-act="edit"]').addEventListener("click", function () {
      document.getElementById("eboardId").value = docSnap.id;
      document.getElementById("eboardName").value = d.name || "";
      document.getElementById("eboardPosition").value = d.position || "";
      document.getElementById("eboardClass").value = d.classYear || "";
      document.getElementById("eboardMajor").value = d.major || "";
      document.getElementById("eboardMinor").value = d.minor || "";
      document.getElementById("eboardEmail").value = d.email || "";
      document.getElementById("eboardHometown").value = d.hometown || "";
      document.getElementById("eboardLinkedin").value = d.linkedin || "";
      document.getElementById("eboardFormTitle").textContent = "Edit " + (d.name || "member");
      document.getElementById("eboardSaveBtn").textContent = "Save changes";
      openModal("eboard");
    });
    row.querySelector('[data-act="del"]').addEventListener("click", async function () {
      if (!confirm('Remove "' + (d.name || "this member") + '" from the E-Board?')) return;
      await deleteDoc(doc(db, "eboard", docSnap.id));
      loadEboard();
    });
    eboardList.appendChild(row);
  });
}

eboardForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  var id = document.getElementById("eboardId").value;
  var saveBtn = document.getElementById("eboardSaveBtn");
  saveBtn.disabled = true;
  try {
    var data = {
      name: document.getElementById("eboardName").value.trim(),
      position: document.getElementById("eboardPosition").value.trim(),
      classYear: document.getElementById("eboardClass").value.trim(),
      major: document.getElementById("eboardMajor").value.trim(),
      minor: document.getElementById("eboardMinor").value.trim(),
      email: document.getElementById("eboardEmail").value.trim(),
      hometown: document.getElementById("eboardHometown").value.trim(),
      linkedin: document.getElementById("eboardLinkedin").value.trim()
    };
    var file = document.getElementById("eboardPhoto").files[0];
    var targetId = id;
    if (!targetId) {
      var snap = await getDocs(collection(db, "eboard"));
      var maxOrder = 0;
      snap.forEach(function (s) { var o = s.data().order || 0; if (o > maxOrder) maxOrder = o; });
      data.order = maxOrder + 1;
      var newDoc = await addDoc(collection(db, "eboard"), data);
      targetId = newDoc.id;
    }
    if (file) data.photoUrl = await uploadPhoto(file, "eboard", targetId);
    await setDoc(doc(db, "eboard", targetId), data, { merge: true });
    resetEboardForm();
    closeModal("eboard");
    loadEboard();
  } catch (err) {
    setStatus(eboardStatus, "Something went wrong: " + err.message, true);
  } finally {
    saveBtn.disabled = false;
  }
});

/* ================= MEMBERS ================= */
var membersForm = document.getElementById("membersForm");
var membersList = document.getElementById("membersList");
var memberStatus = document.getElementById("memberStatus");

function resetMembersForm() {
  membersForm.reset();
  document.getElementById("memberId").value = "";
  document.getElementById("membersFormTitle").textContent = "Add a member";
  document.getElementById("memberSaveBtn").textContent = "Save member";
}
document.querySelector('[data-add="members"]').addEventListener("click", function () {
  resetMembersForm();
  openModal("members");
});

async function loadMembers() {
  membersList.innerHTML = '<tr class="table-empty"><td colspan="6">Loading…</td></tr>';
  var snap = await getDocs(collection(db, "members"));
  if (snap.empty) { membersList.innerHTML = '<tr class="table-empty"><td colspan="6">No members added yet.</td></tr>'; return; }
  membersList.innerHTML = "";
  var i = 0;
  snap.forEach(function (docSnap) {
    i++;
    var d = docSnap.data();
    var row = document.createElement("tr");
    row.innerHTML =
      '<td class="col-num">' + i + "</td>" +
      '<td class="cell-name">' + esc(d.name) + "</td>" +
      '<td class="cell-muted">' + esc(d.email) + "</td>" +
      "<td>" + esc(d.major) + "</td>" +
      "<td>" + esc(d.gradYear) + "</td>" +
      '<td><div class="table-actions"><button type="button" data-act="edit">Edit</button><button type="button" class="danger" data-act="del">Delete</button></div></td>';
    row.querySelector('[data-act="edit"]').addEventListener("click", function () {
      document.getElementById("memberId").value = docSnap.id;
      document.getElementById("memberName").value = d.name || "";
      document.getElementById("memberEmail").value = d.email || "";
      document.getElementById("memberMajor").value = d.major || "";
      document.getElementById("memberGrad").value = d.gradYear || "";
      document.getElementById("membersFormTitle").textContent = "Edit " + (d.name || "member");
      document.getElementById("memberSaveBtn").textContent = "Save changes";
      openModal("members");
    });
    row.querySelector('[data-act="del"]').addEventListener("click", async function () {
      if (!confirm('Remove "' + (d.name || "this member") + '"?')) return;
      await deleteDoc(doc(db, "members", docSnap.id));
      loadMembers();
    });
    membersList.appendChild(row);
  });
}

membersForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  var id = document.getElementById("memberId").value;
  var saveBtn = document.getElementById("memberSaveBtn");
  saveBtn.disabled = true;
  try {
    var data = {
      name: document.getElementById("memberName").value.trim(),
      email: document.getElementById("memberEmail").value.trim(),
      major: document.getElementById("memberMajor").value.trim(),
      gradYear: document.getElementById("memberGrad").value.trim()
    };
    if (id) await setDoc(doc(db, "members", id), data, { merge: true });
    else await addDoc(collection(db, "members"), data);
    resetMembersForm();
    closeModal("members");
    loadMembers();
  } catch (err) {
    setStatus(memberStatus, "Something went wrong: " + err.message, true);
  } finally {
    saveBtn.disabled = false;
  }
});

/* ================= EVENTS ================= */
var eventsForm = document.getElementById("eventsForm");
var eventsList = document.getElementById("eventsList");
var eventStatus = document.getElementById("eventStatus");

function resetEventsForm() {
  eventsForm.reset();
  document.getElementById("eventId").value = "";
  document.getElementById("eventsFormTitle").textContent = "Add an event";
  document.getElementById("eventSaveBtn").textContent = "Save event";
}
document.querySelector('[data-add="events"]').addEventListener("click", function () {
  resetEventsForm();
  openModal("events");
});

var TYPE_LABEL = { talk: "Talk", workshop: "Workshop", social: "Social" };

async function loadEvents() {
  eventsList.innerHTML = '<tr class="table-empty"><td colspan="6">Loading…</td></tr>';
  var snap = await getDocs(query(collection(db, "events"), orderBy("date")));
  if (snap.empty) { eventsList.innerHTML = '<tr class="table-empty"><td colspan="6">No events added yet.</td></tr>'; return; }
  eventsList.innerHTML = "";
  var i = 0;
  snap.forEach(function (docSnap) {
    i++;
    var d = docSnap.data();
    var row = document.createElement("tr");
    row.innerHTML =
      '<td class="col-num">' + i + "</td>" +
      '<td class="cell-name">' + esc(d.title) + "</td>" +
      '<td class="cell-muted">' + esc(d.date) + "</td>" +
      "<td>" + esc(TYPE_LABEL[d.type] || d.type) + "</td>" +
      '<td class="cell-muted">' + esc(d.location) + "</td>" +
      '<td><div class="table-actions"><button type="button" data-act="edit">Edit</button><button type="button" class="danger" data-act="del">Delete</button></div></td>';
    row.querySelector('[data-act="edit"]').addEventListener("click", function () {
      document.getElementById("eventId").value = docSnap.id;
      document.getElementById("eventTitle").value = d.title || "";
      document.getElementById("eventType").value = d.type || "workshop";
      document.getElementById("eventDate").value = d.date || "";
      document.getElementById("eventTime").value = d.time || "";
      document.getElementById("eventLocation").value = d.location || "";
      document.getElementById("eventDescription").value = d.description || "";
      document.getElementById("eventRsvp").value = d.rsvpLink || "";
      document.getElementById("eventsFormTitle").textContent = "Edit " + (d.title || "event");
      document.getElementById("eventSaveBtn").textContent = "Save changes";
      openModal("events");
    });
    row.querySelector('[data-act="del"]').addEventListener("click", async function () {
      if (!confirm('Remove "' + (d.title || "this event") + '"?')) return;
      await deleteDoc(doc(db, "events", docSnap.id));
      loadEvents();
    });
    eventsList.appendChild(row);
  });
}

eventsForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  var id = document.getElementById("eventId").value;
  var saveBtn = document.getElementById("eventSaveBtn");
  saveBtn.disabled = true;
  try {
    var data = {
      title: document.getElementById("eventTitle").value.trim(),
      type: document.getElementById("eventType").value,
      date: document.getElementById("eventDate").value,
      time: document.getElementById("eventTime").value.trim(),
      location: document.getElementById("eventLocation").value.trim(),
      description: document.getElementById("eventDescription").value.trim(),
      rsvpLink: document.getElementById("eventRsvp").value.trim()
    };
    var file = document.getElementById("eventPhoto").files[0];
    var targetId = id;
    if (!targetId) {
      var newDoc = await addDoc(collection(db, "events"), data);
      targetId = newDoc.id;
    }
    if (file) data.photoUrl = await uploadPhoto(file, "events", targetId);
    await setDoc(doc(db, "events", targetId), data, { merge: true });
    resetEventsForm();
    closeModal("events");
    loadEvents();
  } catch (err) {
    setStatus(eventStatus, "Something went wrong: " + err.message, true);
  } finally {
    saveBtn.disabled = false;
  }
});

/* ================= ADMINS ================= */
var adminsForm = document.getElementById("adminsForm");
var adminsList = document.getElementById("adminsList");
var adminStatus = document.getElementById("adminStatus");

document.querySelector('[data-add="admins"]').addEventListener("click", function () {
  adminsForm.reset();
  openModal("admins");
});

async function loadAdmins() {
  adminsList.innerHTML = '<tr class="table-empty"><td colspan="4">Loading…</td></tr>';
  var snap = await getDocs(collection(db, "admins"));
  if (snap.empty) { adminsList.innerHTML = '<tr class="table-empty"><td colspan="4">No admins yet.</td></tr>'; return; }
  adminsList.innerHTML = "";
  var i = 0;
  snap.forEach(function (docSnap) {
    i++;
    var d = docSnap.data();
    var isSelf = auth.currentUser && docSnap.id === auth.currentUser.uid;
    var row = document.createElement("tr");
    row.innerHTML =
      '<td class="col-num">' + i + "</td>" +
      '<td class="cell-name">' + esc(d.name) + (isSelf ? " (you)" : "") + "</td>" +
      '<td class="cell-muted">' + esc(d.email) + "</td>" +
      '<td><div class="table-actions">' + (isSelf ? "" : '<button type="button" class="danger" data-act="revoke">Revoke access</button>') + "</div></td>";
    if (!isSelf) {
      row.querySelector('[data-act="revoke"]').addEventListener("click", async function () {
        if (!confirm('Revoke CMS access for "' + (d.name || d.email) + '"? They will no longer be able to sign in and manage content.')) return;
        await deleteDoc(doc(db, "admins", docSnap.id));
        loadAdmins();
      });
    }
    adminsList.appendChild(row);
  });
}

adminsForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  var saveBtn = document.getElementById("adminSaveBtn");
  saveBtn.disabled = true;
  var name = document.getElementById("adminName").value.trim();
  var email = document.getElementById("adminEmail").value.trim();
  var secondaryApp = null;
  try {
    // Create the new account on a throwaway secondary Firebase App instance so
    // it never disturbs the currently signed-in admin's own session.
    secondaryApp = initializeApp(firebaseConfig, "invite-" + Date.now());
    var secondaryAuth = getSecondaryAuth(secondaryApp);
    var tempPassword = crypto.randomUUID(); // random, never shown, never used to sign in
    var cred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
    var newUid = cred.user.uid;
    await sendPasswordResetEmail(secondaryAuth, email);
    await signOut(secondaryAuth);

    await setDoc(doc(db, "admins", newUid), {
      name: name,
      email: email,
      addedBy: auth.currentUser ? auth.currentUser.email : "",
      addedAt: serverTimestamp()
    });

    adminsForm.reset();
    closeModal("admins");
    loadAdmins();
  } catch (err) {
    var msg = err && err.code === "auth/email-already-in-use"
      ? "That email already has an account. Ask them to sign in at /admin — if it still says no access, add them from the Firebase console."
      : "Something went wrong: " + (err.message || err);
    setStatus(adminStatus, msg, true);
  } finally {
    if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (e) {} }
    saveBtn.disabled = false;
  }
});

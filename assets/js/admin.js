import { auth, db, storage } from "./firebase-init.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection, doc, addDoc, setDoc, deleteDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

/* ---------- auth ---------- */
var loginView = document.getElementById("loginView");
var cmsView = document.getElementById("cmsView");
var loginForm = document.getElementById("loginForm");
var loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  loginError.hidden = true;
  var email = document.getElementById("loginEmail").value.trim();
  var password = document.getElementById("loginPassword").value;
  signInWithEmailAndPassword(auth, email, password).catch(function (err) {
    loginError.textContent = "Couldn't sign in — check your email and password.";
    loginError.hidden = false;
  });
});

document.getElementById("logoutBtn").addEventListener("click", function () {
  signOut(auth);
});

onAuthStateChanged(auth, function (user) {
  if (user) {
    loginView.hidden = true;
    cmsView.hidden = false;
    document.getElementById("whoami").textContent = user.email;
    loadEboard();
    loadMembers();
    loadEvents();
  } else {
    cmsView.hidden = true;
    loginView.hidden = false;
  }
});

/* ---------- tabs ---------- */
document.querySelectorAll(".admin-tab").forEach(function (tab) {
  tab.addEventListener("click", function () {
    document.querySelectorAll(".admin-tab").forEach(function (t) { t.classList.remove("is-active"); });
    document.querySelectorAll(".admin-panel").forEach(function (p) { p.hidden = true; });
    tab.classList.add("is-active");
    document.querySelector('.admin-panel[data-panel="' + tab.getAttribute("data-tab") + '"]').hidden = false;
  });
});

/* ---------- helpers ---------- */
function setStatus(el, msg, isError) {
  el.textContent = msg;
  el.className = "admin-status " + (isError ? "err" : "ok");
  if (msg) setTimeout(function () { el.textContent = ""; el.className = "admin-status"; }, 4000);
}

function initials(name) {
  return (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
}

async function uploadPhoto(file, folder, id) {
  var path = folder + "/" + id + "-" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  var storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/* ================= E-BOARD ================= */
var eboardForm = document.getElementById("eboardForm");
var eboardList = document.getElementById("eboardList");
var eboardStatus = document.getElementById("eboardStatus");
var eboardCancelBtn = document.getElementById("eboardCancelBtn");

function resetEboardForm() {
  eboardForm.reset();
  document.getElementById("eboardId").value = "";
  document.getElementById("eboardFormTitle").textContent = "Add a member";
  document.getElementById("eboardSaveBtn").textContent = "Save member";
  eboardCancelBtn.hidden = true;
}
eboardCancelBtn.addEventListener("click", resetEboardForm);

async function loadEboard() {
  eboardList.innerHTML = '<p class="admin-empty">Loading…</p>';
  var snap = await getDocs(query(collection(db, "eboard"), orderBy("order")));
  if (snap.empty) { eboardList.innerHTML = '<p class="admin-empty">No E-Board members yet.</p>'; return; }
  eboardList.innerHTML = "";
  snap.forEach(function (docSnap) {
    var d = docSnap.data();
    var row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML =
      '<div class="admin-row-avatar">' + (d.photoUrl ? '<img src="' + d.photoUrl + '" alt="">' : initials(d.name)) + "</div>" +
      '<div class="admin-row-body"><div class="admin-row-title">' + (d.name || "") + '</div><div class="admin-row-sub">' + (d.position || "") + "</div></div>" +
      '<div class="admin-row-actions"><button type="button" data-act="edit">Edit</button><button type="button" class="danger" data-act="del">Delete</button></div>';
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
      eboardCancelBtn.hidden = false;
      eboardForm.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (file) {
      data.photoUrl = await uploadPhoto(file, "eboard", targetId);
    }
    await setDoc(doc(db, "eboard", targetId), data, { merge: true });
    setStatus(eboardStatus, "Saved.");
    resetEboardForm();
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
var memberCancelBtn = document.getElementById("memberCancelBtn");

function resetMembersForm() {
  membersForm.reset();
  document.getElementById("memberId").value = "";
  document.getElementById("membersFormTitle").textContent = "Add a member";
  document.getElementById("memberSaveBtn").textContent = "Save member";
  memberCancelBtn.hidden = true;
}
memberCancelBtn.addEventListener("click", resetMembersForm);

async function loadMembers() {
  membersList.innerHTML = '<p class="admin-empty">Loading…</p>';
  var snap = await getDocs(collection(db, "members"));
  if (snap.empty) { membersList.innerHTML = '<p class="admin-empty">No members added yet.</p>'; return; }
  membersList.innerHTML = "";
  snap.forEach(function (docSnap) {
    var d = docSnap.data();
    var row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML =
      '<div class="admin-row-avatar">' + initials(d.name) + "</div>" +
      '<div class="admin-row-body"><div class="admin-row-title">' + (d.name || "") + '</div><div class="admin-row-sub">' + (d.email || "") + "</div></div>" +
      '<div class="admin-row-actions"><button type="button" data-act="edit">Edit</button><button type="button" class="danger" data-act="del">Delete</button></div>';
    row.querySelector('[data-act="edit"]').addEventListener("click", function () {
      document.getElementById("memberId").value = docSnap.id;
      document.getElementById("memberName").value = d.name || "";
      document.getElementById("memberEmail").value = d.email || "";
      document.getElementById("memberMajor").value = d.major || "";
      document.getElementById("memberGrad").value = d.gradYear || "";
      document.getElementById("membersFormTitle").textContent = "Edit " + (d.name || "member");
      document.getElementById("memberSaveBtn").textContent = "Save changes";
      memberCancelBtn.hidden = false;
      membersForm.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (id) {
      await setDoc(doc(db, "members", id), data, { merge: true });
    } else {
      await addDoc(collection(db, "members"), data);
    }
    setStatus(memberStatus, "Saved.");
    resetMembersForm();
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
var eventCancelBtn = document.getElementById("eventCancelBtn");

function resetEventsForm() {
  eventsForm.reset();
  document.getElementById("eventId").value = "";
  document.getElementById("eventsFormTitle").textContent = "Add an event";
  document.getElementById("eventSaveBtn").textContent = "Save event";
  eventCancelBtn.hidden = true;
}
eventCancelBtn.addEventListener("click", resetEventsForm);

async function loadEvents() {
  eventsList.innerHTML = '<p class="admin-empty">Loading…</p>';
  var snap = await getDocs(query(collection(db, "events"), orderBy("date")));
  if (snap.empty) { eventsList.innerHTML = '<p class="admin-empty">No events added yet.</p>'; return; }
  eventsList.innerHTML = "";
  snap.forEach(function (docSnap) {
    var d = docSnap.data();
    var row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML =
      '<div class="admin-row-avatar">' + (d.photoUrl ? '<img src="' + d.photoUrl + '" alt="">' : "📅") + "</div>" +
      '<div class="admin-row-body"><div class="admin-row-title">' + (d.title || "") + '</div><div class="admin-row-sub">' + (d.date || "") + (d.location ? " · " + d.location : "") + "</div></div>" +
      '<div class="admin-row-actions"><button type="button" data-act="edit">Edit</button><button type="button" class="danger" data-act="del">Delete</button></div>';
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
      eventCancelBtn.hidden = false;
      eventsForm.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (file) {
      data.photoUrl = await uploadPhoto(file, "events", targetId);
    }
    await setDoc(doc(db, "events", targetId), data, { merge: true });
    setStatus(eventStatus, "Saved.");
    resetEventsForm();
    loadEvents();
  } catch (err) {
    setStatus(eventStatus, "Something went wrong: " + err.message, true);
  } finally {
    saveBtn.disabled = false;
  }
});

import { auth, db } from "./firebase-init.js?v=2";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

var form = document.getElementById("loginForm");
var errEl = document.getElementById("loginError");
var checkingEl = document.getElementById("loginChecking");
var submitBtn = document.getElementById("loginSubmitBtn");
var submitLabel = document.getElementById("loginSubmitLabel");
var spinner = document.getElementById("loginSpinner");

var params = new URLSearchParams(location.search);
if (params.get("denied")) {
  errEl.textContent = "That account doesn't have CMS access. Ask an existing admin to add you.";
  errEl.hidden = false;
}

function setBusy(isBusy, label) {
  submitBtn.disabled = isBusy;
  spinner.hidden = !isBusy;
  submitLabel.textContent = label;
}

async function isAdminUser(user) {
  if (!user) return false;
  try {
    var snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists();
  } catch (err) {
    // Rules deny the read for non-admins — that itself means "not an admin".
    if (err && err.code === "permission-denied") return false;
    throw err;
  }
}

// Already-signed-in visitor (persisted session) — skip straight to the dashboard if they're an admin.
onAuthStateChanged(auth, async function (user) {
  if (!user) { checkingEl.hidden = true; return; }
  checkingEl.hidden = false;
  var ok = await isAdminUser(user);
  if (ok) {
    window.location.href = "admin-dashboard.html";
  } else {
    checkingEl.hidden = true;
    await signOut(auth);
  }
});

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  errEl.hidden = true;
  setBusy(true, "Signing in…");
  var email = document.getElementById("loginEmail").value.trim();
  var password = document.getElementById("loginPassword").value;
  try {
    var cred = await signInWithEmailAndPassword(auth, email, password);
    var ok = await isAdminUser(cred.user);
    if (!ok) {
      await signOut(auth);
      errEl.textContent = "This account doesn't have CMS access. Ask an existing admin to add you.";
      errEl.hidden = false;
      setBusy(false, "Sign in");
      return;
    }
    setBusy(true, "Redirecting…");
    window.location.href = "admin-dashboard.html";
  } catch (err) {
    errEl.textContent = "Couldn't sign in — check your email and password.";
    errEl.hidden = false;
    setBusy(false, "Sign in");
  }
});

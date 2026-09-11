/* AI Business Association — small interactions only */
(function () {
  "use strict";

  /* Mobile nav toggle */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () { header.classList.remove("open"); });
    });
  }

  /* E-Board member modal (Community page) */
  var eboardModal = document.getElementById("eboardModal");
  if (eboardModal) {
    var emImg = document.getElementById("eboardModalImg");
    var emPos = document.getElementById("eboardModalPos");
    var emName = document.getElementById("eboardModalName");
    var emDesc = document.getElementById("eboardModalDesc");
    var emEmailLi = eboardModal.querySelector(".eboard-modal-email");
    var emEmailA = document.getElementById("eboardModalEmail");
    var emHomeLi = eboardModal.querySelector(".eboard-modal-home");
    var emHomeSpan = document.getElementById("eboardModalHome");
    var emLinkedinLi = eboardModal.querySelector(".eboard-modal-linkedin");
    var emLinkedinA = document.getElementById("eboardModalLinkedin");
    var emInfoList = eboardModal.querySelector(".eboard-modal-info");
    var lastFocused = null;

    function openEboardModal(card) {
      var name = card.querySelector("h3").textContent.trim();
      var pos = card.querySelector(".eboard-pos").textContent.trim();
      var sub = card.querySelector(".eboard-sub").textContent.trim();
      var minor = card.getAttribute("data-minor") || "";
      var email = card.getAttribute("data-email") || "";
      var home = card.getAttribute("data-hometown") || "";
      var linkedin = card.getAttribute("data-linkedin") || "";
      var img = card.querySelector(".eboard-photo img");

      emName.textContent = name;
      emPos.textContent = pos;
      emDesc.textContent = sub + (minor ? " · Minor: " + minor : "");
      if (img) { emImg.src = img.src; emImg.alt = name; emImg.style.display = ""; }
      else { emImg.style.display = "none"; }

      if (email) { emEmailA.textContent = email; emEmailA.href = "mailto:" + email; emEmailLi.style.display = ""; }
      else { emEmailLi.style.display = "none"; }

      if (home) { emHomeSpan.textContent = home; emHomeLi.style.display = ""; }
      else { emHomeLi.style.display = "none"; }

      if (linkedin) { emLinkedinA.href = linkedin; emLinkedinLi.style.display = ""; }
      else { emLinkedinLi.style.display = "none"; }

      if (!email && !home && !linkedin) { emInfoList.style.display = "none"; }
      else { emInfoList.style.display = ""; }

      lastFocused = document.activeElement;
      eboardModal.hidden = false;
      document.body.classList.add("eboard-modal-open");
      eboardModal.querySelector(".eboard-modal-close").focus();
    }

    function closeEboardModal() {
      eboardModal.hidden = true;
      document.body.classList.remove("eboard-modal-open");
      if (lastFocused) lastFocused.focus();
    }

    document.querySelectorAll(".eboard-card").forEach(function (card) {
      card.addEventListener("click", function () { openEboardModal(card); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEboardModal(card); }
      });
    });
    eboardModal.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeEboardModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !eboardModal.hidden) closeEboardModal();
    });
  }

  /* "What you'll learn" accordion — single open at a time */
  document.querySelectorAll(".track-list .track-head").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var track = btn.closest(".track");
      var willOpen = !track.classList.contains("open");
      track.parentElement.querySelectorAll(".track.open").forEach(function (t) {
        t.classList.remove("open");
        var h = t.querySelector(".track-head");
        if (h) h.setAttribute("aria-expanded", "false");
      });
      track.classList.toggle("open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  /* Filter chips (Events / Opportunities lists) — with empty state + #hash deep-links */
  var HASH_MAP = {
    upcoming: "upcoming",
    talks: "talk", talk: "talk",
    workshops: "workshop", workshop: "workshop",
    all: "all", "events-list": "upcoming"
  };
  var CHIP_HASH = { talk: "talks", workshop: "workshops", upcoming: "upcoming", all: "" };

  document.querySelectorAll("[data-filter-group]").forEach(function (group) {
    var chips = Array.prototype.slice.call(group.querySelectorAll(".chip"));
    var target = document.querySelector(group.getAttribute("data-filter-target"));
    if (!target) return;
    var items = Array.prototype.slice.call(target.querySelectorAll("[data-tags]"));
    var empty = target.querySelector("[data-empty]");
    var section = group.closest("section");

    function apply(filter, scroll) {
      var shown = 0;
      chips.forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-filter") === filter);
      });
      items.forEach(function (item) {
        var tags = (item.getAttribute("data-tags") || "").split(/\s+/);
        var show = filter === "all" || tags.indexOf(filter) !== -1;
        item.style.display = show ? "" : "none";
        if (show) shown++;
      });
      if (empty) empty.style.display = shown === 0 ? "" : "none";
      if (scroll && section) {
        requestAnimationFrame(function () { section.scrollIntoView({ block: "start" }); });
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        apply(f, false);
        if (window.history && history.replaceState) {
          var slug = CHIP_HASH.hasOwnProperty(f) ? CHIP_HASH[f] : f;
          history.replaceState(null, "", slug ? "#" + slug : location.pathname + location.search);
        }
      });
    });

    var h = (location.hash || "").replace("#", "").toLowerCase();
    if (HASH_MAP[h]) apply(HASH_MAP[h], true);
  });

  /* Demo form: don't actually submit anywhere */
  document.querySelectorAll("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form-status");
      if (note) {
        note.textContent = "Thanks — your interest form is in. We'll email you within a few days.";
        note.style.color = "var(--green)";
      }
      form.reset();
    });
  });
})();

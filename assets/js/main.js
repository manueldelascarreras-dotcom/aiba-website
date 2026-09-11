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

  /* re-run after JS-injected content (e.g. CMS-loaded events) changes the DOM */
  window.AIBA_refreshFilters = [];

  document.querySelectorAll("[data-filter-group]").forEach(function (group) {
    var chips = Array.prototype.slice.call(group.querySelectorAll(".chip"));
    var target = document.querySelector(group.getAttribute("data-filter-target"));
    if (!target) return;
    var empty = target.querySelector("[data-empty]");
    var section = group.closest("section");
    var activeChip = group.querySelector(".chip.is-active");
    var currentFilter = activeChip ? activeChip.getAttribute("data-filter") : "all";

    function apply(filter, scroll) {
      currentFilter = filter;
      var items = Array.prototype.slice.call(target.querySelectorAll("[data-tags]"));
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

    window.AIBA_refreshFilters.push(function () { apply(currentFilter, false); });

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

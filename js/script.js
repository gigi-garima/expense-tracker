/* ==========================================================================
   SpendWise — Phase 1 JavaScript (UI Navigation & Foundation)
   Note: Phase 1 handles section switching, responsive navigation, current
   date display, and placeholder feedback notifications. CRUD, calculations,
   and localStorage persistence will be added in later phases.
   ========================================================================== */

"use strict";

// Metadata for each single-page section (title + subtitle shown in the header)
const SECTION_INFO = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of your monthly spending and budget health"
  },
  transactions: {
    title: "Transactions",
    subtitle: "Browse, search, and manage your recorded expenses"
  },
  analytics: {
    title: "Analytics",
    subtitle: "Visual breakdown of categories and monthly spending trends"
  },
  budget: {
    title: "Budget",
    subtitle: "Set your monthly spending target and monitor threshold alerts"
  },
  settings: {
    title: "Settings",
    subtitle: "Customize theme preferences, CSV export, and stored data"
  }
};

// Cached DOM references used across Phase 1 UI interactions
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const menuToggleBtn = document.getElementById("menu-toggle-btn");
const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
const navLinks = document.querySelectorAll(".nav-link");
const contentSections = document.querySelectorAll(".content-section");

const pageTitleEl = document.getElementById("page-title");
const pageSubtitleEl = document.getElementById("page-subtitle");
const currentDateEl = document.getElementById("current-date");

const notificationArea = document.getElementById("notification-area");
const notificationMessageEl = document.getElementById("notification-message");
const notificationCloseBtn = document.getElementById("notification-close-btn");
const budgetForm = document.getElementById("budget-form");

/**
 * Formats today's date in a readable format and updates the header <time> element.
 */
function renderCurrentDate() {
  if (!currentDateEl) return;

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  currentDateEl.textContent = formattedDate;
  currentDateEl.setAttribute("datetime", today.toISOString().split("T")[0]);
}

/**
 * Shows a single section by name and updates the active sidebar item + header title.
 * @param {string} sectionKey - One of: dashboard, transactions, analytics, budget, settings
 */
function showSection(sectionKey) {
  if (!SECTION_INFO[sectionKey]) return;

  // Hide all sections except the selected one
  contentSections.forEach((section) => {
    const isTarget = section.id === `section-${sectionKey}`;
    section.hidden = !isTarget;
    section.classList.toggle("is-active", isTarget);
  });

  // Highlight the active navigation item and set aria-current for screen readers
  navLinks.forEach((link) => {
    const isActive = link.dataset.section === sectionKey;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  // Update header text safely using textContent
  pageTitleEl.textContent = SECTION_INFO[sectionKey].title;
  pageSubtitleEl.textContent = SECTION_INFO[sectionKey].subtitle;

  // Close the mobile navigation drawer after selecting a section
  closeMobileSidebar();
}

/**
 * Opens the collapsible sidebar drawer on mobile screens.
 */
function openMobileSidebar() {
  if (!sidebar || !sidebarBackdrop || !menuToggleBtn) return;

  sidebar.classList.add("is-open");
  sidebarBackdrop.hidden = false;
  menuToggleBtn.setAttribute("aria-expanded", "true");
}

/**
 * Closes the collapsible sidebar drawer on mobile screens.
 */
function closeMobileSidebar() {
  if (!sidebar || !sidebarBackdrop || !menuToggleBtn) return;

  sidebar.classList.remove("is-open");
  sidebarBackdrop.hidden = true;
  menuToggleBtn.setAttribute("aria-expanded", "false");
}

/**
 * Displays a message inside the top notification area.
 * @param {string} message - Plain text message to show to the user
 */
function showNotification(message) {
  if (!notificationArea || !notificationMessageEl) return;

  notificationMessageEl.textContent = message;
  notificationArea.hidden = false;
}

/**
 * Hides the notification banner when dismissed by the user.
 */
function hideNotification() {
  if (!notificationArea) return;
  notificationArea.hidden = true;
}

/**
 * Attaches all Phase 1 event listeners once the DOM is ready.
 */
function initApp() {
  renderCurrentDate();

  // Handle clicks on sidebar links, quick navigation buttons, and placeholder buttons
  // using event delegation on the document body.
  document.addEventListener("click", (event) => {
    const navBtn = event.target.closest(".nav-link");
    if (navBtn && navBtn.dataset.section) {
      showSection(navBtn.dataset.section);
      return;
    }

    const navTarget = event.target.closest("[data-nav-target]");
    if (navTarget && navTarget.dataset.navTarget) {
      event.preventDefault();
      showSection(navTarget.dataset.navTarget);
      return;
    }

    const placeholderBtn = event.target.closest("[data-placeholder-action]");
    if (placeholderBtn) {
      showNotification(placeholderBtn.dataset.placeholderAction);
    }
  });

  // Provide clean feedback when interacting with Phase 1 placeholder filter/sort inputs
  document.addEventListener("change", (event) => {
    const control = event.target.closest("[data-placeholder-control]");
    if (control) {
      showNotification(control.dataset.placeholderControl);
    }
  });

  // Prevent form submission page reload on the placeholder Budget form
  if (budgetForm) {
    budgetForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showNotification("Saving monthly budgets to localStorage will be implemented in a later phase.");
    });
  }

  // Mobile sidebar controls
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener("click", openMobileSidebar);
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", closeMobileSidebar);
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", closeMobileSidebar);
  }

  // Allow closing the mobile drawer with the Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileSidebar();
    }
  });

  // Dismiss notification banner
  if (notificationCloseBtn) {
    notificationCloseBtn.addEventListener("click", hideNotification);
  }
}

document.addEventListener("DOMContentLoaded", initApp);

/* ==========================================================================
   SpendWise — Personal Finance Dashboard (Vanilla ES6 JavaScript)
   Architecture:
   - Single shared `expenses` array as the source of truth
   - Update data -> Save (Batch 2) -> Re-render relevant UI
   - Event delegation + addEventListener (no inline handlers)
   - Safe DOM creation using document.createElement and textContent
   ========================================================================== */

"use strict";

// Section titles and subtitles for single-page navigation
const SECTION_INFO = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of your monthly spending and budget health"
  },
  transactions: {
    title: "Transactions",
    subtitle: "Browse, search, filter, and manage your recorded expenses"
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

// Category display configuration (icon letter, tag/badge class, chart color)
const CATEGORY_META = {
  "Food & Dining": { short: "F", slug: "food", color: "#6d5bd0" },
  "Housing & Bills": { short: "H", slug: "bills", color: "#4f46e5" },
  Transport: { short: "T", slug: "transport", color: "#0d9488" },
  Shopping: { short: "S", slug: "shopping", color: "#d97706" },
  Entertainment: { short: "E", slug: "entertainment", color: "#e11d48" },
  Healthcare: { short: "M", slug: "healthcare", color: "#16a34a" },
  Education: { short: "B", slug: "education", color: "#0284c7" },
  Other: { short: "O", slug: "other", color: "#64748b" }
};

// LocalStorage Keys (exact schema required by architecture)
const STORAGE_KEYS = {
  EXPENSES: "spendwise_expenses",
  BUDGETS: "spendwise_budgets",
  PREFERENCES: "spendwise_preferences"
};

// Shared Application State (Single Source of Truth)
let expenses = [];
let budgets = {};
let preferences = { theme: "light" };
let editingExpenseId = null;
let pendingConfirmAction = null;

// ==========================================================================
// DOM Element References
// ==========================================================================

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
const notificationBanner = document.getElementById("notification-banner");
const notificationBadge = document.getElementById("notification-badge");
const notificationMessageEl = document.getElementById("notification-message");
const notificationCloseBtn = document.getElementById("notification-close-btn");

// Transactions section controls
const searchInput = document.getElementById("search-transactions");
const filterCategorySelect = document.getElementById("filter-category");
const filterMonthSelect = document.getElementById("filter-month");
const sortSelect = document.getElementById("sort-transactions");
const transactionsTbody = document.getElementById("transactions-tbody");
const transactionsTableWrapper = document.getElementById("transactions-table-wrapper");
const transactionsEmptyState = document.getElementById("transactions-empty-state");
const emptyStateTitle = document.getElementById("empty-state-title");
const emptyStateDesc = document.getElementById("empty-state-desc");
const transactionsCountText = document.getElementById("transactions-count-text");
const transactionsFilteredTotal = document.getElementById("transactions-filtered-total");

// Expense Modal elements
const expenseModalBackdrop = document.getElementById("expense-modal-backdrop");
const expenseModalTitle = document.getElementById("expense-modal-title");
const expenseForm = document.getElementById("expense-form");
const expenseTitleInput = document.getElementById("expense-title");
const expenseAmountInput = document.getElementById("expense-amount");
const expenseDateInput = document.getElementById("expense-date");
const expenseCategorySelect = document.getElementById("expense-category");
const expensePaymentSelect = document.getElementById("expense-payment");
const expenseDescriptionInput = document.getElementById("expense-description");
const expenseFormError = document.getElementById("expense-form-error");
const expenseSubmitBtn = document.getElementById("expense-submit-btn");
const expenseModalCloseBtn = document.getElementById("expense-modal-close-btn");
const expenseCancelBtn = document.getElementById("expense-cancel-btn");

// Confirmation Modal elements
const confirmModalBackdrop = document.getElementById("confirm-modal-backdrop");
const confirmModalTitle = document.getElementById("confirm-modal-title");
const confirmModalMessage = document.getElementById("confirm-modal-message");
const confirmCloseBtn = document.getElementById("confirm-close-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const confirmOkBtn = document.getElementById("confirm-ok-btn");

// Action buttons
const addExpenseBtn = document.getElementById("add-expense-btn");
const quickAddExpenseBtn = document.getElementById("quick-add-expense-btn");
const emptyAddExpenseBtn = document.getElementById("empty-add-expense-btn");

// ==========================================================================
// Utility & Formatting Helpers
// ==========================================================================

/**
 * Generates a unique ID for each expense record.
 */
function generateExpenseId() {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a numeric amount as USD currency (e.g., "$1,250.50").
 */
function formatCurrency(amount) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeAmount);
}

/**
 * Formats a YYYY-MM string into a readable label (e.g., "Nov 2026").
 */
function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || "";
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Looks up category styling metadata with a safe fallback.
 */
function getCategoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.Other;
}

/**
 * Displays today's date in the top header.
 */
function renderCurrentDate() {
  if (!currentDateEl) return;
  const today = new Date();
  currentDateEl.textContent = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  currentDateEl.setAttribute("datetime", getTodayDateString());
}

// ==========================================================================
// Notifications & Navigation
// ==========================================================================

/**
 * Displays a notification banner in the top notification area.
 * @param {string} message
 * @param {"info"|"success"|"error"|"warning"} type
 */
function showNotification(message, type = "info") {
  if (!notificationArea || !notificationBanner || !notificationBadge || !notificationMessageEl) return;

  const badgeLabels = {
    info: "Info",
    success: "Success",
    error: "Error",
    warning: "Alert"
  };

  notificationBanner.className = `notification-banner is-${type}`;
  notificationBadge.textContent = badgeLabels[type] || "Info";
  notificationMessageEl.textContent = message;
  notificationArea.hidden = false;
}

function hideNotification() {
  if (notificationArea) {
    notificationArea.hidden = true;
  }
}

/**
 * Switches the visible SPA section and highlights the active sidebar item.
 */
function showSection(sectionKey) {
  if (!SECTION_INFO[sectionKey]) return;

  contentSections.forEach((section) => {
    const isTarget = section.id === `section-${sectionKey}`;
    section.hidden = !isTarget;
    section.classList.toggle("is-active", isTarget);
  });

  navLinks.forEach((link) => {
    const isActive = link.dataset.section === sectionKey;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  pageTitleEl.textContent = SECTION_INFO[sectionKey].title;
  pageSubtitleEl.textContent = SECTION_INFO[sectionKey].subtitle;
  closeMobileSidebar();
}

function openMobileSidebar() {
  if (!sidebar || !sidebarBackdrop || !menuToggleBtn) return;
  sidebar.classList.add("is-open");
  sidebarBackdrop.hidden = false;
  menuToggleBtn.setAttribute("aria-expanded", "true");
}

function closeMobileSidebar() {
  if (!sidebar || !sidebarBackdrop || !menuToggleBtn) return;
  sidebar.classList.remove("is-open");
  sidebarBackdrop.hidden = true;
  menuToggleBtn.setAttribute("aria-expanded", "false");
}

// ==========================================================================
// LocalStorage Persistence (Batch 2)
// ==========================================================================

/**
 * Safely reads and parses JSON from localStorage.
 * Returns { data, corrupted } so corrupted values do not crash the app.
 */
function safeReadStorage(key, fallbackValue, validator) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { data: fallbackValue, corrupted: false };
    }

    const parsed = JSON.parse(raw);
    if (!validator(parsed)) {
      return { data: fallbackValue, corrupted: true };
    }
    return { data: parsed, corrupted: false };
  } catch (error) {
    return { data: fallbackValue, corrupted: true };
  }
}

/**
 * Safely writes JSON data to localStorage with error handling.
 */
function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    showNotification("Could not save data to localStorage (storage may be full or disabled).", "error");
    return false;
  }
}

/**
 * Checks whether a single expense object read from storage has valid fields.
 */
function isValidStoredExpense(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    item.title.trim() !== "" &&
    Number.isFinite(Number(item.amount)) &&
    Number(item.amount) > 0 &&
    typeof item.category === "string" &&
    typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
    typeof item.paymentMethod === "string"
  );
}

/**
 * Loads expenses, monthly budgets, and user preferences from localStorage on startup.
 */
function loadFromStorage() {
  const expResult = safeReadStorage(STORAGE_KEYS.EXPENSES, [], Array.isArray);
  const budgetResult = safeReadStorage(
    STORAGE_KEYS.BUDGETS,
    {},
    (val) => val !== null && typeof val === "object" && !Array.isArray(val)
  );
  const prefResult = safeReadStorage(
    STORAGE_KEYS.PREFERENCES,
    { theme: "light" },
    (val) => val !== null && typeof val === "object" && !Array.isArray(val)
  );

  // Filter out malformed expense entries while preserving valid ones
  expenses = expResult.data
    .filter(isValidStoredExpense)
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      amount: Math.round(Number(item.amount) * 100) / 100,
      category: CATEGORY_META[item.category] ? item.category : "Other",
      date: item.date,
      paymentMethod: item.paymentMethod,
      description: typeof item.description === "string" ? item.description.trim() : ""
    }));

  // Keep only valid positive numeric month budgets
  budgets = {};
  Object.entries(budgetResult.data).forEach(([monthKey, value]) => {
    const num = Number(value);
    if (/^\d{4}-\d{2}$/.test(monthKey) && Number.isFinite(num) && num > 0) {
      budgets[monthKey] = Math.round(num * 100) / 100;
    }
  });

  preferences = {
    theme: prefResult.data.theme === "dark" ? "dark" : "light"
  };

  if (expResult.corrupted || budgetResult.corrupted || prefResult.corrupted) {
    showNotification("Some saved localStorage data was invalid and safely skipped.", "warning");
  }
}

function saveExpenses() {
  return safeWriteStorage(STORAGE_KEYS.EXPENSES, expenses);
}

function saveBudgets() {
  return safeWriteStorage(STORAGE_KEYS.BUDGETS, budgets);
}

function savePreferences() {
  return safeWriteStorage(STORAGE_KEYS.PREFERENCES, preferences);
}

// ==========================================================================
// Expense CRUD & Validation (Batch 1)
// ==========================================================================

/**
 * Validates raw form values for an expense before saving.
 * Returns { valid: boolean, error: string, data?: object }.
 */
function validateExpenseInput(raw) {
  const title = (raw.title || "").trim();
  const amountNum = Number(raw.amount);
  const category = (raw.category || "").trim();
  const date = (raw.date || "").trim();
  const paymentMethod = (raw.paymentMethod || "").trim();
  const description = (raw.description || "").trim();

  if (!title) {
    return { valid: false, error: "Please enter an expense title.", field: expenseTitleInput };
  }
  if (title.length > 80) {
    return { valid: false, error: "Title must be 80 characters or fewer.", field: expenseTitleInput };
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { valid: false, error: "Please enter a valid amount greater than 0.", field: expenseAmountInput };
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: "Please select a valid date.", field: expenseDateInput };
  }
  if (!category || !CATEGORY_META[category]) {
    return { valid: false, error: "Please choose an expense category.", field: expenseCategorySelect };
  }
  if (!paymentMethod) {
    return { valid: false, error: "Please select a payment method.", field: expensePaymentSelect };
  }

  return {
    valid: true,
    error: "",
    data: {
      title,
      amount: Math.round(amountNum * 100) / 100,
      category,
      date,
      paymentMethod,
      description
    }
  };
}

/**
 * Adds a new expense to the shared expenses array and refreshes UI.
 */
function addExpense(expenseData) {
  const newExpense = {
    id: generateExpenseId(),
    ...expenseData
  };
  expenses.push(newExpense);
  saveExpenses();
  refreshUI();
  showNotification(`Added "${newExpense.title}" (${formatCurrency(newExpense.amount)}).`, "success");
}

/**
 * Updates an existing expense by ID and refreshes UI.
 */
function updateExpense(id, updatedData) {
  const index = expenses.findIndex((item) => item.id === id);
  if (index === -1) {
    showNotification("Could not find the selected expense to update.", "error");
    return;
  }

  expenses[index] = {
    id,
    ...updatedData
  };
  saveExpenses();
  refreshUI();
  showNotification(`Updated "${updatedData.title}".`, "success");
}

/**
 * Deletes an expense by ID from the shared expenses array and refreshes UI.
 */
function deleteExpense(id) {
  const target = expenses.find((item) => item.id === id);
  if (!target) return;

  expenses = expenses.filter((item) => item.id !== id);
  saveExpenses();
  refreshUI();
  showNotification(`Deleted "${target.title}".`, "success");
}

// ==========================================================================
// Filtering & Sorting (Batch 1)
// ==========================================================================

/**
 * Returns a filtered and sorted copy of the shared `expenses` array
 * based on the current search, category, month, and sort controls.
 */
function getFilteredAndSortedExpenses() {
  const searchTerm = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const selectedCategory = filterCategorySelect ? filterCategorySelect.value : "";
  const selectedMonth = filterMonthSelect ? filterMonthSelect.value : "";
  const sortOrder = sortSelect ? sortSelect.value : "date-desc";

  const filtered = expenses.filter((expense) => {
    const matchesSearch = !searchTerm || expense.title.toLowerCase().includes(searchTerm);
    const matchesCategory = !selectedCategory || expense.category === selectedCategory;
    const matchesMonth = !selectedMonth || expense.date.startsWith(selectedMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  filtered.sort((a, b) => {
    if (sortOrder === "date-asc") {
      return a.date.localeCompare(b.date);
    }
    if (sortOrder === "amount-desc") {
      return b.amount - a.amount;
    }
    if (sortOrder === "amount-asc") {
      return a.amount - b.amount;
    }
    // Default: newest date first
    return b.date.localeCompare(a.date);
  });

  return filtered;
}

/**
 * Populates the month filter dropdown dynamically from recorded expenses,
 * preserving the user's current selection if still available.
 */
function populateMonthFilter() {
  if (!filterMonthSelect) return;

  const previousValue = filterMonthSelect.value;
  const monthSet = new Set();
  expenses.forEach((expense) => {
    if (expense.date && expense.date.length >= 7) {
      monthSet.add(expense.date.slice(0, 7));
    }
  });

  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  filterMonthSelect.textContent = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "All Months";
  filterMonthSelect.appendChild(defaultOpt);

  sortedMonths.forEach((monthKey) => {
    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = formatMonthLabel(monthKey);
    filterMonthSelect.appendChild(option);
  });

  if (sortedMonths.includes(previousValue)) {
    filterMonthSelect.value = previousValue;
  }
}

/**
 * Renders the Transactions table safely using DOM element creation.
 */
function renderTransactionsTable() {
  if (!transactionsTbody || !transactionsTableWrapper || !transactionsEmptyState) return;

  const visibleExpenses = getFilteredAndSortedExpenses();
  const filteredTotal = visibleExpenses.reduce((sum, item) => sum + item.amount, 0);

  if (transactionsCountText) {
    const label = visibleExpenses.length === 1 ? "transaction" : "transactions";
    transactionsCountText.textContent = `Showing ${visibleExpenses.length} ${label}`;
  }
  if (transactionsFilteredTotal) {
    transactionsFilteredTotal.textContent = `Total: ${formatCurrency(filteredTotal)}`;
  }

  transactionsTbody.textContent = "";

  if (visibleExpenses.length === 0) {
    transactionsTableWrapper.hidden = true;
    transactionsEmptyState.hidden = false;

    if (expenses.length === 0) {
      emptyStateTitle.textContent = "No expenses recorded yet";
      emptyStateDesc.textContent = "Add your first expense to start tracking your spending.";
    } else {
      emptyStateTitle.textContent = "No matching expenses found";
      emptyStateDesc.textContent = "Try clearing your search text or changing the category/month filter.";
    }
    return;
  }

  transactionsTableWrapper.hidden = false;
  transactionsEmptyState.hidden = true;

  visibleExpenses.forEach((expense) => {
    const meta = getCategoryMeta(expense.category);
    const tr = document.createElement("tr");

    // Title (+ optional description)
    const titleTd = document.createElement("td");
    titleTd.className = "cell-title";
    const titleText = document.createElement("div");
    titleText.textContent = expense.title;
    titleTd.appendChild(titleText);

    if (expense.description) {
      const descText = document.createElement("div");
      descText.className = "cell-desc";
      descText.textContent = expense.description;
      titleTd.appendChild(descText);
    }

    // Category tag
    const categoryTd = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = `tag tag-${meta.slug}`;
    tag.textContent = expense.category;
    categoryTd.appendChild(tag);

    // Date
    const dateTd = document.createElement("td");
    dateTd.className = "tabular-nums date-cell";
    dateTd.textContent = expense.date;

    // Payment method
    const paymentTd = document.createElement("td");
    paymentTd.textContent = expense.paymentMethod;

    // Amount
    const amountTd = document.createElement("td");
    amountTd.className = "text-right tabular-nums cell-amount";
    amountTd.textContent = formatCurrency(expense.amount);

    // Edit & Delete action buttons
    const actionsTd = document.createElement("td");
    actionsTd.className = "text-right";
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-action";
    editBtn.dataset.action = "edit-expense";
    editBtn.dataset.id = expense.id;
    editBtn.setAttribute("aria-label", `Edit ${expense.title}`);
    editBtn.textContent = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-action btn-action-danger";
    deleteBtn.dataset.action = "delete-expense";
    deleteBtn.dataset.id = expense.id;
    deleteBtn.setAttribute("aria-label", `Delete ${expense.title}`);
    deleteBtn.textContent = "Delete";

    actionsWrap.appendChild(editBtn);
    actionsWrap.appendChild(deleteBtn);
    actionsTd.appendChild(actionsWrap);

    tr.appendChild(titleTd);
    tr.appendChild(categoryTd);
    tr.appendChild(dateTd);
    tr.appendChild(paymentTd);
    tr.appendChild(amountTd);
    tr.appendChild(actionsTd);

    transactionsTbody.appendChild(tr);
  });
}

// ==========================================================================
// Modal Management (Expense Add/Edit & Confirmation)
// ==========================================================================

function clearExpenseFormErrors() {
  if (expenseFormError) {
    expenseFormError.hidden = true;
    expenseFormError.textContent = "";
  }
  [
    expenseTitleInput,
    expenseAmountInput,
    expenseDateInput,
    expenseCategorySelect,
    expensePaymentSelect
  ].forEach((field) => {
    if (field) field.classList.remove("is-invalid");
  });
}

/**
 * Opens the Add/Edit Expense modal.
 * @param {object|null} expenseToEdit - Pass an expense object to edit, or null to add.
 */
function openExpenseModal(expenseToEdit = null) {
  if (!expenseModalBackdrop || !expenseForm) return;

  clearExpenseFormErrors();

  if (expenseToEdit) {
    editingExpenseId = expenseToEdit.id;
    expenseModalTitle.textContent = "Edit Expense";
    expenseSubmitBtn.textContent = "Update Expense";
    expenseTitleInput.value = expenseToEdit.title;
    expenseAmountInput.value = expenseToEdit.amount;
    expenseDateInput.value = expenseToEdit.date;
    expenseCategorySelect.value = expenseToEdit.category;
    expensePaymentSelect.value = expenseToEdit.paymentMethod;
    expenseDescriptionInput.value = expenseToEdit.description || "";
  } else {
    editingExpenseId = null;
    expenseModalTitle.textContent = "Add Expense";
    expenseSubmitBtn.textContent = "Save Expense";
    expenseForm.reset();
    expenseDateInput.value = getTodayDateString();
  }

  expenseModalBackdrop.hidden = false;
  expenseTitleInput.focus();
}

function closeExpenseModal() {
  if (!expenseModalBackdrop) return;
  expenseModalBackdrop.hidden = true;
  editingExpenseId = null;
  clearExpenseFormErrors();
}

/**
 * Opens a reusable confirmation modal (used for Delete Expense and Clear Data).
 */
function openConfirmModal(title, message, confirmLabel, onConfirm) {
  if (!confirmModalBackdrop) return;
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  confirmOkBtn.textContent = confirmLabel;
  pendingConfirmAction = onConfirm;
  confirmModalBackdrop.hidden = false;
  confirmOkBtn.focus();
}

function closeConfirmModal() {
  if (!confirmModalBackdrop) return;
  confirmModalBackdrop.hidden = true;
  pendingConfirmAction = null;
}

/**
 * Refreshes UI views after state changes.
 */
function refreshUI() {
  populateMonthFilter();
  renderTransactionsTable();
}

// ==========================================================================
// Event Listeners & Initialization
// ==========================================================================

function handleExpenseFormSubmit(event) {
  event.preventDefault();
  clearExpenseFormErrors();

  const validation = validateExpenseInput({
    title: expenseTitleInput.value,
    amount: expenseAmountInput.value,
    category: expenseCategorySelect.value,
    date: expenseDateInput.value,
    paymentMethod: expensePaymentSelect.value,
    description: expenseDescriptionInput.value
  });

  if (!validation.valid) {
    expenseFormError.textContent = validation.error;
    expenseFormError.hidden = false;
    if (validation.field) {
      validation.field.classList.add("is-invalid");
      validation.field.focus();
    }
    return;
  }

  const isEditing = Boolean(editingExpenseId);
  const targetId = editingExpenseId;
  closeExpenseModal();

  if (isEditing) {
    updateExpense(targetId, validation.data);
  } else {
    addExpense(validation.data);
  }
}

function initApp() {
  renderCurrentDate();
  loadFromStorage();
  refreshUI();

  // Global click delegation for navigation, modals, and transaction row actions
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

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const id = actionBtn.dataset.id;

      if (action === "edit-expense") {
        const target = expenses.find((item) => item.id === id);
        if (target) openExpenseModal(target);
      } else if (action === "delete-expense") {
        const target = expenses.find((item) => item.id === id);
        if (target) {
          openConfirmModal(
            "Delete Expense",
            `Are you sure you want to delete "${target.title}" (${formatCurrency(target.amount)})? This action cannot be undone.`,
            "Delete",
            () => deleteExpense(target.id)
          );
        }
      }
    }
  });

  // Add Expense buttons
  [addExpenseBtn, quickAddExpenseBtn, emptyAddExpenseBtn].forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", () => openExpenseModal(null));
    }
  });

  // Expense form submission & modal close buttons
  if (expenseForm) expenseForm.addEventListener("submit", handleExpenseFormSubmit);
  if (expenseModalCloseBtn) expenseModalCloseBtn.addEventListener("click", closeExpenseModal);
  if (expenseCancelBtn) expenseCancelBtn.addEventListener("click", closeExpenseModal);
  if (expenseModalBackdrop) {
    expenseModalBackdrop.addEventListener("click", (event) => {
      if (event.target === expenseModalBackdrop) closeExpenseModal();
    });
  }

  // Confirmation modal controls
  if (confirmCloseBtn) confirmCloseBtn.addEventListener("click", closeConfirmModal);
  if (confirmCancelBtn) confirmCancelBtn.addEventListener("click", closeConfirmModal);
  if (confirmOkBtn) {
    confirmOkBtn.addEventListener("click", () => {
      const callback = pendingConfirmAction;
      closeConfirmModal();
      if (typeof callback === "function") callback();
    });
  }
  if (confirmModalBackdrop) {
    confirmModalBackdrop.addEventListener("click", (event) => {
      if (event.target === confirmModalBackdrop) closeConfirmModal();
    });
  }

  // Live search, filter, and sort listeners
  if (searchInput) searchInput.addEventListener("input", renderTransactionsTable);
  if (filterCategorySelect) filterCategorySelect.addEventListener("change", renderTransactionsTable);
  if (filterMonthSelect) filterMonthSelect.addEventListener("change", renderTransactionsTable);
  if (sortSelect) sortSelect.addEventListener("change", renderTransactionsTable);

  // Mobile sidebar drawer controls
  if (menuToggleBtn) menuToggleBtn.addEventListener("click", openMobileSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  // Escape key closes open modals or mobile drawer
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeExpenseModal();
      closeConfirmModal();
      closeMobileSidebar();
    }
  });

  // Notification close
  if (notificationCloseBtn) {
    notificationCloseBtn.addEventListener("click", hideNotification);
  }
}

document.addEventListener("DOMContentLoaded", initApp);

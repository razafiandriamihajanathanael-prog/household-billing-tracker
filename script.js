const SUPABASE_URL = "https://tyethrwijwqsqrgsrdnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_6dfeonRsZH8E26XQl-mKDQ_8dSu4UWs";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
const billTableBody = document.getElementById("billTableBody");
const addBillBtn = document.getElementById("addBillBtn");

const totalAmount = document.getElementById("totalAmount");
const totalPerPerson = document.getElementById("totalPerPerson");
const billCount = document.getElementById("billCount");

const currentMonthDisplay = document.getElementById("currentMonth");
const previousMonthBtn = document.getElementById("previousMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const printBtn = document.getElementById("printBtn");

let currentDate = new Date(2026, 7, 1);

const defaultBills = [
  "Rent",
  "Water",
  "Electricity",
  "Gas + Trash",
  "AT&T Internet",
  "Phone"
];

function getMonthKey() {
  return `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
}

function formatMonth() {
  return currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function createBillRow(data = {}) {
  const row = document.createElement("tr");

  row.classList.add("bill-row");

  row.innerHTML = `
    <td>
      <input
        type="text"
        class="bill-name"
        placeholder="Bill name"
        value="${data.name || ""}"
      >
    </td>

    <td>
      <input
        type="date"
        class="due-date"
        value="${data.dueDate || ""}"
      >
    </td>

    <td>
      <div class="money-input">
        <span>$</span>
        <input
          type="number"
          class="bill-amount"
          placeholder="0.00"
          step="0.01"
          min="0"
          value="${data.amount || ""}"
        >
      </div>
    </td>

    <td class="split-amount">
      $0.00
    </td>

    <td>
      <input
        type="text"
        class="bill-notes"
        placeholder="Optional"
        value="${data.notes || ""}"
      >
    </td>

    <td>
      <button class="delete-btn" type="button">
        ×
      </button>
    </td>
  `;

  billTableBody.appendChild(row);

  addRowEvents(row);

  updateTotals();
}

function addRowEvents(row) {
  const amountInput = row.querySelector(".bill-amount");
  const deleteBtn = row.querySelector(".delete-btn");

  row.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => {
      updateTotals();
      saveMonth();
    });

    input.addEventListener("change", saveMonth);
  });

  amountInput.addEventListener("input", () => {
    updateRowSplit(row);
  });

  deleteBtn.addEventListener("click", () => {
    row.remove();

    updateTotals();
    saveMonth();
  });
}

function updateRowSplit(row) {
  const amount =
    parseFloat(row.querySelector(".bill-amount").value) || 0;

  const splitAmount = amount / 4;

  row.querySelector(".split-amount").textContent =
    `$${splitAmount.toFixed(2)}`;
}

function updateTotals() {
  const rows = document.querySelectorAll(".bill-row");

  let total = 0;
  let count = 0;

  rows.forEach(row => {
    const amount =
      parseFloat(row.querySelector(".bill-amount").value) || 0;

    updateRowSplit(row);

    if (amount > 0) {
      total += amount;
      count++;
    }
  });

  totalAmount.textContent =
    `$${total.toFixed(2)}`;

  totalPerPerson.textContent =
    `$${(total / 4).toFixed(2)}`;

  billCount.textContent =
    count;
}

function saveMonth() {
  const rows =
    document.querySelectorAll(".bill-row");

  const data = [];

  rows.forEach(row => {
    data.push({
      name: row.querySelector(".bill-name").value,
      dueDate: row.querySelector(".due-date").value,
      amount: row.querySelector(".bill-amount").value,
      notes: row.querySelector(".bill-notes").value
    });
  });

  localStorage.setItem(
    `billing-${getMonthKey()}`,
    JSON.stringify(data)
  );
}

function loadMonth() {
  currentMonthDisplay.textContent =
    formatMonth();

  billTableBody.innerHTML = "";

  const savedData =
    localStorage.getItem(
      `billing-${getMonthKey()}`
    );

  if (savedData) {
    const bills =
      JSON.parse(savedData);

    bills.forEach(bill => {
      createBillRow(bill);
    });
  } else {
    defaultBills.forEach(name => {
      createBillRow({ name });
    });
  }

  updateTotals();
}

function changeMonth(direction) {
  saveMonth();

  currentDate.setMonth(
    currentDate.getMonth() + direction
  );

  loadMonth();
}

addBillBtn.addEventListener("click", () => {
  createBillRow();
  saveMonth();
});

previousMonthBtn.addEventListener("click", () => {
  changeMonth(-1);
});

nextMonthBtn.addEventListener("click", () => {
  changeMonth(1);
});

printBtn.addEventListener("click", () => {
  saveMonth();
  window.print();
});

loadMonth();

const SUPABASE_URL = "https://tyethrwijwqsqrgsrdnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_6dfeonRsZH8E26XQl-mKDQ_8dSu4UWs";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const loginScreen = document.getElementById("loginScreen");
const appContent = document.getElementById("appContent");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const billTableBody = document.getElementById("billTableBody");
const addBillBtn = document.getElementById("addBillBtn");
const totalAmount = document.getElementById("totalAmount");
const totalPerPerson = document.getElementById("totalPerPerson");
const billCount = document.getElementById("billCount");
const currentMonthDisplay = document.getElementById("currentMonth");
const previousMonthBtn = document.getElementById("previousMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const printBtn = document.getElementById("printBtn");
const generateBillsBtn = document.getElementById("generateBillsBtn");
const generatedBillsSection = document.getElementById("generatedBillsSection");
const generatedBillsContent = document.getElementById("generatedBillsContent");
const printSummaryBtn = document.getElementById("printSummaryBtn");
let currentDate = new Date(2026, 7, 1);

const defaultBills = [
  "Rent",
  "Water",
  "Electricity",
  "Gas + Trash",
  "AT&T Internet",
  "Phone"
];

function formatMonth() {
  return currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

async function checkSession() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    loginMessage.textContent = "Unable to check login session.";
    return;
  }

  if (session) {
    loginScreen.style.display = "none";
    appContent.style.display = "";
    await loadMonth();
  } else {
    loginScreen.style.display = "flex";
    appContent.style.display = "none";
  }
}

loginBtn.addEventListener("click", async () => {
  loginMessage.textContent = "Signing in...";
  loginBtn.disabled = true;

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginMessage.textContent = "Enter the email and password.";
    loginBtn.disabled = false;
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login error:", error);
    loginMessage.textContent = error.message || "Incorrect email or password.";
    loginBtn.disabled = false;
    return;
  }

  if (!data.session) {
    loginMessage.textContent = "Login did not create a session.";
    loginBtn.disabled = false;
    return;
  }

  loginMessage.textContent = "";
  loginScreen.style.display = "none";
  appContent.style.display = "";
  loginBtn.disabled = false;
  await loadMonth();
});

loginPassword.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    loginBtn.click();
  }
});

function createBillRow(data = {}) {
  const row = document.createElement("tr");
  row.classList.add("bill-row");

  row.innerHTML = `
    <td><input type="text" class="bill-name" placeholder="Bill name" value="${data.name || ""}"></td>
    <td><input type="date" class="due-date" value="${data.dueDate || ""}"></td>
    <td>
      <div class="money-input">
        <span>$</span>
        <input type="number" class="bill-amount" placeholder="0.00" step="0.01" min="0" value="${data.amount ?? ""}">
      </div>
    </td>
    <td class="split-amount">$0.00</td>
    <td><input type="text" class="bill-notes" placeholder="Optional" value="${data.notes || ""}"></td>
    <td><button class="delete-btn" type="button">×</button></td>
  `;

  billTableBody.appendChild(row);
  addRowEvents(row);
  updateTotals();
}

function addRowEvents(row) {
  const amountInput = row.querySelector(".bill-amount");
  const deleteBtn = row.querySelector(".delete-btn");

  let saveTimer;

  row.querySelectorAll("input").forEach(input => {

    input.addEventListener("input", () => {
      updateTotals();

      clearTimeout(saveTimer);

      saveTimer = setTimeout(async () => {
        await saveMonth();
      }, 500);
    });

    input.addEventListener("change", async () => {
      clearTimeout(saveTimer);
      await saveMonth();
    });

  });

  amountInput.addEventListener("input", () => {
    updateRowSplit(row);
  });

  deleteBtn.addEventListener("click", async () => {
    row.remove();
    updateTotals();
    await saveMonth();
  });
}

function updateRowSplit(row) {
  const amount = parseFloat(row.querySelector(".bill-amount").value) || 0;
  row.querySelector(".split-amount").textContent = `$${(amount / 4).toFixed(2)}`;
}

function updateTotals() {
  const rows = document.querySelectorAll(".bill-row");
  let total = 0;
  let count = 0;

  rows.forEach(row => {
    const amount = parseFloat(row.querySelector(".bill-amount").value) || 0;
    updateRowSplit(row);

    if (amount > 0) {
      total += amount;
      count++;
    }
  });

  totalAmount.textContent = `$${total.toFixed(2)}`;
  totalPerPerson.textContent = `$${(total / 4).toFixed(2)}`;
  billCount.textContent = count;
}

async function saveMonth() {
  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    console.error("User error:", userError);
    return;
  }

  const rows = document.querySelectorAll(".bill-row");
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const bills = [];

  rows.forEach(row => {
    const name = row.querySelector(".bill-name").value.trim();
    const dueDate = row.querySelector(".due-date").value;
    const amount = row.querySelector(".bill-amount").value;
    const notes = row.querySelector(".bill-notes").value.trim();

    if (name !== "") {
      bills.push({
        month: monthKey,
        bill_name: name,
        due_date: dueDate || null,
        amount: amount === "" ? null : Number(amount),
        notes: notes || null
      });
    }
  });

  const { error: deleteError } = await supabaseClient
    .from("bills")
    .delete()
    .eq("month", monthKey);

  if (deleteError) {
    console.error("Error removing old bills:", deleteError);
    return;
  }

  if (bills.length > 0) {
    const { error: insertError } = await supabaseClient
      .from("bills")
      .insert(bills);

    if (insertError) {
      console.error("Error saving bills:", insertError);
    }
  }
}

async function loadMonth() {
  currentMonthDisplay.textContent = formatMonth();
  billTableBody.innerHTML = "";

  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  const { data, error } = await supabaseClient
    .from("bills")
    .select("*")
    .eq("month", monthKey)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading bills:", error);
    return;
  }

  if (data && data.length > 0) {
    data.forEach(bill => {
      createBillRow({
        name: bill.bill_name,
        dueDate: bill.due_date || "",
        amount: bill.amount ?? "",
        notes: bill.notes || ""
      });
    });
  } else {
    defaultBills.forEach(name => {
      createBillRow({ name });
    });
  }

  updateTotals();
}

async function changeMonth(direction) {
  await saveMonth();
  currentDate.setMonth(currentDate.getMonth() + direction);
  await loadMonth();
}

addBillBtn.addEventListener("click", () => {
  createBillRow();
});

previousMonthBtn.addEventListener("click", () => {
  changeMonth(-1);
});

nextMonthBtn.addEventListener("click", () => {
  changeMonth(1);
});

printBtn.addEventListener("click", async () => {
  await saveMonth();
  window.print();
});
generateBillsBtn.addEventListener("click", async () => {

  // Save the latest changes first
  await saveMonth();

  const rows = document.querySelectorAll(".bill-row");

  let total = 0;

  let html = `
    <div class="generated-month-title">
      ${formatMonth()}
    </div>
  `;

  rows.forEach(row => {

    const name = row.querySelector(".bill-name").value.trim();
    const dueDate = row.querySelector(".due-date").value;

    const amount =
      parseFloat(row.querySelector(".bill-amount").value) || 0;

    const notes =
      row.querySelector(".bill-notes").value.trim();

    if (!name) return;

    total += amount;

    html += `
      <div class="generated-bill-item">

        <div class="generated-bill-info">

          <strong>${name}</strong>

          <p>
            ${dueDate ? `Due: ${dueDate}` : "No due date"}
          </p>

          ${notes ? `<small>${notes}</small>` : ""}

        </div>

        <div class="generated-bill-money">

          <strong>
            $${amount.toFixed(2)}
          </strong>

          <span>
            $${(amount / 4).toFixed(2)} each
          </span>

        </div>

      </div>
    `;
  });

  html += `
    <div class="generated-bills-total">

      <div>
        <span>Total Household Bills</span>
        <strong>$${total.toFixed(2)}</strong>
      </div>

      <div>
        <span>Each Person</span>
        <strong>$${(total / 4).toFixed(2)}</strong>
      </div>

    </div>
  `;

  generatedBillsContent.innerHTML = html;

  generatedBillsSection.style.display = "block";

  generatedBillsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

});
printSummaryBtn.addEventListener("click", () => {
  document.body.classList.add("print-summary-only");

  window.print();

  setTimeout(() => {
    document.body.classList.remove("print-summary-only");
  }, 500);
});
checkSession();

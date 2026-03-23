import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyA7dmLQovQgzhJFQHucy5m-kZR72Qk_WPU",
  authDomain: "nithin-pitcs-database.firebaseapp.com",
  projectId: "nithin-pitcs-database",
  storageBucket: "nithin-pitcs-database.firebasestorage.app",
  messagingSenderId: "511792044799",
  appId: "1:511792044799:web:ebe87e8ea652192e14caca",
  measurementId: "G-CCVNTMVJ6N",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allCandidates = [];

// 🔐 LOGIN
window.login = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(e.message);
  }
};

// 🔓 LOGOUT
window.logout = async () => {
  await signOut(auth);
};

// 🔄 AUTH CHECK
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("appSection").style.display = "block";
    startRealtimeListener();
  } else {
    document.getElementById("loginSection").style.display = "flex";
    document.getElementById("appSection").style.display = "none";
  }
});

// 🔥 REALTIME
function startRealtimeListener() {
  const colRef = collection(db, "candidates");

  onSnapshot(colRef, (snapshot) => {
    allCandidates = [];

    snapshot.forEach((docSnap) => {
      allCandidates.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });

    allCandidates.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );

    populateFilters();
    applyFilters();
  });
}

// ➕ ADD
document
  .getElementById("candidateForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("emailInput").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      position: document.getElementById("position").value.trim(),
      exp: document.getElementById("exp").value || "",
      currentCTC: document.getElementById("currentCTC").value || "",
      expectedCTC: document.getElementById("expectedCTC").value || "",
      noticePeriod: document.getElementById("noticePeriod").value.trim(),
      location: document.getElementById("location").value.trim(),
      currentCompany: document.getElementById("currentCompany").value.trim(),
      targetCompany: document.getElementById("targetCompany").value.trim(),
      comment: document.getElementById("comment").value.trim(),
      status: document.getElementById("status").value,
      createdAt: serverTimestamp(),
    };

    if (!data.name || !data.email || !data.phone) {
      alert("Fill required fields");
      return;
    }

    await addDoc(collection(db, "candidates"), data);
    e.target.reset();
  });

// 🧠 FILTER POPULATION
function populateFilters() {
  const positionSet = new Set();
  const expSet = new Set();

  allCandidates.forEach((c) => {
    if (c.position) positionSet.add(c.position);
    if (c.exp) expSet.add(Number(c.exp));
  });

  const positionFilter = document.getElementById("positionFilter");
  positionFilter.innerHTML = '<option value="">All Positions</option>';

  positionSet.forEach((pos) => {
    positionFilter.innerHTML += `<option value="${pos}">${pos}</option>`;
  });

  const expFilter = document.getElementById("expFilter");
  expFilter.innerHTML = '<option value="">All Experience</option>';

  const expArray = [...expSet].sort((a, b) => a - b);

  if (expArray.length > 0) {
    const min = expArray[0];
    const max = expArray[expArray.length - 1];

    for (let i = min; i <= max; i += 3) {
      expFilter.innerHTML += `<option value="${i}-${i + 2}">${i}-${i + 2} years</option>`;
    }
  }
}

// 🎯 APPLY FILTERS
function applyFilters() {
  const position = document.getElementById("positionFilter").value;
  const expRange = document.getElementById("expFilter").value;
  const search = document.getElementById("search").value.toLowerCase();

  let filtered = [...allCandidates];

  if (position) {
    filtered = filtered.filter((c) => c.position === position);
  }

  if (expRange) {
    const [min, max] = expRange.split("-").map(Number);
    filtered = filtered.filter((c) => {
      const exp = Number(c.exp);
      return !isNaN(exp) && exp >= min && exp <= max;
    });
  }

  if (search) {
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.position.toLowerCase().includes(search) ||
        c.phone.includes(search),
    );
  }

  renderTable(filtered);
}

function renderTable(list) {
  const table = document.getElementById("tableBody");
  table.innerHTML = "";

  const fields = [
    "name",
    "email",
    "phone",
    "position",
    "exp",
    "currentCTC",
    "expectedCTC",
    "noticePeriod",
    "location",
    "currentCompany",
    "targetCompany",
    "comment",
    "status",
  ];

  list.forEach((c, i) => {
    const date = c.createdAt?.seconds
      ? new Date(c.createdAt.seconds * 1000).toLocaleString()
      : "";

    // 1. Start the row
    // 2. Add the Action Buttons in the FIRST column
    let row = `
      <tr>
        <td>
          <div style="display: flex; gap: 5px; align-items: center;">
            <button class="action-btn edit-btn" onclick="openEdit('${c.id}')">Edit
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" onclick="deleteCandidate('${c.id}')">Delete
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
        <td>${i + 1}</td>
        <td>${date}</td>
    `;

    // 3. Add dynamic data fields
    fields.forEach((field) => {
      row += `<td>${c[field] || "-"}</td>`;
    });

    row += `</tr>`;

    table.innerHTML += row;
  });
}

// ❌ DELETE
window.deleteCandidate = async (id) => {
  await deleteDoc(doc(db, "candidates", id));
};

// 🎧 EVENTS
document
  .getElementById("positionFilter")
  .addEventListener("change", applyFilters);
document.getElementById("expFilter").addEventListener("change", applyFilters);
document.getElementById("search").addEventListener("input", applyFilters);

// //////////////////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////////////////
let currentEditId = null;

window.openEdit = function (id) {
  const c = allCandidates.find((x) => x.id === id);
  if (!c) return;

  currentEditId = id;

  // Set values in modal
  document.getElementById("editName").value = c.name || "";
  document.getElementById("editEmail").value = c.email || "";
  document.getElementById("editPhone").value = c.phone || "";
  document.getElementById("editPosition").value = c.position || "";
  document.getElementById("editExp").value = c.exp || "";
  
  // Fill the 3 missing fields
  document.getElementById("editCurrentCTC").value = c.currentCTC || "";
  document.getElementById("editExpectedCTC").value = c.expectedCTC || "";
  document.getElementById("editNoticePeriod").value = c.noticePeriod || "";

  document.getElementById("editLocation").value = c.location || "";
  document.getElementById("editCurrentCompany").value = c.currentCompany || "";
  document.getElementById("editTargetCompany").value = c.targetCompany || "";
  document.getElementById("editComment").value = c.comment || "";
  document.getElementById("editStatus").value = c.status || "";

  document.getElementById("editModal").style.display = "flex"; // Changed to flex for centering
};

window.saveEdit = async function () {
  const updated = {
    name: document.getElementById("editName").value,
    email: document.getElementById("editEmail").value,
    phone: document.getElementById("editPhone").value,
    position: document.getElementById("editPosition").value,
    exp: document.getElementById("editExp").value,
    
    // Save the 3 missing fields
    currentCTC: document.getElementById("editCurrentCTC").value,
    expectedCTC: document.getElementById("editExpectedCTC").value,
    noticePeriod: document.getElementById("editNoticePeriod").value,

    location: document.getElementById("editLocation").value,
    currentCompany: document.getElementById("editCurrentCompany").value,
    targetCompany: document.getElementById("editTargetCompany").value,
    comment: document.getElementById("editComment").value,
    status: document.getElementById("editStatus").value,
  };

  try {
    await updateDoc(doc(db, "candidates", currentEditId), updated);
    closeModal();
  } catch (error) {
    console.error("Error updating document: ", error);
    alert("Failed to save changes.");
  }
};

window.closeModal = function () {
  document.getElementById("editModal").style.display = "none";
};

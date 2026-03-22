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
    filtered = filtered.filter(
      (c) => Number(c.exp) >= min && Number(c.exp) <= max,
    );
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

// 🖥️ TABLE
function renderTable(list) {
  const table = document.getElementById("tableBody");
  table.innerHTML = "";

  list.forEach((c, i) => {
    const date = c.createdAt?.seconds
      ? new Date(c.createdAt.seconds * 1000).toLocaleString()
      : "";

    table.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${date}</td>
        <td>${c.name}</td>
        <td>${c.email}</td>
        <td>${c.phone}</td>
        <td>${c.position}</td>
        <td>${c.exp}</td>
        <td>${c.currentCTC}</td>
        <td>${c.expectedCTC}</td>
        <td>${c.noticePeriod}</td>
        <td>${c.status}</td>
        <td>
        <button class="delete-btn" onclick="deleteCandidate('${c.id}')">Delete
  <i class="fas fa-trash"></i>
</button>
  </td>
      </tr>
    `;
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

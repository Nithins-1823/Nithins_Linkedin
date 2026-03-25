
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
      allCandidates.push({ id: docSnap.id, ...docSnap.data() });
    });
    allCandidates.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    populateFilters();
    applyFilters();
  });
}

// ➕ ADD
document.getElementById("candidateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const addBtn = document.getElementById("addBtn");
  
  try {
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    addBtn.disabled = true;

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
      resumeURL: document.getElementById("resumeLink").value.trim(), // Manually pasted link
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "candidates"), data);
    e.target.reset();
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Error saving candidate!");
  } finally {
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
    addBtn.disabled = false;
  }
});

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

function applyFilters() {
  const position = document.getElementById("positionFilter").value;
  const expRange = document.getElementById("expFilter").value;
  const search = document.getElementById("search").value.toLowerCase();

  let filtered = [...allCandidates];

  if (position) filtered = filtered.filter((c) => c.position === position);
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
    "name", "email", "phone", "position", "exp", "currentCTC", 
    "expectedCTC", "noticePeriod", "location", "currentCompany", 
    "targetCompany", "comment", "status"
  ];

  list.forEach((c, i) => {
    const date = c.createdAt?.seconds
      ? new Date(c.createdAt.seconds * 1000).toLocaleDateString()
      : "";

    // Toggle button based on if a URL exists
    const viewResumeBtn = c.resumeURL
        ? `<button class="action-btn view-btn" onclick="openResumeModal('${c.resumeURL}')" title="View Resume Link"><i class="fas fa-link"></i></button>`
        : `<button class="action-btn" disabled title="No Link Provided"><i class="fas fa-link"></i></button>`;

    let row = `
      <tr>
        <td>
          <div style="display: flex; gap: 5px; align-items: center;">
            ${viewResumeBtn}
            <button class="action-btn edit-btn" onclick="openEdit('${c.id}')" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="action-btn delete-btn" onclick="deleteCandidate('${c.id}')" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </td>
        <td>${i + 1}</td>
        <td>${date}</td>
    `;

    fields.forEach((field) => {
      row += `<td>${c[field] || "-"}</td>`;
    });

    row += `</tr>`;
    table.innerHTML += row;
  });
}

// ❌ DELETE
window.deleteCandidate = async (id) => {
  if(confirm("Are you sure you want to delete this candidate?")) {
      await deleteDoc(doc(db, "candidates", id));
  }
};

// 🎧 EVENTS
document.getElementById("positionFilter").addEventListener("change", applyFilters);
document.getElementById("expFilter").addEventListener("change", applyFilters);
document.getElementById("search").addEventListener("input", applyFilters);


// ==========================================
// EDIT MODAL LOGIC
// ==========================================
let currentEditId = null;

window.openEdit = function (id) {
  const c = allCandidates.find((x) => x.id === id);
  if (!c) return;

  currentEditId = id;
  document.getElementById("editName").value = c.name || "";
  document.getElementById("editEmail").value = c.email || "";
  document.getElementById("editPhone").value = c.phone || "";
  document.getElementById("editPosition").value = c.position || "";
  document.getElementById("editExp").value = c.exp || "";
  document.getElementById("editCurrentCTC").value = c.currentCTC || "";
  document.getElementById("editExpectedCTC").value = c.expectedCTC || "";
  document.getElementById("editNoticePeriod").value = c.noticePeriod || "";
  document.getElementById("editLocation").value = c.location || "";
  document.getElementById("editCurrentCompany").value = c.currentCompany || "";
  document.getElementById("editTargetCompany").value = c.targetCompany || "";
  document.getElementById("editComment").value = c.comment || "";
  document.getElementById("editStatus").value = c.status || "";
  
  // Load the existing URL into the edit field
  document.getElementById("editResumeLink").value = c.resumeURL || ""; 

  document.getElementById("editModal").style.display = "flex";
};

window.saveEdit = async function () {
  const saveBtn = document.getElementById("saveEditBtn");
  saveBtn.innerHTML = "Saving...";
  saveBtn.disabled = true;

  try {
    const updated = {
      name: document.getElementById("editName").value,
      email: document.getElementById("editEmail").value,
      phone: document.getElementById("editPhone").value,
      position: document.getElementById("editPosition").value,
      exp: document.getElementById("editExp").value,
      currentCTC: document.getElementById("editCurrentCTC").value,
      expectedCTC: document.getElementById("editExpectedCTC").value,
      noticePeriod: document.getElementById("editNoticePeriod").value,
      location: document.getElementById("editLocation").value,
      currentCompany: document.getElementById("editCurrentCompany").value,
      targetCompany: document.getElementById("editTargetCompany").value,
      comment: document.getElementById("editComment").value,
      status: document.getElementById("editStatus").value,
      resumeURL: document.getElementById("editResumeLink").value.trim(), // Update link
    };

    await updateDoc(doc(db, "candidates", currentEditId), updated);
    closeModal();
  } catch (error) {
    console.error("Error updating document: ", error);
    alert("Failed to save changes.");
  } finally {
      saveBtn.innerHTML = "Save Changes";
      saveBtn.disabled = false;
  }
};

window.closeModal = function () {
  document.getElementById("editModal").style.display = "none";
};

// ==========================================
// VIEW RESUME MODAL LOGIC
// ==========================================
window.openResumeModal = function(url) {
    const modal = document.getElementById("resumeModal");
    const iframe = document.getElementById("resumeIframe");
    const downloadBtn = document.getElementById("downloadResumeBtn");
    
    // Set the link to open in a new tab
    downloadBtn.href = url;

    // Optional: Attempt to load in iframe. 
    // If it's a raw Google Drive preview link, this might work. 
    // Standard OneDrive links will usually display a blank white box.
    iframe.src = url; 

    modal.style.display = "flex";
};

window.closeResumeModal = function() {
    document.getElementById("resumeModal").style.display = "none";
    document.getElementById("resumeIframe").src = ""; 
};

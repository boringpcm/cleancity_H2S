let userLoc = null;
let model = null;
let stream = null;
let isAnalysing = false;
let allReports = [];
let pendingImage = null;
let currentServiceType = null;
let currentGameType = null;

// INIT
window.onload = async () => {
    const landing = document.getElementById('landing-page');
    const mainApp = document.getElementById('main-app');
    
    if(landing && mainApp) {
        landing.classList.add('active-view');
        landing.classList.remove('hidden-view');
        mainApp.classList.add('hidden-view');
        mainApp.classList.remove('active-view');
    }

    try { 
        if(typeof mobilenet !== 'undefined') {
            model = await mobilenet.load(); 
            console.log("AI Model Loaded"); 
        }
    } catch(e){ console.log("AI Load Error"); }
    
    refreshLocation();
    initMockLeaderboard();
    
    setInterval(() => {
        if(document.getElementById('main-app').classList.contains('active-view')) {
            loadData();
        }
    }, 5000);
};

async function refreshLocation() {
    return new Promise((resolve) => {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                p => { 
                    userLoc = { lat: p.coords.latitude, lng: p.coords.longitude }; 
                    resolve(userLoc);
                },
                err => { resolve(null); }
            );
        } else resolve(null);
    });
}

async function enterApp(role) {
    document.getElementById('landing-page').classList.remove('active-view');
    document.getElementById('landing-page').classList.add('hidden-view');
    document.getElementById('main-app').classList.remove('hidden-view');
    document.getElementById('main-app').classList.add('active-view');

    const userNav = document.getElementById('user-nav');
    const adminNav = document.getElementById('admin-nav');
    const userActions = document.getElementById('user-actions');

    if(role === 'admin') {
        if(userNav) userNav.style.display = 'none';
        if(userActions) userActions.style.display = 'none';
        if(adminNav) adminNav.style.display = 'flex';
        navigateTo('admin');
    } else {
        if(userNav) userNav.style.display = 'flex';
        if(userActions) userActions.style.display = 'block';
        if(adminNav) adminNav.style.display = 'none';
        navigateTo('home');
    }
    loadData();
}

async function loadData() {
    try {
        allReports = await getReports();
        updateDashboardStats();
        if(document.getElementById('admin').classList.contains('active')) loadAdminPanel();
        if(document.getElementById('map').classList.contains('active')) refreshMapMarkers(allReports);
    } catch (e) {}
}

function navigateTo(id) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    if(id === 'report') startCamera(); else stopCamera();
    
    if(id === 'map') {
        setTimeout(() => {
            initMap(userLoc?.lat, userLoc?.lng, allReports);
            if(map) map.invalidateSize(); 
        }, 300);
    }
    
    if(id === 'admin') loadAdminPanel();
    if(id === 'home') updateDashboardStats();
    if(id === 'leaderboard') updateGamificationUI();
}

// REAL-TIME AI
async function startCamera() {
    await refreshLocation(); 
    const v = document.getElementById('camera-feed');
    v.style.display='block';
    document.getElementById('image-preview').style.display='none';
    document.getElementById('btn-capture').style.display = 'block';
    document.getElementById('btn-submit-ai').style.display = 'none';

    try { 
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); 
        v.srcObject = stream; 
        isAnalysing = true;
        predictLoop(); 
    } catch(e){ console.log("Camera Blocked"); }
}

async function predictLoop() {
    const v = document.getElementById('camera-feed');
    const label = document.getElementById('ai-live-label');
    if(!isAnalysing || !model || v.style.display === 'none') return;
    if(v.readyState === 4) {
        try {
            const preds = await model.classify(v);
            if(preds.length > 0) label.innerText = `${preds[0].className.split(',')[0]} (${Math.round(preds[0].probability * 100)}%)`;
        } catch(e) {}
    }
    requestAnimationFrame(predictLoop);
}

function stopCamera() { isAnalysing = false; if(stream) stream.getTracks().forEach(t=>t.stop()); }

function takeSnapshot() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    const img = document.getElementById('image-preview');

    canvas.width = video.videoWidth; 
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    img.src = canvas.toDataURL('image/jpeg');
    
    video.style.display = 'none';
    img.style.display = 'block';
    stopCamera();

    document.getElementById('btn-capture').style.display = 'none';
    document.getElementById('btn-submit-ai').style.display = 'block';
}

function processSnapshot() {
    const img = document.getElementById('image-preview');
    const label = document.getElementById('ai-live-label').innerText;
    
    pendingImage = img.src;
    document.getElementById('form-category').innerText = label;
    const lat = userLoc ? userLoc.lat.toFixed(5) : "Unknown";
    const lng = userLoc ? userLoc.lng.toFixed(5) : "Unknown";
    document.getElementById('form-location').innerText = `${lat}, ${lng}`;
    
    if(currentGameType) {
        submitGameProof(label); 
    } else {
        document.getElementById('report-form-modal').classList.add('active');
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const img = document.getElementById('image-preview');
        const video = document.getElementById('camera-feed');
        video.style.display = 'none';
        img.style.display = 'block';
        img.src = ev.target.result;
        stopCamera();
        
        let label = "Analyzed";
        if(model) {
            const preds = await model.classify(img);
            if(preds.length > 0) label = `${preds[0].className.split(',')[0]} (${Math.round(preds[0].probability*100)}%)`;
        }
        
        pendingImage = img.src;
        document.getElementById('form-category').innerText = label;
        document.getElementById('report-form-modal').classList.add('active');
    };
    reader.readAsDataURL(file);
}

async function confirmSubmission() {
    const name = document.getElementById('report-name').value;
    const phone = document.getElementById('report-phone').value;
    const desc = document.getElementById('report-desc').value;
    const category = document.getElementById('form-category').innerText;
    
    if(!name || !phone) return showToast("Contact info required");

    const complaintId = 'CPT-' + Math.floor(10000 + Math.random() * 90000);
    await postReport({
        category, location: userLoc || {lat:0,lng:0}, image: pendingImage,
        contactName: name, contactPhone: phone, description: desc,
        complaintId, status: "Received"
    });

    document.getElementById('report-form-modal').classList.remove('active');
    document.getElementById('success-id').innerText = complaintId;
    document.getElementById('success-modal').classList.add('active');
    loadData();
}

function updateDashboardStats() {
    document.getElementById('total-reports').innerText = allReports.length;
    document.getElementById('resolved-reports').innerText = allReports.filter(r=>r.status==='Resolved').length;
    document.getElementById('pending-reports').innerText = allReports.filter(r=>r.status!=='Resolved').length;
    document.getElementById('user-points').innerText = allReports.length * 50;
    
    const list = document.getElementById('active-reports-list');
    const active = allReports.filter(r=>r.status!=='Resolved').slice(0,3);
    list.innerHTML = active.length ? active.map(r => `
        <div class="update-card" style="border-left: 4px solid ${getStatusColor(r.status)}">
            <img src="${r.image}" class="update-img" onerror="this.src='assets/default.png'">
            <div>
                <div style="font-weight:700;">${r.category}</div>
                <div style="font-size:0.85rem; color:var(--secondary);">${r.complaintId} • ${r.status}</div>
            </div>
        </div>`).join('') : '<p style="opacity:0.6;">No active issues.</p>';
}

// --- ADMIN PANEL (With Delete Button) ---
function loadAdminPanel() {
    const tbody = document.getElementById('admin-tbody');
    if(!tbody) return;
    tbody.innerHTML = allReports.map(r => {
        let locLink = r.location && r.location.lat ? `https://www.google.com/maps/search/?api=1&query=${r.location.lat},${r.location.lng}` : '#';
        return `
        <tr>
            <td><img src="${r.image}" style="width:40px; height:40px; object-fit:cover; border-radius:6px;" onerror="this.src='assets/default.png'"></td>
            <td><b>${r.category}</b><br><small>${r.description || ''}</small></td>
            <td>${r.contactName || 'Anon'}<br><a href="${locLink}" target="_blank" class="map-link-btn">Map</a></td>
            <td><div class="vote-badge">👍 ${r.upvotes||0} 👎 ${r.downvotes||0}</div></td>
            <td><span style="padding:4px 8px; border-radius:4px; font-size:0.8rem; background:${getStatusBg(r.status)}; color:${getStatusColor(r.status)}">${r.status}</span></td>
            <td>
                <div style="display:flex; gap:5px; align-items:center;">
                    <select onchange="updateStatus('${r._id}', this.value)" class="status-select">
                        <option ${r.status==='Received'?'selected':''}>Received</option>
                        <option ${r.status==='In Progress'?'selected':''}>In Progress</option>
                        <option ${r.status==='Resolved'?'selected':''}>Resolved</option>
                    </select>
                    <button class="btn-icon-danger" onclick="deleteReport('${r._id}')">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function updateStatus(id, status) {
    await fetch(`http://localhost:5000/api/reports/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status}) });
    loadData();
}

// --- GLOBAL FUNCTIONS (Exposed for HTML buttons) ---
window.handleVote = async function(id, type) {
    await voteReport(id, type);
    loadData(); // Refresh UI instantly
};

window.deleteReport = async function(id) {
    if(confirm("Are you sure you want to PERMANENTLY delete this report?")) {
        await deleteReportAPI(id);
        showToast("Report Deleted Forever");
        loadData();
    }
};

function openServiceModal(type) {
    currentServiceType = type;
    document.getElementById('service-modal-title').innerText = type + " Request";
    document.getElementById('service-form-content').innerHTML = `
        <div class="form-row">
            <div class="form-group half"><label>Name</label><input type="text" id="srv-name" placeholder="Name"></div>
            <div class="form-group half"><label>Mobile No</label><input type="tel" id="srv-phone" placeholder="Mobile"></div>
        </div>
        <div class="form-group">
            <label>Location</label>
            <div style="display:flex; gap:10px;">
                <input type="text" id="srv-location" readonly placeholder="Click fetch ->" style="flex:1;">
                <button class="btn-secondary" onclick="fetchServiceLocation()" style="width:auto; padding:8px;"><span class="material-icons-round">my_location</span></button>
            </div>
        </div>
        <div class="form-group"><label>Description</label><textarea id="srv-desc" rows="3"></textarea></div>
    `;
    document.getElementById('service-modal').classList.add('active');
}

async function fetchServiceLocation() {
    const locBox = document.getElementById('srv-location');
    locBox.value = "Fetching...";
    await refreshLocation();
    if(userLoc) locBox.value = `${userLoc.lat.toFixed(5)}, ${userLoc.lng.toFixed(5)}`;
    else locBox.value = "Failed. Enable GPS.";
}

async function submitServiceForm() {
    const desc = document.getElementById('srv-desc').value;
    const name = document.getElementById('srv-name').value;
    const phone = document.getElementById('srv-phone').value;
    const locTxt = document.getElementById('srv-location').value;
    
    if(!name || !phone || !locTxt || locTxt.includes("Fail")) return showToast("All fields required");

    await postReport({
        category: "Service: " + currentServiceType, location: userLoc, 
        complaintId: 'SRV-'+Math.floor(Math.random()*10000), status: "Received", 
        description: desc, contactName: name, contactPhone: phone, image: 'assets/default.png'
    });
    document.getElementById('service-modal').classList.remove('active');
    showToast("Requested!");
    loadData();
}

function triggerGameProof(gameName) {
    currentGameType = gameName;
    navigateTo('report'); 
    showToast(`Capture photo for: ${gameName}`);
}

async function submitGameProof(aiLabel) {
    const complaintId = 'GAME-' + Math.floor(Math.random()*10000);
    await postReport({
        category: `Proof: ${currentGameType}`, location: userLoc || {lat:0,lng:0}, image: pendingImage,
        contactName: "Gamer", contactPhone: "N/A", description: `Proof. AI: ${aiLabel}`,
        complaintId, status: "Received"
    });
    currentGameType = null;
    showToast("Proof Uploaded! + Points");
    navigateTo('leaderboard');
    const dots = document.querySelectorAll('.dot.empty');
    if(dots.length > 0) dots[0].classList.remove('empty').add('filled');
}

function getStatusColor(s){return s==='Resolved'?'#166534':(s==='In Progress'?'#9a3412':'#991b1b');}
function getStatusBg(s){return s==='Resolved'?'#dcfce7':(s==='In Progress'?'#ffedd5':'#fee2e2');}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function closeSuccessModal() { document.getElementById('success-modal').classList.remove('active'); navigateTo('home'); }
function showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); }

let mockLeaderboardData = [{user:"Hero1",points:1200},{user:"You",points:0}];
function initMockLeaderboard(){ /* ... */ }
function updateGamificationUI(){ document.getElementById('user-points').innerText = allReports.length * 50; }
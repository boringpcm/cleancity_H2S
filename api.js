const API_URL = 'http://localhost:5000/api';

async function postReport(data) {
    try {
        const res = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { console.error(e); }
}

async function getReports() {
    try {
        const res = await fetch(`${API_URL}/reports`);
        return await res.json();
    } catch(e) { return []; }
}

async function voteReport(id, type) {
    try {
        await fetch(`${API_URL}/reports/${id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
    } catch (e) { console.error(e); }
}

// --- ADDED: DELETE FUNCTION ---
async function deleteReportAPI(id) {
    try {
        const res = await fetch(`${API_URL}/reports/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    } catch (e) { console.error(e); return { error: true }; }
}
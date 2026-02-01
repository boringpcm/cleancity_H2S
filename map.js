let map = null;

function initMap(lat, lng, reports = []) {
    if (map) {
        refreshMapMarkers(reports);
        return;
    }
    
    const startLat = lat || 20.5937;
    const startLng = lng || 78.9629;

    map = L.map('leaflet-map').setView([startLat, startLng], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    refreshMapMarkers(reports);
}

function refreshMapMarkers(reports) {
    if(!map) return;
    
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const markers = []; // ADDED: Array to collect marker coordinates

    reports.forEach(r => {
        if (r.location && r.location.lat) {
            // ADDED: Use global handleVote instead of direct API call for UI refresh
            const popupContent = `
                <div style="text-align:center;">
                    <b>${r.category}</b><br>
                    <small>${r.status}</small><br>
                    <div style="margin-top:5px; display:flex; gap:10px; justify-content:center;">
                        <button onclick="handleVote('${r._id}', 'up')" style="border:1px solid #ddd; background:white; cursor:pointer; padding:2px 6px; border-radius:4px;">👍 ${r.upvotes||0}</button>
                        <button onclick="handleVote('${r._id}', 'down')" style="border:1px solid #ddd; background:white; cursor:pointer; padding:2px 6px; border-radius:4px;">👎 ${r.downvotes||0}</button>
                    </div>
                </div>
            `;
            const marker = L.marker([r.location.lat, r.location.lng]).addTo(map).bindPopup(popupContent);
            markers.push([r.location.lat, r.location.lng]); // ADDED: Collect coordinate
        }
    });

    // ADDED: Auto-zoom to fit all markers if any exist
    if (markers.length > 0) {
        map.fitBounds(markers, { padding: [50, 50] });
    }
}
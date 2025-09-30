// Initialize the map centered on Afghanistan
const map = L.map('map').setView([33.9391, 67.7100], 6);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Helper function to create health facility icon with emoji
function createHealthFacilityIcon(color, symbol) {
    return L.divIcon({
        className: 'health-facility-icon',
        html: `
            <div style="
                background-color: ${color};
                color: white;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 16px;
                border: 2px solid #8B0000;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ">${symbol}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

// Define symbols and colors for health facility types
const healthFacilityConfig = {
    'Primary Health Care Centres': { symbol: '🏥', color: '#1e3a8a' },
    'Hospitals': { symbol: '🏨', color: '#fbbf24' },
    'Blood Centres': { symbol: '🩸', color: '#8b0000' },
    'Ambulance Stations': { symbol: '🚑', color: '#166534' },
    'Pharmacies': { symbol: '💊', color: '#84cc16' },
    'Training Facilities': { symbol: '🎓', color: '#ea580c' },
    'Specialized Services': { symbol: '🔬', color: '#a16207' },
    'Residential Facilities': { symbol: '🏠', color: '#7dd3fc' },
    'Other': { symbol: '⚕️', color: '#374151' }
};

// Create icon map
const iconMap = {};
for (const [type, config] of Object.entries(healthFacilityConfig)) {
    iconMap[type] = createHealthFacilityIcon(config.color, config.symbol);
}

// School icon with pencil emoji
const schoolIcon = L.divIcon({
    className: 'health-facility-icon',
    html: `
        <div style="
            background-color: #1976D2;
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            border: 2px solid #0d47a1;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">✏️</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

// Create layer groups for schools and health facilities
const schoolsLayer = L.layerGroup();
const healthFacilitiesLayer = L.layerGroup();

// Load and display schools
fetch('schools_AFG.json')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data) {
            data.data.forEach(school => {
                if (school.latitude && school.longitude) {
                    const marker = L.marker([school.latitude, school.longitude], {
                        icon: schoolIcon
                    });

                    marker.bindPopup(`
                        <strong>${school.school_name || 'Unknown School'}</strong><br>
                        Education Level: ${school.education_level || 'N/A'}<br>
                        Coordinates: ${school.latitude.toFixed(6)}, ${school.longitude.toFixed(6)}
                    `);

                    marker.addTo(schoolsLayer);
                }
            });
            console.log(`Loaded ${data.data.length} schools`);
        }
    })
    .catch(error => console.error('Error loading schools:', error));

// Load and display health facilities
fetch('health_facilities.json')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data) {
            data.data.forEach(facility => {
                if (facility.Latitude && facility.Longitude) {
                    const facilityType = facility['Health facility type'] || 'Other';
                    const icon = iconMap[facilityType] || iconMap['Other'];

                    const marker = L.marker([facility.Latitude, facility.Longitude], {
                        icon: icon
                    });

                    marker.bindPopup(`
                        <strong>${facility['Facility name'] || 'Unknown Facility'}</strong><br>
                        Type: ${facilityType}<br>
                        Country: ${facility.Country || 'N/A'}<br>
                        Coordinates: ${facility.Latitude.toFixed(6)}, ${facility.Longitude.toFixed(6)}
                    `);

                    marker.addTo(healthFacilitiesLayer);
                }
            });
            console.log(`Loaded ${data.data.length} health facilities`);
        }
    })
    .catch(error => console.error('Error loading health facilities:', error));

// Add both layers to the map by default
schoolsLayer.addTo(map);
healthFacilitiesLayer.addTo(map);

// Add layer control
const overlays = {
    'Schools': schoolsLayer,
    'Health Facilities': healthFacilitiesLayer
};

L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// Add legend
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = '<h4>Legend</h4>';

    // Schools legend
    div.innerHTML += '<div class="legend-item"><span style="font-size: 18px; margin-right: 5px;">✏️</span> Schools</div>';

    // Health facilities legend
    div.innerHTML += '<br><strong style="font-size: 12px;">Health Facilities:</strong><br>';

    Object.entries(healthFacilityConfig).forEach(([type, config]) => {
        div.innerHTML += `<div class="legend-item"><span style="font-size: 18px; margin-right: 5px;">${config.symbol}</span> ${type}</div>`;
    });

    return div;
};

legend.addTo(map);

// Add info control
const info = L.control({ position: 'topleft' });

info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this._div.innerHTML = '<h4>Schools & Health Facilities</h4>Use the layer control to toggle visibility';
    return this._div;
};

info.addTo(map);
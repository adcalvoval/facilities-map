// Initialize the map centered on Afghanistan
const map = L.map('map').setView([33.9391, 67.7100], 6);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Define custom icons for health facility types
const iconMap = {
    'Primary Health Care Centres': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#4CAF50;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Hospitals': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#F44336;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Ambulance Stations': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#FF9800;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Blood Centres': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#E91E63;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Pharmacies': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#2196F3;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Specialized Services': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#9C27B0;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Training Facilities': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#FF5722;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Residential Facilities': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#795548;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    }),
    'Other': L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#607D8B;' class='marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    })
};

// School icon (blue)
const schoolIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color:#1976D2;' class='marker-pin'></div>",
    iconSize: [30, 42],
    iconAnchor: [15, 42]
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
    div.innerHTML += '<div class="legend-item"><i style="background:#1976D2; border-radius:50%;"></i> Schools</div>';

    // Health facilities legend
    div.innerHTML += '<br><strong style="font-size: 12px;">Health Facilities:</strong><br>';
    const facilityTypes = [
        ['Primary Health Care Centres', '#4CAF50'],
        ['Hospitals', '#F44336'],
        ['Ambulance Stations', '#FF9800'],
        ['Blood Centres', '#E91E63'],
        ['Pharmacies', '#2196F3'],
        ['Specialized Services', '#9C27B0'],
        ['Training Facilities', '#FF5722'],
        ['Residential Facilities', '#795548'],
        ['Other', '#607D8B']
    ];

    facilityTypes.forEach(([type, color]) => {
        div.innerHTML += `<div class="legend-item"><i style="background:${color}; border-radius:50%;"></i> ${type}</div>`;
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
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
    className: 'school-icon',
    html: `
        <svg width="32" height="32" viewBox="0 0 32 32" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));">
            <polygon points="16,4 28,26 4,26" fill="#64B5F6" stroke="#0d47a1" stroke-width="2"/>
            <text x="16" y="21" text-anchor="middle" font-size="12">✏️</text>
        </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 28]
});

// Create layer groups for schools and health facilities
const schoolsLayer = L.layerGroup();
const healthFacilitiesLayer = L.layerGroup();

// Store all facilities for filtering
const allFacilities = [];
const facilityMarkers = new Map();

// Track active filters
const activeFilters = {
    types: new Set(),
    countries: new Set()
};

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
                    const country = facility.Country || 'Unknown';
                    const icon = iconMap[facilityType] || iconMap['Other'];

                    const marker = L.marker([facility.Latitude, facility.Longitude], {
                        icon: icon
                    });

                    marker.bindPopup(`
                        <strong>${facility['Facility name'] || 'Unknown Facility'}</strong><br>
                        Type: ${facilityType}<br>
                        Country: ${country}<br>
                        Coordinates: ${facility.Latitude.toFixed(6)}, ${facility.Longitude.toFixed(6)}
                    `);

                    // Store facility data
                    const facilityData = {
                        marker: marker,
                        type: facilityType,
                        country: country
                    };

                    allFacilities.push(facilityData);
                    facilityMarkers.set(marker, facilityData);

                    // Add to active filters
                    activeFilters.types.add(facilityType);
                    activeFilters.countries.add(country);

                    marker.addTo(healthFacilitiesLayer);
                }
            });
            console.log(`Loaded ${data.data.length} health facilities`);

            // Initialize filter controls after data is loaded
            initializeFilters();
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

// Initialize filter controls
function initializeFilters() {
    // Create filters container
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';

    // Country dropdown filter
    const countryFilterDiv = document.createElement('div');
    countryFilterDiv.className = 'country-filter-control';

    const countryLabel = document.createElement('label');
    countryLabel.textContent = 'Country:';
    countryLabel.setAttribute('for', 'country-select');

    const countrySelect = document.createElement('select');
    countrySelect.id = 'country-select';

    // Add "All Countries" option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Countries';
    allOption.selected = true;
    countrySelect.appendChild(allOption);

    // Add individual country options
    const sortedCountries = Array.from(activeFilters.countries).sort();
    sortedCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });

    countryFilterDiv.appendChild(countryLabel);
    countryFilterDiv.appendChild(countrySelect);

    // Facility types checkbox filter
    const typesFilterDiv = document.createElement('div');
    typesFilterDiv.className = 'facility-types-control';

    const typesHeader = document.createElement('h5');
    typesHeader.textContent = 'Facility Types';
    typesFilterDiv.appendChild(typesHeader);

    const typesList = document.createElement('div');
    typesList.className = 'facility-types-list';

    // Add Select All / Remove All buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'filter-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.type-filter').forEach(cb => {
            cb.checked = true;
        });
        applyFilters();
    });

    const removeAllBtn = document.createElement('button');
    removeAllBtn.textContent = 'Remove All';
    removeAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.type-filter').forEach(cb => {
            cb.checked = false;
        });
        applyFilters();
    });

    actionsDiv.appendChild(selectAllBtn);
    actionsDiv.appendChild(removeAllBtn);
    typesList.appendChild(actionsDiv);

    const sortedTypes = Array.from(activeFilters.types).sort();
    sortedTypes.forEach(type => {
        const filterItem = document.createElement('div');
        filterItem.className = 'filter-item';

        const label = document.createElement('label');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'type-filter';
        checkbox.value = type;
        checkbox.checked = true;

        const span = document.createElement('span');
        span.textContent = type;

        label.appendChild(checkbox);
        label.appendChild(span);
        filterItem.appendChild(label);
        typesList.appendChild(filterItem);
    });

    typesFilterDiv.appendChild(typesList);

    // Add collapse/expand functionality
    typesHeader.addEventListener('click', () => {
        typesHeader.classList.toggle('collapsed');
        typesList.classList.toggle('collapsed');
    });

    // Add both filters to container
    filtersContainer.appendChild(countryFilterDiv);
    filtersContainer.appendChild(typesFilterDiv);

    // Add container to map
    document.getElementById('map').appendChild(filtersContainer);

    // Add event listeners
    countrySelect.addEventListener('change', () => {
        applyFilters();
        zoomToCountry();
    });

    document.querySelectorAll('.type-filter').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}

// Apply filters to health facilities
function applyFilters() {
    const selectedTypes = new Set();

    // Get selected facility types from checkboxes
    document.querySelectorAll('.type-filter:checked').forEach(checkbox => {
        selectedTypes.add(checkbox.value);
    });

    // Get selected country from dropdown
    const countrySelect = document.getElementById('country-select');
    const selectedCountry = countrySelect ? countrySelect.value : 'all';

    // Update facility visibility
    allFacilities.forEach(facilityData => {
        const showType = selectedTypes.has(facilityData.type);
        const showCountry = selectedCountry === 'all' || facilityData.country === selectedCountry;

        if (showType && showCountry) {
            if (!healthFacilitiesLayer.hasLayer(facilityData.marker)) {
                healthFacilitiesLayer.addLayer(facilityData.marker);
            }
        } else {
            if (healthFacilitiesLayer.hasLayer(facilityData.marker)) {
                healthFacilitiesLayer.removeLayer(facilityData.marker);
            }
        }
    });
}

// Zoom map to selected country
function zoomToCountry() {
    const countrySelect = document.getElementById('country-select');
    const selectedCountry = countrySelect ? countrySelect.value : 'all';

    if (selectedCountry === 'all') {
        // Reset to default view (Afghanistan)
        map.setView([33.9391, 67.7100], 6);
        return;
    }

    // Get all facilities for the selected country
    const countryFacilities = allFacilities.filter(f => f.country === selectedCountry);

    if (countryFacilities.length > 0) {
        // Create a bounds object from all facility markers in the country
        const bounds = L.latLngBounds(
            countryFacilities.map(f => f.marker.getLatLng())
        );

        // Fit the map to show all facilities in the selected country
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}
// Initialize the map with world view
const map = L.map('map', {
    zoomControl: false,
    minZoom: 2
}).setView([20, 0], 2);

// Add zoom control to top right
L.control.zoom({
    position: 'topright'
}).addTo(map);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: false,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Ensure map renders correctly
setTimeout(() => {
    map.invalidateSize();
}, 100);

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
                position: relative;
                z-index: 1000;
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
const schoolsLayer = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});
const healthFacilitiesLayer = L.layerGroup();

// Store all facilities for filtering
const allFacilities = [];
const facilityMarkers = new Map();
const facilityBuffers = new Map();
const allSchools = [];
const loadedSchoolCountries = new Set();

// Track active filters
const activeFilters = {
    types: new Set(),
    countries: new Set()
};

// Buffer radius in kilometers (default 5km)
let bufferRadius = 5;

// API configuration
const API_BASE_URL = 'https://uni-ooi-giga-maps-service.azurewebsites.net/api/v1/schools_location';
const API_TOKEN = '..us4I8UK0p5XI6Vh412AxsDKzy5WGW5.#hKEL21FiKe6mhGe4uC3uwMntW0ezyNWO3g61HdknRSjyiTH*eQTnWSuA2weTX9Pgw32ERwiVm8PBuqfPsuEMmAO*JDtIueiz0huD4eIrBTaqEm7#Ht3E91d3Kxm.pRzIzbX#VTP6JDm292wI2A#iWA5LSWH8x*.RxEXpChNqiRsibWRMz0FWzZ9eHn4qL7dxwrKp74iDhvpyI6fISZgi3W*#jcwpDs4VvfNp9d';

// Country name to ISO3 code mapping
const countryNameToISO3 = {
    'Afghanistan': 'AFG',
    'Algeria': 'DZA',
    'Angola': 'AGO',
    'Antigua and Barbuda': 'ATG',
    'Argentina': 'ARG',
    'Australia': 'AUS',
    'Austria': 'AUT',
    'Bangladesh': 'BGD',
    'Barbados': 'BRB',
    'Belgium': 'BEL',
    'Benin': 'BEN',
    'Bolivia': 'BOL',
    'Bosnia and Herzegovina': 'BIH',
    'Botswana': 'BWA',
    'Brazil': 'BRA',
    'Burkina Faso': 'BFA',
    'Burundi': 'BDI',
    'Cabo Verde': 'CPV',
    'Cameroon': 'CMR',
    'Canada': 'CAN',
    'Central African Republic': 'CAF',
    'Chad': 'TCD',
    'Chile': 'CHL',
    'China': 'CHN',
    'Colombia': 'COL',
    'Congo': 'COG',
    'Costa Rica': 'CRI',
    'Cuba': 'CUB',
    'Czech Republic': 'CZE',
    'Côte d\'Ivoire': 'CIV',
    'Democratic Republic of Congo': 'COD',
    'Dominica': 'DMA',
    'Dominican Republic': 'DOM',
    'Ecuador': 'ECU',
    'Egypt': 'EGY',
    'El Salvador': 'SLV',
    'Equatorial Guinea': 'GNQ',
    'Eswatini, Kingdom of': 'SWZ',
    'Ethiopia': 'ETH',
    'Finland': 'FIN',
    'France': 'FRA',
    'Gabon': 'GAB',
    'Gambia, Republic of The': 'GMB',
    'Georgia': 'GEO',
    'Germany': 'DEU',
    'Ghana': 'GHA',
    'Greece': 'GRC',
    'Guatemala': 'GTM',
    'Guinea': 'GIN',
    'Guyana': 'GUY',
    'Haiti': 'HTI',
    'Honduras': 'HND',
    'Hungary': 'HUN',
    'India': 'IND',
    'Indonesia': 'IDN',
    'Iran, Islamic Republic of': 'IRN',
    'Iraq': 'IRQ',
    'Israel': 'ISR',
    'Italy': 'ITA',
    'Japan': 'JPN',
    'Jordan': 'JOR',
    'Kazakhstan': 'KAZ',
    'Kenya': 'KEN',
    'Kyrgyzstan': 'KGZ',
    'Lao People\'s Democratic Republic': 'LAO',
    'Latvia': 'LVA',
    'Lebanon': 'LBN',
    'Lesotho': 'LSO',
    'Liberia': 'LBR',
    'Libya': 'LBY',
    'Luxembourg': 'LUX',
    'Madagascar': 'MDG',
    'Mali': 'MLI',
    'Mauritius': 'MUS',
    'Mexico': 'MEX',
    'Mongolia': 'MNG',
    'Morocco': 'MAR',
    'Myanmar': 'MMR',
    'Nepal': 'NPL',
    'Niger': 'NER',
    'Nigeria': 'NGA',
    'Norway': 'NOR',
    'Pakistan': 'PAK',
    'Palestine': 'PSE',
    'Panama': 'PAN',
    'Paraguay': 'PRY',
    'Peru': 'PER',
    'Philippines': 'PHL',
    'Poland': 'POL',
    'Portugal': 'PRT',
    'Qatar': 'QAT',
    'Republic of Korea': 'KOR',
    'Romania': 'ROU',
    'Russian Federation': 'RUS',
    'Rwanda': 'RWA',
    'Saint Lucia': 'LCA',
    'Saudi Arabia': 'SAU',
    'Serbia': 'SRB',
    'Seychelles': 'SYC',
    'Sierra Leone': 'SLE',
    'Singapore': 'SGP',
    'Slovakia': 'SVK',
    'Slovenia': 'SVN',
    'Somalia': 'SOM',
    'South Sudan': 'SSD',
    'Spain': 'ESP',
    'Sudan': 'SDN',
    'Suriname': 'SUR',
    'Sweden': 'SWE',
    'Switzerland': 'CHE',
    'Syrian Arab Republic': 'SYR',
    'Tanzania, United Republic of': 'TZA',
    'Thailand': 'THA',
    'Timor-Leste': 'TLS',
    'Togo': 'TGO',
    'Trinidad and Tobago': 'TTO',
    'Turkey': 'TUR',
    'Uganda': 'UGA',
    'United States': 'USA',
    'Uruguay': 'URY',
    'Uzbekistan': 'UZB',
    'Venezuela': 'VEN',
    'Yemen': 'YEM',
    'Zimbabwe': 'ZWE',
    // Legacy mappings for schools data
    'Anguilla': 'AIA',
    'Montserrat': 'MSR',
    'Virgin Islands, British': 'VGB',
    'Grenada': 'GRD',
    'Saint Vincent and the Grenadines': 'VCT',
    'Saint Kitts and Nevis': 'KNA',
    'Mauritania': 'MRT'
};

// Function to show/hide loading indicator
function showLoading(message, subtext) {
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingSubtext = document.getElementById('loading-subtext');
    if (loadingIndicator) {
        loadingIndicator.classList.add('active');
        if (loadingSubtext && subtext) {
            loadingSubtext.textContent = subtext;
        }
    }
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('active');
    }
}

// Function to fetch schools from API for a specific country with pagination
async function fetchSchoolsForCountry(countryName) {
    // Convert country name to ISO3 code
    console.log(`Looking up country: "${countryName}"`);
    const countryCode = countryNameToISO3[countryName] || countryName;
    console.log(`Mapped to ISO3: "${countryCode}"`);
    console.log(`Loaded countries set:`, Array.from(loadedSchoolCountries));
    console.log(`Has ${countryCode}?`, loadedSchoolCountries.has(countryCode));

    if (loadedSchoolCountries.has(countryCode)) {
        console.log(`Schools for ${countryName} (${countryCode}) already loaded - skipping fetch`);
        console.log(`Current schools count: ${allSchools.filter(s => s.country === countryCode).length}`);
        return;
    }

    console.log(`Starting fresh fetch for ${countryName} (${countryCode})`);

    // Show loading indicator
    showLoading('Loading Schools...', `Fetching schools for ${countryName}`);

    try {
        let page = 1; // API uses 1-indexed pages, not 0-indexed
        const size = 1000;
        let hasMore = true;
        let totalLoaded = 0;

        console.log(`Fetching schools for ${countryName} (${countryCode})...`);

        while (hasMore) {
            const url = `${API_BASE_URL}/country/${countryCode}?page=${page}&size=${size}`;
            console.log(`Fetching: ${url}`);

            let response;
            try {
                response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${API_TOKEN}`
                    }
                });
                console.log(`Response received: ${response.status} ${response.statusText}`);
            } catch (fetchError) {
                console.error(`Fetch error for ${countryCode}:`, fetchError);
                break;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to fetch schools for ${countryCode}: ${response.status}`, errorText);
                break;
            }

            const data = await response.json();
            console.log(`API Response for ${countryCode} page ${page}:`, data);
            console.log(`Response keys:`, Object.keys(data));

            // Handle different possible response structures
            let schools = [];
            if (Array.isArray(data)) {
                schools = data;
            } else if (data.data && Array.isArray(data.data)) {
                schools = data.data;
            } else if (data.content && Array.isArray(data.content)) {
                schools = data.content;
            }

            console.log(`Extracted ${schools.length} schools from response`);

            if (schools.length === 0) {
                hasMore = false;
                break;
            }

            // Add schools to map
            schools.forEach(school => {
                if (school.latitude && school.longitude) {
                    const marker = L.marker([school.latitude, school.longitude], {
                        icon: schoolIcon
                    });

                    marker.bindPopup(`
                        <strong>${school.school_name || 'Unknown School'}</strong><br>
                        Education Level: ${school.education_level || 'N/A'}<br>
                        Country: ${school.country_iso3_code || countryCode}<br>
                        Coordinates: ${school.latitude.toFixed(6)}, ${school.longitude.toFixed(6)}
                    `);

                    allSchools.push({
                        lat: school.latitude,
                        lng: school.longitude,
                        marker: marker,
                        country: school.country_iso3_code || countryCode
                    });

                    // Add to layer if Schools layer is currently visible
                    if (map.hasLayer(schoolsLayer)) {
                        marker.addTo(schoolsLayer);
                    }
                }
            });

            totalLoaded += schools.length;
            console.log(`Loaded page ${page} for ${countryCode}: ${schools.length} schools (total: ${totalLoaded})`);

            // Update loading indicator with progress
            showLoading('Loading Schools...', `Loaded ${totalLoaded} schools for ${countryName}...`);

            // Check if there are more pages
            if (schools.length < size) {
                hasMore = false;
            } else {
                page++;
            }
        }

        loadedSchoolCountries.add(countryCode);
        console.log(`Finished loading ${totalLoaded} schools for ${countryCode}`);

        // Update schools count after loading
        updateSchoolsCount();

        // Hide loading indicator
        hideLoading();

    } catch (error) {
        console.error(`Error fetching schools for ${countryCode}:`, error);
        console.error('Error stack:', error.stack);
        alert(`Error loading schools for ${countryName}: ${error.message}`);
        hideLoading();
    }
}

// Don't load any schools initially - wait for user to select a country or toggle Schools layer

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
                        icon: icon,
                        zIndexOffset: 1000  // Ensure health facilities appear above schools
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

                    // Create buffer circle
                    const buffer = L.circle([facility.Latitude, facility.Longitude], {
                        radius: bufferRadius * 1000, // Convert km to meters
                        color: '#3388ff',
                        fillColor: '#3388ff',
                        fillOpacity: 0.1,
                        weight: 1
                    });

                    facilityBuffers.set(marker, buffer);
                    buffer.addTo(healthFacilitiesLayer);

                    marker.addTo(healthFacilitiesLayer);
                }
            });
            console.log(`Loaded ${data.data.length} health facilities`);

            // Initialize filters after data is loaded
            initializeFilters();

            // Set initial map view to show all facilities and schools
            const allPoints = [];
            allFacilities.forEach(f => allPoints.push(f.marker.getLatLng()));
            allSchools.forEach(s => allPoints.push(L.latLng(s.lat, s.lng)));

            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    })
    .catch(error => console.error('Error loading health facilities:', error));

// Don't add layers to the map by default (user must check them)
// schoolsLayer and healthFacilitiesLayer will be added only when user enables them

// Add layer control
const overlays = {
    'Schools': schoolsLayer,
    'Health Facilities': healthFacilitiesLayer
};

const layerControl = L.control.layers(null, overlays, {
    collapsed: false,
    position: 'bottomleft'
}).addTo(map);

// Listen for layer add/remove events to handle visibility correctly
map.on('overlayadd', async function(e) {
    if (e.name === 'Schools') {
        console.log('Schools layer toggled ON');

        // Check if we need to load schools for current country
        const countrySelect = document.getElementById('country-select');
        const selectedCountry = countrySelect ? countrySelect.value : 'all';

        if (selectedCountry !== 'all') {
            const countryISO3 = countryNameToISO3[selectedCountry] || selectedCountry;
            if (!loadedSchoolCountries.has(countryISO3)) {
                console.log(`Loading schools for ${selectedCountry}...`);
                await fetchSchoolsForCountry(selectedCountry);
            }
        }

        // Show loading indicator while adding markers
        showLoading('Adding Schools to Map...', `Displaying ${allSchools.length} schools`);

        // Add all schools to layer in batch for better performance with clustering
        const markersToAdd = allSchools
            .filter(schoolData => !schoolsLayer.hasLayer(schoolData.marker))
            .map(schoolData => schoolData.marker);

        schoolsLayer.addLayers(markersToAdd);
        console.log(`Added ${markersToAdd.length} schools to layer`);
        updateSchoolsCount();

        // Hide loading indicator
        hideLoading();
    }
});

map.on('overlayremove', function(e) {
    if (e.name === 'Schools') {
        console.log('Schools layer toggled OFF');
        // Remove all schools from the layer
        allSchools.forEach(schoolData => {
            if (schoolsLayer.hasLayer(schoolData.marker)) {
                schoolsLayer.removeLayer(schoolData.marker);
            }
        });
    }
});

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

    // Add individual country options from health facilities
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
    typesHeader.className = 'collapsed'; // Start collapsed
    typesFilterDiv.appendChild(typesHeader);

    const typesList = document.createElement('div');
    typesList.className = 'facility-types-list collapsed'; // Start collapsed

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

    // Buffer radius slider control
    const bufferControlDiv = document.createElement('div');
    bufferControlDiv.className = 'buffer-control';

    const bufferLabel = document.createElement('label');
    bufferLabel.textContent = 'Buffer Radius';
    bufferLabel.setAttribute('for', 'buffer-slider');

    const bufferSlider = document.createElement('input');
    bufferSlider.type = 'range';
    bufferSlider.id = 'buffer-slider';
    bufferSlider.min = '0';
    bufferSlider.max = '500';
    bufferSlider.value = '5';
    bufferSlider.step = '5';

    const bufferValue = document.createElement('div');
    bufferValue.className = 'buffer-value';
    bufferValue.textContent = '5 km';

    bufferControlDiv.appendChild(bufferLabel);
    bufferControlDiv.appendChild(bufferSlider);
    bufferControlDiv.appendChild(bufferValue);

    // Schools IN buffer counter
    const schoolsCounterDiv = document.createElement('div');
    schoolsCounterDiv.className = 'schools-counter';
    schoolsCounterDiv.id = 'schools-counter';

    const counterLabel = document.createElement('div');
    counterLabel.textContent = 'Schools in Buffer';

    const counterValue = document.createElement('span');
    counterValue.className = 'count';
    counterValue.id = 'schools-count';
    counterValue.textContent = '0';

    schoolsCounterDiv.appendChild(counterLabel);
    schoolsCounterDiv.appendChild(counterValue);

    // Schools OUTSIDE buffer counter
    const schoolsOutsideCounterDiv = document.createElement('div');
    schoolsOutsideCounterDiv.className = 'schools-outside-counter';
    schoolsOutsideCounterDiv.id = 'schools-outside-counter';

    const outsideCounterLabel = document.createElement('div');
    outsideCounterLabel.textContent = 'Schools Outside Buffer';

    const outsideCounterValue = document.createElement('span');
    outsideCounterValue.className = 'count';
    outsideCounterValue.id = 'schools-outside-count';
    outsideCounterValue.textContent = '0';

    schoolsOutsideCounterDiv.appendChild(outsideCounterLabel);
    schoolsOutsideCounterDiv.appendChild(outsideCounterValue);

    // Add all controls to container
    filtersContainer.appendChild(countryFilterDiv);
    filtersContainer.appendChild(typesFilterDiv);
    filtersContainer.appendChild(bufferControlDiv);
    filtersContainer.appendChild(schoolsCounterDiv);
    filtersContainer.appendChild(schoolsOutsideCounterDiv);

    // Add container to map
    document.getElementById('map').appendChild(filtersContainer);

    // Initial count
    updateSchoolsCount();

    // Add event listeners
    countrySelect.addEventListener('change', async () => {
        const selectedCountry = countrySelect.value;

        // Fetch schools for selected country if not "all"
        if (selectedCountry !== 'all') {
            const countryISO3 = countryNameToISO3[selectedCountry] || selectedCountry;
            if (!loadedSchoolCountries.has(countryISO3)) {
                await fetchSchoolsForCountry(selectedCountry);
            }
        }

        applyFilters();
        zoomToCountry();
        updateCountryStats();
    });

    document.querySelectorAll('.type-filter').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    // Buffer slider event listener
    bufferSlider.addEventListener('input', (e) => {
        bufferRadius = parseFloat(e.target.value);
        bufferValue.textContent = `${bufferRadius} km`;
        updateBuffers();
        updateSchoolsCount();
    });
}

// Apply filters to health facilities and schools
function applyFilters() {
    const selectedTypes = new Set();

    // Get selected facility types from checkboxes
    document.querySelectorAll('.type-filter:checked').forEach(checkbox => {
        selectedTypes.add(checkbox.value);
    });

    // Get selected country from dropdown
    const countrySelect = document.getElementById('country-select');
    const selectedCountry = countrySelect ? countrySelect.value : 'all';

    // Update facility and buffer visibility
    allFacilities.forEach(facilityData => {
        const showType = selectedTypes.has(facilityData.type);
        const showCountry = selectedCountry === 'all' || facilityData.country === selectedCountry;

        if (showType && showCountry) {
            if (!healthFacilitiesLayer.hasLayer(facilityData.marker)) {
                healthFacilitiesLayer.addLayer(facilityData.marker);
            }
            // Show buffer
            const buffer = facilityBuffers.get(facilityData.marker);
            if (buffer && !healthFacilitiesLayer.hasLayer(buffer)) {
                healthFacilitiesLayer.addLayer(buffer);
            }
        } else {
            if (healthFacilitiesLayer.hasLayer(facilityData.marker)) {
                healthFacilitiesLayer.removeLayer(facilityData.marker);
            }
            // Hide buffer
            const buffer = facilityBuffers.get(facilityData.marker);
            if (buffer && healthFacilitiesLayer.hasLayer(buffer)) {
                healthFacilitiesLayer.removeLayer(buffer);
            }
        }
    });

    // Update schools count after filter changes (schools are not filtered by country)
    updateSchoolsCount();
}

// Zoom map to selected country
function zoomToCountry() {
    const countrySelect = document.getElementById('country-select');
    const selectedCountry = countrySelect ? countrySelect.value : 'all';

    const allPoints = [];

    if (selectedCountry === 'all') {
        // Add all facilities
        allFacilities.forEach(f => allPoints.push(f.marker.getLatLng()));
        // Add all schools
        allSchools.forEach(s => allPoints.push(L.latLng(s.lat, s.lng)));
    } else {
        // Convert country name to ISO3 for school comparison
        const countryISO3 = countryNameToISO3[selectedCountry] || selectedCountry;

        // Add facilities for selected country
        allFacilities
            .filter(f => f.country === selectedCountry)
            .forEach(f => allPoints.push(f.marker.getLatLng()));

        // Add schools for selected country (schools use ISO3 codes)
        allSchools
            .filter(s => s.country === countryISO3)
            .forEach(s => allPoints.push(L.latLng(s.lat, s.lng)));
    }

    if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });
        console.log(`Zoomed to ${selectedCountry} with ${allPoints.length} points`);
    } else {
        console.log(`No points found for ${selectedCountry}`);
    }
}

// Update buffer radius for all facilities
function updateBuffers() {
    facilityBuffers.forEach((buffer, marker) => {
        buffer.setRadius(bufferRadius * 1000); // Convert km to meters
    });
}

// Calculate distance between two points in kilometers using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Update country statistics box
function updateCountryStats() {
    const countrySelect = document.getElementById('country-select');
    const selectedCountry = countrySelect ? countrySelect.value : 'all';
    const statsBox = document.getElementById('country-stats');
    const instructionsBox = document.getElementById('instructions-box');

    if (selectedCountry === 'all') {
        statsBox.classList.remove('active');
        if (instructionsBox) {
            instructionsBox.style.display = 'block';
        }
        return;
    }

    // Hide instructions and show stats box
    if (instructionsBox) {
        instructionsBox.style.display = 'none';
    }
    statsBox.classList.add('active');

    // Update country name
    const countryNameElement = document.getElementById('stats-country-name');
    if (countryNameElement) {
        countryNameElement.textContent = `${selectedCountry} Statistics`;
    }

    // Get ISO3 code for school filtering
    const countryISO3 = countryNameToISO3[selectedCountry] || selectedCountry;

    // Count schools for this country
    const countrySchools = allSchools.filter(s => s.country === countryISO3);
    const totalSchools = countrySchools.length;

    // Count facilities for this country
    const countryFacilities = allFacilities.filter(f => f.country === selectedCountry);
    const totalFacilities = countryFacilities.length;

    // Calculate schools within different radii
    const schoolsWithin5km = new Set();
    const schoolsWithin10km = new Set();
    const schoolsWithin50km = new Set();

    countryFacilities.forEach(facilityData => {
        const facilityLatLng = facilityData.marker.getLatLng();

        countrySchools.forEach(school => {
            const distance = calculateDistance(
                facilityLatLng.lat,
                facilityLatLng.lng,
                school.lat,
                school.lng
            );

            const schoolKey = `${school.lat},${school.lng}`;
            if (distance <= 5) schoolsWithin5km.add(schoolKey);
            if (distance <= 10) schoolsWithin10km.add(schoolKey);
            if (distance <= 50) schoolsWithin50km.add(schoolKey);
        });
    });

    // Update the display
    document.getElementById('stats-total-schools').textContent = totalSchools.toLocaleString();
    document.getElementById('stats-total-facilities').textContent = totalFacilities.toLocaleString();
    document.getElementById('stats-within-5km').textContent = `${schoolsWithin5km.size.toLocaleString()} / ${totalSchools.toLocaleString()}`;
    document.getElementById('stats-within-10km').textContent = `${schoolsWithin10km.size.toLocaleString()} / ${totalSchools.toLocaleString()}`;
    document.getElementById('stats-within-50km').textContent = `${schoolsWithin50km.size.toLocaleString()} / ${totalSchools.toLocaleString()}`;
}

// Update the count of schools within and outside buffer zones
function updateSchoolsCount() {
    if (allSchools.length === 0 || allFacilities.length === 0) {
        return;
    }

    const schoolsInBuffer = new Set();

    // Check each school against each visible facility's buffer
    allFacilities.forEach(facilityData => {
        // Only count if facility is currently visible
        if (healthFacilitiesLayer.hasLayer(facilityData.marker)) {
            const facilityLatLng = facilityData.marker.getLatLng();

            allSchools.forEach(school => {
                const distance = calculateDistance(
                    facilityLatLng.lat,
                    facilityLatLng.lng,
                    school.lat,
                    school.lng
                );

                if (distance <= bufferRadius) {
                    schoolsInBuffer.add(`${school.lat},${school.lng}`);
                }
            });
        }
    });

    const schoolsInBufferCount = schoolsInBuffer.size;
    const schoolsOutsideCount = allSchools.length - schoolsInBufferCount;

    // Update "in buffer" counter
    const countElement = document.getElementById('schools-count');
    if (countElement) {
        countElement.textContent = schoolsInBufferCount.toLocaleString();
    }

    // Update "outside buffer" counter
    const outsideCountElement = document.getElementById('schools-outside-count');
    if (outsideCountElement) {
        outsideCountElement.textContent = schoolsOutsideCount.toLocaleString();
    }
}
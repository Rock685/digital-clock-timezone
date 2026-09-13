// State Management
let clocks = [];
let is24HourFormat = false;
let showSeconds = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadSavedClocks();
    startClockUpdate();
});

// Initialize the app
function initializeApp() {
    // Get timezone options
    const timezoneSelect = document.getElementById('timezoneSelect');
    
    // Get all available timezones
    const timezones = Intl.DateTimeFormat().resolvedOptions().timeZone
        ? getAllTimezones()
        : Object.keys(timezoneDatabase);
    
    timezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz;
        option.textContent = tz.replace(/_/g, ' ');
        timezoneSelect.appendChild(option);
    });
    
    // Add default cities
    const defaultCities = [
        { city: 'New York', timezone: 'America/New_York' },
        { city: 'London', timezone: 'Europe/London' },
        { city: 'Tokyo', timezone: 'Asia/Tokyo' }
    ];
    
    // Check if first time visit
    const savedClocks = localStorage.getItem('clocks');
    if (!savedClocks) {
        defaultCities.forEach(c => addClockToList(c.city, c.timezone));
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal controls
    const modal = document.getElementById('modal');
    const addClockBtn = document.getElementById('addClock');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeBtn = document.querySelector('.close');
    const addBtn = document.getElementById('addBtn');
    
    addClockBtn.addEventListener('click', () => modal.classList.add('show'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('show'));
    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
    
    addBtn.addEventListener('click', handleAddClock);
    
    // Format toggle
    document.getElementById('toggleFormat').addEventListener('click', () => {
        is24HourFormat = !is24HourFormat;
        document.getElementById('toggleFormat').textContent = 
            is24HourFormat ? '📅 24-Hour Format' : '📅 12-Hour Format';
        saveClocks();
        updateAllClocks();
    });
    
    // Seconds toggle
    document.getElementById('toggleSecond').addEventListener('click', () => {
        showSeconds = !showSeconds;
        document.getElementById('toggleSecond').textContent = 
            showSeconds ? '⏱️ Hide Seconds' : '⏱️ Show Seconds';
        saveClocks();
        updateAllClocks();
    });
    
    // City input suggestions
    const cityInput = document.getElementById('cityInput');
    const suggestionList = document.getElementById('suggestionList');
    
    cityInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        if (value.length > 0) {
            const suggestions = getCitySuggestions(value);
            if (suggestions.length > 0) {
                suggestionList.innerHTML = suggestions
                    .map(s => `<div class="suggestion-item" data-city="${s.city}" data-tz="${s.timezone}">${s.city} (${s.timezone})</div>`)
                    .join('');
                suggestionList.classList.add('show');
                
                suggestionList.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        cityInput.value = e.target.dataset.city;
                        document.getElementById('timezoneSelect').value = e.target.dataset.tz;
                        suggestionList.classList.remove('show');
                    });
                });
            } else {
                suggestionList.classList.remove('show');
            }
        } else {
            suggestionList.classList.remove('show');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.modal-body')) {
            suggestionList.classList.remove('show');
        }
    });
}

// Handle adding a new clock
function handleAddClock() {
    const cityInput = document.getElementById('cityInput');
    const timezoneSelect = document.getElementById('timezoneSelect');
    const city = cityInput.value.trim();
    const timezone = timezoneSelect.value;
    
    if (!city || !timezone) {
        alert('Please enter a city name and select a timezone');
        return;
    }
    
    // Check for duplicates
    if (clocks.some(c => c.timezone === timezone)) {
        alert('This timezone is already added');
        return;
    }
    
    addClockToList(city, timezone);
    
    // Reset form
    cityInput.value = '';
    timezoneSelect.value = '';
    document.getElementById('modal').classList.remove('show');
    document.getElementById('suggestionList').classList.remove('show');
    
    saveClocks();
}

// Add clock to list
function addClockToList(city, timezone) {
    const clock = { city, timezone, id: Date.now() };
    clocks.push(clock);
    renderClocks();
    updateAllClocks();
}

// Remove clock
function removeClock(id) {
    clocks = clocks.filter(c => c.id !== id);
    renderClocks();
    saveClocks();
}

// Render all clocks
function renderClocks() {
    const clockGrid = document.getElementById('clockGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (clocks.length === 0) {
        clockGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    clockGrid.innerHTML = clocks.map(clock => `
        <div class="clock-card" data-id="${clock.id}">
            <button class="remove-btn" onclick="removeClock(${clock.id})" title="Remove timezone">✕</button>
            <div class="clock-city">${clock.city}</div>
            <div class="clock-timezone">${clock.timezone.replace(/_/g, ' ')}</div>
            <div class="clock-time" data-id="${clock.id}">--:--</div>
            <div class="clock-date" data-date-id="${clock.id}">Loading...</div>
            <div class="clock-period" data-period-id="${clock.id}"></div>
        </div>
    `).join('');
}

// Update all clocks
function updateAllClocks() {
    clocks.forEach(clock => updateClock(clock));
}

// Update single clock
function updateClock(clock) {
    const now = new Date();
    
    try {
        // Get time in specific timezone
        const options = {
            timeZone: clock.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: !is24HourFormat
        };
        
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(now);
        
        let hour = parts.find(p => p.type === 'hour').value;
        let minute = parts.find(p => p.type === 'minute').value;
        let second = parts.find(p => p.type === 'second').value;
        let period = parts.find(p => p.type === 'dayPeriod');
        
        let timeStr = `${hour}:${minute}`;
        if (showSeconds) {
            timeStr += `:${second}`;
        }
        
        // Update time display
        const timeElement = document.querySelector(`[data-id="${clock.id}"]`);
        if (timeElement) {
            timeElement.textContent = timeStr;
        }
        
        // Update date display
        const dateElement = document.querySelector(`[data-date-id="${clock.id}"]`);
        if (dateElement) {
            const day = parts.find(p => p.type === 'day').value;
            const month = parts.find(p => p.type === 'month').value;
            const year = parts.find(p => p.type === 'year').value;
            dateElement.textContent = `${month}/${day}/${year}`;
        }
        
        // Update period display
        const periodElement = document.querySelector(`[data-period-id="${clock.id}"]`);
        if (periodElement && period) {
            periodElement.textContent = period.value;
        }
    } catch (error) {
        console.error(`Error updating clock for ${clock.timezone}:`, error);
    }
}

// Start clock update interval
function startClockUpdate() {
    updateAllClocks();
    setInterval(updateAllClocks, 1000);
}

// Save clocks to localStorage
function saveClocks() {
    localStorage.setItem('clocks', JSON.stringify(clocks));
    localStorage.setItem('is24HourFormat', is24HourFormat);
    localStorage.setItem('showSeconds', showSeconds);
}

// Load saved clocks from localStorage
function loadSavedClocks() {
    const saved = localStorage.getItem('clocks');
    if (saved) {
        clocks = JSON.parse(saved);
        renderClocks();
    }
    
    const format = localStorage.getItem('is24HourFormat');
    if (format !== null) {
        is24HourFormat = JSON.parse(format);
        document.getElementById('toggleFormat').textContent = 
            is24HourFormat ? '📅 24-Hour Format' : '📅 12-Hour Format';
    }
    
    const seconds = localStorage.getItem('showSeconds');
    if (seconds !== null) {
        showSeconds = JSON.parse(seconds);
        document.getElementById('toggleSecond').textContent = 
            showSeconds ? '⏱️ Hide Seconds' : '⏱️ Show Seconds';
    }
}

// Get city suggestions from timezone database
function getCitySuggestions(query) {
    const suggestions = [];
    const maxSuggestions = 8;
    
    for (const city in timezoneDatabase) {
        if (suggestions.length >= maxSuggestions) break;
        
        if (city.toLowerCase().includes(query)) {
            suggestions.push({
                city,
                timezone: timezoneDatabase[city]
            });
        }
    }
    
    return suggestions;
}

// Get all available timezones
function getAllTimezones() {
    const timezones = new Set();
    
    for (const tz of Object.values(timezoneDatabase)) {
        timezones.add(tz);
    }
    
    return Array.from(timezones).sort();
}
const API_BASE_URL = 'http://localhost:3000';

let globalAirports = [];
let filteredOriginAirports = []; 
let routeDurations = [];
let allFlights = [];
let globalAirlines = [];

// Kabin Sınıfları Verisi
const cabinClasses = [
    { value: 'economy', text: 'Ekonomi', icon: 'fa-chair' },
    { value: 'business', text: 'Business', icon: 'fa-chair' },
    { value: 'first', text: 'First Class', icon: 'fa-chair' }
];

document.addEventListener('DOMContentLoaded', async () => {
    await fetchInitialData();

    // 🌟 MODERN TARİH SEÇİCİ (FLATPICKR) BAŞLATILIYOR 🌟
    flatpickr("#searchDate", {
        locale: "tr", // Türkçe dil ayarı
        altInput: true, // Kullanıcıya farklı format (08.03.2026), arka plana farklı format (2026-03-08)
        altFormat: "d.m.Y",
        dateFormat: "Y-m-d",
        defaultDate: "today", // Açılışta bugünü seç
        minDate: "today", // Geçmişi engelle
        maxDate: new Date().fp_incr(360), // Maksimum 360 gün ileriye izin ver
        disableMobile: "true" // Mobilde de şık kalsın, kaba tarayıcı takvimi açılmasın
    });

    document.getElementById('flightSearchForm').addEventListener('submit', handleFlightSearch);
    
    const filterInput = document.getElementById('globalFilterInput');
    filterInput.addEventListener('input', handleGlobalFilter);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
        }
    });
});

async function fetchInitialData() {
    try {
        const [airportsRes, routesRes, flightsRes, airlinesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/airports`),
            fetch(`${API_BASE_URL}/routes_duration`),
            fetch(`${API_BASE_URL}/flights`),
            fetch(`${API_BASE_URL}/airlines`)
        ]);

        globalAirports = await airportsRes.json();
        filteredOriginAirports = [...globalAirports]; 
        routeDurations = await routesRes.json();
        allFlights = await flightsRes.json();
        globalAirlines = await airlinesRes.json();
        
        setupAutocomplete('searchOriginText', 'searchOrigin', 'originDropdown', 'origin');
        setupAutocomplete('searchDestText', 'searchDest', 'destDropdown', 'dest');
        setupClassAutocomplete();

    } catch (error) {
        console.error("Veriler çekilirken hata:", error);
    }
}

// Global Arama Daraltma Fonksiyonu
function handleGlobalFilter(e) {
    const term = e.target.value.toLocaleLowerCase('tr-TR').trim();
    const dropdown = document.getElementById('globalDropdown');
    dropdown.innerHTML = ''; 

    if (term === "") {
        dropdown.style.display = 'none';
        filteredOriginAirports = [...globalAirports]; 
        document.getElementById('searchOriginText').value = '';
        document.getElementById('searchOrigin').value = '';
        return;
    }

    const uniqueTerms = new Set();
    const suggestionsHTML = [];

    globalAirports.forEach(a => {
        if (a.city && a.city.toLocaleLowerCase('tr-TR').includes(term)) {
            if(!uniqueTerms.has(a.city)) {
                uniqueTerms.add(a.city);
                suggestionsHTML.push({text: a.city, icon: "fa-city", type: "city"});
            }
        }
        if (a.country && a.country.toLocaleLowerCase('tr-TR').includes(term)) {
            if(!uniqueTerms.has(a.country)) {
                uniqueTerms.add(a.country);
                suggestionsHTML.push({text: a.country, icon: "fa-globe-americas", type: "country"});
            }
        }
    });

    if (suggestionsHTML.length === 0) {
        dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-search-minus me-2"></i>Sonuç bulunamadı</li>';
        dropdown.style.display = 'block';
        return;
    }

    suggestionsHTML.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas ${item.icon} me-2 text-muted"></i> ${item.text}`;
        
        li.addEventListener('click', () => {
            document.getElementById('globalFilterInput').value = item.text;
            dropdown.style.display = 'none';
            
            filteredOriginAirports = globalAirports.filter(a => {
                if (item.type === "city") return a.city === item.text;
                if (item.type === "country") return a.country === item.text;
            });

            document.getElementById('searchOriginText').value = '';
            document.getElementById('searchOrigin').value = '';
            document.getElementById('searchOriginText').focus(); 
        });

        dropdown.appendChild(li);
    });

    dropdown.style.display = 'block'; 
}

// Nereden & Nereye Autocomplete Fonksiyonu
function setupAutocomplete(inputId, hiddenId, dropdownId, boxType) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(dropdownId);

    const renderList = function() {
        const term = input.value.toLocaleLowerCase('tr-TR').trim();
        dropdown.innerHTML = '';
        
        const dataToSearch = (boxType === 'origin') ? filteredOriginAirports : globalAirports;

        const matched = dataToSearch.filter(a => {
            if (term === "") return true;
            const fullText = `${a.code} ${a.name} ${a.city} ${a.country}`.toLocaleLowerCase('tr-TR');
            return fullText.includes(term);
        });

        if (matched.length === 0) {
            dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-plane-slash me-2"></i>Uçuş Noktası Bulunamadı</li>';
            dropdown.style.display = 'block';
            return;
        }

        matched.forEach(a => {
            const li = document.createElement('li');
            li.innerHTML = `<b>${a.code}</b> - ${a.name} <small class="text-muted ms-auto">(${a.city}, ${a.country})</small>`;
            
            li.addEventListener('click', () => {
                input.value = `${a.code} - ${a.name}`; 
                hidden.value = a.code; 
                dropdown.style.display = 'none';
            });

            dropdown.appendChild(li);
        });

        dropdown.style.display = 'block';
    };

    input.addEventListener('input', () => {
        document.getElementById(hiddenId).value = ''; 
        renderList();
    });
    
    input.addEventListener('focus', renderList); 
}

// Kabin Sınıfı Autocomplete
function setupClassAutocomplete() {
    const input = document.getElementById('searchClassText');
    const hidden = document.getElementById('searchClass');
    const dropdown = document.getElementById('searchClassDropdown');

    const renderList = function() {
        dropdown.innerHTML = '';
        
        cabinClasses.forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fas ${c.icon} me-2 text-muted"></i> <b>${c.text}</b>`;
            
            li.addEventListener('click', () => {
                input.value = c.text; 
                hidden.value = c.value; 
                dropdown.style.display = 'none';
            });

            dropdown.appendChild(li);
        });

        dropdown.style.display = 'block';
    };

    input.addEventListener('focus', renderList); 
    input.addEventListener('click', renderList); 
}

// Hesaplamalar
function calculateArrivalTime(startTime, durationHours) {
    const [hrs, mins] = startTime.split(':').map(Number);
    const totalMins = (hrs * 60) + mins + (durationHours * 60);
    const endHrs = Math.floor(totalMins / 60) % 24;
    const endMins = Math.round(totalMins % 60);
    return `${String(endHrs).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

function calculatePrice(durationHours, cabinClass) {
    let basePrice = durationHours * 1200; 
    if (cabinClass === 'business') basePrice *= 2.5; 
    if (cabinClass === 'first') basePrice *= 4.0;    
    return Math.round(basePrice).toLocaleString('tr-TR');
}

// Arama İşlemi
function handleFlightSearch(e) {
    e.preventDefault();

    const origin = document.getElementById('searchOrigin').value;
    const dest = document.getElementById('searchDest').value;
    const date = document.getElementById('searchDate').value;
    const cabinClass = document.getElementById('searchClass').value;

    if (!origin || !dest || origin === "" || dest === "") {
        alert("⚠️ Lütfen listeden geçerli bir kalkış ve varış noktası seçiniz!");
        return;
    }

    const originAirport = globalAirports.find(a => a.code === origin);
    const destAirport = globalAirports.find(a => a.code === dest);

    if (originAirport && destAirport) {
        if (originAirport.cityId === destAirport.cityId) {
            alert(`⚠️ Uçuş kuralları gereği kalkış ve varış noktası aynı şehirde (${originAirport.city}) olamaz!\nLütfen farklı bir varış noktası seçin.`);
            return;
        }
    }

    const resultsContainer = document.getElementById('flightResults');
    resultsContainer.innerHTML = `<div class="text-center mt-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-2 text-muted">Uçuşlar aranıyor...</p></div>`;

    setTimeout(() => {
        const searchRoute = `${origin}>${dest}`.replace(/\s+/g, '');
        
        const [year, month, day] = date.split('-');
        const trDate = `${day}.${month}.${year}`;

        const todayObj = new Date();
        const yearT = todayObj.getFullYear();
        const monthT = String(todayObj.getMonth() + 1).padStart(2, '0');
        const dayT = String(todayObj.getDate()).padStart(2, '0');
        const todayIso = `${yearT}-${monthT}-${dayT}`;
        
        let tomorrowObj = new Date();
        tomorrowObj.setDate(todayObj.getDate() + 1);
        const tomorrowIso = tomorrowObj.toISOString().split('T')[0];

        let textDate = "";
        if (date === todayIso) textDate = "Bugün";
        else if (date === tomorrowIso) textDate = "Yarın";

        const matchedFlights = allFlights.filter(f => {
            const dbRoute = f.route ? f.route.replace(/\s+/g, '') : "";
            const routeMatches = dbRoute === searchRoute;

            const dateMatches = (
                f.date === date ||
                f.date === trDate ||
                f.date === textDate ||
                f.date === `${day}/${month}/${year}`
            );

            const statusMatches = f.status !== "İptal" && f.status !== "İndi";

            return routeMatches && dateMatches && statusMatches;
        });

        if (matchedFlights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="alert alert-warning text-center shadow-sm p-4 rounded-4 mt-4">
                    <i class="fas fa-plane-slash fa-3x mb-3 text-warning"></i>
                    <h4>Uçuş Bulunamadı</h4>
                    <p class="mb-0">Seçtiğiniz tarih ve güzergah için planlanmış bir uçuş bulunmuyor. Lütfen farklı bir tarih veya rota deneyin.</p>
                </div>`;
            return;
        }

        const routeData = routeDurations.find(r => r.id === `${origin}-${dest}`);
        const duration = routeData ? parseFloat(routeData.duration) : 2.0;

        let html = '<h4 class="mb-4 text-dark fw-bold">Bulunan Uçuşlar</h4>';
        
        matchedFlights.forEach(flight => {
            const arrivalTime = calculateArrivalTime(flight.time, duration);
            const price = calculatePrice(duration, cabinClass);
            
            let classBadge = 'bg-secondary';
            let className = 'Ekonomi';
            if (cabinClass === 'business') { classBadge = 'bg-primary'; className = 'Business'; }
            if (cabinClass === 'first') { classBadge = 'bg-dark'; className = 'First Class'; }

            html += `
            <div class="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style="transition: transform 0.2s;">
                <div class="card-body p-0">
                    <div class="row g-0 align-items-center">
                        
                        <div class="col-md-3 bg-light p-4 text-center border-end">
                            <i class="fas fa-plane-tail fa-2x text-primary mb-2"></i>
                            <h5 class="fw-bold mb-0">${flight.flightNo}</h5>
                            <small class="text-muted">SkyOps Airlines</small>
                            <div class="mt-2"><span class="badge ${classBadge}">${className}</span></div>
                        </div>

                        <div class="col-md-6 p-4">
                            <div class="d-flex justify-content-between align-items-center text-center px-4">
                                <div>
                                    <h3 class="fw-bold text-dark mb-0">${flight.time}</h3>
                                    <span class="text-muted fw-semibold">${origin}</span>
                                </div>
                                
                                <div class="flex-grow-1 px-3 position-relative">
                                    <div style="border-top: 2px dashed #cbd5e1; width: 100%; position: absolute; top: 50%; z-index: 1;"></div>
                                    <i class="fas fa-plane text-primary bg-white px-2 position-relative" style="z-index: 2;"></i>
                                    <div class="mt-1"><small class="text-muted">${duration} Saat</small></div>
                                </div>

                                <div>
                                    <h3 class="fw-bold text-dark mb-0">${arrivalTime}</h3>
                                    <span class="text-muted fw-semibold">${dest}</span>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-3 p-4 text-center border-start bg-light">
                            <p class="text-muted mb-1">Kişi Başı</p>
                            <h3 class="fw-bold text-success mb-3">${price} ₺</h3>
                            <button class="btn btn-primary w-100 rounded-pill fw-bold" onclick="selectFlight('${flight.id}')">
                                Koltuk Seç <i class="fas fa-arrow-right ms-1"></i>
                            </button>
                        </div>

                    </div>
                </div>
            </div>`;
        });

        resultsContainer.innerHTML = html;

    }, 600); 
}

function selectFlight(flightId) {
    alert("Koltuk seçimi ekranına yönlendiriliyorsunuz! Uçuş ID: " + flightId);
}
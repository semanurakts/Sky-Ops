const API_BASE_URL = 'http://localhost:3000';

let allPersonnel = [];
let allFlights = []; 
let globalAirports = [];
let globalAirlines = [];
let globalCountries = []; 
let routeDurations = [];

// --- ÖZEL MODAL YÖNETİCİSİ (Dinamik Butonlu) ---
let confirmCallback = null;
let cancelCallback = null;

function showConfirmModal(title, body, callback, onCancel = null, isDeleteAction = false, btnText = "Onayla") {
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalBody').innerText = body;
    
    const confirmBtn = document.getElementById('confirmBtnAction');
    const confirmIconContainer = document.querySelector('#confirmModal .mb-3');
    confirmBtn.innerText = btnText;
    
    confirmBtn.className = "btn rounded-pill px-4 ";
    confirmIconContainer.className = "mb-3 ";

    if (isDeleteAction) {
        confirmBtn.classList.add('btn-danger');
        confirmIconContainer.classList.add('text-danger');
    } else if (btnText === "Güncelle") {
        confirmBtn.classList.add('btn-success');
        confirmIconContainer.classList.add('text-success');
    } else {
        confirmBtn.classList.add('btn-primary');
        confirmIconContainer.classList.add('text-primary');
    }

    confirmCallback = callback;
    cancelCallback = onCancel;
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
}

// --- DİNAMİK TARİH YARDIMCILARI (TÜRKİYE SAATİNE UYUMLU) ---
const getLocalYYYYMMDD = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTodayDate = () => getLocalYYYYMMDD(new Date());
const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalYYYYMMDD(d);
};

let activeDateFilter = "all"; 
let currentPage = 1;
const rowsPerPage = 15;
let searchTerm = "";
let statusFilter = "Tüm Durumlar";

let isEditing = false;
let editingFlightId = null;
let tempHour = ""; 
let selectedCrewIds = [];

document.addEventListener('DOMContentLoaded', async () => {
    setInterval(() => {
        const clock = document.getElementById('liveClock');
        if(clock) clock.textContent = new Date().toLocaleTimeString('tr-TR');
    }, 1000);

    document.getElementById('confirmBtnAction')?.addEventListener('click', () => {
        if (confirmCallback) confirmCallback(); 
        const modalEl = document.getElementById('confirmModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide(); 
    });

    await loadPersonnelData();   
    await loadDropdownData();   
    renderAirlineOptions(globalAirlines); 
    await fetchFlights(); 
    await fetchRouteDurations(); 
    await handleDailyReset(); 

    setupFormControls();
    setupTimePicker(); 

    const modalEl = document.getElementById('addFlightModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => resetFlightForm());
    }
});

async function fetchRouteDurations() {
    const res = await fetch(`${API_BASE_URL}/routes_duration`);
    routeDurations = await res.json();
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return (hrs * 60) + mins;
}

function getBusyStatus(personId, newFlightTime, selectedDate) {
    if (!newFlightTime || allFlights.length === 0) return { busy: false };
    
    const newStart = timeToMinutes(newFlightTime);
    
    const activeFlight = allFlights.find(f => {
        if (isEditing && f.id === editingFlightId) return false;
        const isSameDate = f.date === selectedDate;
        const isActive = f.status !== "İptal" && f.status !== "İndi";
        const isSamePerson = String(f.pilot) === String(personId) || (f.cabinCrew && f.cabinCrew.includes(String(personId)));
        return isSameDate && isActive && isSamePerson;
    });

    if (activeFlight) {
        const flightStart = timeToMinutes(activeFlight.time);
        const routeParts = activeFlight.route.split(' > ');
        const routeKey = `${routeParts[0]}-${routeParts[1]}`;
        const routeData = routeDurations.find(r => r.id === routeKey);
        const durationMins = routeData ? (parseFloat(routeData.duration) * 60) : 120;
        
        let safeReturn = flightStart + durationMins + 60;

        if (newStart < safeReturn) { 
            const displaySafeReturn = safeReturn % 1440;
            const hours = Math.floor(displaySafeReturn / 60).toString().padStart(2, '0');
            const mins = (displaySafeReturn % 60).toString().padStart(2, '0');
            return { busy: true, msg: `(MEŞGUL - Müsaitlik: ${hours}:${mins})` };
        }
    }
    return { busy: false };
}

async function handleDailyReset() {
    const todayStr = getTodayDate(); 
    
    for (const p of allPersonnel) {
        if (!p.lastUpdate || p.lastUpdate !== todayStr) {
            await fetch(`${API_BASE_URL}/personnel/${p.id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    dailyFlightHours: 0,
                    fatiguePoint: 0,
                    status: "Müsait",
                    risk: "Düşük",
                    lastUpdate: todayStr
                })
            });
        }
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const pastFlights = allFlights.filter(f => {
        const isPastDate = f.date < todayStr;
        const isPastHour = f.date === todayStr && timeToMinutes(f.time) < (currentMins - 60); 
        return (isPastDate || isPastHour) && f.status !== "İndi" && f.status !== "İptal";
    });

    for (const f of pastFlights) {
        await fetch(`${API_BASE_URL}/flights/${f.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: "İndi" })
        });
    }
}

function setupTimePicker() {
    const hourList = document.getElementById('hourList');
    const minuteList = document.getElementById('minuteList');
    const display = document.getElementById('selectedTimeText');
    const hiddenInput = document.getElementById('flightTime');
    const timeDisplayBox = document.getElementById('flightTimeDisplay');

    const updateTimeOptions = () => {
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();

    const selectedDay = document.querySelector('input[name="flightDay"]:checked').value;
    const isToday = (selectedDay === 'today');

    hourList.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        const val = h.toString().padStart(2, '0');
        const box = document.createElement('div');
        
        const isPastHour = isToday && h < curH;
        
        box.className = `time-box ${isPastHour ? 'disabled' : ''}`;
        box.innerText = val;
        box.onclick = () => {
            if (isPastHour) return;
            Array.from(hourList.children).forEach(c => c.classList.remove('selected'));
            box.classList.add('selected');
            tempHour = val;
            renderMinutes(isToday && h === curH ? curM : -1);
        };
        hourList.appendChild(box);
    }

    const renderMinutes = (minLimit) => {
        minuteList.innerHTML = '';
        for (let m = 0; m < 60; m++) {
            const val = m.toString().padStart(2, '0');
            const box = document.createElement('div');
            
            box.className = `time-box ${m <= minLimit ? 'disabled' : ''}`;
            box.innerText = val;
            box.onclick = () => {
                if (m <= minLimit && minLimit !== -1) return;
                if (!tempHour) return; 
                const finalTime = `${tempHour}:${val}`;
                display.innerText = finalTime;
                display.style.color = "#212529";
                display.style.fontWeight = "bold";
                hiddenInput.value = finalTime;
                bootstrap.Dropdown.getOrCreateInstance(timeDisplayBox).hide();
                populateCrewSelects();
            };
            minuteList.appendChild(box);
        }
    };
    
    const initialH = tempHour !== "" ? parseInt(tempHour) : -1;
    renderMinutes(isToday && initialH === curH ? curM : -1);
};
    timeDisplayBox?.addEventListener('show.bs.dropdown', updateTimeOptions);
}

function setupFormControls() {
    const addFlightForm = document.getElementById('addFlightForm');
    const flightNumInput = document.getElementById('flightNumberInput');
    const airlineInput = document.getElementById('airlineCodeInput');
    
    if(airlineInput) airlineInput.setAttribute('maxlength', '2'); 

    airlineInput?.addEventListener('input', (e) => {
        let val = e.target.value;
        const charMap = { 'i': 'I', 'İ': 'I', 'ı': 'I', 'ğ': 'G', 'Ğ': 'G', 'ü': 'U', 'Ü': 'U', 'ş': 'S', 'Ş': 'S', 'ö': 'O', 'Ö': 'O', 'ç': 'C', 'Ç': 'C' };
        
        let correctedVal = val.split('').map(char => charMap[char] || char).join('').toUpperCase();
        correctedVal = correctedVal.replace(/[^A-Z0-9]/g, '').substring(0, 2);
        e.target.value = correctedVal;

        const filtered = globalAirlines.filter(a => a.code.startsWith(correctedVal));
        renderAirlineOptions(filtered);

        const selected = globalAirlines.find(a => a.code === correctedVal);
        if (selected && selected.countryId) {
            const filteredAirports = globalAirports.filter(ap => ap.countryId === selected.countryId);
            populateAirportSelect('originInput', filteredAirports, 'Kalkış');
        } else {
            populateAirportSelect('originInput', globalAirports, 'Kalkış');
        }
    });

    const originSelect = document.getElementById('originInput');
    const destSelect = document.getElementById('destinationInput');
    const gateInput = document.getElementById('gate');
    const pilotSelect = document.getElementById('pilotName');
    const statusSelect = document.getElementById('flightStatus');

    const checkRoute = () => {
    const origin = originSelect.value;
    const dest = destSelect.value;

    if (origin && dest) {
        if (origin === dest) {
            alert("⚠️ Kalkış ve varış noktası aynı havalimanı olamaz!");
            destSelect.value = "";
            return;
        }

        const originData = globalAirports.find(a => a.code === origin);
        const destData = globalAirports.find(a => a.code === dest);

        if (originData && destData && originData.cityId === destData.cityId) {
            alert(`⚠️ AYNI ŞEHİR ENGELİ: Bu havalimanları aynı operasyonel bölgeye (${originData.cityId}) hizmet verdiği için uçuş planlanamaz!`);
            destSelect.value = "";
        }
    }
};
    originSelect?.addEventListener('change', checkRoute);
    destSelect?.addEventListener('change', checkRoute);

    flightNumInput?.addEventListener('input', (e) => {
        if (e.target.value.length > 4) {
            e.target.value = e.target.value.slice(0, 4);
        }
    });

    flightNumInput?.addEventListener('blur', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) {
            e.target.value = "0001";
        } else {
            e.target.value = val.toString().padStart(4, '0');
        }
    });

    statusSelect?.addEventListener('change', (e) => {
        const newVal = e.target.value;
        if (!isEditing && newVal === "İndi") {
            alert("⚠️ Yeni eklenen bir uçuş henüz kalkmadan 'İndi' olarak girilemez!");
            e.target.value = ""; // "Zamanında" yerine boş değere dön
            return;
        }
        populateCrewSelects();
    });

    document.getElementById('globalSearchInput')?.addEventListener('input', (e) => { 
        searchTerm = e.target.value; 
        currentPage = 1; 
        renderFlightManagementTable(); 
    });

    document.getElementById('statusFilterSelect')?.addEventListener('change', (e) => { 
        statusFilter = e.target.value; 
        currentPage = 1; 
        renderFlightManagementTable(); 
    });

    document.querySelectorAll('input[name="dateFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            activeDateFilter = e.target.value; 
            currentPage = 1;
            renderFlightManagementTable(); 
        });
    });

    gateInput?.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (val.length > 0) {
            let firstChar = val.charAt(0);
            if (!/[A-Z]/.test(firstChar)) { e.target.value = ""; return; }
            let formatted = firstChar;
            if (val.length > 1) {
                formatted += "-";
                let rest = val.substring(1).replace(/[^0-9]/g, '').substring(0, 2);
                formatted += rest;
            }
            e.target.value = formatted;
        }
    });

    gateInput?.addEventListener('blur', (e) => {
        let val = e.target.value;
        if (val.includes("-")) {
            let parts = val.split("-");
            if (parts[1] !== "") e.target.value = `${parts[0]}-${parts[1].padStart(2, '0')}`;
        }
    });

    addFlightForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const airlineCode = document.getElementById('airlineCodeInput').value;
        
        const isValidAirline = globalAirlines.some(a => a.code === airlineCode);
        if (!isValidAirline) {
            alert(`⚠️ '${airlineCode}' sistemde kayıtlı bir havayolu değil! Lütfen geçerli bir kod giriniz (Örn: TK, PC, U2).`);
            return;
        }

        const newStatus = document.getElementById('flightStatus').value;
        
        if (!newStatus) {
            alert("⚠️ Lütfen uçuş için bir durum (Statü) seçiniz!");
            return;
        }

        const flightNum = document.getElementById('flightNumberInput').value.padStart(4, '0');
        const newFlightNo = `${airlineCode}-${flightNum}`;
        const newGate = document.getElementById('gate').value;
        const newOrigin = document.getElementById('originInput').value;
        const newDest = document.getElementById('destinationInput').value;
        const newTime = document.getElementById('flightTime').value;
        const newTimeMins = timeToMinutes(newTime);
        const pilotId = document.getElementById('pilotName').value;
        const selectedDayVal = document.querySelector('input[name="flightDay"]:checked').value;
        const flightDate = selectedDayVal === 'today' ? getTodayDate() : getTomorrowDate();

        const conflict = allFlights.find(f => {
            if (isEditing && f.id === editingFlightId) return false; 
            if (f.status === "İptal" || f.status === "İndi") return false; 

            if (f.flightNo === newFlightNo) {
                alert(`⚠️ HATA: ${newFlightNo} numaralı uçuş zaten aktif!`);
                return true;
            }

            const fTimeMins = timeToMinutes(f.time);
            const timeDiff = Math.abs(fTimeMins - newTimeMins);
            const fOrigin = f.route.split(' > ')[0];

            if (f.date === flightDate && fOrigin === newOrigin && f.gate === newGate && timeDiff < 45) {
                alert(`⚠️ KAPI ÇAKIŞMASI: ${newGate} numaralı kapı ${f.time} saatindeki uçuş tarafından kullanılıyor! (En az 45 dk ara olmalı)`);
                return true;
            }
            return false;
        });
        if (conflict) return;

        const pilotBusy = getBusyStatus(pilotId, newTime, flightDate);
        if (pilotBusy.busy) {
            alert(`⚠️ Seçilen pilot bu saatte başka bir uçuşta meşgul!`);
            return;
        }

        if (selectedCrewIds.length < 2) {
            alert("⚠️ EKSİK EKİP: Bir uçuş planlayabilmek için en az 2 kabin memuru seçmelisiniz!");
            return; 
        }

        if (selectedCrewIds.length > 8) {
            alert("⚠️ FAZLA EKİP: Bir uçuş için en fazla 8 kabin memuru seçilebilir!");
            return; 
        }

        const routeId = `${newOrigin}-${newDest}`;
        const routeData = routeDurations.find(r => r.id === routeId);
        const duration = routeData ? parseFloat(routeData.duration) : 2.0;

        // --- İŞTE DÜZELTİLEN YENİ ID MOTORU (100% Güvenli) ---
        let newId = "1"; 
        if (isEditing) {
            newId = String(editingFlightId);
        } else if (allFlights.length > 0) {
            const validIds = allFlights.map(f => parseInt(f.id)).filter(id => !isNaN(id));
            if (validIds.length > 0) {
                newId = String(Math.max(...validIds) + 1);
            }
        }
        // -----------------------------------------------------

        const payload = {
            id: newId,
            flightNo: newFlightNo,
            route: `${newOrigin} > ${newDest}`,
            time: newTime,
            date: flightDate,
            gate: newGate,
            pilot: pilotId,
            cabinCrew: selectedCrewIds,
            status: newStatus
        };

        const handleFlightSave = async () => {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `${API_BASE_URL}/flights/${editingFlightId}` : `${API_BASE_URL}/flights`;
            
            try {
                const res = await fetch(url, { 
                    method: method, 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(payload) 
                });

                if (res.ok) {
                    if (payload.status === "İndi") {
    const teamIds = [payload.pilot, ...payload.cabinCrew];
    const flightHour = parseInt(payload.time.split(':')[0]);
    let nightMultiplier = (flightHour >= 0 && flightHour < 6) ? 1.5 : 1.0;

    for (const personId of teamIds) {
        const pRes = await fetch(`${API_BASE_URL}/personnel/${personId}`);
        const pData = await pRes.json();

        // --- İŞTE EKLEYECEĞİN KRİTİK 2 SATIR BURASI ---
        const currentHours = parseFloat(pData.dailyFlightHours) || 0;
        const currentFatigue = parseInt(pData.fatiguePoint) || 0;
        // ----------------------------------------------

        const addedFatigue = Math.round((duration <= 2.5 ? 15 : 20) * nightMultiplier);
        
        await fetch(`${API_BASE_URL}/personnel/${personId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                dailyFlightHours: parseFloat((currentHours + duration).toFixed(1)),
                fatiguePoint: Math.min(currentFatigue + addedFatigue, 100),
                status: (currentFatigue + addedFatigue) >= 80 ? "Yorgun" : "Müsait",
                risk: (currentFatigue + addedFatigue) >= 80 ? "Yüksek" : ((currentFatigue + addedFatigue) >= 50 ? "Orta" : "Düşük"),
                lastUpdate: getTodayDate()
            })
        });
    }
}
                    bootstrap.Modal.getInstance(document.getElementById('addFlightModal')).hide();
                    resetFlightForm();
                    await fetchFlights();
                    await loadPersonnelData();
                } else {
                    console.error("Kayıt Başarısız. Sunucu Yanıtı:", await res.text());
                    alert("Uçuş kaydedilemedi! Sunucu ile bağlantıyı kontrol edin.");
                }
            } catch (error) {
                console.error("Fetch Hatası:", error);
                alert("Sunucuya ulaşılamadı. JSON Server'ın açık olduğundan emin olun.");
            }
        };

        if (isEditing) {
            showConfirmModal("Onay", "Bilgileri güncelleyip yorgunluğu işlemek istiyor musunuz?", handleFlightSave, null, false, "Güncelle");
        } else {
            await handleFlightSave();
        }
    });
}

function populateCrewSelects() {
    const pilotSelect = document.getElementById('pilotName');
    const cabinContainer = document.getElementById('cabinCrewList');
    const selectedTime = document.getElementById('flightTime').value;

    const selectedDayVal = document.querySelector('input[name="flightDay"]:checked')?.value || 'today';
    const flightDateForBusy = selectedDayVal === 'today' ? getTodayDate() : getTomorrowDate();

    if (pilotSelect) {
        const currentVal = pilotSelect.value;
        pilotSelect.innerHTML = '<option value="" selected>Pilot Seçiniz...</option>';
        allPersonnel.filter(p => p.role === 'Pilot').forEach(p => {
            const status = getBusyStatus(p.id, selectedTime, flightDateForBusy); 
            const opt = new Option(`${p.name} ${status.busy ? status.msg : ''}`, p.id);
            
            if (status.busy) {
                opt.style.color = "red"; 
                opt.style.fontWeight = "bold";
            }
            pilotSelect.options.add(opt);
        });
        pilotSelect.value = currentVal;
    }

    if (cabinContainer) {
    cabinContainer.innerHTML = '';
    allPersonnel.filter(p => p.role === 'Kabin Memuru').forEach(c => {
        const status = getBusyStatus(c.id, selectedTime, flightDateForBusy); 
        const item = document.createElement('div');
        
        item.className = `crew-item ${status.busy ? 'text-danger fw-bold border-danger' : ''}`;
        if(selectedCrewIds.includes(c.id)) item.classList.add('active');
        
        item.innerHTML = `<span>${c.name} <br> <small>${status.busy ? status.msg : ''}</small></span>`;
        
        item.onclick = () => {
            if (status.busy) { 
                alert(`⚠️ ${c.name} bu saatte meşgul!`); 
                return; 
            }
            
            const index = selectedCrewIds.indexOf(c.id);
            if (index > -1) {
                selectedCrewIds.splice(index, 1);
                item.classList.remove('active');
            } else {
                if (selectedCrewIds.length >= 8) { 
                    alert("⚠️ Maksimum 8 kabin memuru seçebilirsiniz!"); 
                    return; 
                }
                selectedCrewIds.push(c.id);
                item.classList.add('active');
            }
            
            const countEl = document.getElementById('selectedCrewCount');
            if (countEl) {
                countEl.innerText = selectedCrewIds.length;
            }
        };
        cabinContainer.appendChild(item);
    });
}
}

async function loadPersonnelData() {
    const res = await fetch(`${API_BASE_URL}/personnel`);
    allPersonnel = await res.json();
    populateCrewSelects();
}

async function fetchFlights() {
    const res = await fetch(`${API_BASE_URL}/flights`);
    allFlights = await res.json();
    allFlights.sort((a, b) => parseInt(b.id || 0) - parseInt(a.id || 0));
    renderFlightManagementTable();
    updateUcusKPIs(allFlights);
}

function updateUcusKPIs(flights) {
    document.getElementById('totalFlightsCount').textContent = flights.length;
    document.getElementById('onTimeFlightsCount').textContent = flights.filter(f => f.status === "Zamanında" || f.status === "İndi").length;
    document.getElementById('delayedFlightsCount').textContent = flights.filter(f => f.status === "Gecikmeli" || f.status === "İptal").length;
}

function renderFlightManagementTable() {
    const tableBody = document.getElementById('flightManagementTableBody');
    if (!tableBody) return;

    const todayStr = getTodayDate();
    const tomorrowStr = getTomorrowDate();

    let filtered = allFlights.filter(f => {
        const matchesStatus = statusFilter === "Tüm Durumlar" || f.status === statusFilter;
        const matchesSearch = f.flightNo.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesDate = true;
        if (activeDateFilter === 'today') matchesDate = f.date === todayStr;
        if (activeDateFilter === 'tomorrow') matchesDate = f.date === tomorrowStr;
        if (activeDateFilter === 'past') matchesDate = f.date < todayStr;

        return matchesStatus && matchesSearch && matchesDate;
    });

    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tableBody.innerHTML = paginated.map(flight => {
        const person = allPersonnel.find(p => String(p.id) === String(flight.pilot));
        const pilotName = person ? person.name : "Tanımsız";

        const now = new Date();
        const currentTotalMins = now.getHours() * 60 + now.getMinutes();
        const flightMins = timeToMinutes(flight.time);

        let timeStatusBadge = "";
        
        if (flight.date < todayStr) {
            timeStatusBadge = `<span class="badge bg-secondary-subtle text-secondary border me-1" style="font-size: 0.7rem; font-weight: 600;">GEÇMİŞ</span>`;
        } 
        else if (flight.date === todayStr) {
            if (flightMins < currentTotalMins) {
                timeStatusBadge = `<span class="badge bg-secondary-subtle text-secondary border me-1" style="font-size: 0.7rem; font-weight: 600;">GEÇMİŞ</span>`;
            } else {
                timeStatusBadge = `<span class="badge bg-info-subtle text-info border border-info me-1" style="font-size: 0.7rem; font-weight: 600;">BUGÜN</span>`;
            }
        } 
        else if (flight.date === tomorrowStr) {
            timeStatusBadge = `<span class="badge bg-light text-secondary border me-1" style="font-size: 0.7rem; font-weight: 600;">YARIN</span>`;
        } 
        else {
            timeStatusBadge = `<span class="badge bg-light text-secondary border me-1" style="font-size: 0.7rem; font-weight: 600;">İLERİ TARİH</span>`;
        }

        return `
            <tr class="align-middle">
                <td class="fw-bold text-dark font-monospace">${flight.flightNo}</td>
                <td>${flight.route}</td>
                
                <td>
                    <div class="d-flex align-items-center">
                        ${timeStatusBadge}
                        <span class="fw-bold text-dark font-monospace" style="font-size: 0.95rem;">${flight.time}</span>
                    </div>
                </td>

                <td><span class="badge bg-light text-dark border">${flight.gate}</span></td>
                <td><span class="badge ${getBadgeClass(flight.status)} px-3 py-2 rounded-pill">${flight.status}</span></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="avatar bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style="width:35px; height:35px;">
                            ${pilotName[0]}
                        </div>
                        <span>${pilotName}</span>
                    </div>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="editFlight('${flight.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFlight('${flight.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    renderPaginationControls(filtered.length);
}

function renderPaginationControls(total) {
    const el = document.getElementById('paginationControls');
    const pages = Math.ceil(total / rowsPerPage);
    el.innerHTML = '';
    if (pages <= 1) return;
    if (currentPage > 1) {
        el.innerHTML += `<li class="page-item"><a class="page-link pagination-arrow" href="#" onclick="changePage(${currentPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a></li>`;
    }
    for (let i = 1; i <= pages; i++) {
        el.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a></li>`;
    }
    if (currentPage < pages) {
        el.innerHTML += `<li class="page-item"><a class="page-link pagination-arrow" href="#" onclick="changePage(${currentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
    }
}

function changePage(page) { currentPage = page; renderFlightManagementTable(); }

async function loadDropdownData() {
    const [airportsRes, airlinesRes, countriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/airports`), fetch(`${API_BASE_URL}/airlines`), fetch(`${API_BASE_URL}/countries`)
    ]);
    globalAirports = await airportsRes.json();
    globalAirlines = await airlinesRes.json();
    globalCountries = await countriesRes.json();
    populateAirportSelect('originInput', globalAirports, 'Kalkış');
    populateAirportSelect('destinationInput', globalAirports, 'Varış');
    renderAirlineOptions(globalAirlines);
}

function populateAirportSelect(id, data, ph) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="" selected disabled>${ph}</option>`;
    data.forEach(a => el.options.add(new Option(`${a.code} - ${a.name}`, a.code)));
}

function renderAirlineOptions(data) {
    const dl = document.getElementById('airlineOptions');
    if (!dl) return;

    dl.innerHTML = data.map(airline => {
        const countryObj = globalCountries.find(c => c.id === airline.countryId);
        const countryName = countryObj ? countryObj.name : airline.countryId;

        return `<option value="${airline.code}">${airline.code} (${countryName}) - ${airline.name}</option>`;
    }).join('');
}

async function editFlight(id) {
    const flight = allFlights.find(f => f.id === id);
    if(!flight) return;

    if (flight.status === "İptal" || flight.status === "İndi") {
        alert(`⚠️ Bu uçuş ${flight.status} olarak işaretlendiği için artık üzerinde değişiklik yapılamaz.`);
        return;
    }

    isEditing = true;
    editingFlightId = id;

    document.querySelector('.modal-title').innerHTML = `<i class="fas fa-edit me-2 text-success"></i>Uçuş Güncelle`;
    const submitBtn = document.querySelector('#addFlightForm button[type="submit"]');
    if(submitBtn) { 
        submitBtn.textContent = 'Güncelle'; 
        submitBtn.classList.remove('btn-primary');
        submitBtn.classList.add('btn-success'); 
    }

    const [air, num] = flight.flightNo.split('-');
    document.getElementById('airlineCodeInput').value = air;
    document.getElementById('flightNumberInput').value = num;
    const [start, end] = flight.route.split(' > ');
    document.getElementById('originInput').value = start;
    document.getElementById('destinationInput').value = end;
    document.getElementById('selectedTimeText').innerText = flight.time;
    document.getElementById('flightTime').value = flight.time;
    tempHour = flight.time.split(':')[0];
    document.getElementById('gate').value = flight.gate;
    document.getElementById('pilotName').value = flight.pilot;
    selectedCrewIds = flight.cabinCrew || [];
    document.getElementById('selectedCrewCount').innerText = selectedCrewIds.length; 

    if (flight.date === getTodayDate()) {
        document.getElementById('dayToday').checked = true;
    } else if (flight.date === getTomorrowDate()) {
        document.getElementById('dayTomorrow').checked = true;
    }

    const statusSelect = document.getElementById('flightStatus');
    const indiOptionEl = statusSelect.querySelector('option[value="İndi"]');
    
    if (indiOptionEl) {
        indiOptionEl.style.display = "block"; 
        indiOptionEl.disabled = false;        
    }
    
    statusSelect.value = flight.status;
    
    populateCrewSelects();
    new bootstrap.Modal(document.getElementById('addFlightModal')).show();
}

function getBadgeClass(status) {
    switch(status) {
        case 'Zamanında': return 'bg-success-subtle text-success';
        case 'Gecikmeli': return 'bg-warning-subtle text-warning-emphasis';
        case 'İndi': return 'bg-primary text-white';
        case 'İptal': return 'bg-danger-subtle text-danger'; 
        default: return 'bg-secondary-subtle text-secondary';
    }
}

function resetFlightForm() {
    isEditing = false; 
    editingFlightId = null;
    tempHour = "";
    selectedCrewIds = [];
    document.getElementById('addFlightForm').reset();
    document.getElementById('selectedTimeText').innerText = '--:--';
    document.getElementById('flightTime').value = '';
    document.getElementById('selectedCrewCount').innerText = "0";
    document.getElementById('crewValidationMsg')?.classList.add('d-none');
    
    document.querySelector('.modal-title').innerHTML = `<i class="fas fa-plane-arrival me-2 text-primary"></i>Yeni Uçuş Ekle`;
    const submitBtn = document.querySelector('#addFlightForm button[type="submit"]');
    if(submitBtn) { 
        submitBtn.textContent = 'Kaydı Tamamla'; 
        submitBtn.classList.remove('btn-success'); 
        submitBtn.classList.add('btn-primary');    
    }

    populateAirportSelect('originInput', globalAirports, 'Kalkış');
    populateAirportSelect('destinationInput', globalAirports, 'Varış');
    renderAirlineOptions(globalAirlines);
    populateCrewSelects();

    const statusSelectEl = document.getElementById('flightStatus');
    const indiOpt = statusSelectEl.querySelector('option[value="İndi"]');
    
    if (indiOpt) {
        indiOpt.disabled = false;        
        indiOpt.style.display = "block";  
    }
    
    statusSelectEl.value = ""; 
}

async function deleteFlight(id) {
    showConfirmModal(
        "Uçuş Siliniyor", 
        "Bu uçuşu silmek personelin yorgunluk puanlarını güncelleyecektir. Onaylıyor musunuz?", 
        async () => {
            const flightToDelete = allFlights.find(f => String(f.id) === String(id));
            if (flightToDelete?.status === "İndi") await processFatigueReturnOnly(id);
            await fetch(`${API_BASE_URL}/flights/${id}`, { method: 'DELETE' });
            await fetchFlights();
            await loadPersonnelData();
        },
        null,
        true,   
        "Sil"   
    );
}

document.getElementById('deleteAllFlightsBtn')?.addEventListener('click', () => {
    showConfirmModal(
        "TÜMÜNÜ SİL", 
        "Sistemdeki TÜM uçuşlar silinecek. BU İŞLEM GERİ ALINAMAZ!", 
        async () => {
            const btn = document.getElementById('deleteAllFlightsBtn');
            btn.disabled = true;
            for (const flight of allFlights) {
                if (flight.status === "İndi") await processFatigueReturnOnly(flight.id);
                await fetch(`${API_BASE_URL}/flights/${flight.id}`, { method: 'DELETE' });
            }
            await loadPersonnelData();
            await fetchFlights();
            btn.disabled = false;
        },
        null,
        true,           
        "Tümünü Sil"    
    );
});

async function processFatigueReturnOnly(id) {
    const flightToDelete = allFlights.find(f => String(f.id) === String(id));
    if (!flightToDelete) return;

    const teamIds = [flightToDelete.pilot, ...(flightToDelete.cabinCrew || [])];
    const routeParts = flightToDelete.route.split(' > ');
    const routeKey = `${routeParts[0]}-${routeParts[1]}`;
    const routeData = routeDurations.find(r => r.id === routeKey);
    const duration = routeData ? parseFloat(routeData.duration) : 2.0;

    const flightHour = parseInt(flightToDelete.time.split(':')[0]);
    const nightMultiplier = (flightHour >= 0 && flightHour < 6) ? 1.5 : 1.0;
    const fatigueToReturn = Math.round((duration <= 2.5 ? 15 : 20) * nightMultiplier);

    for (const personId of teamIds) {
        const pIndex = allPersonnel.findIndex(per => String(per.id) === String(personId));
        if (pIndex !== -1) {
            const p = allPersonnel[pIndex];
            const updatedHours = Math.max(0, (p.dailyFlightHours || 0) - duration);
            const updatedFatigue = Math.max(0, (p.fatiguePoint || 0) - fatigueToReturn);

            await fetch(`${API_BASE_URL}/personnel/${personId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    dailyFlightHours: updatedHours,
                    fatiguePoint: updatedFatigue,
                    status: updatedFatigue >= 80 ? "Yorgun" : "Müsait",
                    risk: updatedFatigue >= 80 ? "Yüksek" : (updatedFatigue >= 50 ? "Orta" : "Düşük")
                })
            });
        }
    }
}
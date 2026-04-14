const API_BASE_URL = 'http://localhost:3000';

let allPersonnel = [];
let allFlights = []; 
let globalAirports = [];
let globalAirlines = [];
let globalCountries = []; 
let routeDurations = [];

// 🌟 STATÜ LİSTESİ 🌟
const flightStatuses = [
    { code: 'Zamanında', name: 'Zamanında', icon: 'fa-check-circle text-success' },
    { code: 'Gecikmeli', name: 'Gecikmeli', icon: 'fa-clock text-warning' },
    { code: 'Yolcu Alımı', name: 'Yolcu Alımı', icon: 'fa-users text-primary' },
    { code: 'İndi', name: 'İndi', icon: 'fa-plane-arrival text-info' },
    { code: 'İptal', name: 'İptal', icon: 'fa-times-circle text-danger' }
];

// --- ÖZEL MODAL YÖNETİCİSİ ---
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

// --- DİNAMİK TARİH YARDIMCILARI ---
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
// Arşiv için eşik tarihi: Bugünden 30 gün öncesi
const getArchiveThresholdDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Buradaki 2'yi 30 yaptık!
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
    await fetchFlights(); 
    await fetchRouteDurations(); 
    await applyFatigueDecay(); 

    setupFormControls();
    setupTimePicker(); 
    
    setupModalAutocomplete('statusText', 'flightStatus', 'statusDropdown', flightStatuses, 'status');

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

// 🌟 YENİ: ZAMAN VE STATÜ KİLİDİ (Time-Lock & Status Lock) 🌟
function isFlightLocked(flight) {
    // 1. Durum Kilidi: Fiziken işlem başlamış veya bitmişse KİLİTLE
    if (["İndi", "İptal", "Yolcu Alımı", "Havalandı"].includes(flight.status)) {
        return true;
    }

    const today = getTodayDate();
    
    // 2. Geçmiş Kilidi: Tarih dünde kalmışsa KİLİTLE
    if (flight.date < today) {
        return true;
    }

    // 3. Canlı Saat Kilidi: Uçuş bugünse ve saat 1 dk bile geçmişse KİLİTLE
    if (flight.date === today) {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const flightMins = timeToMinutes(flight.time);
        
        if (currentMins >= flightMins) {
            return true; 
        }
    }
    
    return false; // Uçuş gelecekte, silinebilir.
}

function getBusyStatus(personId, newFlightTime, selectedDate, selectedOrigin) {
    const person = allPersonnel.find(p => String(p.id) === String(personId));

    if (person && person.currentLocation && selectedOrigin && person.currentLocation !== selectedOrigin) {
        return { busy: true, msg: `(KONUM HATASI: Şu an ${person.currentLocation} meydanında)` };
    }

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

// 🌟 YENİ: SAATLİK YORGUNLUK SÖNÜMLENMESİ (Fatigue Decay Algorithm) 🌟
async function applyFatigueDecay() {
    const now = new Date();
    let updates = [];
    
    for (const p of allPersonnel) {
        let currentFatigue = parseInt(p.fatiguePoint) || 0;
        
        // Eğer personelin yorgunluğu varsa ve sisteme son yorgunluk/dinlenme saati işlenmişse
        if (currentFatigue > 0 && p.lastDecayTime) {
            const lastTime = new Date(p.lastDecayTime);
            const diffMs = now - lastTime;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60)); // Kaç tam saat geçmiş?
            
            if (diffHours > 0) {
                // Yerde geçen (dinlenilen) her 1 saat için 5 puan iyileşme
                const decayAmount = diffHours * 5; 
                const newFatigue = Math.max(0, currentFatigue - decayAmount);
                
                // Saati ileri sar (Örn: 3 saat dinlendiyse, son hesaplama saatini 3 saat ileri at)
                const newDecayTime = new Date(lastTime.getTime() + (diffHours * 60 * 60 * 1000)).toISOString();
                
                const status = newFatigue >= 80 ? "Yorgun" : "Müsait";
                const risk = newFatigue >= 80 ? "Yüksek" : (newFatigue >= 50 ? "Orta" : "Düşük");

                updates.push(fetch(`${API_BASE_URL}/personnel/${p.id}`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        fatiguePoint: newFatigue,
                        status: status,
                        risk: risk,
                        // Yorgunluk sıfırlandıysa takibi bırak, sıfırlanmadıysa yeni saati yaz
                        lastDecayTime: newFatigue === 0 ? null : newDecayTime 
                    })
                }));
            }
        }
    }

    // Geçmiş uçuşları otomatik "İndi" yapma mantığı (Eski koddan koruduğumuz kısım)
    const todayStr = getTodayDate();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const pastFlights = allFlights.filter(f => {
        const isPastDate = f.date < todayStr;
        const isPastHour = f.date === todayStr && timeToMinutes(f.time) < (currentMins - 60); 
        return (isPastDate || isPastHour) && f.status !== "İndi" && f.status !== "İptal";
    });

    for (const f of pastFlights) {
        const teamIds = [f.pilot, ...(f.cabinCrew || [])];
        const dest = f.route.split(' > ')[1]; 
        for (const personId of teamIds) {
            updates.push(fetch(`${API_BASE_URL}/personnel/${personId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ currentLocation: dest })
            }));
        }
        updates.push(fetch(`${API_BASE_URL}/flights/${f.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: "İndi" })
        }));
    }

    if (updates.length > 0) await Promise.all(updates);
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
    
    document.getElementById('swapRouteBtn')?.addEventListener('click', () => {
        const oText = document.getElementById('originText');
        const oInput = document.getElementById('originInput');
        const dText = document.getElementById('destText');
        const dInput = document.getElementById('destinationInput');

        const tempText = oText.value;
        const tempInput = oInput.value;
        
        oText.value = dText.value;
        oInput.value = dInput.value;
        
        dText.value = tempText;
        dInput.value = tempInput;

        const destDropdown = document.getElementById('destDropdown');
        if (destDropdown) destDropdown.style.display = 'none'; 
        
        const event = new Event('change');
        document.getElementById('originInput').dispatchEvent(event);
    });

    const checkRoute = () => {
        const origin = document.getElementById('originInput').value;
        const dest = document.getElementById('destinationInput').value;

        if (origin && dest) {
            if (origin === dest) {
                alert("⚠️ Kalkış ve varış noktası aynı havalimanı olamaz!");
                document.getElementById('destinationInput').value = "";
                document.getElementById('destText').value = ""; 
                return;
            }

            const originData = globalAirports.find(a => a.code === origin);
            const destData = globalAirports.find(a => a.code === dest);

            if (originData && destData && originData.cityId === destData.cityId) {
                alert(`⚠️ AYNI ŞEHİR ENGELİ: Bu havalimanları aynı operasyonel bölgeye (${originData.city}) hizmet verdiği için uçuş planlanamaz!`);
                document.getElementById('destinationInput').value = "";
                document.getElementById('destText').value = ""; 
            }
        }
        populateCrewSelects(); 
    };

    document.getElementById('originInput')?.addEventListener('change', checkRoute);
    document.getElementById('destinationInput')?.addEventListener('change', checkRoute);

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

    const gateInput = document.getElementById('gate');
    gateInput?.addEventListener('input', (e) => {
        let rawVal = e.target.value;
        const charMap = { 'i': 'I', 'İ': 'I', 'ı': 'I', 'ğ': 'G', 'Ğ': 'G', 'ü': 'U', 'Ü': 'U', 'ş': 'S', 'Ş': 'S', 'ö': 'O', 'Ö': 'O', 'ç': 'C', 'Ç': 'C' };
        let mappedVal = rawVal.split('').map(char => charMap[char] || char).join('');
        
        let val = mappedVal.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        
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
        } else {
            e.target.value = "";
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
        const newOrigin = document.getElementById('originInput').value;
        const newDest = document.getElementById('destinationInput').value;
        const pilotId = document.getElementById('pilotInput').value;
        const newStatus = document.getElementById('flightStatus').value; 

        if (!airlineCode || !newOrigin || !newDest || !pilotId || !newStatus) {
            alert("⚠️ Lütfen formu eksiksiz doldurun.");
            return;
        }

        const flightNum = document.getElementById('flightNumberInput').value.padStart(4, '0');
        const newFlightNo = `${airlineCode}-${flightNum}`;
        const newGate = document.getElementById('gate').value;
        const newTime = document.getElementById('flightTime').value;
        const newTimeMins = timeToMinutes(newTime);
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
                alert(`⚠️ KAPI ÇAKIŞMASI: ${newGate} numaralı kapı ${f.time} saatindeki uçuş tarafından kullanılıyor!`);
                return true;
            }
            return false;
        });
        if (conflict) return;

        const pilotBusy = getBusyStatus(pilotId, newTime, flightDate, newOrigin);
        if (pilotBusy.busy) {
            alert(`⚠️ Seçilen pilot atanamaz: ${pilotBusy.msg}`);
            return;
        }

        if (selectedCrewIds.length < 2 || selectedCrewIds.length > 8) {
            alert("⚠️ KABİN EKİBİ HATASI: Uçuşta en az 2, en fazla 8 kabin memuru olmalıdır.");
            return; 
        }

        const routeId = `${newOrigin}-${newDest}`;
        const routeData = routeDurations.find(r => r.id === routeId);
        const duration = routeData ? parseFloat(routeData.duration) : 2.0;

        let newId = "1"; 
        if (isEditing) {
            newId = String(editingFlightId);
        } else if (allFlights.length > 0) {
            const validIds = allFlights.map(f => parseInt(f.id)).filter(id => !isNaN(id));
            if (validIds.length > 0) {
                newId = String(Math.max(...validIds) + 1);
            }
        }

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

                            const currentHours = parseFloat(pData.dailyFlightHours) || 0;
                            const currentFatigue = parseInt(pData.fatiguePoint) || 0;

                            const addedFatigue = Math.round((duration <= 2.5 ? 15 : 20) * nightMultiplier);
                            
                            // 🌟 KALICI KONUM VE DİNAMİK YORGUNLUK BAŞLANGICI 🌟
                            await fetch(`${API_BASE_URL}/personnel/${personId}`, {
                                method: 'PATCH',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    currentLocation: newDest,
                                    dailyFlightHours: parseFloat((currentHours + duration).toFixed(1)),
                                    fatiguePoint: Math.min(currentFatigue + addedFatigue, 100),
                                    status: (currentFatigue + addedFatigue) >= 80 ? "Yorgun" : "Müsait",
                                    risk: (currentFatigue + addedFatigue) >= 80 ? "Yüksek" : ((currentFatigue + addedFatigue) >= 50 ? "Orta" : "Düşük"),
                                    lastDecayTime: new Date().toISOString() // 🌟 BURAYI EKLEDİK! İniş anında kronometreyi başlatıyoruz.
                                })
                            });
                        }
                    }
                    bootstrap.Modal.getInstance(document.getElementById('addFlightModal')).hide();
                    resetFlightForm();
                    await fetchFlights();
                    await loadPersonnelData();
                } else {
                    alert("Uçuş kaydedilemedi! Sunucu ile bağlantıyı kontrol edin.");
                }
            } catch (error) {
                alert("Sunucuya ulaşılamadı. JSON Server'ın açık olduğundan emin olun.");
            }
        };

        if (isEditing) {
            showConfirmModal("Onay", "Bilgileri güncelleyip ekip konumlarını işlemek istiyor musunuz?", handleFlightSave, null, false, "Güncelle");
        } else {
            await handleFlightSave();
        }
    });
}

function setupModalAutocomplete(inputId, hiddenId, dropdownId, dataArray, type) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let currentFocus = -1;

    const renderList = function() {
        const term = input.value.toLocaleLowerCase('tr-TR').trim();
        dropdown.innerHTML = '';
        currentFocus = -1;

        const selectedTime = document.getElementById('flightTime')?.value || "";
        const selectedOrigin = document.getElementById('originInput')?.value || "";
        const selectedDayVal = document.querySelector('input[name="flightDay"]:checked')?.value || 'today';
        const flightDateForBusy = selectedDayVal === 'today' ? getTodayDate() : getTomorrowDate();
        
        const matched = dataArray.filter(item => {
            if (term === "") return true;
            let fullText = "";
            if (type === 'airport') fullText = `${item.code} ${item.name} ${item.city} ${item.country}`;
            else if (type === 'airline') fullText = `${item.code} ${item.name}`;
            else if (type === 'pilot') fullText = item.name;
            else if (type === 'status') fullText = item.name;
            return fullText.toLocaleLowerCase('tr-TR').includes(term);
        });

        if (matched.length === 0) {
            dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-search-minus me-2"></i>Kayıt bulunamadı</li>';
            dropdown.style.display = 'block';
            return;
        }

        matched.forEach(item => {
            const li = document.createElement('li');
            let isItemSelectable = true;

            if (type === 'airport') {
                li.innerHTML = `<b>${item.code}</b> - ${item.name} <small class="text-muted ms-auto">(${item.city})</small>`;
            } 
            else if (type === 'airline') {
                li.innerHTML = `<b>${item.code}</b> - ${item.name}`;
            } 
            else if (type === 'pilot') {
                const status = getBusyStatus(item.id, selectedTime, flightDateForBusy, selectedOrigin);
                if (status.busy) {
                    li.innerHTML = `<span class="text-danger"><i class="fas fa-ban me-2"></i>${item.name} - <small>${status.msg}</small></span>`;
                    li.style.cursor = 'not-allowed';
                    li.style.backgroundColor = '#fef2f2';
                    isItemSelectable = false;
                    li.addEventListener('click', (e) => { e.stopPropagation(); alert(`⚠️ ${item.name} atanamaz: ${status.msg}`); });
                } else {
                    li.innerHTML = `<b><i class="fas fa-user-tie me-2 text-primary"></i>${item.name}</b>`;
                }
            }
            else if (type === 'status') {
                li.innerHTML = `<i class="fas ${item.icon} me-2"></i> <b>${item.name}</b>`;
                if (!isEditing && item.code === "İndi") {
                    li.style.opacity = '0.5';
                    li.style.cursor = 'not-allowed';
                    isItemSelectable = false;
                    li.addEventListener('click', (e) => { e.stopPropagation(); alert("⚠️ Yeni eklenen uçuş henüz kalkmadan 'İndi' girilemez!"); });
                }
            }
            
            if (isItemSelectable) {
                li.addEventListener('click', () => selectItem(item));
            }
            dropdown.appendChild(li);
        });
        dropdown.style.display = 'block';
    };

    function selectItem(item) {
        if (type === 'pilot' || type === 'status') {
            input.value = item.name;
            hidden.value = item.code || item.id;
        } else {
            input.value = `${item.code} - ${item.name}`; 
            hidden.value = item.code; 
        }
        dropdown.style.display = 'none';
        
        if (type === 'airport') document.getElementById('originInput').dispatchEvent(new Event('change'));
        if (type === 'status') populateCrewSelects(); 
    }

    input.addEventListener('input', () => { hidden.value = ''; renderList(); });
    input.addEventListener('focus', renderList);

    input.addEventListener('keydown', function(e) {
        let items = dropdown.getElementsByTagName('li');
        if (!items || items.length === 0 || items[0].innerText.includes("bulunamadı")) return;

        if (e.key === "ArrowDown") { currentFocus++; addActive(items); } 
        else if (e.key === "ArrowUp") { currentFocus--; addActive(items); } 
        else if (e.key === "Enter") {
            e.preventDefault();
            if (currentFocus > -1 && items[currentFocus]) items[currentFocus].click();
        }
    });

    function addActive(items) {
        if (!items) return false;
        removeActive(items);
        let tries = 0;
        while (tries < items.length) {
            if (currentFocus >= items.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (items.length - 1);
            if (items[currentFocus].style.cursor !== 'not-allowed') break; 
            if (event && event.key === "ArrowDown") currentFocus++; else currentFocus--;
            tries++;
        }
        items[currentFocus].classList.add("bg-light"); 
        items[currentFocus].style.color = "#2563eb";
        items[currentFocus].scrollIntoView({ block: "nearest" }); 
    }

    function removeActive(items) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove("bg-light");
            if (items[i].style.cursor !== 'not-allowed') items[i].style.color = "#475569";
        }
    }
}

function populateCrewSelects() {
    const cabinContainer = document.getElementById('cabinCrewList');
    const selectedTime = document.getElementById('flightTime').value;
    const selectedOrigin = document.getElementById('originInput').value;

    const selectedDayVal = document.querySelector('input[name="flightDay"]:checked')?.value || 'today';
    const flightDateForBusy = selectedDayVal === 'today' ? getTodayDate() : getTomorrowDate();

    if (cabinContainer) {
        cabinContainer.innerHTML = '';
        allPersonnel.filter(p => p.role === 'Kabin Memuru').forEach(c => {
            const status = getBusyStatus(c.id, selectedTime, flightDateForBusy, selectedOrigin); 
            const item = document.createElement('div');
            
            item.className = `crew-item ${status.busy ? 'text-danger fw-bold border-danger' : ''}`;
            if(selectedCrewIds.includes(c.id)) item.classList.add('active');
            
            item.innerHTML = `<span>${c.name} <br> <small>${status.busy ? status.msg : ''}</small></span>`;
            
            item.onclick = () => {
                if (status.busy) { alert(`⚠️ ${c.name} atanamaz: ${status.msg}`); return; }
                
                const index = selectedCrewIds.indexOf(c.id);
                if (index > -1) {
                    selectedCrewIds.splice(index, 1);
                    item.classList.remove('active');
                } else {
                    if (selectedCrewIds.length >= 8) { alert("⚠️ Maksimum 8 kabin memuru seçebilirsiniz!"); return; }
                    selectedCrewIds.push(c.id);
                    item.classList.add('active');
                }
                const countEl = document.getElementById('selectedCrewCount');
                if (countEl) countEl.innerText = selectedCrewIds.length;
            };
            cabinContainer.appendChild(item);
        });
    }
}

async function loadPersonnelData() {
    const res = await fetch(`${API_BASE_URL}/personnel`);
    allPersonnel = await res.json();
    populateCrewSelects();
    
    const pilots = allPersonnel.filter(p => p.role === 'Pilot');
    setupModalAutocomplete('pilotText', 'pilotInput', 'pilotDropdown', pilots, 'pilot');
}

async function loadDropdownData() {
    const [airportsRes, airlinesRes, countriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/airports`), fetch(`${API_BASE_URL}/airlines`), fetch(`${API_BASE_URL}/countries`)
    ]);
    globalAirports = await airportsRes.json();
    globalAirlines = await airlinesRes.json();
    globalCountries = await countriesRes.json();
    
    setupModalAutocomplete('airlineCodeText', 'airlineCodeInput', 'airlineDropdown', globalAirlines, 'airline');
    setupModalAutocomplete('originText', 'originInput', 'originDropdown', globalAirports, 'airport');
    setupModalAutocomplete('destText', 'destinationInput', 'destDropdown', globalAirports, 'airport');
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
    const archiveThreshold = getArchiveThresholdDate(); // 🌟 ARŞİV EŞİĞİ 🌟

    const getBadgeLabel = (flight) => {
        if (flight.date < todayStr || flight.status === "İndi") return 'GEÇMİŞ';
        if (flight.date === todayStr) return 'BUGÜN';
        if (flight.date === tomorrowStr) return 'YARIN';
        return 'İLERİ TARİH';
    };

    let filtered = allFlights.filter(f => {
        // 🌟 ARŞİV MANTIĞI: 2 Günden daha eski uçuşları Ana Ekranda (burada) GÖSTERME.
        if (f.date < archiveThreshold) return false; 

        const matchesStatus = statusFilter === "Tüm Durumlar" || f.status === statusFilter;
        const matchesSearch = f.flightNo.toLowerCase().includes(searchTerm.toLowerCase());
        
        const badgeLabel = getBadgeLabel(f);
        let matchesDate = true;
        
        if (activeDateFilter === 'today') matchesDate = badgeLabel === 'BUGÜN';
        else if (activeDateFilter === 'tomorrow') matchesDate = badgeLabel === 'YARIN';
        else if (activeDateFilter === 'past') matchesDate = badgeLabel === 'GEÇMİŞ';

        return matchesStatus && matchesSearch && matchesDate;
    });

    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tableBody.innerHTML = paginated.map(flight => {
        const person = allPersonnel.find(p => String(p.id) === String(flight.pilot));
        const pilotName = person ? person.name : "Tanımsız";

        const badgeLabel = getBadgeLabel(flight);
        let timeStatusBadge = "";
        
        if (badgeLabel === 'GEÇMİŞ') {
            timeStatusBadge = `<span class="badge bg-secondary-subtle text-secondary border me-1" style="font-size: 0.7rem; font-weight: 600;">GEÇMİŞ</span>`;
        } 
        else if (badgeLabel === 'BUGÜN') {
            timeStatusBadge = `<span class="badge bg-info-subtle text-info border border-info me-1" style="font-size: 0.7rem; font-weight: 600;">BUGÜN</span>`;
        } 
        else if (badgeLabel === 'YARIN') {
            timeStatusBadge = `<span class="badge bg-light text-secondary border me-1" style="font-size: 0.7rem; font-weight: 600;">YARIN</span>`;
        } 
        else {
            timeStatusBadge = `<span class="badge bg-light text-secondary border me-1" style="font-size: 0.7rem; font-weight: 600;">İLERİ TARİH</span>`;
        }

        let genderIcon = '<i class="fas fa-question-circle text-secondary fs-5 me-2" title="Bilinmiyor"></i>';
        if (person) {
            genderIcon = person.genderId === "2" 
                ? '<i class="fas fa-user-nurse text-danger fs-5 me-2" title="Kadın"></i>' 
                : '<i class="fas fa-user-tie text-primary fs-5 me-2" title="Erkek"></i>';
        }

        // 🌟 TIME-LOCK VE STATUS-LOCK EKRANA YANSITILMASI 🌟
        const locked = isFlightLocked(flight);
        
        const actionButtons = locked 
            ? `<button class="btn btn-sm btn-outline-secondary" disabled title="Operasyon başladı veya uçuş bitti. Silinemez."><i class="fas fa-lock"></i></button>`
            : `<button class="btn btn-sm btn-outline-danger" onclick="deleteFlight('${flight.id}')"><i class="fas fa-trash"></i></button>`;

        // Güncelle (Edit) butonunu "İndi" veya "İptal" ise kapalı tut
        const editButton = (flight.status === "İndi" || flight.status === "İptal")
            ? `<button class="btn btn-sm btn-outline-secondary me-2" disabled><i class="fas fa-edit"></i></button>`
            : `<button class="btn btn-sm btn-outline-primary me-2" onclick="editFlight('${flight.id}')"><i class="fas fa-edit"></i></button>`;

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
                    <div class="d-flex align-items-center gap-1">
                        ${genderIcon}
                        <span class="fw-semibold">${pilotName}</span>
                    </div>
                </td>
                <td class="text-end">
                    ${editButton}
                    ${actionButtons}
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

    // Maksimum 15 sayfa mantığı
    let startPage = Math.max(1, currentPage - 7);
    let endPage = Math.min(pages, startPage + 14);

    if (endPage - startPage < 14) {
        startPage = Math.max(1, endPage - 14);
    }

    if (startPage > 1) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1); return false;">1</a></li>`;
        if (startPage > 2) el.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        el.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a></li>`;
    }

    if (endPage < pages) {
        if (endPage < pages - 1) el.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${pages}); return false;">${pages}</a></li>`;
    }

    if (currentPage < pages) {
        el.innerHTML += `<li class="page-item"><a class="page-link pagination-arrow" href="#" onclick="changePage(${currentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
    }
}

function changePage(page) { currentPage = page; renderFlightManagementTable(); }

async function editFlight(id) {
    const flight = allFlights.find(f => String(f.id) === String(id));
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
    const al = globalAirlines.find(a => a.code === air);
    document.getElementById('airlineCodeInput').value = air; 
    document.getElementById('airlineCodeText').value = al ? `${al.code} - ${al.name}` : air; 
    document.getElementById('flightNumberInput').value = num;

    const [start, end] = flight.route.split(' > ');
    const oa = globalAirports.find(a => a.code === start);
    document.getElementById('originInput').value = start; 
    document.getElementById('originText').value = oa ? `${oa.code} - ${oa.name}` : start; 
    const da = globalAirports.find(a => a.code === end);
    document.getElementById('destinationInput').value = end; 
    document.getElementById('destText').value = da ? `${da.code} - ${da.name}` : end; 

    document.getElementById('selectedTimeText').innerText = flight.time;
    document.getElementById('flightTime').value = flight.time;
    tempHour = flight.time.split(':')[0];
    document.getElementById('gate').value = flight.gate;
    
    const person = allPersonnel.find(p => String(p.id) === String(flight.pilot));
    document.getElementById('pilotInput').value = flight.pilot;
    document.getElementById('pilotText').value = person ? person.name : "Tanımsız";

    selectedCrewIds = flight.cabinCrew || [];
    document.getElementById('selectedCrewCount').innerText = selectedCrewIds.length; 

    if (flight.date === getTodayDate()) document.getElementById('dayToday').checked = true;
    else if (flight.date === getTomorrowDate()) document.getElementById('dayTomorrow').checked = true;

    document.getElementById('flightStatus').value = flight.status;
    document.getElementById('statusText').value = flight.status;
    
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
    
    document.getElementById('airlineCodeText').value = '';
    document.getElementById('airlineCodeInput').value = '';
    document.getElementById('originText').value = '';
    document.getElementById('originInput').value = '';
    document.getElementById('destText').value = '';
    document.getElementById('destinationInput').value = '';
    document.getElementById('pilotText').value = '';  
    document.getElementById('pilotInput').value = ''; 
    document.getElementById('statusText').value = ''; 
    document.getElementById('flightStatus').value = ''; 

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
    populateCrewSelects();
}

async function deleteFlight(id) {
    // 🌟 KİLİT KONTROLÜNÜ ÇİFT DİKİŞ YAPIYORUZ (SİSTEME SIZMALARI ÖNLEMEK İÇİN)
    const flightToDelete = allFlights.find(f => String(f.id) === String(id));
    if (isFlightLocked(flightToDelete)) {
        alert("⚠️ Güvenlik İhlali: Bu uçuş zaman veya durum kilidi altında olduğu için silinemez!");
        return;
    }

    showConfirmModal(
        "Uçuş Siliniyor", 
        "Seçilen uçuş sistemden silinecek. Onaylıyor musunuz?", 
        async () => {
            await fetch(`${API_BASE_URL}/flights/${id}`, { method: 'DELETE' });
            await fetchFlights();
        },
        null,
        true,   
        "Sil"   
    );
}

// Boş bir yere tıklanınca listeleri kapat
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
        document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
    }
});


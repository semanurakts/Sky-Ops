const API_BASE_URL = 'http://localhost:3000';

let allPersonnel = [];
let allFlights = []; 
let globalAirports = [];
let globalAirlines = [];
let globalCountries = []; 
let routeDurations = [];

// --- BURAYA EKLİYORSUN: TARİH YARDIMCILARI ---
const getFormattedDate = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0]; // Örn: 2026-02-19
};

const TODAY_DATE = getFormattedDate(0);
const TOMORROW_DATE = getFormattedDate(1);
let activeDateFilter = "all"; 
// --------------------------------------------

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

    await loadPersonnelData();   
    await loadDropdownData();    
    await fetchFlights(); 
    await fetchRouteDurations(); 
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

// --- YARDIMCI ZAMAN FONKSİYONLARI ---
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

        // Sadece seçtiğimiz tarihteki uçuşlara bak
        const isSameDate = f.date === selectedDate;
        
        return isSameDate && 
               (String(f.pilot) === String(personId) || (f.cabinCrew && f.cabinCrew.includes(String(personId)))) && 
               f.status !== "İptal" && 
               f.status !== "İndi";
    });

    if (activeFlight) {
        const flightStart = timeToMinutes(activeFlight.time);
        const routeParts = activeFlight.route.split(' > ');
        const routeKey = `${routeParts[0]}-${routeParts[1]}`;
        const routeData = routeDurations.find(r => r.id === routeKey);
        const durationMins = routeData ? (routeData.duration * 60) : 120;
        let safeReturn = flightStart + durationMins + 60;

        if (newStart < safeReturn) { 
            const displaySafeReturn = safeReturn % 1440;
            const hours = Math.floor(displaySafeReturn / 60).toString().padStart(2, '0');
            const mins = (displaySafeReturn % 60).toString().padStart(2, '0');
            return { busy: true, msg: `(MEŞGUL - Dönüş: ${hours}:${mins})` };
        }
    }
    return { busy: false };
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

    // Modalda hangi günün seçili olduğunu kontrol et
    const selectedDay = document.querySelector('input[name="flightDay"]:checked').value;
    const isToday = (selectedDay === 'today');

    hourList.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        const val = h.toString().padStart(2, '0');
        const box = document.createElement('div');
        
        // EĞER BUGÜNSE: Geçmiş saatleri engelle | EĞER YARINSA: Hepsini aç
        const isPastHour = isToday && h < curH;
        
        box.className = `time-box ${isPastHour ? 'disabled' : ''}`;
        box.innerText = val;
        box.onclick = () => {
            if (isPastHour) return; // Güvenlik kilidi
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
            
            // Dakika engellemesi sadece Bugün ve Şu anki saat seçiliyse çalışır
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
    
    // İlk açılışta renderMinutes'u doğru limitlerle çağır
    const initialH = tempHour !== "" ? parseInt(tempHour) : -1;
    renderMinutes(isToday && initialH === curH ? curM : -1);
};
    timeDisplayBox?.addEventListener('show.bs.dropdown', updateTimeOptions);
}

function setupFormControls() {
    const addFlightForm = document.getElementById('addFlightForm');
    const flightNumInput = document.getElementById('flightNumberInput');
    const airlineInput = document.getElementById('airlineCodeInput');
    const originSelect = document.getElementById('originInput');
    const destSelect = document.getElementById('destinationInput');
    const gateInput = document.getElementById('gate');
    const pilotSelect = document.getElementById('pilotName');
    const statusSelect = document.getElementById('flightStatus');

    // 1. STATÜ DEĞİŞİKLİĞİ DİNLEYİCİSİ
    statusSelect?.addEventListener('change', (e) => {
        const newVal = e.target.value;
        if (!isEditing && newVal === "İndi") {
            alert("⚠️ Yeni eklenen bir uçuş henüz kalkmadan 'İndi' olarak girilemez!");
            e.target.value = "Zamanında";
            return;
        }
        if (newVal === "İptal") {
            const confirmCancel = confirm("UYARI: Statüyü 'İptal' olarak seçtiniz...\nDevam etmek istiyor musunuz?");
            if (!confirmCancel) {
                e.target.value = isEditing ? allFlights.find(f => f.id === editingFlightId).status : "Zamanında";
                return;
            }
        }
        if (newVal === "İndi") {
            const confirmLanded = confirm("BİLGİ: Statüyü 'İndi' olarak seçtiniz...\nOnaylıyor musunuz?");
            if (!confirmLanded) {
                e.target.value = isEditing ? allFlights.find(f => f.id === editingFlightId).status : "Zamanında";
                return;
            }
        }
        populateCrewSelects();
    });

    // 2. ARAMA VE DURUM FİLTRESİ DİNLEYİCİLERİ
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

    // --- 3. BURAYA EKLİYORUZ: TARİH FİLTRELEME BUTONLARI ---
    document.querySelectorAll('input[name="dateFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            activeDateFilter = e.target.value; // "all", "today" veya "tomorrow"
            currentPage = 1;
            renderFlightManagementTable(); // Tabloyu anında güncelle
        });
    });
    // ---------------------------------------------------

    if (!addFlightForm) return;

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

    // --- GÜNCELLENMİŞ HAVAYOLU KODU GİRİŞİ (Küçük -> Büyük ve Türkçe Karakter Düzeltme) ---
    airlineInput?.addEventListener('input', (e) => {
        let val = e.target.value;

        // 1. Önce küçük i'leri ve noktalı İ'leri I'ya çevir (Havacılık standardı)
        val = val.replace(/i/g, 'i').replace(/İ/g, 'I').replace(/ı/g, 'I');

        // 2. Diğer Türkçe karakterleri manuel eşle
        const charMap = {
            'ğ': 'G', 'Ğ': 'G', 
            'ü': 'U', 'Ü': 'U', 
            'ş': 'S', 'Ş': 'S', 
            'ö': 'O', 'Ö': 'O', 
            'ç': 'C', 'Ç': 'C'
        };

        let correctedVal = val.split('').map(char => charMap[char] || char).join('');

        // 3. Küçük harfleri BÜYÜK harfe çevir ve sadece A-Z arası harflere izin ver
        correctedVal = correctedVal.toUpperCase().replace(/[^A-Z]/g, '');
        
        e.target.value = correctedVal;

        // Filtreleme ve Dropdown işlemlerine devam et
        const filteredAirlines = globalAirlines.filter(a => a.code.startsWith(correctedVal));
        renderAirlineOptions(filteredAirlines);
        
        const selected = globalAirlines.find(a => a.code === correctedVal);
        if (selected && selected.countryId) {
            const filteredAirports = globalAirports.filter(ap => ap.countryId === selected.countryId);
            populateAirportSelect('originInput', filteredAirports, 'Kalkış');
        } else {
            populateAirportSelect('originInput', globalAirports, 'Kalkış');
        }
    });

    const checkRoute = () => {
        const origin = originSelect.value;
        const dest = destSelect.value;
        if (origin && dest) {
            const istanbulPorts = ["IST", "SAW"];
            let isSameCity = false;
            if (istanbulPorts.includes(origin) && istanbulPorts.includes(dest)) isSameCity = true;
            if (origin === dest) isSameCity = true;
            if (isSameCity) {
                alert("⚠️ Aynı şehir içindeki havalimanları arasında uçuş planlanamaz!");
                destSelect.value = "";
            }
        }
    };
    originSelect?.addEventListener('change', checkRoute);
    destSelect?.addEventListener('change', checkRoute);

    // 1. Yazarken 4 haneden sonrasına izin vermeyen engel (ANLIK)
flightNumInput?.addEventListener('input', (e) => {
    if (e.target.value.length > 4) {
        e.target.value = e.target.value.slice(0, 4);
    }
});

// 2. Kutudan çıkınca formatlayan kısım (MEVCUT)
flightNumInput?.addEventListener('blur', (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) {
        e.target.value = "0001";
    } else {
        // Zaten 4 hane sınırı yukarıda geldi, burada sadece başına sıfır ekler
        e.target.value = val.toString().padStart(4, '0');
    }
});

    addFlightForm.addEventListener('submit', async (e) => {
        e.preventDefault();

    // --- BURAYA EKLİYORUZ: WORKFLOW (DURUM GEÇİŞ) KONTROLLERİ ---
    const oldFlight = isEditing ? allFlights.find(f => f.id === editingFlightId) : null;
    const newStatus = statusSelect.value;

    if (isEditing && oldFlight) {
        // 1. İptal edilmiş bir uçuş hiçbir şeye dönemez
        if (oldFlight.status === "İptal" && newStatus !== "İptal") {
            alert("⚠️ İptal edilmiş bir uçuş tekrar aktif edilemez!");
            return;
        }

        // 2. İnmiş bir uçuş hiçbir şeye dönemez
        if (oldFlight.status === "İndi" && newStatus !== "İndi") {
            alert("⚠️ Uçuş 'İndi' durumuna ulaştıktan sonra geçmişe dönük değiştirilemez!");
            return;
        }

        // 3. İptal edilmiş bir uçuş "İndi" yapılamaz
        if (oldFlight.status === "İptal" && newStatus === "İndi") {
            alert("⚠️ Hiç gerçekleşmemiş (İptal edilmiş) bir uçuş 'İndi' olarak işaretlenemez!");
            return;
        }
    }

    // --- 2. ADIM: BURAYA EKLİYORUZ: ÇAKIŞMA ÖNLEYİCİ FİLTRE (CONFLICT PREVENTION) ---
        const newFlightNo = `${airlineInput.value}-${flightNumInput.value.padStart(4, '0')}`;
        const newGate = gateInput.value;
        const newOrigin = originSelect.value;
        const newDest = destSelect.value;
        const newTime = document.getElementById('flightTime').value; // flightTime değişkeni aşağıda tanımlı, burada formdan alıyoruz
        const newTimeMins = timeToMinutes(newTime);

        // ROTA KONTROLÜ (Aynı yer olamaz)
        if (newOrigin === newDest) {
            alert("⚠️ HATA: Kalkış ve Varış noktası aynı olamaz!");
            return;
        }

        const conflict = allFlights.find(f => {
            if (isEditing && f.id === editingFlightId) return false; 
            if (f.status === "İptal" || f.status === "İndi") return false; 

            // AYNI UÇUŞ NUMARASI (Duplicate Flight Number)
            if (f.flightNo === newFlightNo) {
                alert(`⚠️ HATA: ${newFlightNo} numaralı uçuş şu an zaten aktif!`);
                return true;
            }

            // KAPI ÇAKIŞMASI (Gate Conflict)
            const fOrigin = f.route.split(' > ')[0];
            const fTimeMins = timeToMinutes(f.time);
            const timeDiff = Math.abs(fTimeMins - newTimeMins);

            if (fOrigin === newOrigin && f.gate === newGate && timeDiff < 45) {
                alert(`⚠️ KAPI ÇAKIŞMASI: ${newGate} numaralı kapı ${f.time} saatindeki uçuş tarafından kullanılıyor! (En az 45 dk ara olmalı)`);
                return true;
            }
            return false;
        });

        if (conflict) return; 
        // -----------------------------------------------------------------------------

    // 3. ADIM: MEVCUT KONTROLLERİN DEVAMI (Pilot/Ekip meşguliyet vb.)

    // Mevcut kodların buradan itibaren devam ediyor...
    const pilotValue = pilotSelect.value;
    const statusValue = statusSelect.value;
    const flightTime = document.getElementById('flightTime').value;

        const gateRegex = /^[A-Z]-[0-9]+$/;
        if (!gateRegex.test(gateInput.value)) {
            alert("⚠️ Lütfen geçerli bir kapı numarası giriniz! (Örnek: A-01)");
            gateInput.focus();
            return;
        }

        const pilotBusy = getBusyStatus(pilotValue, flightTime);
        if (pilotBusy.busy) {
            alert(`⚠️ Seçilen pilot bu saatte uygun değil! ${pilotBusy.msg}`);
            return;
        }

        for (let crewId of selectedCrewIds) {
            const crewBusy = getBusyStatus(crewId, flightTime);
            if (crewBusy.busy) {
                alert(`⚠️ Kabin ekibinden bir personel bu saatte uygun değil!`);
                return;
            }
        }

        if (!pilotValue || pilotValue === "") { alert("Lütfen geçerli bir pilot seçiniz!"); pilotSelect.focus(); return; }
        if (!statusValue || statusValue === "") { alert("Lütfen geçerli bir uçuş durumu seçiniz!"); statusSelect.focus(); return; }
        if (!flightTime) { alert("Lütfen uçuş saatini seçiniz!"); return; }
        if (selectedCrewIds.length < 2 || selectedCrewIds.length > 8) { document.getElementById('crewValidationMsg').classList.remove('d-none'); 
            return; 
        }
        
        const routeId = `${originSelect.value}-${destSelect.value}`;
        const routeData = routeDurations.find(r => r.id === routeId);
        const duration = routeData ? routeData.duration : 2.0;

        // --- BURAYA EKLİYORSUN: GÜN SEÇİMİ VE PAYLOAD GÜNCELLEMESİ ---
        const selectedDayVal = document.querySelector('input[name="flightDay"]:checked').value;
        const flightDate = selectedDayVal === 'today' ? TODAY_DATE : TOMORROW_DATE;

        const payload = {
            id: isEditing ? editingFlightId : (allFlights.length > 0 ? (Math.max(...allFlights.map(f => parseInt(f.id))) + 1).toString() : "1"),
            flightNo: `${airlineInput.value}-${flightNumInput.value.padStart(4, '0')}`,
            route: `${originSelect.value} > ${destSelect.value}`,
            time: flightTime,
            date: flightDate, // Yeni eklenen tarih alanı
            gate: gateInput.value,
            pilot: pilotValue,
            cabinCrew: selectedCrewIds,
            status: statusValue
        };

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_BASE_URL}/flights/${editingFlightId}` : `${API_BASE_URL}/flights`;

        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            if (statusValue !== "İptal") {
                const teamIds = [pilotValue, ...selectedCrewIds];
                for (const personId of teamIds) {
                    const p = allPersonnel.find(per => per.id == personId);
                    if (p) {
                        const newDailyHours = (p.dailyFlightHours || 0) + duration;
                        const newFatigue = Math.min(Math.round((newDailyHours / 14) * 100), 100);
                        
                        await fetch(`${API_BASE_URL}/personnel/${personId}`, {
                            method: 'PATCH',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                dailyFlightHours: newDailyHours,
                                fatiguePoint: newFatigue,
                                status: newFatigue > 80 ? "Yorgun" : "Müsait",
                                risk: newFatigue > 80 ? "Yüksek" : (newFatigue > 50 ? "Orta" : "Düşük")
                            })
                        });
                    }
                }
            }
            bootstrap.Modal.getInstance(document.getElementById('addFlightModal')).hide();
            resetFlightForm();
            await fetchFlights();
            await loadPersonnelData();
        }
    });

    document.getElementById('globalSearchInput')?.addEventListener('input', (e) => { searchTerm = e.target.value; currentPage=1; renderFlightManagementTable(); });
    document.getElementById('statusFilterSelect')?.addEventListener('change', (e) => { statusFilter = e.target.value; currentPage=1; renderFlightManagementTable(); });
}

function populateCrewSelects() {
    const pilotSelect = document.getElementById('pilotName');
    const cabinContainer = document.getElementById('cabinCrewList');
    const selectedTime = document.getElementById('flightTime').value;

    if (pilotSelect) {
        const currentVal = pilotSelect.value;
        pilotSelect.innerHTML = '<option value="" selected>Pilot Seçiniz...</option>';
        allPersonnel.filter(p => p.role === 'Pilot').forEach(p => {
            const status = getBusyStatus(p.id, selectedTime);
            const opt = new Option(`${p.name} ${status.busy ? status.msg : ''}`, p.id);
            if (status.busy) opt.style.color = "red";
            pilotSelect.options.add(opt);
        });
        pilotSelect.value = currentVal;
    }

    if (cabinContainer) {
        cabinContainer.innerHTML = '';
        allPersonnel.filter(p => p.role === 'Kabin Memuru').forEach(c => {
            const status = getBusyStatus(c.id, selectedTime);
            const item = document.createElement('div');
            item.className = `crew-item ${status.busy ? 'text-danger fw-lighter' : ''}`;
            if(selectedCrewIds.includes(c.id)) item.classList.add('active');
            item.innerHTML = `<span>${c.name} ${status.busy ? status.msg : ''}</span>`;
            item.onclick = () => {
                if (status.busy) { alert("Bu personel belirtilen saatte başka bir uçuşta meşgul!"); return; }
                const index = selectedCrewIds.indexOf(c.id);
                if (index > -1) {
                    selectedCrewIds.splice(index, 1);
                    item.classList.remove('active');
                } else {
                    if (selectedCrewIds.length >= 8) { alert("Maksimum 8 memur!"); return; }
                    selectedCrewIds.push(c.id);
                    item.classList.add('active');
                }
                document.getElementById('selectedCrewCount').innerText = selectedCrewIds.length;
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
    allFlights.sort((a, b) => parseInt(b.id) - parseInt(a.id));
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
    // --- BURAYI GÜNCELLİYORSUN ---
    let filtered = allFlights.filter(f => {
        const matchesStatus = statusFilter === "Tüm Durumlar" || f.status === statusFilter;
        const matchesSearch = f.flightNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             f.route.toLowerCase().includes(searchTerm.toLowerCase());
        
        // TARİH FİLTRESİ (YENİ)
        let matchesDate = true;
        if (activeDateFilter === 'today') matchesDate = f.date === TODAY_DATE;
        if (activeDateFilter === 'tomorrow') matchesDate = f.date === TOMORROW_DATE;

        return matchesStatus && matchesSearch && matchesDate;
    });
    // -----------------------------
    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    tableBody.innerHTML = paginated.map(flight => {
        const person = allPersonnel.find(p => String(p.id) === String(flight.pilot));
        const pilotName = person ? person.name : "Tanımsız";
        return `
            <tr class="align-middle">
        <td class="fw-bold text-dark font-monospace">${flight.flightNo}</td>
        <td>${flight.route}</td>
        
        <td>
            <span class="badge ${flight.date === TODAY_DATE ? 'text-info' : 'text-secondary'} p-0 me-1" style="font-size: 0.75rem; font-weight: 600;">
                ${flight.date === TODAY_DATE ? 'Bugün' : 'Yarın'}
            </span>
            <span class="fw-bold text-dark font-monospace" style="font-size: 0.95rem;">${flight.time}</span>
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
        const country = globalCountries.find(c => c.id === airline.countryId);
        return `<option value="${airline.code}">${airline.code} (${country ? country.name : airline.countryId}) - ${airline.name}</option>`;
    }).join('');
}

async function editFlight(id) {
    const flight = allFlights.find(f => f.id === id);
    if(!flight) return;

    // --- Terminal Durum Kontrolü ---
    if (flight.status === "İptal" || flight.status === "İndi") {
        alert(`⚠️ Bu uçuş ${flight.status} olarak işaretlendiği için artık üzerinde değişiklik yapılamaz.`);
        return;
    }

    isEditing = true;
    editingFlightId = id;

    // --- BAŞLIK VE BUTON DÜZENLEMESİ (GÜNCELLEME MODU) ---
    document.querySelector('.modal-title').innerHTML = `<i class="fas fa-edit me-2 text-success"></i>Uçuş Güncelle`;
    const submitBtn = document.querySelector('#addFlightForm button[type="submit"]');
    if(submitBtn) { 
        submitBtn.textContent = 'Güncelle'; 
        submitBtn.classList.remove('btn-primary');
        submitBtn.classList.add('btn-success'); 
    }

    // Veri atamaları
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

    // --- BURAYA EKLİYORSUN: DÜZENLEME MODUNDA GÜN SEÇİMİ ---
    if (flight.date === TODAY_DATE) {
        document.getElementById('dayToday').checked = true;
    } else if (flight.date === TOMORROW_DATE) {
        document.getElementById('dayTomorrow').checked = true;
    }
    // ----------------------------------------------------- 

    // --- DURUM SEÇİM KUTUSU DÜZENLEMESİ ---
    const statusSelect = document.getElementById('flightStatus');
    const indiOptionEl = statusSelect.querySelector('option[value="İndi"]');
    
    if (indiOptionEl) {
        indiOptionEl.style.display = "block"; // Tekrar göster
        indiOptionEl.disabled = false;        // Tıklanabilir yap
    }
    
    // Sonra uçuşun kendi statüsünü seçiyoruz
    statusSelect.value = flight.status;
    
    populateCrewSelects();
    new bootstrap.Modal(document.getElementById('addFlightModal')).show();
}

async function deleteFlight(id) {
    if(confirm('Silmek istediğine emin misin?')) {
        await fetch(`${API_BASE_URL}/flights/${id}`, { method: 'DELETE' });
        await fetchFlights();
    }
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
    document.getElementById('crewValidationMsg').classList.add('d-none');
    
    // --- BAŞLIK VE BUTON DÜZENLEMESİ (EKLEME MODU) ---
    document.querySelector('.modal-title').innerHTML = `<i class="fas fa-plane-arrival me-2 text-primary"></i>Yeni Uçuş Ekle`;
    const submitBtn = document.querySelector('#addFlightForm button[type="submit"]');
    if(submitBtn) { 
        submitBtn.textContent = 'Kaydı Tamamla'; 
        submitBtn.classList.remove('btn-success'); // Yeşili kaldır
        submitBtn.classList.add('btn-primary');    // Maviyi ekle
    }

    populateAirportSelect('originInput', globalAirports, 'Kalkış');
    populateAirportSelect('destinationInput', globalAirports, 'Varış');
    renderAirlineOptions(globalAirlines);
    populateCrewSelects();

    // --- BURAYI KONTROL ET VE GÜNCELLE ---
    const statusSelectEl = document.getElementById('flightStatus');
    const indiOpt = statusSelectEl.querySelector('option[value="İndi"]');
    
    if (indiOpt) {
        indiOpt.disabled = true;        // Kesinlikle tıklanamaz yapar
        indiOpt.style.display = "none";  // Listede görünmez yapar
    }
    
    // "Varsayılan durum Zamanında olsun" dediğimiz yer burası:
    statusSelectEl.value = "Zamanında"; 
}
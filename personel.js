const API_URL = 'http://localhost:3000/personnel';
const FLIGHTS_API_URL = 'http://localhost:3000/flights'; 

let allPersonnel = [];
let allFlights = []; 
let isEditMode = false; 
let currentEditId = null;  
let confirmCallback = null; 

// 🌟 YENİ: SABİT VERİ LİSTELERİ 🌟
const roleDataList = [
    { code: 'Pilot', name: 'Pilot', icon: 'fa-plane' },
    { code: 'Kabin Memuru', name: 'Kabin Memuru', icon: 'fa-users' }
];
const genderDataList = [
    { code: '1', name: 'Erkek', icon: 'fa-mars text-primary' },
    { code: '2', name: 'Kadın', icon: 'fa-venus text-danger' }
];

function showConfirmModal(title, body, callback, isDeleteAction = false, btnText = "Onayla") {
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalBody').innerText = body;
    const confirmBtn = document.getElementById('confirmBtnAction');
    const confirmIcon = document.getElementById('confirmIcon');
    
    confirmBtn.innerText = btnText;
    confirmBtn.classList.remove('btn-danger', 'btn-primary', 'btn-success');
    
    if (isDeleteAction) { 
        confirmBtn.classList.add('btn-danger'); 
        confirmIcon.className = "mb-3 text-danger"; 
    }
    else if (btnText === "Güncelle") { 
        confirmBtn.classList.add('btn-success'); 
        confirmIcon.className = "mb-3 text-success"; 
    }
    else { 
        confirmBtn.classList.add('btn-primary'); 
        confirmIcon.className = "mb-3 text-primary"; 
    }
    
    confirmCallback = callback;
    new bootstrap.Modal(document.getElementById('confirmModal')).show();
}

let currentPage = 1;
const rowsPerPage = 15;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmBtnAction')?.addEventListener('click', async () => {
        if (confirmCallback) {
            const btn = document.getElementById('confirmBtnAction');
            const originalText = btn.innerText;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bekleyin...';
            btn.disabled = true;

            await confirmCallback(); 
            
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        bootstrap.Modal.getInstance(document.getElementById('confirmModal'))?.hide();
    });

    // 🌟 ADMİN ÇIKIŞ YAPMA İŞLEMİ (ŞIK MODAL İLE) 🌟
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const logoutModal = new bootstrap.Modal(document.getElementById('adminLogoutModal'));
            logoutModal.show();
        });
    }

    const btnConfirmAdminLogout = document.getElementById('btnConfirmAdminLogout');
    if (btnConfirmAdminLogout) {
        btnConfirmAdminLogout.addEventListener('click', () => {
            btnConfirmAdminLogout.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Çıkılıyor...';
            btnConfirmAdminLogout.disabled = true;
            setTimeout(() => { window.location.href = 'login.html'; }, 600);
        });
    }

    startLiveClock();
    fetchPersonnel();
    fetchFlights(); 
    setupPersonnelFormControls();
    setupFilters();
    
    // 🌟 AUTOCOMPLETE MOTORLARINI BAŞLAT 🌟
    setupModalAutocomplete('staffRoleText', 'staffRole', 'roleDropdown', roleDataList);
    setupModalAutocomplete('genderText', 'personnelGender', 'genderDropdown', genderDataList);

    document.getElementById('addPersonnelModal')?.addEventListener('hidden.bs.modal', resetFormToDefault);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
        }
    });
});

function startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    const update = () => { if(clockEl) clockEl.textContent = new Date().toLocaleTimeString('tr-TR'); };
    setInterval(update, 1000);
}

const getTodayDate = () => new Date().toISOString().split('T')[0];

async function fetchPersonnel() {
    try {
        const response = await fetch(API_URL);
        allPersonnel = await response.json();
        allPersonnel.sort((a, b) => parseInt(b.id || 0) - parseInt(a.id || 0));
        applyFiltersAndRender();
    } catch (error) { console.error("Hata:", error); }
}

async function fetchFlights() {
    try {
        const response = await fetch(FLIGHTS_API_URL);
        allFlights = await response.json();
    } catch (error) { console.error("Uçuşları çekerken hata:", error); }
}

function setupFilters() {
    document.querySelector('.search-box input')?.addEventListener('input', () => { currentPage = 1; applyFiltersAndRender(); });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPage = 1;
            applyFiltersAndRender();
        });
    });
}

function applyFiltersAndRender() {
    const term = document.querySelector('.search-box input')?.value.toLowerCase().trim() || "";
    const activeFilter = document.querySelector('.filter-btn.active')?.textContent.trim();
    const filtered = allPersonnel.filter(p => {
        const matchesTerm = p.name.toLowerCase().includes(term) || p.id.toString().includes(term);
        let matchesRole = true;
        if (activeFilter === 'Pilotlar') matchesRole = p.role === 'Pilot';
        else if (activeFilter === 'Kabin Ekibi') matchesRole = p.role === 'Kabin Memuru';
        return matchesTerm && matchesRole;
    });
    const paginatedData = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    renderPersonnelTable(paginatedData);
    renderPaginationControls(filtered.length);
    updatePersonnelKPIs(allPersonnel);
}

function renderPersonnelTable(data) {
    const tableBody = document.getElementById('personnelTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = data.map(p => {
        const fatigue = p.fatiguePoint || 0;
        const flightHours = p.dailyFlightHours ? parseFloat(p.dailyFlightHours).toFixed(1) : "0.0";
        let barClass = fatigue > 80 ? 'bg-danger' : (fatigue > 50 ? 'bg-warning' : 'bg-success');
        
        const genderIcon = p.genderId === "1" 
            ? '<i class="fas fa-user-tie text-primary fs-5 me-2" title="Erkek"></i>' 
            : '<i class="fas fa-user-nurse text-danger fs-5 me-2" title="Kadın"></i>';

        return `
        <tr class="align-middle">
            <td>
                <div class="d-flex align-items-center">
                    ${genderIcon}
                    <div>
                        <b>${p.name}</b><br><small class="text-muted">ID: ${p.id}</small>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-light text-dark border px-2 py-1">${p.role}</span></td>
            <td><span class="fw-bold">${flightHours}</span> Saat</td>
            <td style="width: 25%;">
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="height:8px; border-radius: 4px; background-color: #e9ecef;">
                        <div class="progress-bar ${barClass}" role="progressbar" style="width: ${fatigue}%"></div>
                    </div>
                    <small class="fw-bold text-dark" style="min-width: 35px;">%${fatigue}</small>
                </div>
            </td>
            <td><span class="badge ${fatigue >= 80 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} rounded-pill px-3">${p.status}</span></td>
            <td class="text-end">
                <button class="btn btn-outline-secondary btn-sm me-1" onclick="viewProfile('${p.id}')" title="Profili Görüntüle">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline-primary btn-sm me-1" onclick="editPersonnel('${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-outline-danger btn-sm" onclick="deletePersonnel('${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function viewProfile(id) {
    const person = allPersonnel.find(p => String(p.id) === String(id));
    if (!person) return;

    document.getElementById('profileName').textContent = person.name;
    document.getElementById('profileId').textContent = person.id;
    document.getElementById('profileRoleBadge').textContent = person.role;
    
    const fatigue = person.fatiguePoint || 0;
    const flightHours = person.dailyFlightHours ? parseFloat(person.dailyFlightHours).toFixed(1) : "0.0";
    
    document.getElementById('profileFlightHours').textContent = flightHours;
    document.getElementById('profileFatigue').textContent = `%${fatigue}`;

    const statusBadge = document.getElementById('profileStatusBadge');
    statusBadge.textContent = person.status || "Müsait";
    statusBadge.className = `badge rounded-pill px-3 py-2 ${fatigue >= 80 ? 'bg-danger' : (fatigue >= 50 ? 'bg-warning text-dark' : 'bg-success')}`;

    const avatarIcon = document.getElementById('profileAvatarIcon');
    const genderBadge = document.getElementById('profileGenderBadge');
    
    if (person.genderId === "1") { 
        avatarIcon.innerHTML = '<i class="fas fa-user-tie"></i>';
        avatarIcon.className = "profile-avatar text-primary";
        genderBadge.innerHTML = '<i class="fas fa-mars"></i>';
        genderBadge.className = "gender-badge text-primary";
    } else { 
        avatarIcon.innerHTML = '<i class="fas fa-user-nurse"></i>';
        avatarIcon.className = "profile-avatar text-danger";
        genderBadge.innerHTML = '<i class="fas fa-venus"></i>';
        genderBadge.className = "gender-badge text-danger";
    }

    const historyContainer = document.getElementById('profileFlightHistory');
    
    const personFlights = allFlights.filter(f => 
        String(f.pilot) === String(id) || 
        (f.cabinCrew && f.cabinCrew.includes(String(id)))
    ).sort((a, b) => new Date(b.date) - new Date(a.date)); 

    if (personFlights.length > 0) {
        const top5Flights = personFlights.slice(0, 5);
        historyContainer.innerHTML = top5Flights.map(f => {
            let statusColor = f.status === "İndi" ? "text-primary" : (f.status === "İptal" ? "text-danger" : "text-success");
            return `
                <div class="timeline-item">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-dark font-monospace">${f.flightNo}</strong>
                        <span class="small ${statusColor} fw-bold">${f.status}</span>
                    </div>
                    <div class="small text-muted d-flex justify-content-between">
                        <span><i class="fas fa-map-marker-alt me-1"></i>${f.route}</span>
                        <span><i class="far fa-calendar-alt me-1"></i>${f.date} | ${f.time}</span>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        historyContainer.innerHTML = `
            <div class="text-center text-muted py-3 small">
                <i class="fas fa-plane-slash mb-2 fs-4"></i><br>
                Henüz uçuş kaydı bulunmuyor.
            </div>
        `;
    }

    const offcanvasEl = document.getElementById('profileOffcanvas');
    const offcanvas = new bootstrap.Offcanvas(offcanvasEl);
    offcanvas.show();
}

function setupPersonnelFormControls() {
    document.getElementById('addPersonnelForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('staffRole').value;
        const gender = document.getElementById('personnelGender').value;

        if(!role || !gender) {
            alert("⚠️ Lütfen Görev ve Cinsiyet alanlarını listeden seçiniz.");
            return;
        }

        const newId = isEditMode ? currentEditId : (allPersonnel.length > 0 ? (Math.max(...allPersonnel.map(p => parseInt(p.id) || 0)) + 1).toString() : "1");
        const payload = {
            id: newId, 
            name: document.getElementById('staffName').value,
            role: role,
            genderId: gender,
            lastUpdate: getTodayDate()
        };
        if (!isEditMode) {
            payload.flightHours = 0; payload.dailyFlightHours = 0; payload.fatiguePoint = 0;
            payload.status = "Müsait"; payload.risk = "Düşük";
        }
        const url = isEditMode ? `${API_URL}/${currentEditId}` : API_URL;
        const method = isEditMode ? 'PATCH' : 'POST';
        const saveProcess = async () => {
            const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('addPersonnelModal')).hide(); fetchPersonnel(); }
        };
        if (isEditMode) showConfirmModal("Bilgileri Güncelle", "Onaylıyor musunuz?", saveProcess, false, "Güncelle");
        else await saveProcess();
    });
}

// 🌟 KLAVYE DESTEKLİ EVRENSEL MOTOR 🌟
function setupModalAutocomplete(inputId, hiddenId, dropdownId, dataArray) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let currentFocus = -1;

    const renderList = function() {
        const term = input.value.toLocaleLowerCase('tr-TR').trim();
        dropdown.innerHTML = '';
        currentFocus = -1;
        
        const matched = dataArray.filter(item => {
            if (term === "") return true;
            return item.name.toLocaleLowerCase('tr-TR').includes(term);
        });

        if (matched.length === 0) {
            dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-search-minus me-2"></i>Kayıt bulunamadı</li>';
            dropdown.style.display = 'block';
            return;
        }

        matched.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fas ${item.icon} me-2 text-muted"></i> <b>${item.name}</b>`;
            
            li.addEventListener('click', () => {
                selectItem(item);
            });
            dropdown.appendChild(li);
        });
        dropdown.style.display = 'block';
    };

    function selectItem(item) {
        input.value = item.name; 
        hidden.value = item.code; 
        dropdown.style.display = 'none';
    }

    input.addEventListener('input', () => { hidden.value = ''; renderList(); });
    input.addEventListener('focus', renderList);

    input.addEventListener('keydown', function(e) {
        let items = dropdown.getElementsByTagName('li');
        if (!items || items.length === 0 || items[0].innerText.includes("bulunamadı")) return;

        if (e.key === "ArrowDown") {
            currentFocus++;
            addActive(items);
        } else if (e.key === "ArrowUp") {
            currentFocus--;
            addActive(items);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (currentFocus > -1) {
                if (items[currentFocus]) items[currentFocus].click();
            }
        }
    });

    function addActive(items) {
        if (!items) return false;
        removeActive(items);
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (items.length - 1);
        items[currentFocus].classList.add("bg-light"); 
        items[currentFocus].style.color = "#2563eb";
        items[currentFocus].scrollIntoView({ block: "nearest" }); 
    }

    function removeActive(items) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove("bg-light");
            items[i].style.color = "#475569";
        }
    }
}


async function editPersonnel(id) {
    const person = allPersonnel.find(p => String(p.id) === String(id));
    if (!person) return;
    isEditMode = true; currentEditId = id;
    
    document.getElementById('staffName').value = person.name;

    // Gizli Inputları Doldur
    document.getElementById('staffRole').value = person.role;
    document.getElementById('personnelGender').value = person.genderId || "";

    // Ekranda Görünen Text Inputları Doldur
    document.getElementById('staffRoleText').value = person.role;
    const genderObj = genderDataList.find(g => g.code === person.genderId);
    document.getElementById('genderText').value = genderObj ? genderObj.name : "";
    
    document.querySelector('#addPersonnelModal .modal-title').innerHTML = '<i class="fas fa-edit me-2 text-success"></i>Personel Güncelle';
    const submitBtn = document.querySelector('#addPersonnelForm button[type="submit"]');
    if (submitBtn) { submitBtn.textContent = 'Güncelle'; submitBtn.classList.replace('btn-primary', 'btn-success'); }
    new bootstrap.Modal(document.getElementById('addPersonnelModal')).show();
}

function resetFormToDefault() {
    isEditMode = false; currentEditId = null;
    document.getElementById('addPersonnelForm')?.reset();
    
    // Gizli ve Text Inputları temizle
    document.getElementById('staffRole').value = '';
    document.getElementById('staffRoleText').value = '';
    document.getElementById('personnelGender').value = '';
    document.getElementById('genderText').value = '';

    document.querySelector('#addPersonnelModal .modal-title').innerHTML = '<i class="fas fa-user-plus me-2 text-primary"></i>Yeni Personel Kaydı';
    const submitBtn = document.querySelector('#addPersonnelForm button[type="submit"]');
    if (submitBtn) { submitBtn.textContent = 'Kaydı Tamamla'; submitBtn.classList.replace('btn-success', 'btn-primary'); }
}

async function deletePersonnel(id) {
    showConfirmModal("Siliniyor", "Emin misiniz?", async () => {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        await fetchPersonnel();
    }, true, "Sil");
}

document.getElementById('deleteAllPersonnelBtn')?.addEventListener('click', () => {
    showConfirmModal("KRİTİK TEMİZLİK", "Tüm personeller silinecek. Onaylıyor musunuz?", async () => {
        for (const p of allPersonnel) { 
            await fetch(`${API_URL}/${p.id}`, { method: 'DELETE' }); 
        }
        await fetchPersonnel(); 
    }, true, "Tümünü Sil");
});

function renderPaginationControls(total) {
    const el = document.getElementById('paginationControls'); const pages = Math.ceil(total / rowsPerPage); el.innerHTML = '';
    if (pages <= 1) return;
    if (currentPage > 1) el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a></li>`;
    for (let i = 1; i <= pages; i++) el.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a></li>`;
    if (currentPage < pages) el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
}

function changePage(page) { currentPage = page; applyFiltersAndRender(); window.scrollTo(0, 0); }

function updatePersonnelKPIs(data) {
    const totalEl = document.getElementById('totalStaffCount');
    const availEl = document.getElementById('availableStaffCount');
    const riskyEl = document.getElementById('riskyStaffCount');
    if (totalEl) totalEl.textContent = data.length;
    if (availEl) availEl.textContent = data.filter(x => x.status === 'Müsait').length;
    if (riskyEl) riskyEl.textContent = data.filter(x => (x.fatiguePoint || 0) >= 80).length;
}

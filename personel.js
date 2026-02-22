const API_URL = 'http://localhost:3000/personnel';
let allPersonnel = [];
let isEditMode = false;
let currentEditId = null;
let confirmCallback = null;

// --- ÖZEL MODAL YÖNETİCİSİ (Renk ve Metin Duyarlı) ---
function showConfirmModal(title, body, callback, isDeleteAction = false, btnText = "Onayla") {
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalBody').innerText = body;
    
    const confirmBtn = document.getElementById('confirmBtnAction');
    const confirmIcon = document.getElementById('confirmIcon');
    confirmBtn.innerText = btnText;

    confirmBtn.classList.remove('btn-danger', 'btn-primary', 'btn-success');

    if (isDeleteAction) {
        confirmBtn.classList.add('btn-danger'); // Silme: Kırmızı
        confirmIcon.className = "mb-3 text-danger";
    } else if (btnText === "Güncelle") {
        confirmBtn.classList.add('btn-success'); // Güncelleme: Yeşil
        confirmIcon.className = "mb-3 text-success";
    } else {
        confirmBtn.classList.add('btn-primary'); // Standart: Mavi
        confirmIcon.className = "mb-3 text-primary";
    }

    confirmCallback = callback;
    new bootstrap.Modal(document.getElementById('confirmModal')).show();
}

let currentPage = 1;
const rowsPerPage = 15;

document.addEventListener('DOMContentLoaded', () => {
    // MODAL ONAY BUTONU DİNLEYİCİSİ
    document.getElementById('confirmBtnAction')?.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        const modalEl = document.getElementById('confirmModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    });

    startLiveClock();
    fetchPersonnel();
    setupPersonnelFormControls();
    setupFilters();

    const modalEl = document.getElementById('addPersonnelModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            resetFormToDefault(); // Modal her kapandığında formu temizle ve "Yeni Kayıt" moduna dön
        });
    }
});

function startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    const update = () => { clockEl.textContent = new Date().toLocaleTimeString('tr-TR'); };
    update();
    setInterval(update, 1000);
}

const TODAY_DATE = new Date().toISOString().split('T')[0];

async function fetchPersonnel() {
    try {
        const response = await fetch(API_URL);
        allPersonnel = await response.json();
        allPersonnel.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        applyFiltersAndRender();
    } catch (error) { console.error("Veri çekme hatası:", error); }
}

function setupFilters() {
    const searchInput = document.querySelector('.search-box input');
    const filterBtns = document.querySelectorAll('.filter-btn');

    searchInput?.addEventListener('input', () => { currentPage = 1; applyFiltersAndRender(); });
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPage = 1;
            applyFiltersAndRender();
        });
    });
}

function applyFiltersAndRender() {
    const searchInput = document.querySelector('.search-box input');
    const activeFilter = document.querySelector('.filter-btn.active')?.textContent.trim();
    
    const normalize = (text) => text.toString().toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim();
    const term = searchInput ? normalize(searchInput.value) : "";

    const filtered = allPersonnel.filter(p => {
        const nameMatch = normalize(p.name).includes(term);
        const idMatch = normalize(p.id).includes(term);
        let matchesRole = true;
        if (activeFilter === 'Pilotlar') matchesRole = p.role === 'Pilot';
        else if (activeFilter === 'Kabin Ekibi') matchesRole = p.role === 'Kabin Memuru';
        return (nameMatch || idMatch) && matchesRole;
    });

    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filtered.slice(startIndex, startIndex + rowsPerPage);
    renderPersonnelTable(paginatedData);

    // BUNU EKLE: Butonları ekrana basması için çağırıyoruz
    renderPaginationControls(filtered.length);

    // BUNU EKLE: Kartlardaki sayıları güncelle
    updatePersonnelKPIs(allPersonnel);
}

// Fonksiyonun içinde bul ve şu şekilde güncelle:
function renderPersonnelTable(data) {
    const tableBody = document.getElementById('personnelTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = data.map(p => {
        const fatigue = p.fatiguePoint || 0;
        
        // --- YENİ: Ondalık Kısmı Tek Hane Yapıyoruz ---
        // dailyFlightHours varsa virgülden sonra 1 hane al, yoksa 0 yaz.
        const flightHours = p.dailyFlightHours ? parseFloat(p.dailyFlightHours).toFixed(1) : 0;

        let barClass = 'bg-success'; 
        if (fatigue > 50 && fatigue <= 80) barClass = 'bg-warning'; 
        else if (fatigue > 80) barClass = 'bg-danger'; 

        return `
        <tr class="align-middle">
            <td><b>${p.name}</b><br><small class="text-muted">ID: ${p.id}</small></td>
            <td><span class="badge bg-light text-dark border">${p.role}</span></td>
            
            <td>${flightHours} Saat</td>
            
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="height:8px; border-radius: 4px; background-color: #e9ecef;">
                        <div class="progress-bar ${barClass}" role="progressbar" style="width: ${fatigue}%"></div>
                    </div>
                    <small class="fw-bold text-dark">%${fatigue}</small>
                </div>
            </td>
            <td><span class="badge ${fatigue > 80 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} rounded-pill px-3">${p.status}</span></td>
            <td class="text-end">
                <button class="btn btn-outline-primary btn-sm" onclick="editPersonnel('${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-outline-danger btn-sm" onclick="deletePersonnel('${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function setupPersonnelFormControls() {
    const form = document.getElementById('addPersonnelForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('staffName').value,
            role: document.getElementById('staffRole').value,
            lastUpdate: TODAY_DATE
        };

        const url = isEditMode ? `${API_URL}/${currentEditId}` : API_URL;
        const method = isEditMode ? 'PATCH' : 'POST';

        if (isEditMode) {
            showConfirmModal("Bilgileri Güncelle", "Yapılan değişiklikleri onaylıyor musunuz?", async () => {
                const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
                if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('addPersonnelModal')).hide(); fetchPersonnel(); }
            }, false, "Güncelle");
        } else {
            const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('addPersonnelModal')).hide(); fetchPersonnel(); }
        }
    });
}

async function editPersonnel(id) {
    const person = allPersonnel.find(p => p.id === id);
    if (!person) return;
    isEditMode = true;
    currentEditId = id;

    document.getElementById('staffName').value = person.name;
    document.getElementById('staffRole').value = person.role;

    // MODAL DÜZENLEMESİ (YEŞİL VE GÜNCELLE)
    document.querySelector('#addPersonnelModal .modal-title').innerHTML = '<i class="fas fa-edit me-2 text-success"></i>Personel Güncelle';
    const submitBtn = document.querySelector('#addPersonnelForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Güncelle';
        submitBtn.classList.replace('btn-primary', 'btn-success');
    }

    new bootstrap.Modal(document.getElementById('addPersonnelModal')).show();
}

function resetFormToDefault() {
    isEditMode = false;
    currentEditId = null;
    document.getElementById('addPersonnelForm')?.reset();
    
    // YENİ KAYIT MODUNA GERİ DÖN (MAVİ VE YENİ KAYIT)
    document.querySelector('#addPersonnelModal .modal-title').innerHTML = '<i class="fas fa-user-plus me-2 text-primary"></i>Yeni Personel Kaydı';
    const submitBtn = document.querySelector('#addPersonnelForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Kaydı Tamamla';
        submitBtn.classList.replace('btn-success', 'btn-primary');
    }
}

async function deletePersonnel(id) {
    showConfirmModal("Personel Siliniyor", "Bu personeli silmek istediğinize emin misiniz?", async () => {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        fetchPersonnel();
    }, true, "Sil");
}

document.getElementById('deleteAllPersonnelBtn')?.addEventListener('click', () => {
    showConfirmModal("KRİTİK TEMİZLİK", "Tüm personeller silinecek. Onaylıyor musunuz?", async () => {
        for (const p of allPersonnel) { await fetch(`${API_URL}/${p.id}`, { method: 'DELETE' }); }
        location.reload();
    }, true, "Tümünü Sil");
});

// --- 1. SAYFALAMA BUTONLARINI OLUŞTURAN FONKSİYON ---
function renderPaginationControls(total) {
    const el = document.getElementById('paginationControls');
    const pages = Math.ceil(total / rowsPerPage);
    el.innerHTML = '';
    
    if (pages <= 1) return; // Eğer tek sayfa varsa buton basma

    // Önceki Sayfa oku
    if (currentPage > 1) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a></li>`;
    }

    // Sayfa Numaraları
    for (let i = 1; i <= pages; i++) {
        el.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a></li>`;
    }

    // Sonraki Sayfa oku
    if (currentPage < pages) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
    }
}

// --- 2. SAYFA DEĞİŞTİRME FONKSİYONU ---
function changePage(page) {
    currentPage = page;
    applyFiltersAndRender(); // Tabloyu yeni sayfaya göre tekrar çiz
    window.scrollTo(0, 0);   // Sayfayı yukarı kaydır
}

// --- 2. SAYFA DEĞİŞTİRME FONKSİYONU ---
function changePage(page) {
    currentPage = page;
    applyFiltersAndRender(); // Tabloyu yeni sayfaya göre tekrar çiz
    window.scrollTo(0, 0);   // Sayfayı yukarı kaydır
}

// === BURAYA EKLİYORSUN: KPI KARTLARINI GÜNCELLEYEN FONKSİYON ===
function updatePersonnelKPIs(data) {
    const totalEl = document.getElementById('totalStaffCount');
    const availEl = document.getElementById('availableStaffCount');
    const riskyEl = document.getElementById('riskyStaffCount');

    if (totalEl) totalEl.textContent = data.length; // Toplam Ekip
    if (availEl) availEl.textContent = data.filter(x => x.status === 'Müsait').length; // Operasyona Hazır
    if (riskyEl) riskyEl.textContent = data.filter(x => (x.fatiguePoint || 0) > 80).length; // Yorgunluk Sınırında
}
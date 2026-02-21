const API_URL = 'http://localhost:3000/personnel';
let allPersonnel = [];
let isEditMode = false;
let currentEditId = null;

// Sayfalama Değişkenleri
let currentPage = 1;
const rowsPerPage = 15;

document.addEventListener('DOMContentLoaded', () => {
    startLiveClock();
    fetchPersonnel();
    setupPersonnelFormControls();
    setupFilters();

    const modalEl = document.getElementById('addPersonnelModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            resetFormToDefault();
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

// --- TARİH YARDIMCILARI ---
const TODAY_DATE = new Date().toISOString().split('T')[0];

async function handleDailyReset(data) {
    // Bugünün tarihini ISO formatında al (Örn: 2026-02-21)
    const todayStr = new Date().toISOString().split('T')[0]; 
    
    for (const p of data) {
        // Eğer personelin lastUpdate alanı yoksa veya bugünden farklı bir tarihse sıfırlama yap
        if (!p.lastUpdate || p.lastUpdate !== todayStr) {
            try {
                await fetch(`${API_URL}/${p.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dailyFlightHours: 0, // Yeni mesai günü için saatleri sıfırla
                        fatiguePoint: 0,     // Yorgunluk puanını sıfırla
                        status: "Müsait",    // Durumu müsait yap
                        risk: "Düşük",       // Riski en düşüğe çek
                        lastUpdate: todayStr // Bugünün tarih damgasını vur ki bir daha sıfırlamasın
                    })
                });
            } catch (error) {
                console.error(`Personel ${p.id} sıfırlanırken hata oluştu:`, error);
            }
        }
    }
}

async function fetchPersonnel() {
    try {
        // 1. Önce mevcut verileri sunucudan çek
        const response = await fetch(API_URL);
        allPersonnel = await response.json();
        
        // 2. Günlük sıfırlama kontrolünü yap (Dünden kalan yorgunlukları temizle)
        await handleDailyReset(allPersonnel);

        // 3. KRİTİK ADIM: Sıfırlama sonrası güncel veriyi SUNUCUDAN TEKRAR ÇEK
        // Eğer bunu yapmazsak tablo eski (yorgun) verileri göstermeye devam eder
        const updatedRes = await fetch(API_URL);
        allPersonnel = await updatedRes.json();

        // 4. Sıralama yap (En yeni kayıt en başa)
        allPersonnel.sort((a, b) => parseInt(b.id) - parseInt(a.id));

        // 5. Filtreleri uygula ve tabloyu ekrana bas
        applyFiltersAndRender();
        
    } catch (error) {
        console.error("Veri çekme veya sıfırlama hatası:", error);
    }
}

function setupFilters() {
    const searchInput = document.querySelector('.search-box input');
    const filterBtns = document.querySelectorAll('.filter-btn');

    searchInput?.addEventListener('input', () => {
        currentPage = 1; // Arama yapınca 1. sayfaya dön
        applyFiltersAndRender();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPage = 1; // Filtre değişince 1. sayfaya dön
            applyFiltersAndRender();
        });
    });
}

function applyFiltersAndRender() {
    const searchInput = document.querySelector('.search-box input');
    const activeFilter = document.querySelector('.filter-btn.active')?.textContent.trim();
    
    const normalize = (text) => {
        return text.toString().toLowerCase()
            .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
            .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim();
    };

    const term = searchInput ? normalize(searchInput.value) : "";

    const filtered = allPersonnel.filter(p => {
        const nameMatch = normalize(p.name).includes(term);
        const idMatch = normalize(p.id).includes(term);
        const matchesSearch = nameMatch || idMatch;

        let matchesRole = true;
        if (activeFilter === 'Pilotlar') matchesRole = p.role === 'Pilot';
        else if (activeFilter === 'Kabin Ekibi') matchesRole = p.role === 'Kabin Memuru';

        return matchesSearch && matchesRole;
    });

    // Alt bilgi metnini güncelle
    const filteredCountEl = document.getElementById('filteredStaffCount');
    if (filteredCountEl) filteredCountEl.textContent = filtered.length;

    // --- SAYFALAMA (PAGINATION) UYGULA ---
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filtered.slice(startIndex, startIndex + rowsPerPage);

    renderPersonnelTable(paginatedData);
    renderPaginationControls(filtered.length);
    updatePersonnelKPIs(allPersonnel); 
}

function renderPersonnelTable(data) {
    const tableBody = document.getElementById('personnelTableBody');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Aranan kriterlere uygun personel bulunamadı.</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map(p => {
        const hrs = p.dailyFlightHours || 0;
        const fatigue = p.fatiguePoint || 0;
        
        let barClass = 'bg-success';
        if (fatigue > 50 && fatigue <= 80) barClass = 'bg-warning';
        else if (fatigue > 80) barClass = 'bg-danger';

        return `
        <tr class="align-middle">
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="avatar bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style="width:35px; height:35px; font-weight:bold;">${p.name.charAt(0)}</div>
                    <div><b>${p.name}</b><br><small class="text-muted">ID: ${p.id}</small></div>
                </div>
            </td>
            <td><span class="badge bg-light text-dark border">${p.role}</span></td>
            <td>${hrs} Saat</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="height:8px; border-radius: 4px;">
                        <div class="progress-bar ${barClass}" style="width:${fatigue}%"></div>
                    </div>
                    <small class="fw-bold">%${fatigue}</small>
                </div>
            </td>
            <td><span class="badge ${fatigue > 80 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} rounded-pill px-3 py-1">${p.status}</span></td>
            <td class="text-end">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; border-radius: 6px;" onclick="editPersonnel('${p.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; border-radius: 6px;" onclick="deletePersonnel('${p.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
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

// Sayfa Değiştirme Fonksiyonu
function changePage(page) {
    currentPage = page;
    applyFiltersAndRender();
}

function setupPersonnelFormControls() {
    const form = document.getElementById('addPersonnelForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roleSelect = document.getElementById('staffRole');
        
        if (roleSelect.value === "" || roleSelect.value === "Seçiniz...") {
            alert("Lütfen personelin görevini seçiniz!");
            roleSelect.focus();
            return;
        }

        const payload = {
            name: document.getElementById('staffName').value,
            role: roleSelect.value,
            lastUpdate: TODAY_DATE, // Bu satırı ekliyoruz
            flightHours: isEditMode ? undefined : 0, 
            dailyFlightHours: isEditMode ? undefined : 0,
            fatiguePoint: isEditMode ? undefined : 0,
            status: isEditMode ? undefined : "Müsait",
            risk: isEditMode ? undefined : "Düşük"
        };

        const method = isEditMode ? 'PATCH' : 'POST';
        const url = isEditMode ? `${API_URL}/${currentEditId}` : API_URL;
        
        if (!isEditMode) {
            const lastId = allPersonnel.length > 0 
                ? Math.max(...allPersonnel.map(p => parseInt(p.id))) 
                : 0;
            payload.id = (lastId + 1).toString();
        }

        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addPersonnelModal')).hide();
            await fetchPersonnel();
            alert(isEditMode ? "Güncellendi!" : "Eklendi!");
        }
    });
}

async function editPersonnel(id) {
    const person = allPersonnel.find(p => p.id === id);
    if (!person) return;

    document.getElementById('staffName').value = person.name;
    document.getElementById('staffRole').value = person.role;

    document.querySelector('#addPersonnelModal .modal-title').innerHTML = '<i class="fas fa-edit me-2 text-success"></i>Personel Bilgilerini Güncelle';
    const submitBtn = document.querySelector('#addPersonnelForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Güncelle';
        submitBtn.classList.replace('btn-primary', 'btn-success');
    }

    isEditMode = true;
    currentEditId = id;
    new bootstrap.Modal(document.getElementById('addPersonnelModal')).show();
}

function resetFormToDefault() {
    isEditMode = false;
    currentEditId = null;
    document.getElementById('addPersonnelForm').reset();
    document.querySelector('#addPersonnelModal .modal-title').innerHTML = '<i class="fas fa-user-plus me-2 text-primary"></i>Yeni Personel Kaydı';
    const submitBtn = document.querySelector('#addPersonnelForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Kaydı Tamamla';
        submitBtn.classList.replace('btn-success', 'btn-primary');
    }
}

async function deletePersonnel(id) {
    if (confirm("Bu personeli silmek istediğinize emin misiniz?")) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        await fetchPersonnel();
    }
}

function updatePersonnelKPIs(data) {
    const totalEl = document.getElementById('totalStaffCount');
    const availEl = document.getElementById('availableStaffCount');
    const riskyEl = document.getElementById('riskyStaffCount');

    if (totalEl) totalEl.textContent = data.length;
    if (availEl) availEl.textContent = data.filter(x => x.status === 'Müsait').length;
    if (riskyEl) riskyEl.textContent = data.filter(x => (x.fatiguePoint || 0) > 80).length;
}


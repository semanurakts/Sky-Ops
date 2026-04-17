const API_BASE_URL = 'http://localhost:3000';

let archiveFlights = [];
let allPersonnel = [];
let currentPage = 1;
const rowsPerPage = 15;
let searchTerm = "";

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 🌟 EKLENEN KISIM: ÇIKIŞ YAPMA İŞLEMİ (ŞIK MODAL İLE) 🌟 ---
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

    // --- Senin Mevcut Kodların ---
    // Canlı Saat
    setInterval(() => {
        const clock = document.getElementById('liveClock');
        if(clock) clock.textContent = new Date().toLocaleTimeString('tr-TR');
    }, 1000);

    // Verileri Yükle
    await loadPersonnelData();
    await fetchArchiveFlights();

    // Arama Kutusu (Gerçek Zamanlı Filtreleme)
    document.getElementById('archiveSearchInput')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        currentPage = 1;
        renderArchiveTable();
    });
});

// Tarih Formatlayıcı (Veritabanındaki gibi YYYY-MM-DD döndürür)
const getLocalYYYYMMDD = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 🌟 30 GÜN KURALI 🌟
// Bu fonksiyon "Bugünden 30 gün öncesinin" tarihini bulur.
const getArchiveThresholdDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalYYYYMMDD(d);
};

// Pilot isimlerini yazabilmek için personelleri çekiyoruz
async function loadPersonnelData() {
    const res = await fetch(`${API_BASE_URL}/personnel`);
    allPersonnel = await res.json();
}

async function fetchArchiveFlights() {
    const res = await fetch(`${API_BASE_URL}/flights`);
    const allFlights = await res.json();
    
    const thresholdDate = getArchiveThresholdDate();

    // 🌟 ARŞİV FİLTRESİ 🌟
    // Sadece 30 günden ESKİ olanlar VE statüsü "İndi" veya "İptal" olanlar
    archiveFlights = allFlights.filter(f => {
        return f.date < thresholdDate && (f.status === "İndi" || f.status === "İptal");
    });

    // En yeni tarih en üstte olacak şekilde sırala
    archiveFlights.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    document.getElementById('archiveCount').innerText = archiveFlights.length;
    renderArchiveTable();
}

function renderArchiveTable() {
    const tableBody = document.getElementById('archiveTableBody');
    if (!tableBody) return;

    // Arama işlemine göre süz
    let filtered = archiveFlights.filter(f => {
        return f.flightNo.toLowerCase().includes(searchTerm) || 
               f.route.toLowerCase().includes(searchTerm);
    });

    document.getElementById('archiveCount').innerText = filtered.length;

    // Sayfalama (Pagination) için sadece ilgili satırları al
    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // Tabloyu çiz
    tableBody.innerHTML = paginated.map(flight => {
        const person = allPersonnel.find(p => String(p.id) === String(flight.pilot));
        const pilotName = person ? person.name : "Bilinmiyor";

        // Görüntüyü güzelleştirmek için tarihi "GG.AA.YYYY" formatına çeviriyoruz
        const [y, m, d] = flight.date.split('-');
        const formattedDate = `${d}.${m}.${y}`;

        // İndi ise gri, İptal ise kırmızı yap
        let statusBadge = flight.status === "İndi" 
            ? `<span class="badge bg-secondary px-3 py-2 rounded-pill"><i class="fas fa-check me-1"></i>Tamamlandı</span>`
            : `<span class="badge bg-danger px-3 py-2 rounded-pill"><i class="fas fa-times me-1"></i>İptal</span>`;

        return `
            <tr>
                <td>
                    <div class="d-flex flex-column">
                        <div class="text-muted mb-1" style="font-size: 0.75rem; font-weight: 500;">
                            <i class="far fa-calendar-alt me-1"></i>${formattedDate}
                        </div>
                        <div class="fw-bold text-secondary font-monospace" style="font-size: 0.95rem;">
                            ${flight.time}
                        </div>
                    </div>
                </td>
                <td class="fw-bold text-secondary font-monospace">${flight.flightNo}</td>
                <td class="text-secondary">${flight.route}</td>
                <td class="text-secondary"><i class="fas fa-user-tie me-2"></i>${pilotName}</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <span class="badge bg-light text-muted border" title="Değiştirilemez Arşiv Kaydı">
                        <i class="fas fa-lock me-1"></i>Salt Okunur
                    </span>
                </td>
            </tr>`;
    }).join('');

    renderPaginationControls(filtered.length);
}

function renderPaginationControls(total) {
    const el = document.getElementById('paginationControls');
    const pages = Math.ceil(total / rowsPerPage);
    el.innerHTML = '';
    
    // Sayfa sayısı 1'den azsa sayfalama çubuğunu gizle
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

function changePage(page) { 
    currentPage = page; 
    renderArchiveTable(); 
}
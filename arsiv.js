const API_BASE_URL = 'http://localhost:3000';

let archiveFlights = [];
let allPersonnel = [];
let currentPage = 1;
const rowsPerPage = 15;
let searchTerm = "";

// 🌟 ADMİN PANELİ ÇEVİRİ SÖZLÜĞÜ 🌟
const adminTranslations = {
    tr: {
        adminRole: "Sistem Yöneticisi", menuOverview: "Genel Bakış", menuFlight: "Uçuş Yönetimi",
        menuCrew: "Personel Planlama", menuReports: "Raporlar", menuArchive: "Uçuş Arşivi",
        logoutText: "Çıkış Yap", pageTitleArchive: "Soğuk Arşiv",
        pageDescArchive: "30 günden eski, tamamlanmış veya iptal edilmiş tüm uçuşların salt okunur kayıtları.",
        searchPlaceholder: "PNR, Uçuş No veya Rota ara...", recordsFound: "Kayıt Bulundu",
        thDateTime: "Tarih / Saat", thFlightNo: "Uçuş No", thRoute: "Rota", thPilot: "Pilot", thStatus: "Durum", thRecord: "Kayıt İzi",
        statusCompleted: "Tamamlandı", statusCancelled: "İptal",
        logoutTitle: "Sistemden Çıkılıyor", logoutDesc: "Operasyon kontrol merkezinden çıkış yapmak istediğinize emin misiniz?", cancel: "İptal",
        readOnly: "Salt Okunur", unknown: "Bilinmiyor"
    },
    en: {
        adminRole: "System Admin", menuOverview: "Overview", menuFlight: "Flight Management",
        menuCrew: "Crew Planning", menuReports: "Reports", menuArchive: "Flight Archive",
        logoutText: "Log Out", pageTitleArchive: "Cold Archive",
        pageDescArchive: "Read-only records of all completed or cancelled flights older than 30 days.",
        searchPlaceholder: "Search PNR, Flight No or Route...", recordsFound: "Records Found",
        thDateTime: "Date / Time", thFlightNo: "Flight No", thRoute: "Route", thPilot: "Pilot", thStatus: "Status", thRecord: "Record Trace",
        statusCompleted: "Completed", statusCancelled: "Cancelled",
        logoutTitle: "Logging Out", logoutDesc: "Are you sure you want to log out of the operation control center?", cancel: "Cancel",
        readOnly: "Read-Only", unknown: "Unknown"
    }
};

function t(key) {
    const lang = window.currentAdminLang || 'tr';
    return adminTranslations[lang][key] || key;
}

function updateAdminLanguage(lang) {
    window.currentAdminLang = lang;
    localStorage.setItem('skyOpsAdminLang', lang);
    const btnTR = document.getElementById('btnLangTR');
    const btnEN = document.getElementById('btnLangEN');
    if(btnTR && btnEN) {
        btnTR.classList.toggle('active', lang === 'tr');
        btnEN.classList.toggle('active', lang === 'en');
    }
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (adminTranslations[lang][key]) el.innerHTML = adminTranslations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (adminTranslations[lang][key]) el.setAttribute('placeholder', adminTranslations[lang][key]);
    });
    
    renderArchiveTable();
}

document.addEventListener('DOMContentLoaded', async () => {
    // 🌟 DİL MOTORUNU BAŞLAT 🌟
    window.currentAdminLang = localStorage.getItem('skyOpsAdminLang') || 'tr';
    document.getElementById('btnLangTR')?.addEventListener('click', () => updateAdminLanguage('tr'));
    document.getElementById('btnLangEN')?.addEventListener('click', () => updateAdminLanguage('en'));
    
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
            btnConfirmAdminLogout.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>...';
            btnConfirmAdminLogout.disabled = true;
            setTimeout(() => { window.location.href = 'login.html'; }, 600);
        });
    }

    setInterval(() => {
        const clock = document.getElementById('liveClock');
        if(clock) clock.textContent = new Date().toLocaleTimeString('tr-TR');
    }, 1000);

    await loadPersonnelData();
    await fetchArchiveFlights();

    document.getElementById('archiveSearchInput')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        currentPage = 1;
        renderArchiveTable();
    });

    // İlk dil yüklemesi
    updateAdminLanguage(window.currentAdminLang);
});

const getLocalYYYYMMDD = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getArchiveThresholdDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalYYYYMMDD(d);
};

async function loadPersonnelData() {
    const res = await fetch(`${API_BASE_URL}/personnel`);
    allPersonnel = await res.json();
}

async function fetchArchiveFlights() {
    const res = await fetch(`${API_BASE_URL}/flights`);
    const allFlights = await res.json();
    const thresholdDate = getArchiveThresholdDate();

    archiveFlights = allFlights.filter(f => f.date < thresholdDate && (f.status === "İndi" || f.status === "İptal"));
    archiveFlights.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    document.getElementById('archiveCount').innerText = archiveFlights.length;
    renderArchiveTable();
}

function renderArchiveTable() {
    const tableBody = document.getElementById('archiveTableBody');
    if (!tableBody) return;

    let filtered = archiveFlights.filter(f => 
        f.flightNo.toLowerCase().includes(searchTerm) || f.route.toLowerCase().includes(searchTerm)
    );

    document.getElementById('archiveCount').innerText = filtered.length;

    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tableBody.innerHTML = paginated.map(flight => {
        const person = allPersonnel.find(p => String(p.id) === String(flight.pilot));
        const pilotName = person ? person.name : t('unknown');

        const [y, m, d] = flight.date.split('-');
        const formattedDate = `${d}.${m}.${y}`;

        let statusBadge = flight.status === "İndi" 
            ? `<span class="badge bg-secondary-subtle text-secondary px-3 py-2 rounded-pill"><i class="fas fa-check me-1"></i>${t('statusCompleted')}</span>`
            : `<span class="badge bg-danger-subtle text-danger px-3 py-2 rounded-pill"><i class="fas fa-times me-1"></i>${t('statusCancelled')}</span>`;

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
                    <span class="badge bg-light text-muted border">
                        <i class="fas fa-lock me-1"></i>${t('readOnly')}
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
    if (pages <= 1) return;

    if (currentPage > 1) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a></li>`;
    }

    for (let i = 1; i <= pages; i++) {
        el.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a></li>`;
    }

    if (currentPage < pages) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
    }
}

function changePage(page) { currentPage = page; renderArchiveTable(); window.scrollTo(0, 0); }
const API_BASE_URL = 'http://localhost:3000';
let myFlightChart = null;
let allFlights = [];  
let allPersonnel = [];

// 🌟 DASHBOARD SAYFALANDIRMA DEĞİŞKENLERİ 🌟
let currentDashboardPage = 1;
const dashboardRowsPerPage = 10; // Dashboard için 10 idealdir, çok yer kaplamasın

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Canlı saat eklentisi
    setInterval(() => {
        const clock = document.getElementById('liveClock');
        if(clock) clock.textContent = new Date().toLocaleTimeString('tr-TR');
    }, 1000);
    
// 🌟 2. ADMİN ÇIKIŞ YAPMA İŞLEMİ 🌟
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Modalı göster
            const logoutModal = new bootstrap.Modal(document.getElementById('adminLogoutModal'));
            logoutModal.show();
        });
    }

    // Modal içindeki onay butonunu dinle
    const btnConfirmAdminLogout = document.getElementById('btnConfirmAdminLogout');
    if (btnConfirmAdminLogout) {
        btnConfirmAdminLogout.addEventListener('click', () => {
            btnConfirmAdminLogout.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Çıkılıyor...';
            btnConfirmAdminLogout.disabled = true;
            
            // 🚨 GÜVENLİK: ÇIKIŞ YAPARKEN OTURUM VERİLERİNİ KESİNLİKLE SİL 🚨
            sessionStorage.removeItem("isLoggedIn");
            sessionStorage.removeItem("userRole");
            sessionStorage.removeItem("skyOpsActiveUser"); // Yolcu tarafını da temizler (İsteğe bağlı)
            
            setTimeout(() => {
                window.location.replace('login.html'); // .replace() kullan ki geri tuşuyla dönülmesin
            }, 600); // Küçük bir animasyon gecikmesi
        });
    }

    // 3. Verileri ilk kez yükle
    await refreshDashboard();
    
    // 4. Her 30 saniyede bir verileri tazele
    setInterval(refreshDashboard, 30000);
    
    // 5. Grafik filtresini dinle
    document.getElementById('chartFilter')?.addEventListener('change', () => {
        initOrUpdateChart();
    });
});

// --- TARİH FONKSİYONLARI ---
const getLocalYYYYMMDD = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 🌟 YENİ: 30 GÜN ARŞİV KURALI (Dashboard için) 🌟
const getArchiveThresholdDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalYYYYMMDD(d);
};

async function refreshDashboard() {
    try {
        // --- 🌟 YORGUNLUK SÖNÜMLENMESİ (HER EKRAN YENİLENDİĞİNDE GÜNCEL KONTROL) ---
        const now = new Date();
        const pResInit = await fetch(`${API_BASE_URL}/personnel`);
        let tempPersonnel = await pResInit.json();
        let updates = [];

        for (const p of tempPersonnel) {
            let currentFatigue = parseInt(p.fatiguePoint) || 0;
            if (currentFatigue > 0 && p.lastDecayTime) {
                const diffHours = Math.floor((now - new Date(p.lastDecayTime)) / (1000 * 60 * 60));
                if (diffHours > 0) {
                    const newFatigue = Math.max(0, currentFatigue - (diffHours * 5));
                    const newTime = new Date(new Date(p.lastDecayTime).getTime() + (diffHours * 60 * 60 * 1000)).toISOString();
                    updates.push(fetch(`${API_BASE_URL}/personnel/${p.id}`, {
                        method: 'PATCH',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            fatiguePoint: newFatigue,
                            status: newFatigue >= 80 ? "Yorgun" : "Müsait",
                            risk: newFatigue >= 80 ? "Yüksek" : (newFatigue >= 50 ? "Orta" : "Düşük"),
                            lastDecayTime: newFatigue === 0 ? null : newTime
                        })
                    }));
                }
            }
        }
        if (updates.length > 0) await Promise.all(updates);

        const [fRes, pRes] = await Promise.all([
            fetch(`${API_BASE_URL}/flights`),
            fetch(`${API_BASE_URL}/personnel`)
        ]);
        
        const rawFlights = await fRes.json();
        allPersonnel = await pRes.json(); // Güncellenmiş dinlenmiş personelleri çeker
        
        const thresholdDate = getArchiveThresholdDate();

        allFlights = rawFlights.filter(f => {
            const isArchived = (f.date < thresholdDate) && (f.status === "İndi" || f.status === "İptal");
            return !isArchived; 
        });

        updateDashboardKPIs();
        updateDensityGauge();
        renderRecentFlightsTable();
        initOrUpdateChart();
    } catch (error) {
        console.error("Dashboard yükleme hatası:", error);
    }
}

function updateDashboardKPIs() {
    // 🌟 KPI'lar da artık SADECE aktif uçuşlara göre hesaplanıyor 🌟
    document.querySelector('.border-blue .kpi-value').textContent = allFlights.length;
    
    const delays = allFlights.filter(f => f.status === "Gecikmeli" || f.status === "İptal").length;
    document.querySelector('.border-red .kpi-value').textContent = delays;
    
    const riskyCount = allPersonnel.filter(p => (p.fatiguePoint || 0) > 80).length;
    document.querySelector('.border-yellow .kpi-value').textContent = riskyCount;

    const activeGates = new Set(allFlights.filter(f => f.status !== "İndi" && f.status !== "İptal").map(f => f.gate)).size;
    const capacity = 20; 
    const occupancy = Math.round((activeGates / capacity) * 100);
    document.querySelector('.border-green .kpi-value').textContent = `%${occupancy}`;

    const alertBox = document.getElementById('aiAlertMessage');
    if (alertBox) {
        if (occupancy > 70) {
            alertBox.innerHTML = `⚠️ <strong>Kritik Durum:</strong> Kapı doluluğu %${occupancy} seviyesinde! Ekip takviyesi önerilir.`;
            alertBox.className = "text-danger small mt-3 px-3 fw-bold";
        } else if (occupancy > 40) {
            alertBox.innerHTML = `ℹ️ <strong>Yoğunluk Artıyor:</strong> Kapıların %${occupancy} kadarı dolu. Operasyon yakından takip edilmeli.`;
            alertBox.className = "text-warning-emphasis small mt-3 px-3";
        } else {
            alertBox.innerHTML = `✅ <strong>Sistem Normal:</strong> Kapı doluluğu %${occupancy} seviyesinde. Operasyonel akış planlandığı gibi gidiyor.`;
            alertBox.className = "text-success small mt-3 px-3";
        }
    }
}

function updateDensityGauge() {
    const activeFlights = allFlights.filter(f => f.status !== "İndi" && f.status !== "İptal").length;
    const score = Math.min((activeFlights / 10), 10).toFixed(1);
    const gaugeFill = document.querySelector('.gauge-fill');
    const scoreVal = document.querySelector('.score-text .val');
    if (gaugeFill) {
        const rotation = (score / 10) * 180;
        gaugeFill.style.transform = `rotate(${rotation}deg)`;
    }
    if (scoreVal) {
        scoreVal.textContent = score;
        scoreVal.className = score >= 8 ? 'val text-danger' : (score >= 5 ? 'val text-warning' : 'val text-success');
    }
}

function renderRecentFlightsTable() {
    const tableBody = document.querySelector('.custom-table tbody');
    if (!tableBody) return;
    
    // Verileri yeniden eskiye sıralıyoruz
    const reversedFlights = [...allFlights].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const paginatedFlights = reversedFlights.slice(
        (currentDashboardPage - 1) * dashboardRowsPerPage, 
        currentDashboardPage * dashboardRowsPerPage
    );

    tableBody.innerHTML = paginatedFlights.map(f => {
        const person = allPersonnel.find(p => String(p.id) === String(f.pilot));
        const pilotName = person ? person.name : "Tanımsız";
        
        let genderIcon = '<i class="fas fa-question-circle text-secondary fs-5" title="Bilinmiyor"></i>';
        if (person) {
            genderIcon = person.genderId === "2" 
                ? '<i class="fas fa-user-nurse text-danger fs-5" title="Kadın"></i>' 
                : '<i class="fas fa-user-tie text-primary fs-5" title="Erkek"></i>';
        }

        const cabinCrewCount = f.cabinCrew ? f.cabinCrew.length : 0;
        
        // 🌟 TARİHİ FORMATLIYORUZ (YYYY-MM-DD -> DD.MM.YYYY) 🌟
        let formattedDate = "";
        if (f.date) {
            const [y, m, d] = f.date.split('-');
            formattedDate = `${d}.${m}.${y}`;
        }

        return `
            <tr>
                <td class="fw-bold text-dark font-monospace">${f.flightNo}</td>
                <td>${f.route}</td>
                <td>
                    <div class="d-flex flex-column">
                        <div class="text-muted mb-1" style="font-size: 0.75rem; font-weight: 500;">
                            <i class="far fa-calendar-alt me-1"></i>${formattedDate}
                        </div>
                        <div class="fw-bold text-dark font-monospace" style="font-size: 0.95rem;">
                            ${f.time}
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border">${f.gate}</span></td>
                <td><span class="badge ${getBadgeClass(f.status)} px-3 py-2 rounded-pill">${f.status}</span></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="d-flex align-items-center gap-1">
                            ${genderIcon}
                            <span class="fw-semibold ms-1">${pilotName}</span>
                        </div>
                        ${cabinCrewCount > 0 ? `
                            <button class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2" style="font-size: 11px; font-weight: 700; height: 22px;" onclick="showCrewDetails('${f.id}')" title="Ekibi Görüntüle">
                                +${cabinCrewCount} Ekip
                            </button>
                        ` : ''}
                    </div>
                </td>
                <td><button class="btn btn-sm btn-light" onclick="showCrewDetails('${f.id}')" title="Detaylar"><i class="fas fa-eye"></i></button></td>
            </tr>
        `;
    }).join('');

    renderDashboardPagination(reversedFlights.length);
}

// 🌟 YENİ: MAX 15 SAYFA LİMİTLİ PAGINATION 🌟
function renderDashboardPagination(totalItems) {
    const el = document.getElementById('dashboardPaginationControls');
    if (!el) return;
    
    const pages = Math.ceil(totalItems / dashboardRowsPerPage);
    el.innerHTML = '';
    
    if (pages <= 1) return;

    if (currentDashboardPage > 1) {
        el.innerHTML += `<li class="page-item"><a class="page-link pagination-arrow" href="#" onclick="changeDashboardPage(${currentDashboardPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a></li>`;
    }

    let startPage = Math.max(1, currentDashboardPage - 7);
    let endPage = Math.min(pages, startPage + 14);

    if (endPage - startPage < 14) {
        startPage = Math.max(1, endPage - 14);
    }

    if (startPage > 1) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeDashboardPage(1); return false;">1</a></li>`;
        if (startPage > 2) el.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        el.innerHTML += `<li class="page-item ${i === currentDashboardPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changeDashboardPage(${i}); return false;">${i}</a></li>`;
    }

    if (endPage < pages) {
        if (endPage < pages - 1) el.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeDashboardPage(${pages}); return false;">${pages}</a></li>`;
    }

    if (currentDashboardPage < pages) {
        el.innerHTML += `<li class="page-item"><a class="page-link pagination-arrow" href="#" onclick="changeDashboardPage(${currentDashboardPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
    }
}

function changeDashboardPage(pageNumber) {
    currentDashboardPage = pageNumber;
    renderRecentFlightsTable();
}

function showCrewDetails(flightId) {
    const flight = allFlights.find(f => String(f.id) === String(flightId));
    if (!flight) return;

    document.getElementById('crewModalFlightInfo').textContent = `Uçuş: ${flight.flightNo} | Rota: ${flight.route} | Saat: ${flight.time}`;

    const container = document.getElementById('crewCardsContainer');
    container.innerHTML = ''; 

    const crewIds = [flight.pilot];
    if (flight.cabinCrew && Array.isArray(flight.cabinCrew)) {
        crewIds.push(...flight.cabinCrew);
    }

    crewIds.forEach(id => {
        const person = allPersonnel.find(p => String(p.id) === String(id));
        if (!person) return;

        const fatigue = person.fatiguePoint || 0;
        let fatigueColor = fatigue >= 80 ? 'bg-danger' : (fatigue >= 50 ? 'bg-warning' : 'bg-success');
        
        const isPilot = person.role === "Pilot";
        const isMale = person.genderId === "1";
        
        const avatarClass = isPilot ? 'pilot' : 'cabin';
        const roleClass = isPilot ? 'role-pilot' : 'role-cabin';
        const iconHtml = isMale ? '<i class="fas fa-user-tie"></i>' : '<i class="fas fa-user-nurse"></i>';

        const cardHtml = `
            <div class="col-md-4 col-sm-6">
                <div class="crew-profile-card">
                    <div class="crew-role-badge ${roleClass}">${person.role}</div>
                    <div class="crew-avatar mx-auto ${avatarClass}">
                        ${iconHtml}
                    </div>
                    <h6 class="fw-bold text-dark mb-1" style="font-size: 14px;">${person.name}</h6>
                    <p class="text-muted small mb-2 font-monospace">ID: ${person.id}</p>
                    
                    <div class="text-start mt-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="small text-muted" style="font-size: 11px; font-weight: 600;">Yorgunluk</span>
                            <span class="small fw-bold text-dark">%${fatigue}</span>
                        </div>
                        <div class="crew-fatigue-bar">
                            <div class="progress-bar ${fatigueColor}" style="width: ${fatigue}%; height: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });

    const modal = new bootstrap.Modal(document.getElementById('crewDetailModal'));
    modal.show();
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

// YENİ — eksik olan fonksiyonu ekle:
const getTodayDate = () => getLocalYYYYMMDD(new Date());

// 🌟 YENİ: ÇİZGİSEL (LINE AREA) GRAFİK & 24 SAAT / 7 GÜN FİLTRESİ 🌟
function initOrUpdateChart() {
    const ctx = document.getElementById('flightChart');
    if (!ctx) return;
    
    // Açılır liste yazılarını JS ile güvene alalım
    const filterEl = document.getElementById('chartFilter');
    if (filterEl && filterEl.options.length > 0) {
        filterEl.options[0].text = "Bugün (24 Saat)";
        if(filterEl.options.length > 1) filterEl.options[1].text = "Son 7 Gün";
    }

    const filterMode = filterEl ? filterEl.value : 'today'; 
    const todayStr = getTodayDate();
    
    let labels = [];
    let dataPoints = [];

    if (filterMode === 'today' || filterMode === '1') {
        // --- BUGÜNÜN 24 SAATLİK DİLİMİ ---
        const todaysFlights = allFlights.filter(f => f.date === todayStr);
        
        for (let i = 0; i < 24; i += 2) { 
            let hourStr = i.toString().padStart(2, '0');
            labels.push(hourStr + ":00");
            
            const count = todaysFlights.filter(f => {
                if (!f.time) return false;
                const flightHour = parseInt(f.time.split(':')[0]);
                return flightHour >= i && flightHour < i + 2;
            }).length;
            
            dataPoints.push(count);
        }
    } else {
        // --- SON 7 GÜNÜN TRENDİ (Geçmiş 7 gün dolu grafik verir) ---
        for (let i = 6; i >= 0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dateStr = getLocalYYYYMMDD(d);
            
            labels.push(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`);
            
            const count = allFlights.filter(f => f.date === dateStr).length;
            dataPoints.push(count);
        }
    }

    if (myFlightChart) { 
        myFlightChart.destroy(); 
    }

    // Çizgi ve Dolgu (Area Line) Grafiği
    myFlightChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: [{
                label: 'Uçuş Sayısı',
                data: dataPoints,
                borderColor: '#3b82f6', // SkyOps mavi çizgisi
                backgroundColor: 'rgba(59, 130, 246, 0.15)', // Çizginin altındaki şeffaf mavi dolgu
                borderWidth: 2,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true, // Altını doldurur
                tension: 0.4 // Dalgalı ve yumuşak çizgi efekti
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { duration: 800, easing: 'easeOutQuart' },
            layout: {
                padding: { top: 10, bottom: 10 }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 10,
                    titleFont: { size: 13 },
                    bodyFont: { size: 14, weight: 'bold' },
                    displayColors: false
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    ticks: { 
                        stepSize: 1, 
                        color: '#64748b',
                        precision: 0 // Sadece tam sayılar
                    },
                    grid: { color: '#e2e8f0', drawBorder: false }
                },
                x: { 
                    ticks: { color: '#64748b', font: { size: 11, weight: '500' } },
                    grid: { display: false, drawBorder: false } 
                }
            }
        }
    });
}
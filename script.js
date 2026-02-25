// const API_BASE_URL = 'http://localhost:3000';
// let myFlightChart = null;
// let allFlights = [];
// let allPersonnel = [];

// document.addEventListener('DOMContentLoaded', async () => {
//     setInterval(() => {
//         const clock = document.getElementById('liveClock');
//         if(clock) clock.textContent = new Date().toLocaleTimeString('tr-TR');
//     }, 1000);
//     await refreshDashboard();
//     setInterval(refreshDashboard, 30000);
//     document.getElementById('chartFilter')?.addEventListener('change', () => {
//         initOrUpdateChart();
//     });
// });

// async function refreshDashboard() {
//     try {
//         const [fRes, pRes] = await Promise.all([
//             fetch(`${API_BASE_URL}/flights`),
//             fetch(`${API_BASE_URL}/personnel`)
//         ]);
//         allFlights = await fRes.json();
//         allPersonnel = await pRes.json();
//         updateDashboardKPIs();
//         updateDensityGauge();
//         renderRecentFlightsTable();
//         initOrUpdateChart();
//     } catch (error) {
//         console.error("Dashboard yükleme hatası:", error);
//     }
// }

// function updateDashboardKPIs() {
//     document.querySelector('.border-blue .kpi-value').textContent = allFlights.length;
//     const delays = allFlights.filter(f => f.status === "Gecikmeli" || f.status === "İptal").length;
//     document.querySelector('.border-red .kpi-value').textContent = delays;
//     const riskyCount = allPersonnel.filter(p => (p.fatiguePoint || 0) > 80).length;
//     document.querySelector('.border-yellow .kpi-value').textContent = riskyCount;

//     const activeGates = new Set(allFlights.filter(f => f.status !== "İndi" && f.status !== "İptal").map(f => f.gate)).size;
//     const capacity = 20; 
//     const occupancy = Math.round((activeGates / capacity) * 100);
//     document.querySelector('.border-green .kpi-value').textContent = `%${occupancy}`;

//     const alertBox = document.getElementById('aiAlertMessage');
//     if (alertBox) {
//         if (occupancy > 70) {
//             alertBox.innerHTML = `⚠️ <strong>Kritik Durum:</strong> Kapı doluluğu %${occupancy} seviyesinde! Ekip takviyesi önerilir.`;
//             alertBox.className = "text-danger small mt-3 px-3 fw-bold";
//         } else if (occupancy > 40) {
//             alertBox.innerHTML = `ℹ️ <strong>Yoğunluk Artıyor:</strong> Kapıların %${occupancy} kadarı dolu. Operasyon yakından takip edilmeli.`;
//             alertBox.className = "text-warning-emphasis small mt-3 px-3";
//         } else {
//             alertBox.innerHTML = `✅ <strong>Sistem Normal:</strong> Kapı doluluğu %${occupancy} seviyesinde. Operasyonel akış planlandığı gibi gidiyor.`;
//             alertBox.className = "text-success small mt-3 px-3";
//         }
//     }
// }

// function updateDensityGauge() {
//     const activeFlights = allFlights.filter(f => f.status !== "İndi" && f.status !== "İptal").length;
//     const score = Math.min((activeFlights / 10), 10).toFixed(1);
//     const gaugeFill = document.querySelector('.gauge-fill');
//     const scoreVal = document.querySelector('.score-text .val');
//     if (gaugeFill) {
//         const rotation = (score / 10) * 180;
//         gaugeFill.style.transform = `rotate(${rotation}deg)`;
//     }
//     if (scoreVal) {
//         scoreVal.textContent = score;
//         scoreVal.className = score >= 8 ? 'val text-danger' : (score >= 5 ? 'val text-warning' : 'val text-success');
//     }
// }

// function renderRecentFlightsTable() {
//     const tableBody = document.querySelector('.custom-table tbody');
//     if (!tableBody) return;
//     const recent = [...allFlights].reverse().slice(0, 8);
//     tableBody.innerHTML = recent.map(f => {
//         const person = allPersonnel.find(p => String(p.id) === String(f.pilot));
//         const pilotName = person ? person.name : "Tanımsız";
        
//         // --- 🌟 İKON MOTORU 🌟 ---
//         let genderIcon = '<i class="fas fa-question-circle text-secondary fs-5" title="Bilinmiyor"></i>';
//         if (person) {
//             genderIcon = person.genderId === "2" 
//                 ? '<i class="fas fa-user-nurse text-danger fs-5" title="Kadın"></i>' 
//                 : '<i class="fas fa-user-tie text-primary fs-5" title="Erkek"></i>';
//         }

//         // Kabin ekibi sayısı hesaplama (Varsa)
//         const cabinCrewCount = f.cabinCrew ? f.cabinCrew.length : 0;
        
//         return `
//             <tr>
//                 <td class="fw-bold text-dark font-monospace">${f.flightNo}</td>
//                 <td>${f.route}</td>
//                 <td>${f.time}</td>
//                 <td><span class="badge bg-light text-dark border">${f.gate}</span></td>
//                 <td><span class="badge ${getBadgeClass(f.status)} px-3 py-2 rounded-pill">${f.status}</span></td>
//                 <td>
//                     <div class="d-flex align-items-center gap-2">
//                         <div class="d-flex align-items-center gap-1">
//                             ${genderIcon}
//                             <span class="fw-semibold ms-1">${pilotName}</span>
//                         </div>
//                         ${cabinCrewCount > 0 ? `
//                             <button class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2" style="font-size: 11px; font-weight: 700; height: 22px;" onclick="showCrewDetails('${f.id}')" title="Ekibi Görüntüle">
//                                 +${cabinCrewCount} Ekip
//                             </button>
//                         ` : ''}
//                     </div>
//                 </td>
//                 <td><button class="btn btn-sm btn-light" onclick="showCrewDetails('${f.id}')" title="Detaylar"><i class="fas fa-eye"></i></button></td>
//             </tr>
//         `;
//     }).join('');
// }

// // -------------------------------------------------------------
// // 🌟 YENİ FONKSİYON: EKİP DETAY PENCERESİNİ AÇAN MOTOR 🌟
// // -------------------------------------------------------------
// function showCrewDetails(flightId) {
//     const flight = allFlights.find(f => String(f.id) === String(flightId));
//     if (!flight) return;

//     // Modaldaki başlık bilgisini güncelle
//     document.getElementById('crewModalFlightInfo').textContent = `Uçuş: ${flight.flightNo} | Rota: ${flight.route} | Saat: ${flight.time}`;

//     const container = document.getElementById('crewCardsContainer');
//     container.innerHTML = ''; // İçini temizle

//     // Pilot ve Kabin ekibi ID'lerini tek bir dizide topla
//     const crewIds = [flight.pilot];
//     if (flight.cabinCrew && Array.isArray(flight.cabinCrew)) {
//         crewIds.push(...flight.cabinCrew);
//     }

//     // Her bir personel için profil kartı oluştur
//     crewIds.forEach(id => {
//         const person = allPersonnel.find(p => String(p.id) === String(id));
//         if (!person) return;

//         const fatigue = person.fatiguePoint || 0;
//         let fatigueColor = fatigue >= 80 ? 'bg-danger' : (fatigue >= 50 ? 'bg-warning' : 'bg-success');
        
//         // Rol ve Cinsiyete göre ikon/renk ayarları
//         const isPilot = person.role === "Pilot";
//         const isMale = person.genderId === "1";
        
//         const avatarClass = isPilot ? 'pilot' : 'cabin';
//         const roleClass = isPilot ? 'role-pilot' : 'role-cabin';
//         const iconHtml = isMale ? '<i class="fas fa-user-tie"></i>' : '<i class="fas fa-user-nurse"></i>';

//         const cardHtml = `
//             <div class="col-md-4 col-sm-6">
//                 <div class="crew-profile-card">
//                     <div class="crew-role-badge ${roleClass}">${person.role}</div>
//                     <div class="crew-avatar mx-auto ${avatarClass}">
//                         ${iconHtml}
//                     </div>
//                     <h6 class="fw-bold text-dark mb-1" style="font-size: 14px;">${person.name}</h6>
//                     <p class="text-muted small mb-2 font-monospace">ID: ${person.id}</p>
                    
//                     <div class="text-start mt-3">
//                         <div class="d-flex justify-content-between align-items-center mb-1">
//                             <span class="small text-muted" style="font-size: 11px; font-weight: 600;">Yorgunluk</span>
//                             <span class="small fw-bold text-dark">%${fatigue}</span>
//                         </div>
//                         <div class="crew-fatigue-bar">
//                             <div class="progress-bar ${fatigueColor}" style="width: ${fatigue}%; height: 100%;"></div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//         container.innerHTML += cardHtml;
//     });

//     // Modalı aç
//     const modal = new bootstrap.Modal(document.getElementById('crewDetailModal'));
//     modal.show();
// }
// // -------------------------------------------------------------

// function getBadgeClass(status) {
//     switch(status) {
//         case 'Zamanında': return 'bg-success-subtle text-success';
//         case 'Gecikmeli': return 'bg-warning-subtle text-warning-emphasis';
//         case 'İndi': return 'bg-primary text-white';
//         case 'İptal': return 'bg-danger-subtle text-danger'; 
//         default: return 'bg-secondary-subtle text-secondary';
//     }
// }

// function initOrUpdateChart() {
//     const ctx = document.getElementById('flightChart');
//     if (!ctx || !allFlights.length) return;
//     const filterEl = document.getElementById('chartFilter');
//     const hoursToShow = filterEl ? parseInt(filterEl.value) : 1; 
//     const now = new Date();
//     let labels = [];
//     let dataPoints = [];

//     if (hoursToShow === 1) {
//         for (let i = 50; i >= 0; i -= 10) {
//             let d = new Date(now.getTime() - i * 60000);
//             let timeStr = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
//             labels.push(timeStr);
//             const count = allFlights.filter(f => {
//                 const [fH, fM] = f.time.split(':').map(Number);
//                 const flightTotalMins = fH * 60 + fM;
//                 const targetTotalMins = d.getHours() * 60 + d.getMinutes();
//                 return flightTotalMins > (targetTotalMins - 10) && flightTotalMins <= targetTotalMins;
//             }).length;
//             dataPoints.push(count);
//         }
//     } else {
//         const currentHour = now.getHours();
//         for (let i = 5; i >= 0; i--) {
//             let h = (currentHour - i + 24) % 24;
//             let hourStr = h.toString().padStart(2, '0');
//             labels.push(hourStr + ":00");
//             const count = allFlights.filter(f => f.time.startsWith(hourStr)).length;
//             dataPoints.push(count);
//         }
//     }

//     if (myFlightChart) { myFlightChart.destroy(); }

//     myFlightChart = new Chart(ctx, {
//         type: 'line',
//         data: {
//             labels: labels,
//             datasets: [{
//                 label: 'Uçuş Sayısı',
//                 data: dataPoints,
//                 borderColor: '#3b82f6',
//                 tension: 0.4,
//                 fill: true,
//                 backgroundColor: 'rgba(59, 130, 246, 0.1)'
//             }]
//         },
//         options: { 
//             responsive: true, 
//             maintainAspectRatio: false, 
//             animation: { duration: 600 },
//             plugins: { legend: { display: false } },
//             scales: { 
//                 y: { beginAtZero: true, ticks: { stepSize: 1 } },
//                 x: { grid: { display: false } }
//             }
//         }
//     });
// }

const API_BASE_URL = 'http://localhost:3000';
let myFlightChart = null;
let allFlights = [];
let allPersonnel = [];

// 🌟 YENİ: DASHBOARD SAYFALANDIRMA DEĞİŞKENLERİ 🌟
let currentDashboardPage = 1;
const dashboardRowsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
    setInterval(() => {
        const clock = document.getElementById('liveClock');
        if(clock) clock.textContent = new Date().toLocaleTimeString('tr-TR');
    }, 1000);
    await refreshDashboard();
    setInterval(refreshDashboard, 30000);
    document.getElementById('chartFilter')?.addEventListener('change', () => {
        initOrUpdateChart();
    });
});

async function refreshDashboard() {
    try {
        const [fRes, pRes] = await Promise.all([
            fetch(`${API_BASE_URL}/flights`),
            fetch(`${API_BASE_URL}/personnel`)
        ]);
        allFlights = await fRes.json();
        allPersonnel = await pRes.json();
        updateDashboardKPIs();
        updateDensityGauge();
        renderRecentFlightsTable();
        initOrUpdateChart();
    } catch (error) {
        console.error("Dashboard yükleme hatası:", error);
    }
}

function updateDashboardKPIs() {
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

// 🌟 GÜNCEL: SAYFALANDIRMALI TABLO ÇİZİM MOTORU 🌟
function renderRecentFlightsTable() {
    const tableBody = document.querySelector('.custom-table tbody');
    if (!tableBody) return;
    
    // Verileri yeniden eskiye sıralıyoruz
    const reversedFlights = [...allFlights].reverse();
    
    // 10'arlı sayfalama formülü
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
        
        return `
            <tr>
                <td class="fw-bold text-dark font-monospace">${f.flightNo}</td>
                <td>${f.route}</td>
                <td>${f.time}</td>
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

    // Sayfalama butonlarını da çiz
    renderDashboardPagination(reversedFlights.length);
}

// 🌟 YENİ: SAYFALANDIRMA BUTONLARINI ÇİZEN FONKSİYON 🌟
function renderDashboardPagination(totalItems) {
    const el = document.getElementById('dashboardPaginationControls');
    if (!el) return;
    
    const pages = Math.ceil(totalItems / dashboardRowsPerPage);
    el.innerHTML = '';
    
    if (pages <= 1) return; // Tek sayfa varsa butonları gizle

    if (currentDashboardPage > 1) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeDashboardPage(${currentDashboardPage - 1}); return false;"><i class="fas fa-chevron-left"></i></a></li>`;
    }
    for (let i = 1; i <= pages; i++) {
        el.innerHTML += `<li class="page-item ${i === currentDashboardPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changeDashboardPage(${i}); return false;">${i}</a></li>`;
    }
    if (currentDashboardPage < pages) {
        el.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeDashboardPage(${currentDashboardPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
    }
}

// 🌟 YENİ: SAYFA DEĞİŞTİRME TETİKLEYİCİSİ 🌟
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

function initOrUpdateChart() {
    const ctx = document.getElementById('flightChart');
    if (!ctx || !allFlights.length) return;
    const filterEl = document.getElementById('chartFilter');
    const hoursToShow = filterEl ? parseInt(filterEl.value) : 1; 
    const now = new Date();
    let labels = [];
    let dataPoints = [];

    if (hoursToShow === 1) {
        for (let i = 50; i >= 0; i -= 10) {
            let d = new Date(now.getTime() - i * 60000);
            let timeStr = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
            labels.push(timeStr);
            const count = allFlights.filter(f => {
                const [fH, fM] = f.time.split(':').map(Number);
                const flightTotalMins = fH * 60 + fM;
                const targetTotalMins = d.getHours() * 60 + d.getMinutes();
                return flightTotalMins > (targetTotalMins - 10) && flightTotalMins <= targetTotalMins;
            }).length;
            dataPoints.push(count);
        }
    } else {
        const currentHour = now.getHours();
        for (let i = 5; i >= 0; i--) {
            let h = (currentHour - i + 24) % 24;
            let hourStr = h.toString().padStart(2, '0');
            labels.push(hourStr + ":00");
            const count = allFlights.filter(f => f.time.startsWith(hourStr)).length;
            dataPoints.push(count);
        }
    }

    if (myFlightChart) { myFlightChart.destroy(); }

    myFlightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Uçuş Sayısı',
                data: dataPoints,
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { duration: 600 },
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}
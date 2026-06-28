const API_BASE_URL = 'http://localhost:3000';

let allFlights = [];
let allPersonnel = [];
let chartPerformance = null;
let chartFatigue = null;

// 🌟 ADMİN PANELİ ÇEVİRİ SÖZLÜĞÜ (HİÇBİR KOD SİLİNMEDEN EKLENDİ) 🌟
const adminTranslations = {
    tr: {
        adminRole: "Sistem Yöneticisi", menuOverview: "Genel Bakış", menuFlight: "Uçuş Yönetimi",
        menuCrew: "Personel Planlama", menuReports: "Raporlar", menuArchive: "Uçuş Arşivi",
        logoutText: "Çıkış Yap", 
        
        pageTitleReports: "İstatistik ve Raporlar", pageDescReports: "Operasyonel verilerin analizi ve dönemsel özetler.",
        btnPdf: "PDF Olarak İndir",
        
        flightPerfAnal: "Uçuş Performans Analizi", personnelFatigueDist: "Personel Yorgunluk Dağılımı",
        top5Routes: "En Çok Uçulan İlk 5 Rota", analyzingRoutes: "Rotalar analiz ediliyor...",
        
        // Modal Text
        logoutTitle: "Sistemden Çıkılıyor", logoutDesc: "Operasyon kontrol merkezinden çıkış yapmak istediğinize emin misiniz?", cancel: "İptal",
        
        // Grafikler (Chart.js)
        chartOnTime: "Zamanında / Başarılı", chartDelayed: "Gecikmeli", chartCancelled: "İptal Edilen",
        chartRested: "Dinlenmiş (0-49)", chartWarning: "Dikkat Edilmeli (50-79)", chartCritical: "Kritik Yorgun (80-100)",
        chartYAxisLabel: "Personel Sayısı",
        
        // Dinamik Ekranlar
        routeText: "Sefer", preparingText: "Hazırlanıyor",
        pdfExportName: "SkyOps_Rapor"
    },
    en: {
        adminRole: "System Admin", menuOverview: "Overview", menuFlight: "Flight Management",
        menuCrew: "Crew Planning", menuReports: "Reports", menuArchive: "Flight Archive",
        logoutText: "Log Out", 
        
        pageTitleReports: "Statistics and Reports", pageDescReports: "Analysis of operational data and periodic summaries.",
        btnPdf: "Download as PDF",
        
        flightPerfAnal: "Flight Performance Analysis", personnelFatigueDist: "Personnel Fatigue Distribution",
        top5Routes: "Top 5 Most Flown Routes", analyzingRoutes: "Analyzing routes...",
        
        // Modal Text
        logoutTitle: "Logging Out", logoutDesc: "Are you sure you want to log out of the operation control center?", cancel: "Cancel",
        
        // Grafikler (Chart.js)
        chartOnTime: "On Time / Success", chartDelayed: "Delayed", chartCancelled: "Cancelled",
        chartRested: "Rested (0-49)", chartWarning: "Warning (50-79)", chartCritical: "Critical Fatigue (80-100)",
        chartYAxisLabel: "Number of Staff",
        
        // Dinamik Ekranlar
        routeText: "Flights", preparingText: "Preparing",
        pdfExportName: "SkyOps_Report"
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

    if (allFlights.length > 0 && allPersonnel.length > 0) {
        renderFlightPerformanceChart();
        renderFatigueChart();
        renderTopRoutes();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // 🌟 DİL MOTORUNU BAŞLAT 🌟
    window.currentAdminLang = localStorage.getItem('skyOpsAdminLang') || 'tr';
    document.getElementById('btnLangTR')?.addEventListener('click', () => updateAdminLanguage('tr'));
    document.getElementById('btnLangEN')?.addEventListener('click', () => updateAdminLanguage('en'));
    updateAdminLanguage(window.currentAdminLang);

    // 🌟 YENİ EKLENEN: CANLI SAAT MOTORU 🌟
    function updateClock() {
        const clockElement = document.getElementById('liveClock');
        if (clockElement) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            clockElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock(); 

    // 1. ADIM: ÇIKIŞ BUTONUNU AKTİF ET
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
            sessionStorage.removeItem("isLoggedIn");
            sessionStorage.removeItem("userRole");
            setTimeout(() => { window.location.replace('login.html'); }, 600);
        });
    }

    // 2. ADIM: SAYFA VERİLERİNİ YÜKLE
    await fetchReportData();
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);
});

async function fetchReportData() {
    try {
        const [flightsRes, personnelRes] = await Promise.all([
            fetch(`${API_BASE_URL}/flights`),
            fetch(`${API_BASE_URL}/personnel`)
        ]);

        allFlights = await flightsRes.json();
        allPersonnel = await personnelRes.json();

        renderFlightPerformanceChart();
        renderFatigueChart();
        renderTopRoutes();

    } catch (error) {
        console.error("Rapor verileri çekilirken hata oluştu:", error);
    }
}

// ==========================================
// 1. UÇUŞ PERFORMANS ANALİZİ (PASTA GRAFİK)
// ==========================================
function renderFlightPerformanceChart() {
    const ctx = document.getElementById('flightPerformanceChart');
    if (!ctx || allFlights.length === 0) return;

    let onTimeCount = 0;
    let delayedCount = 0;
    let cancelledCount = 0;

    allFlights.forEach(f => {
        if (f.status === "Zamanında" || f.status === "İndi" || f.status === "Yolcu Alımı") {
            onTimeCount++;
        } else if (f.status === "Gecikmeli") {
            delayedCount++;
        } else if (f.status === "İptal") {
            cancelledCount++;
        }
    });

    if (chartPerformance) chartPerformance.destroy();

    chartPerformance = new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: [t('chartOnTime'), t('chartDelayed'), t('chartCancelled')],
            datasets: [{
                data: [onTimeCount, delayedCount, cancelledCount],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ==========================================
// 2. PERSONEL YORGUNLUK DAĞILIMI (ÇUBUK GRAFİK)
// ==========================================
function renderFatigueChart() {
    const ctx = document.getElementById('fatigueDistributionChart');
    if (!ctx || allPersonnel.length === 0) return;

    let restedCount = 0;   
    let warningCount = 0;  
    let criticalCount = 0; 

    allPersonnel.forEach(p => {
        const fatigue = p.fatiguePoint || 0;
        if (fatigue < 50) restedCount++;
        else if (fatigue >= 50 && fatigue < 80) warningCount++;
        else criticalCount++;
    });

    if (chartFatigue) chartFatigue.destroy();

    chartFatigue = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [t('chartRested'), t('chartWarning'), t('chartCritical')],
            datasets: [{
                label: t('chartYAxisLabel'),
                data: [restedCount, warningCount, criticalCount],
                backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(239, 68, 68, 0.7)'],
                borderColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 1,
                borderRadius: 6 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ==========================================
// 3. EN ÇOK UÇULAN 5 ROTA (LİSTE)
// ==========================================
function renderTopRoutes() {
    const container = document.getElementById('topRoutesList');
    if (!container || allFlights.length === 0) return;

    const routeCounts = {};
    allFlights.forEach(f => {
        if (routeCounts[f.route]) routeCounts[f.route]++;
        else routeCounts[f.route] = 1;
    });

    const sortedRoutes = Object.keys(routeCounts)
        .map(route => ({ route: route, count: routeCounts[route] }))
        .sort((a, b) => b.count - a.count);

    const top5 = sortedRoutes.slice(0, 5);

    container.innerHTML = top5.map((item, index) => `
        <div class="route-item">
            <div>
                <span class="route-rank">${index + 1}</span>
                <span>${item.route}</span>
            </div>
            <span class="route-count">${item.count} ${t('routeText')}</span>
        </div>
    `).join('');
}

// ==========================================
// 4. PDF İNDİRME MOTORU (YATAY VE ZORUNLU GENİŞLİK ÇÖZÜMÜ)
// ==========================================
function getLocalCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
}

function downloadPDF(){
    const btn = document.getElementById("downloadPdfBtn");
    
    // Görünen metni span'dan almak daha temiz
    const spanText = btn.querySelector('span') ? btn.querySelector('span').innerText : btn.innerText;
    
    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> <span>${t('preparingText')}</span>`;
    btn.disabled = true;

    setTimeout(() => {
        const element = document.getElementById("pdfExportArea");

        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;

        element.style.width = "1060px";
        element.style.maxWidth = "1060px";
        element.style.margin = "0 auto";

        const opt = {
            margin: 0.4,
            filename: `${t('pdfExportName')}_${getLocalCurrentDateTime()}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2.5, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['avoid-all', 'css'] }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.width = originalWidth;
            element.style.maxWidth = originalMaxWidth;
            
            btn.innerHTML = `<i class="fas fa-file-pdf me-2"></i> <span data-i18n="btnPdf">${spanText}</span>`;
            btn.disabled = false;
        });
    }, 500);
}


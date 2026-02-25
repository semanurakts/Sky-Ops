const API_BASE_URL = 'http://localhost:3000';

let allFlights = [];
let allPersonnel = [];

document.addEventListener('DOMContentLoaded', async () => {
    await fetchReportData();
    
    // PDF İndirme Butonu Tetikleyicisi
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

    // Statülere göre sayım yap (Zamanında, Gecikmeli, İptal)
    let onTimeCount = 0;
    let delayedCount = 0;
    let cancelledCount = 0;

    allFlights.forEach(f => {
        // İndi veya Zamanında ise başarılı kabul ediyoruz
        if (f.status === "Zamanında" || f.status === "İndi" || f.status === "Yolcu Alımı") {
            onTimeCount++;
        } else if (f.status === "Gecikmeli") {
            delayedCount++;
        } else if (f.status === "İptal") {
            cancelledCount++;
        }
    });

    new Chart(ctx, {
        type: 'doughnut', // İçi boş pasta grafik daha şık durur
        data: {
            labels: ['Zamanında / Başarılı', 'Gecikmeli', 'İptal Edilen'],
            datasets: [{
                data: [onTimeCount, delayedCount, cancelledCount],
                backgroundColor: [
                    '#10b981', // Yeşil (Başarılı)
                    '#f59e0b', // Sarı (Gecikmeli)
                    '#ef4444'  // Kırmızı (İptal)
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ==========================================
// 2. PERSONEL YORGUNLUK DAĞILIMI (ÇUBUK GRAFİK)
// ==========================================
function renderFatigueChart() {
    const ctx = document.getElementById('fatigueDistributionChart');
    if (!ctx || allPersonnel.length === 0) return;

    // 3 Kategoriye ayırıyoruz
    let restedCount = 0;   // 0 - 49
    let warningCount = 0;  // 50 - 79
    let criticalCount = 0; // 80 - 100

    allPersonnel.forEach(p => {
        const fatigue = p.fatiguePoint || 0;
        if (fatigue < 50) restedCount++;
        else if (fatigue >= 50 && fatigue < 80) warningCount++;
        else criticalCount++;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Dinlenmiş (0-49)', 'Dikkat Edilmeli (50-79)', 'Kritik Yorgun (80-100)'],
            datasets: [{
                label: 'Personel Sayısı',
                data: [restedCount, warningCount, criticalCount],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)', // Yeşil transparan
                    'rgba(245, 158, 11, 0.7)', // Sarı transparan
                    'rgba(239, 68, 68, 0.7)'   // Kırmızı transparan
                ],
                borderColor: [
                    '#10b981', '#f59e0b', '#ef4444'
                ],
                borderWidth: 1,
                borderRadius: 6 // Çubukların üstünü hafif oval yapar (Premium görünüm)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Tek veri olduğu için legende gerek yok
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                },
                x: {
                    grid: { display: false }
                }
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

    // Rotaları sayalım { "IST > LHR": 5, "MUC > CDG": 2 ... }
    const routeCounts = {};
    allFlights.forEach(f => {
        if (routeCounts[f.route]) {
            routeCounts[f.route]++;
        } else {
            routeCounts[f.route] = 1;
        }
    });

    // Objeyi Diziye çevirip büyükten küçüğe sıralayalım
    const sortedRoutes = Object.keys(routeCounts)
        .map(route => ({ route: route, count: routeCounts[route] }))
        .sort((a, b) => b.count - a.count);

    // İlk 5'i al
    const top5 = sortedRoutes.slice(0, 5);

    // Ekrana HTML olarak bas
    container.innerHTML = top5.map((item, index) => `
        <div class="route-item">
            <div>
                <span class="route-rank">${index + 1}</span>
                <span>${item.route}</span>
            </div>
            <span class="route-count">${item.count} Sefer</span>
        </div>
    `).join('');
}

// ==========================================
// 4. PDF OLARAK İNDİRME MOTORU
// ==========================================
function downloadPDF() {
    const btn = document.getElementById('downloadPdfBtn');
    const originalText = btn.innerHTML;
    
    // Kullanıcıya bilgi veriyoruz (Buton yazısı değişir)
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Hazırlanıyor...';
    btn.disabled = true;

    // PDF'e dönüştürülecek HTML alanı (İçinde grafikler ve listeler var)
    const element = document.getElementById('pdfExportArea');

    // html2pdf ayarları
    const opt = {
        margin:       0.5,
        filename:     `SkyOps_Rapor_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }, // Grafikler büyük olduğu için yatay (landscape) daha iyi sığar
        pagebreak: { mode: ['css', 'legacy'] },
    };

    // PDF'i oluştur ve indir
    html2pdf().set(opt).from(element).save().then(() => {
        // İndirme bitince butonu eski haline getir
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}
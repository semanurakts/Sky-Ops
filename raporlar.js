const API_BASE_URL = 'http://localhost:3000';

let allFlights = [];
let allPersonnel = [];

document.addEventListener('DOMContentLoaded', async () => {
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

    new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: ['Zamanında / Başarılı', 'Gecikmeli', 'İptal Edilen'],
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

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Dinlenmiş (0-49)', 'Dikkat Edilmeli (50-79)', 'Kritik Yorgun (80-100)'],
            datasets: [{
                label: 'Personel Sayısı',
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
            <span class="route-count">${item.count} Sefer</span>
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

const btn=document.getElementById("downloadPdfBtn")
const originalText=btn.innerHTML

btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Hazırlanıyor'
btn.disabled=true

setTimeout(()=>{

const element=document.getElementById("pdfExportArea")

const originalWidth=element.style.width
const originalMaxWidth=element.style.maxWidth

element.style.width="1060px"
element.style.maxWidth="1060px"
element.style.margin="0 auto"

const opt={
margin:0.4,
filename:`SkyOps_Rapor_${getLocalCurrentDateTime()}.pdf`,
image:{type:'jpeg',quality:1},

html2canvas:{
scale:2.5,
useCORS:true,
scrollY:0
},

jsPDF:{
unit:'mm',
format:'a4',
orientation:'landscape'
},

pagebreak:{
mode:['avoid-all','css']
}
}

html2pdf().set(opt).from(element).save().then(()=>{

element.style.width=originalWidth
element.style.maxWidth=originalMaxWidth

btn.innerHTML=originalText
btn.disabled=false

})

},500)

}


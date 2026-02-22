const API_BASE_URL = 'http://localhost:3000';
let myFlightChart = null;
let allFlights = [];
let allPersonnel = [];

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

    // --- DINAMIK AI MESAJI BURADA ---
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
    const recent = [...allFlights].reverse().slice(0, 8);
    tableBody.innerHTML = recent.map(f => {
        const pilot = allPersonnel.find(p => String(p.id) === String(f.pilot))?.name || "Tanımsız";
        return `
            <tr>
                <td class="fw-bold text-dark font-monospace">${f.flightNo}</td>
                <td>${f.route}</td>
                <td>${f.time}</td>
                <td><span class="badge bg-light text-dark border">${f.gate}</span></td>
                <td><span class="badge ${getBadgeClass(f.status)} px-3 py-2 rounded-pill">${f.status}</span></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="pilot-avatar bg-dark text-white">${pilot[0]}</div>
                        <span>${pilot}</span>
                    </div>
                </td>
                <td><button class="btn btn-sm btn-light"><i class="fas fa-ellipsis-v"></i></button></td>
            </tr>
        `;
    }).join('');
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
const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
    await renderTickets();
});

async function renderTickets() {
    const container = document.getElementById('ticketContainer');
    const tickets = JSON.parse(localStorage.getItem('skyOpsTickets')) || [];

    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt fa-5x text-light mb-4"></i>
                <h3 class="fw-bold">Henüz Biletiniz Yok</h3>
                <p class="text-muted">Satın aldığınız biletler burada görüntülenecektir.</p>
                <a href="yolcu.html" class="btn btn-primary btn-print mt-3 shadow-sm">Uçuş Ara</a>
            </div>`;
        return;
    }

    // Verileri API'den çekelim (İsimleri eşleştirmek için)
    const [flightsRes, airportsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/flights`),
        fetch(`${API_BASE_URL}/airports`)
    ]);
    const allFlights = await flightsRes.json();
    const allAirports = await airportsRes.json();

    container.innerHTML = `<h2 class="fw-bold mb-4 text-dark"><i class="fas fa-folder-open me-2 text-primary"></i>Kayıtlı Biletlerim</h2>`;

    // En yeni bilet en üstte görünsün
    tickets.reverse().forEach(ticket => {
        // Gidiş Bileti Kartı
        container.innerHTML += createPassHtml(ticket, 'outbound', allFlights, allAirports);
        
        // Eğer gidiş-dönüş ise Dönüş Bileti Kartı
        if (ticket.isRoundTrip && ticket.returnFlightId) {
            container.innerHTML += createPassHtml(ticket, 'return', allFlights, allAirports);
        }
    });
}

function createPassHtml(ticket, direction, allFlights, allAirports) {
    const flightId = direction === 'outbound' ? ticket.outboundFlightId : ticket.returnFlightId;
    const seatNo = direction === 'outbound' ? ticket.outboundSeat : ticket.returnSeat;
    const flight = allFlights.find(f => String(f.id) === String(flightId));
    
    if (!flight) return "";

    const [originCode, destCode] = flight.route.split(' > ');
    const originCity = allAirports.find(a => a.code === originCode)?.city || originCode;
    const destCity = allAirports.find(a => a.code === destCode)?.city || destCode;
    
    const directionLabel = direction === 'outbound' ? "GİDİŞ UÇUŞU" : "DÖNÜŞ UÇUŞU";
    const statusColor = direction === 'outbound' ? "text-primary" : "text-success";

    return `
    <div class="boarding-pass shadow-lg border">
        <div class="pass-main">
            <div class="pass-header">
                <div>
                    <span class="badge bg-light text-dark border me-2">${directionLabel}</span>
                    <span class="text-muted small fw-bold">${flight.date}</span>
                </div>
                <div class="pnr-box">PNR: ${ticket.pnr}</div>
            </div>

            <div class="flight-route">
                <div class="route-point text-start">
                    <h2>${originCode}</h2>
                    <span>${originCity.toUpperCase()}</span>
                </div>
                <div class="text-center flex-grow-1">
                    <i class="fas fa-plane ${statusColor} px-3"></i>
                    <div style="border-top: 2px dashed #e2e8f0; margin-top: -12px;"></div>
                </div>
                <div class="route-point text-end">
                    <h2>${destCode}</h2>
                    <span>${destCity.toUpperCase()}</span>
                </div>
            </div>

            <div class="pass-details">
                <div class="detail-item">
                    <label>Yolcu Adı</label>
                    <p>${ticket.passengerName}</p>
                </div>
                <div class="detail-item">
                    <label>Uçuş No</label>
                    <p>${flight.flightNo}</p>
                </div>
                <div class="detail-item">
                    <label>Kabin Sınıfı</label>
                    <p>${ticket.cabinClass}</p>
                </div>
                <div class="detail-item">
                    <label>Biniş Saati</label>
                    <p>${flight.time}</p>
                </div>
                <div class="detail-item">
                    <label>Kapı</label>
                    <p>${flight.gate}</p>
                </div>
                <div class="detail-item">
                    <label>Koltuk</label>
                    <p class="text-primary fs-5">${seatNo}</p>
                </div>
            </div>
        </div>

        <div class="pass-stub">
            <div>
                <label class="d-block small text-muted fw-bold mb-1">KOLTUK</label>
                <h1 class="fw-black text-dark mb-0">${seatNo}</h1>
                <small class="text-muted">${flight.flightNo}</small>
            </div>
            <div class="barcode">${ticket.pnr}</div>
            <button class="btn btn-light btn-sm text-muted" onclick="printTicket(this)">
                <i class="fas fa-print me-1"></i>Yazdır
            </button>
        </div>
    </div>
    `;
}

function clearTickets() {
    if (confirm("Tüm bilet geçmişiniz silinecek. Onaylıyor musunuz?")) {
        localStorage.removeItem('skyOpsTickets');
        location.reload();
    }
}

// Spesifik bileti yazdırma fonksiyonu
function printTicket(buttonElement) {
    // Tıklanan butonun içinde bulunduğu ana bilet kartını (.boarding-pass) bul
    const ticketCard = buttonElement.closest('.boarding-pass');
    
    // Yazdırılacak bilete özel sınıfı ekle
    ticketCard.classList.add('print-section');
    
    // Tarayıcının yazdırma penceresini aç
    window.print();
    
    // Yazdırma işlemi bittikten (veya iptal edildikten) sonra sınıfı kaldır
    // Böylece sayfa normal görünümüne geri döner
    ticketCard.classList.remove('print-section');
}
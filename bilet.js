const API_BASE_URL = 'http://localhost:3000';

// --- 🌍 ÇEVİRİ SÖZLÜĞÜ (BİLETLERİM SAYFASI) ---
const translations = {
    tr: {
        newTicket: "Yeni Bilet Al", 
        clearMemory: "Hafızayı Temizle", 
        myAccount: "Hesabım",
        editProfile: "Profili Düzenle", 
        settings: "Ayarlar", 
        logout: "Çıkış Yap",
        myTicketsHeader: "Kayıtlı Biletlerim", 
        noTicketTitle: "Henüz Biletiniz Yok",
        noTicketDesc: "Satın aldığınız biletler burada görüntülenecektir.", 
        searchFlight: "Uçuş Ara",
        outbound: "GİDİŞ UÇUŞU", 
        return: "DÖNÜŞ UÇUŞU", 
        print: "Yazdır",
        passengerName: "Yolcu Adı",
        flightNo: "Uçuş No", 
        cabinClass: "Kabin Sınıfı", 
        boardingTime: "Biniş Saati", 
        gate: "Kapı", 
        seat: "Koltuk", 
        seatStub: "KOLTUK",
        loadingTickets: "Biletleriniz hazırlanıyor...",
        profileTitle: "Profil Bilgilerim",
        fullNameLabel: "Ad Soyad",
        emailLabel: "E-posta Adresi (Giriş ID)",
        emailWarning: "* Güvenlik gereği E-posta adresi değiştirilemez.",
        newPasswordLabel: "Yeni Şifre Belirle (İsteğe Bağlı)",
        newPasswordPlaceholder: "Değiştirmek istemiyorsanız boş bırakın",
        saveChanges: "Değişiklikleri Kaydet",
        settingsTitle: "Sistem Ayarları",
        emailNotifications: "E-posta Bildirimleri",
        smsNotifications: "SMS Bilgilendirmesi",
        currencyLabel: "Para Birimi",
        
        // YENİ EKLENENLER (ÇIKIŞ MODALI İÇİN)
        logoutTitle: "Çıkış Yapılıyor",
        logoutDesc: "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
        cancel: "İptal"
    },
    en: {
        newTicket: "New Ticket", 
        clearMemory: "Clear Memory", 
        myAccount: "My Account",
        editProfile: "Edit Profile", 
        settings: "Settings", 
        logout: "Log Out",
        myTicketsHeader: "My Saved Tickets", 
        noTicketTitle: "No Tickets Yet",
        noTicketDesc: "Your purchased tickets will appear here.", 
        searchFlight: "Search Flights",
        outbound: "OUTBOUND FLIGHT", 
        return: "RETURN FLIGHT", 
        print: "Print", 
        passengerName: "Passenger Name",
        flightNo: "Flight No", 
        cabinClass: "Cabin Class", 
        boardingTime: "Boarding Time", 
        gate: "Gate", 
        seat: "Seat", 
        seatStub: "SEAT",
        loadingTickets: "Your tickets are being prepared...",
        profileTitle: "Profile Information",
        fullNameLabel: "Full Name",
        emailLabel: "Email Address (Login ID)",
        emailWarning: "* For security reasons, the email address cannot be changed.",
        newPasswordLabel: "Set New Password (Optional)",
        newPasswordPlaceholder: "Leave blank if you do not want to change",
        saveChanges: "Save Changes",
        settingsTitle: "System Settings",
        emailNotifications: "Email Notifications",
        smsNotifications: "SMS Notifications",
        currencyLabel: "Currency",
        
        // YENİ EKLENENLER (ÇIKIŞ MODALI İÇİN)
        logoutTitle: "Logging Out",
        logoutDesc: "Are you sure you want to log out of your account?",
        cancel: "Cancel"
    }
};

function updateLanguage(lang) {
    window.currentLang = lang;
    localStorage.setItem('skyOpsLang', lang);
    const btnTR = document.getElementById('btnLangTR');
    const btnEN = document.getElementById('btnLangEN');
    if(btnTR && btnEN) {
        btnTR.classList.toggle('active', lang === 'tr');
        btnEN.classList.toggle('active', lang === 'en');
    }
    
    // Normal metinleri çevir
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });

    // Input içindeki silik yazıları (placeholder) çevir
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) el.setAttribute('placeholder', translations[lang][key]);
    });
}

document.addEventListener('DOMContentLoaded', async () => { 
    // Sayfa açıldığında varsayılan dili ayarla
    window.currentLang = localStorage.getItem('skyOpsLang') || 'tr';
    
    document.getElementById('btnLangTR')?.addEventListener('click', () => updateLanguage('tr'));
    document.getElementById('btnLangEN')?.addEventListener('click', () => updateLanguage('en'));
    updateLanguage(window.currentLang);
    
    // --- 🌟 DİNAMİK YOLCU İSMİ VE MODAL İŞLEMLERİ 🌟 ---
    const users = JSON.parse(localStorage.getItem('skyOpsUsers')) || [];
    const activeUserName = sessionStorage.getItem('skyOpsActiveUser') || localStorage.getItem('skyOpsActiveUser');
    const activeUserData = users.find(u => u.name === activeUserName) || users[users.length - 1];

    if(activeUserData && activeUserData.name) {
        document.getElementById('navPassengerName').innerText = activeUserData.name.split(' ')[0]; 
    }

    // 1. Çıkış Yapma İşlemi
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            new bootstrap.Modal(document.getElementById('logoutConfirmModal')).show();
        });
    }

    const btnConfirmLogout = document.getElementById('btnConfirmLogout');
    if (btnConfirmLogout) {
        btnConfirmLogout.addEventListener('click', () => {
            btnConfirmLogout.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Çıkılıyor...';
            setTimeout(() => {
                sessionStorage.removeItem('isLoggedIn');
                localStorage.removeItem('skyOpsActiveUser');
                window.location.href = 'login.html';
            }, 600);
        });
    }

    // 2. Profil ve Ayarlar Modallarını Açma
    document.getElementById('btnProfileEdit')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeUserData) {
            document.getElementById('profileEditName').value = activeUserData.name;
            document.getElementById('profileEditEmail').value = activeUserData.email;
        }
        new bootstrap.Modal(document.getElementById('passengerProfileModal')).show();
    });

    document.getElementById('btnUserSettings')?.addEventListener('click', (e) => {
        e.preventDefault();
        new bootstrap.Modal(document.getElementById('passengerSettingsModal')).show();
    });

    // 3. Ayarları Tarayıcıya Kaydetme Mantığı
    const set_email = document.getElementById('set_emailNotify');
    const set_sms = document.getElementById('set_smsNotify');
    const set_curr = document.getElementById('set_currency');

    const savedSettings = JSON.parse(localStorage.getItem('skyOpsSettings')) || { email: true, sms: false, currency: 'TRY' };
    if(set_email) set_email.checked = savedSettings.email;
    if(set_sms) set_sms.checked = savedSettings.sms;
    if(set_curr) set_curr.value = savedSettings.currency;

    const saveSettings = () => {
        localStorage.setItem('skyOpsSettings', JSON.stringify({
            email: set_email.checked, sms: set_sms.checked, currency: set_curr.value
        }));
    };
    [set_email, set_sms, set_curr].forEach(el => el?.addEventListener('change', saveSettings));

    // Biletleri Ekrana Çiz
    await renderTickets();
});

async function renderTickets() {
    const container = document.getElementById('ticketContainer');
    const tickets = JSON.parse(localStorage.getItem('skyOpsTickets')) || [];

    if (tickets.length === 0) {
        // BURASI DÜZELTİLDİ: Sadece bu görseldeki kısmı dil değişkenine bağladık
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt fa-5x text-light mb-4"></i>
                <h3 class="fw-bold" data-i18n="noTicketTitle">${translations[window.currentLang].noTicketTitle}</h3>
                <p class="text-muted" data-i18n="noTicketDesc">${translations[window.currentLang].noTicketDesc}</p>
                <a href="yolcu.html" class="btn btn-primary btn-print mt-3 shadow-sm" data-i18n="searchFlight">${translations[window.currentLang].searchFlight}</a>
            </div>`;
        return;
    }

    // Verileri API'den çekelim
    const [flightsRes, airportsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/flights`),
        fetch(`${API_BASE_URL}/airports`)
    ]);
    const allFlights = await flightsRes.json();
    const allAirports = await airportsRes.json();

    container.innerHTML = `<h2 class="fw-bold mb-4 text-dark"><i class="fas fa-folder-open me-2 text-primary"></i>Kayıtlı Biletlerim</h2>`;

    // En yeni bilet en üstte görünsün
    tickets.reverse().forEach(ticket => {
        container.innerHTML += createPassHtml(ticket, 'outbound', allFlights, allAirports);
        
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

function printTicket(buttonElement) {
    const ticketCard = buttonElement.closest('.boarding-pass');
    ticketCard.classList.add('print-section');
    window.print();
    ticketCard.classList.remove('print-section');
}
// // --- GLOBAL DEĞİŞKENLER VE YAPILANDIRMA ---
// const API_BASE_URL = 'http://localhost:3000';
// let myFlightChart = null;

// // Bellekte tutulan veriler
// let allPersonnel = [];
// let globalAirports = [];
// let globalAirlines = [];

// // Filtreleme ve Sayfalama Durumu
// let currentPage = 1;
// const rowsPerPage = 15;
// let searchTerm = "";
// let statusFilter = "Tüm Durumlar";

// // Düzenleme (Edit) Modu Durumu
// let isEditing = false;
// let editingFlightId = null;

// // =======================================================
// // 1. BAŞLATICI (DOMContentLoaded)
// // =======================================================
// document.addEventListener('DOMContentLoaded', async () => {
//     // Canlı Saati Başlat
//     setInterval(() => {
//         const now = new Date();
//         const timeString = now.toLocaleTimeString('tr-TR');
//         const clockEls = document.querySelectorAll('#liveClock');
//         clockEls.forEach(el => el.textContent = timeString);
//     }, 1000);

//     // ADIM 1: Önce Personel Verisini Yükle
//     await loadPersonnelData();
    
//     // ADIM 2: Dropdown (Havalimanı/Havayolu) Verilerini Yükle
//     await loadDropdownData();

//     // ADIM 3: Sayfadaki Form Kontrollerini Kur
//     setupFormControls();

//     // ADIM 4: Sayfa Kontrolü ve Veri Basımı
//     const flightTable = document.getElementById('flightManagementTableBody');
//     const personnelTable = document.getElementById('personnelTableBody');

//     // Personel sayfasındaysak verileri tabloya ve kartlara bas
//     if (personnelTable) {
//         renderPersonnelTable(allPersonnel);
//         updatePersonnelKPIs(allPersonnel);
//     }

//     // Uçuş yönetimi sayfasındaysak uçuşları çek
//     if (flightTable) {
//         fetchFlights();
//         setInterval(fetchFlights, 30000); // 30 sn otomatik yenileme
//         initFlightChart();
//     }
// });

// // =======================================================
// // 2. PERSONEL YÖNETİMİ
// // =======================================================
// async function loadPersonnelData() {
//     try {
//         console.log("Personel verileri db.json'dan çekiliyor...");
//         const response = await fetch(`${API_BASE_URL}/personnel`);
//         if (!response.ok) throw new Error('Personel verisi alınamadı');
        
//         allPersonnel = await response.json();
//         console.log("Yüklenen Personeller:", allPersonnel);
        
//         // Tablo ve KPI kartlarını güncelle (Sadece elementler sayfada varsa)
//         if (document.getElementById('personnelTableBody')) {
//             renderPersonnelTable(allPersonnel);
//             updatePersonnelKPIs(allPersonnel);
//         }

//         // Uçuş sayfasındaysak seçim kutularını doldur
//         populateCrewSelects();

//     } catch (error) {
//         console.error("Personel yükleme hatası:", error);
//     }
// }

// function populateCrewSelects() {
//     const pilotSelect = document.getElementById('pilotName');
//     const cabinSelect = document.getElementById('cabinCrewNames');

//     if (!pilotSelect) return; 

//     pilotSelect.innerHTML = '<option value="" selected>Pilot Seçiniz...</option>';
//     if (cabinSelect) cabinSelect.innerHTML = ''; 

//     const pilots = allPersonnel.filter(p => p.role && p.role.toLowerCase() === 'pilot');
//     const cabinCrew = allPersonnel.filter(p => p.role && (p.role.toLowerCase() === 'kabin memuru' || p.role.toLowerCase() === 'kabin ekibi'));

//     pilots.forEach(p => {
//         pilotSelect.options.add(new Option(`${p.name} (${p.status})`, p.id));
//     });

//     if (cabinSelect) {
//         cabinCrew.forEach(c => {
//             cabinSelect.options.add(new Option(`${c.name} (${c.status})`, c.id));
//         });
//     }
// }

// function renderPersonnelTable(data) {
//     const tableBody = document.getElementById('personnelTableBody');
//     if (!tableBody) return;

//     if (!data || data.length === 0) {
//         tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Kayıtlı personel bulunamadı.</td></tr>';
//         return;
//     }

//     tableBody.innerHTML = data.map(p => {
//         const hrs = p.flightHours || 0;
//         const fatiguePercent = Math.min((hrs / 14) * 100, 100);
//         const riskClass = hrs > 10 ? 'bg-danger' : 'bg-success';
//         const riskText = hrs > 10 ? 'Yüksek Risk' : 'Düşük Risk';

//         return `
//             <tr class="align-middle">
//                 <td>
//                     <div class="d-flex align-items-center gap-3">
//                         <div class="pilot-avatar bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style="width:35px; height:35px; font-size: 12px; font-weight: bold;">
//                             ${p.name ? p.name.charAt(0) : '?'}
//                         </div>
//                         <div>
//                             <div class="fw-bold text-dark">${p.name || 'İsimsiz'}</div>
//                             <small class="text-muted">ID: ${p.id}</small>
//                         </div>
//                     </div>
//                 </td>
//                 <td><span class="badge bg-light text-dark border">${p.role || '-'}</span></td>
//                 <td class="fw-bold">${hrs} Saat</td>
//                 <td>
//                     <div class="d-flex justify-content-between mb-1">
//                         <span class="small text-muted" style="font-size:10px;">${riskText}</span>
//                         <span class="small fw-bold" style="font-size:10px;">%${Math.round(fatiguePercent)}</span>
//                     </div>
//                     <div class="progress" style="height: 6px;">
//                         <div class="progress-bar ${riskClass}" style="width: ${fatiguePercent}%"></div>
//                     </div>
//                 </td>
//                 <td><span class="badge bg-success-subtle text-success rounded-pill px-3 py-1">${p.status || 'Bilinmiyor'}</span></td>
//                 <td class="text-end">
//                     <button class="btn btn-sm btn-light text-muted"><i class="fas fa-ellipsis-h"></i></button>
//                 </td>
//             </tr>
//         `;
//     }).join('');
// }

// function updatePersonnelKPIs(data) {
//     const total = document.getElementById('totalStaffCount');
//     const available = document.getElementById('availableStaffCount');
//     const risky = document.getElementById('riskyStaffCount');

//     if (total) total.textContent = data.length;
//     if (available) available.textContent = data.filter(p => p.status === 'Müsait').length;
//     if (risky) risky.textContent = data.filter(p => (p.flightHours || 0) > 10).length;
// }

// // =======================================================
// // 3. UÇUŞ YÖNETİMİ
// // =======================================================
// async function fetchFlights() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/flights`);
//         if (!response.ok) throw new Error('Uçuş verisi alınamadı');
//         const flights = await response.json();
        
//         flights.reverse(); 
//         renderFlightManagementTable(flights);

//         if (document.getElementById('flightTableBody')) {
//             renderDashboardTable(flights);
//         }
//     } catch (error) { console.error("Uçuşlar getirilemedi:", error); }
// }

// function getPilotNameById(id) {
//     if (!id) return "-";
//     const person = allPersonnel.find(p => p.id === id);
//     return person ? person.name : id;
// }

// function renderFlightManagementTable(sourceFlights) {
//     const tableBody = document.getElementById('flightManagementTableBody');
//     if (!tableBody) return;

//     let flights = sourceFlights.filter(f => {
//         const matchesStatus = statusFilter === "Tüm Durumlar" || f.status === statusFilter;
//         const matchesSearch = f.flightNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
//                               f.route.toLowerCase().includes(searchTerm.toLowerCase());
//         return matchesStatus && matchesSearch;
//     });

//     const totalItems = flights.length;
//     const startIndex = (currentPage - 1) * rowsPerPage;
//     const paginatedFlights = flights.slice(startIndex, startIndex + rowsPerPage);

//     tableBody.innerHTML = paginatedFlights.map(flight => {
//         const badgeClass = getBadgeClass(flight.status);
//         const pilotName = getPilotNameById(flight.pilot); 

//         return `
//             <tr>
//                 <td class="fw-bold text-dark font-monospace">${flight.flightNo}</td>
//                 <td>${flight.route}</td>
//                 <td>${flight.time}</td>
//                 <td><span class="badge bg-light text-dark border">${flight.gate}</span></td>
//                 <td><span class="badge ${badgeClass} px-3 py-2 rounded-pill">${flight.status}</span></td>
//                 <td>
//                     <div class="d-flex align-items-center gap-2">
//                         <div class="pilot-avatar bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style="width:25px; height:25px; font-size: 10px;">
//                             ${pilotName.charAt(0)}
//                         </div>
//                         <span>${pilotName}</span>
//                     </div>
//                 </td>
//                 <td class="text-end">
//                     <button class="btn btn-sm btn-outline-primary me-1" onclick="editFlight('${flight.id}')"><i class="fas fa-edit"></i></button>
//                     <button class="btn btn-sm btn-outline-danger" onclick="deleteFlight('${flight.id}')"><i class="fas fa-trash"></i></button>
//                 </td>
//             </tr>`;
//     }).join('');

//     renderPaginationControls(totalItems);
// }

// function renderDashboardTable(flights) {
//     const tableBody = document.getElementById('flightTableBody');
//     if (!tableBody) return;
    
//     const recentFlights = flights.slice(0, 8); 
//     tableBody.innerHTML = recentFlights.map(flight => {
//         const pilotName = getPilotNameById(flight.pilot);
//         return `
//             <tr>
//                 <td class="fw-bold text-dark">${flight.flightNo}</td>
//                 <td>${flight.route}</td>
//                 <td>${flight.time}</td>
//                 <td><span class="badge bg-light text-dark border">${flight.gate}</span></td>
//                 <td><span class="badge ${getBadgeClass(flight.status)} rounded-pill">${flight.status}</span></td>
//                 <td>${pilotName}</td>
//                 <td><button class="btn btn-sm btn-light"><i class="fas fa-ellipsis-v"></i></button></td>
//             </tr>`;
//     }).join('');
// }

// function getBadgeClass(status) {
//     switch(status) {
//         case 'Zamanında': return 'bg-success-subtle text-success';
//         case 'Gecikmeli': return 'bg-warning-subtle text-warning-emphasis';
//         case 'Yolcu Alımı': return 'bg-info-subtle text-info';
//         case 'İndi': return 'bg-primary text-white';
//         case 'İptal': return 'bg-danger-subtle text-danger'; 
//         default: return 'bg-secondary-subtle text-secondary';
//     }
// }

// // =======================================================
// // 4. VERİ YÜKLEME (HAVALİMANI/HAVAYOLU)
// // =======================================================
// async function loadDropdownData() {
//     try {
//         const [airportsRes, airlinesRes] = await Promise.all([
//             fetch(`${API_BASE_URL}/airports`),
//             fetch(`${API_BASE_URL}/airlines`)
//         ]);
//         globalAirports = await airportsRes.json();
//         globalAirlines = await airlinesRes.json();
        
//         populateAirportSelect('originInput', globalAirports, 'Kalkış');
//         populateAirportSelect('destinationInput', globalAirports, 'Varış');
//         renderAirlineOptions(globalAirlines);
//     } catch(error) { console.error("Veri yükleme hatası:", error); } 
// }

// function populateAirportSelect(elementId, data, placeholder) {
//     const selectEl = document.getElementById(elementId);
//     if (!selectEl) return;
//     selectEl.innerHTML = `<option value="" selected>${placeholder}</option>`;
//     data.forEach(a => {
//         const opt = new Option(`${a.code} - ${a.name}`, a.code);
//         selectEl.appendChild(opt);
//     });
// }

// function renderAirlineOptions(airlines) {
//     const datalist = document.getElementById('airlineOptions');
//     if (!datalist) return;
//     datalist.innerHTML = airlines.map(a => `<option value="${a.code} - ${a.name}">`).join('');
// }

// // =======================================================
// // 5. İŞLEM FONKSİYONLARI VE SAYFALAMA
// // =======================================================
// function renderPaginationControls(totalItems) {
//     const paginationEl = document.getElementById('paginationControls');
//     if (!paginationEl) return;
    
//     const totalPages = Math.ceil(totalItems / rowsPerPage);
//     paginationEl.innerHTML = '';
//     if (totalPages <= 1) return;

//     const prevDisabled = currentPage === 1 ? 'disabled' : '';
//     paginationEl.innerHTML += `<li class="page-item ${prevDisabled}"><a class="page-link shadow-none border-0" href="#" onclick="changePage(${currentPage - 1}); return false;">&laquo;</a></li>`;

//     for (let i = 1; i <= totalPages; i++) {
//         const activeClass = i === currentPage ? 'active' : '';
//         const activeStyle = i === currentPage ? 'bg-primary text-white rounded-circle' : 'text-dark rounded-circle';
//         paginationEl.innerHTML += `<li class="page-item ${activeClass} mx-1"><a class="page-link shadow-none border-0 ${activeStyle} w-10 h-10 d-flex align-items-center justify-content-center" href="#" onclick="changePage(${i}); return false;">${i}</a></li>`;
//     }

//     const nextDisabled = currentPage === totalPages ? 'disabled' : '';
//     paginationEl.innerHTML += `<li class="page-item ${nextDisabled}"><a class="page-link shadow-none border-0" href="#" onclick="changePage(${currentPage + 1}); return false;">&raquo;</a></li>`;
// }

// function changePage(page) {
//     currentPage = page;
//     fetchFlights();
// }

// async function deleteFlight(id) {
//     if(confirm('Bu uçuş kaydını silmek istediğinize emin misiniz?')) {
//         await fetch(`${API_BASE_URL}/flights/${id}`, { method: 'DELETE' });
//         fetchFlights();
//     }
// }

// async function editFlight(id) {
//     try {
//         const response = await fetch(`${API_BASE_URL}/flights/${id}`);
//         const flight = await response.json();

//         isEditing = true;
//         editingFlightId = id;

//         const modalEl = document.getElementById('addFlightModal');
//         if(!modalEl) return;

//         document.querySelector('.modal-title').innerHTML = `<i class="fas fa-edit me-2 text-success"></i>Uçuşu Güncelle`;
//         const submitBtn = document.getElementById('addFlightForm').querySelector('button[type="submit"]');
//         submitBtn.innerHTML = `<i class="fas fa-sync-alt me-2"></i>Güncelle`;
//         submitBtn.classList.replace('btn-primary', 'btn-success');

//         const parts = flight.flightNo.split('-');
//         document.getElementById('airlineCodeInput').value = parts[0];
//         document.getElementById('flightNumberInput').value = parts[1];
        
//         const routes = flight.route.split(' > ');
//         document.getElementById('originInput').value = routes[0];
//         document.getElementById('destinationInput').value = routes[1];
//         document.getElementById('flightTime').value = flight.time;
//         document.getElementById('gate').value = flight.gate;
//         document.getElementById('pilotName').value = flight.pilot;
//         document.getElementById('flightStatus').value = flight.status;

//         new bootstrap.Modal(modalEl).show();
//         modalEl.addEventListener('hidden.bs.modal', resetModalUI, { once: true });

//     } catch (error) { console.error("Düzenleme hatası:", error); }
// }

// function resetModalUI() {
//     isEditing = false;
//     editingFlightId = null;
//     const form = document.getElementById('addFlightForm');
//     if (form) {
//         form.reset();
//         document.querySelector('.modal-title').innerHTML = `<i class="fas fa-plane-departure me-2 text-primary"></i>Yeni Uçuş Planla`;
//         const submitBtn = form.querySelector('button[type="submit"]');
//         submitBtn.innerHTML = `<i class="fas fa-save me-2"></i>Kaydet ve Yayınla`;
//         submitBtn.classList.replace('btn-success', 'btn-primary');
//     }
// }

// // =======================================================
// // 6. FORM KONTROLLERİ VE EVENTLER
// // =======================================================
// function setupFormControls() {
//     const addPersonnelForm = document.getElementById('addPersonnelForm');
//     if (addPersonnelForm) {
//         addPersonnelForm.addEventListener('submit', async (e) => {
//             e.preventDefault();
//             const newPerson = {
//                 id: `p${Date.now()}`,
//                 name: document.getElementById('staffName').value,
//                 role: document.getElementById('staffRole').value,
//                 flightHours: 0,
//                 status: "Müsait",
//                 risk: "Düşük"
//             };

//             const res = await fetch(`${API_BASE_URL}/personnel`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(newPerson)
//             });

//             if (res.ok) {
//                 bootstrap.Modal.getInstance(document.getElementById('addPersonnelModal')).hide();
//                 addPersonnelForm.reset();
//                 await loadPersonnelData();
//                 alert("Personel başarıyla eklendi.");
//             }
//         });
//     }

//     const addFlightForm = document.getElementById('addFlightForm');
//     if (addFlightForm) {
//         addFlightForm.addEventListener('submit', async (e) => {
//             e.preventDefault();
//             const cabinSelect = document.getElementById('cabinCrewNames');
//             const selectedCabin = cabinSelect ? Array.from(cabinSelect.selectedOptions).map(opt => opt.value) : [];

//             const payload = {
//                 id: isEditing ? editingFlightId : Date.now().toString(),
//                 flightNo: `${document.getElementById('airlineCodeInput').value}-${document.getElementById('flightNumberInput').value.padStart(4,'0')}`,
//                 route: `${document.getElementById('originInput').value} > ${document.getElementById('destinationInput').value}`,
//                 time: document.getElementById('flightTime').value,
//                 gate: document.getElementById('gate').value,
//                 pilot: document.getElementById('pilotName').value,
//                 cabinCrew: selectedCabin,
//                 status: document.getElementById('flightStatus').value
//             };

//             const method = isEditing ? 'PUT' : 'POST';
//             const url = isEditing ? `${API_BASE_URL}/flights/${editingFlightId}` : `${API_BASE_URL}/flights`;

//             const res = await fetch(url, {
//                 method: method,
//                 headers: {'Content-Type': 'application/json'},
//                 body: JSON.stringify(payload)
//             });

//             if (res.ok) {
//                 bootstrap.Modal.getInstance(document.getElementById('addFlightModal')).hide();
//                 resetModalUI();
//                 fetchFlights();
//                 alert(isEditing ? 'Uçuş güncellendi!' : 'Uçuş eklendi!');
//             }
//         });
//     }

//     const searchInput = document.getElementById('globalSearchInput');
//     const statusSelect = document.getElementById('statusFilterSelect');
//     if (searchInput) searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; currentPage=1; fetchFlights(); });
//     if (statusSelect) statusSelect.addEventListener('change', (e) => { statusFilter = e.target.value; currentPage=1; fetchFlights(); });
// }

// function initFlightChart() {
//     const canvas = document.getElementById('flightChart');
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     myFlightChart = new Chart(ctx, {
//         type: 'line',
//         data: {
//             labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
//             datasets: [{
//                 label: 'Uçuş Sayısı',
//                 data: [12, 19, 15, 20, 22, 24],
//                 borderColor: '#3b82f6',
//                 tension: 0.4,
//                 fill: true,
//                 backgroundColor: 'rgba(59, 130, 246, 0.1)'
//             }]
//         },
//         options: { 
//             responsive: true, 
//             maintainAspectRatio: false, 
//             plugins: { legend: { display: false } } 
//         }
//     });
// }
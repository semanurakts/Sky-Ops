// const API_BASE_URL = 'http://localhost:3000';

// let globalAirports = [];
// let filteredOriginAirports = []; 
// let routeDurations = [];
// let allFlights = [];
// let globalAirlines = [];

// const cabinClasses = [
//     { value: 'economy', text: 'Ekonomi', icon: 'fa-chair' },
//     { value: 'business', text: 'Business', icon: 'fa-chair' },
//     { value: 'first', text: 'First Class', icon: 'fa-chair' }
// ];

// let returnDatePicker; 
// let currentSearchIsRoundTrip = false; 

// let selectedOutboundFlight = null;
// let selectedReturnFlight = null;

// // 🌟 BİLET BİLGİLERİNİ TUTACAK DEĞİŞKENLER 🌟
// let currentMapDirection = 'outbound'; 
// let finalTotalPrice = "0"; 
// let outboundSeatNo = null; // Gidiş Koltuğu
// let returnSeatNo = null;   // Dönüş Koltuğu

// document.addEventListener('DOMContentLoaded', async () => {

//     // 🌟 KULLANICI ADINI YAZDIRMA VE ÇIKIŞ YAPMA İŞLEMİ 🌟
//     const users = JSON.parse(localStorage.getItem('skyOpsUsers')) || [];
//     if(users.length > 0) {
//         const lastUser = users[users.length - 1];
//         if(lastUser && lastUser.name) {
//             document.getElementById('navPassengerName').innerText = lastUser.name.split(' ')[0]; 
//         }
//     }

//     const btnLogout = document.getElementById('btnLogout');
//     const logoutModal = new bootstrap.Modal(document.getElementById('logoutConfirmModal'));

//     if (btnLogout) {
//         btnLogout.addEventListener('click', (e) => {
//             e.preventDefault();
//             logoutModal.show();
//         });
//     }

//     const btnConfirmLogout = document.getElementById('btnConfirmLogout');
//     if (btnConfirmLogout) {
//         btnConfirmLogout.addEventListener('click', () => {
//             btnConfirmLogout.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Çıkılıyor...';
//             btnConfirmLogout.disabled = true;

//             setTimeout(() => {
//                 localStorage.removeItem('skyOpsActiveUser');
//                 window.location.href = 'login.html';
//             }, 600);
//         });
//     }

// // 🌟 YENİ: YOLCU PROFİLİ DÜZENLE MODALI 🌟
//     const btnProfileEdit = document.getElementById('btnProfileEdit');
//     const profileModalEl = document.getElementById('passengerProfileModal');
//     const profileModal = profileModalEl ? new bootstrap.Modal(profileModalEl) : null;

//     // Kullanıcı bilgisini güvenli bir şekilde yakala
//     const systemUsers = JSON.parse(localStorage.getItem('skyOpsUsers')) || [];
//     const activeUserName = sessionStorage.getItem('skyOpsActiveUser') || localStorage.getItem('skyOpsActiveUser');
//     const activeUserData = systemUsers.find(u => u.name === activeUserName) || systemUsers[systemUsers.length - 1];

//     if (btnProfileEdit && profileModal) {
//         btnProfileEdit.addEventListener('click', (e) => {
//             e.preventDefault();
            
//             // 🌟 TIKLANDIĞI ANDA BİLGİLERİ INPUTLARA DOLDUR 🌟
//             if (activeUserData) {
//                 document.getElementById('profileEditName').value = activeUserData.name;
//                 document.getElementById('profileEditEmail').value = activeUserData.email;
//                 document.getElementById('profileEditPassword').value = ''; 
//             }
            
//             profileModal.show();
//         });
//     }

//     if (btnUserSettings && settingsModal) {
//         btnUserSettings.addEventListener('click', (e) => {
//             e.preventDefault();
//             settingsModal.show();
//         });
//     }

//     const profileForm = document.getElementById('passengerProfileForm');
//     if (profileForm) {
//         profileForm.addEventListener('submit', (e) => {
//             e.preventDefault();
//             const submitBtn = profileForm.querySelector('button[type="submit"]');
            
//             const newName = document.getElementById('profileEditName').value.trim();
//             const newPassword = document.getElementById('profileEditPassword').value.trim();

//             submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Kaydediliyor...';
//             submitBtn.disabled = true;

//             setTimeout(() => {
//                 if (activeUserData) {
//                     activeUserData.name = newName;
//                     if (newPassword !== "") {
//                         activeUserData.password = newPassword;
//                     }
//                     localStorage.setItem('skyOpsUsers', JSON.stringify(systemUsers));
//                     localStorage.setItem('skyOpsActiveUser', newName); 
                    
//                     document.getElementById('navPassengerName').innerText = newName.split(' ')[0]; 
//                 }

//                 submitBtn.innerHTML = 'Değişiklikleri Kaydet';
//                 submitBtn.disabled = false;
//                 if(profileModal) profileModal.hide();
                
//                 alert("✅ Profil bilgileriniz başarıyla güncellendi.");
//             }, 800);
//         });
//     }

//     // --- 🌟 AYARLARI KALICI HALE GETİREN VE MODALI AÇAN SİSTEM 🌟 ---
    
//     // Elementleri yakala
//     const set_email = document.getElementById('set_emailNotify');
//     const set_sms = document.getElementById('set_smsNotify');
//     const set_curr = document.getElementById('set_currency');

//     // 1. Sayfa açıldığında LocalStorage'dan ayarları yükle
//     const savedSettings = JSON.parse(localStorage.getItem('skyOpsSettings')) || { email: true, sms: false, currency: 'TRY' };
    
//     // UI'a uygula
//     if(set_email) set_email.checked = savedSettings.email;
//     if(set_sms) set_sms.checked = savedSettings.sms;
//     if(set_curr) set_curr.value = savedSettings.currency;

//     // 2. Ayarlar değiştikçe ANINDA LocalStorage'a kaydet (Save butonuna gerek kalmaz)
//     const saveToMemory = () => {
//         const settings = {
//             email: set_email.checked,
//             sms: set_sms.checked,
//             currency: set_curr.value
//         };
//         localStorage.setItem('skyOpsSettings', JSON.stringify(settings));
//     };

//     if(set_email) set_email.addEventListener('change', saveToMemory);
//     if(set_sms) set_sms.addEventListener('change', saveToMemory);
//     if(set_curr) set_curr.addEventListener('change', saveToMemory);

//     // 3. Ayarlar Modalını Açan Buton (Senin kodunda btnUserSettings zaten tanımlı olmalı)
//     if (btnUserSettings) {
//         btnUserSettings.addEventListener('click', (e) => {
//             e.preventDefault();
//             const settingsModal = new bootstrap.Modal(document.getElementById('passengerSettingsModal'));
//             settingsModal.show();
//         });
//     }
    
//     // --- UÇUŞ ARAMA VE BİLETLEME İŞLEMLERİ ---
//     await fetchInitialData();

//     // 🌟 YENİ: Havacılık standardı olan "Maksimum 330 Gün İleri" kuralını tanımlıyoruz
//     const maxFlightDate = new Date();
//     maxFlightDate.setDate(maxFlightDate.getDate() + 330);

//     flatpickr("#searchDate", {
//         locale: "tr", 
//         altInput: true, 
//         altFormat: "d.m.Y", 
//         dateFormat: "Y-m-d",
//         defaultDate: "today", 
//         minDate: "today",
//         maxDate: maxFlightDate, // 330 gün kısıtlaması
//         disableMobile: "true"
//     });

//     returnDatePicker = flatpickr("#returnDate", {
//         locale: "tr", 
//         altInput: true, 
//         altFormat: "d.m.Y", 
//         dateFormat: "Y-m-d",
//         minDate: "today",
//         maxDate: maxFlightDate, // Dönüş de maksimum 330 gün olabilir
//         disableMobile: "true"
//     });

//     document.querySelectorAll('input[name="tripType"]').forEach(radio => {
//         radio.addEventListener('change', (e) => {
//             const returnContainer = document.getElementById('returnDateContainer');
//             const returnInput = document.getElementById('returnDate');
//             if (e.target.value === 'roundtrip') {
//                 returnContainer.style.display = 'block';
//                 returnInput.required = true;
//             } else {
//                 returnContainer.style.display = 'none';
//                 returnInput.required = false;
//                 returnDatePicker.clear();
//             }
//         });
//     });

//     document.getElementById('flightSearchForm').addEventListener('submit', handleFlightSearch);
    
//     const filterInput = document.getElementById('globalFilterInput');
//     filterInput.addEventListener('input', handleGlobalFilter);

//     document.addEventListener('click', (e) => {
//         document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
//             if (!dropdown.parentElement.contains(e.target)) {
//                 dropdown.style.display = 'none';
//             }
//         });
//     });

//     document.getElementById('btnProceedToPayment').addEventListener('click', () => {
//         if (currentMapDirection === 'outbound') {
//             outboundSeatNo = currentlySelectedSeat;
            
//             if (currentSearchIsRoundTrip) {
//                 openSeatMap(selectedReturnFlight, "Dönüş Uçuşu", "return");
//             } else {
//                 openPaymentModal();
//             }
//         } 
//         else if (currentMapDirection === 'return') {
//             returnSeatNo = currentlySelectedSeat;
//             openPaymentModal();
//         }
//     });

//     const cardNumberInput = document.getElementById('cardNumberInput');
//     if (cardNumberInput) {
//         cardNumberInput.addEventListener('input', function (e) {
//             let value = e.target.value.replace(/\D/g, '');
//             value = value.replace(/(.{4})/g, '$1 ').trim();
//             e.target.value = value;
//         });
//     }

//     const expiryDateInput = document.getElementById('expiryDateInput');
//     if (expiryDateInput) {
//         expiryDateInput.addEventListener('input', function (e) {
//             let value = e.target.value.replace(/\D/g, ''); // Sadece rakamlar
            
//             if (value.length > 0) {
//                 // 🌟 AY KONTROLÜ (01-12) 🌟
//                 let month = value.substring(0, 2);
//                 if (month.length === 1 && parseInt(month) > 1) {
//                     month = '0' + month; // 2-9 arası girilirse başına 0 ekle
//                 } else if (month.length === 2) {
//                     if (parseInt(month) === 0) month = '01'; // 00 girilirse 01 yap
//                     else if (parseInt(month) > 12) month = '12'; // 12'den büyükse 12 yap
//                 }
//                 value = month + value.substring(2);
//             }

//             // Araya / işareti koyma
//             if (value.length >= 3) {
//                 e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
//             } else {
//                 e.target.value = value;
//             }
//         });
//     }

//     document.getElementById('paymentForm').addEventListener('submit', (e) => {
//         e.preventDefault(); 
        
//         const submitBtn = e.target.querySelector('button[type="submit"]');
//         submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Biletiniz Kesiliyor...';
//         submitBtn.disabled = true;

//         const passengerName = document.getElementById('cardNameInput').value.toUpperCase();
//         const pnrCode = Math.random().toString(36).substr(2, 6).toUpperCase();
//         const selectedClass = document.getElementById('searchClassText').value;

//         const ticketData = {
//             pnr: pnrCode,
//             passengerName: passengerName,
//             cabinClass: selectedClass,
//             outboundFlightId: selectedOutboundFlight,
//             outboundSeat: outboundSeatNo,
//             isRoundTrip: currentSearchIsRoundTrip,
//             returnFlightId: currentSearchIsRoundTrip ? selectedReturnFlight : null,
//             returnSeat: currentSearchIsRoundTrip ? returnSeatNo : null,
//             price: finalTotalPrice,
//             purchaseDate: new Date().toISOString()
//         };

//         let myTickets = JSON.parse(localStorage.getItem('skyOpsTickets')) || [];
//         myTickets.push(ticketData);
//         localStorage.setItem('skyOpsTickets', JSON.stringify(myTickets));

//         setTimeout(() => {
//             const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
//             paymentModal.hide();
//             window.location.href = 'bilet.html';
//         }, 1500);
//     });
// });

// async function fetchInitialData() {
//     try {
//         const [airportsRes, routesRes, flightsRes, airlinesRes] = await Promise.all([
//             fetch(`${API_BASE_URL}/airports`),
//             fetch(`${API_BASE_URL}/routes_duration`),
//             fetch(`${API_BASE_URL}/flights`),
//             fetch(`${API_BASE_URL}/airlines`)
//         ]);
//         globalAirports = await airportsRes.json();
//         filteredOriginAirports = [...globalAirports]; 
//         routeDurations = await routesRes.json();
//         allFlights = await flightsRes.json();
//         globalAirlines = await airlinesRes.json();
        
//         setupAutocomplete('searchOriginText', 'searchOrigin', 'originDropdown', 'origin');
//         setupAutocomplete('searchDestText', 'searchDest', 'destDropdown', 'dest');
//         setupClassAutocomplete();
//     } catch (error) { console.error("Veriler çekilirken hata:", error); }
// }

// function handleGlobalFilter(e) {
//     const term = e.target.value.toLocaleLowerCase('tr-TR').trim();
//     const dropdown = document.getElementById('globalDropdown');
//     dropdown.innerHTML = ''; 

//     if (term === "") {
//         dropdown.style.display = 'none';
//         filteredOriginAirports = [...globalAirports]; 
//         document.getElementById('searchOriginText').value = '';
//         document.getElementById('searchOrigin').value = '';
//         return;
//     }

//     const uniqueTerms = new Set();
//     const suggestionsHTML = [];

//     globalAirports.forEach(a => {
//         if (a.city && a.city.toLocaleLowerCase('tr-TR').includes(term)) {
//             if(!uniqueTerms.has(a.city)) {
//                 uniqueTerms.add(a.city);
//                 suggestionsHTML.push({text: a.city, icon: "fa-city", type: "city"});
//             }
//         }
//         if (a.country && a.country.toLocaleLowerCase('tr-TR').includes(term)) {
//             if(!uniqueTerms.has(a.country)) {
//                 uniqueTerms.add(a.country);
//                 suggestionsHTML.push({text: a.country, icon: "fa-globe-americas", type: "country"});
//             }
//         }
//     });

//     if (suggestionsHTML.length === 0) {
//         dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-search-minus me-2"></i>Sonuç bulunamadı</li>';
//         dropdown.style.display = 'block';
//         return;
//     }

//     suggestionsHTML.forEach(item => {
//         const li = document.createElement('li');
//         li.innerHTML = `<i class="fas ${item.icon} me-2 text-muted"></i> ${item.text}`;
        
//         li.addEventListener('click', () => {
//             document.getElementById('globalFilterInput').value = item.text;
//             dropdown.style.display = 'none';
//             filteredOriginAirports = globalAirports.filter(a => {
//                 if (item.type === "city") return a.city === item.text;
//                 if (item.type === "country") return a.country === item.text;
//             });
//             document.getElementById('searchOriginText').value = '';
//             document.getElementById('searchOrigin').value = '';
//         });
//         dropdown.appendChild(li);
//     });
//     dropdown.style.display = 'block'; 
// }

// function setupAutocomplete(inputId, hiddenId, dropdownId, boxType) {
//     const input = document.getElementById(inputId);
//     const hidden = document.getElementById(hiddenId);
//     const dropdown = document.getElementById(dropdownId);
//     let currentFocus = -1; 

//     const renderList = function() {
//         const term = input.value.toLocaleLowerCase('tr-TR').trim();
//         dropdown.innerHTML = '';
//         currentFocus = -1; 
        
//         const dataToSearch = (boxType === 'origin') ? filteredOriginAirports : globalAirports;
        
//         const searchTerms = term.split(/[\s\-]+/).filter(t => t.length > 0);

//         const matched = dataToSearch.filter(a => {
//             if (searchTerms.length === 0) return true;
//             const fullText = `${a.code} ${a.name} ${a.city} ${a.country}`.toLocaleLowerCase('tr-TR');
//             return searchTerms.every(part => fullText.includes(part));
//         });

//         if (matched.length === 0) {
//             dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-plane-slash me-2"></i>Nokta Bulunamadı</li>';
//             dropdown.style.display = 'block'; 
//             return;
//         }

//         matched.forEach(a => {
//             const li = document.createElement('li');
//             li.innerHTML = `<b>${a.code}</b> - ${a.name} <small class="text-muted ms-auto">(${a.city}, ${a.country})</small>`;
//             li.addEventListener('click', () => {
//                 input.value = `${a.code} - ${a.name}`; 
//                 hidden.value = a.code; 
//                 dropdown.style.display = 'none';
//             });
//             dropdown.appendChild(li);
//         });
//         dropdown.style.display = 'block';
//     };

//     input.addEventListener('input', () => { 
//         document.getElementById(hiddenId).value = ''; 
//         renderList(); 
//     });
    
//     input.addEventListener('click', renderList); 

//     input.addEventListener('keydown', function(e) {
//         let items = dropdown.getElementsByTagName('li');
//         if (items.length === 0 || items[0].classList.contains('text-muted')) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             currentFocus++;
//             addActive(items);
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             currentFocus--;
//             addActive(items);
//         } else if (e.key === 'Enter') {
//             e.preventDefault();
//             if (currentFocus > -1) {
//                 if (items[currentFocus]) {
//                     items[currentFocus].click(); 
//                 }
//             }
//         }
//     });

//     function addActive(x) {
//         if (!x) return false;
//         removeActive(x);
//         if (currentFocus >= x.length) currentFocus = 0;
//         if (currentFocus < 0) currentFocus = (x.length - 1);
        
//         x[currentFocus].style.backgroundColor = '#f1f5f9';
//         x[currentFocus].style.color = '#2563eb';
//         x[currentFocus].style.paddingLeft = '20px';
//         x[currentFocus].scrollIntoView({ block: 'nearest' });
//     }

//     function removeActive(x) {
//         for (let i = 0; i < x.length; i++) {
//             x[i].style.backgroundColor = '';
//             x[i].style.color = '';
//             x[i].style.paddingLeft = '';
//         }
//     }
// }

// function setupClassAutocomplete() {
//     const input = document.getElementById('searchClassText');
//     const hidden = document.getElementById('searchClass');
//     const dropdown = document.getElementById('searchClassDropdown');
//     let currentFocus = -1; 

//     const renderList = function() {
//         dropdown.innerHTML = '';
//         currentFocus = -1;
        
//         cabinClasses.forEach(c => {
//             const li = document.createElement('li');
//             li.innerHTML = `<i class="fas ${c.icon} me-2 text-muted"></i> <b>${c.text}</b>`;
//             li.addEventListener('click', () => {
//                 input.value = c.text; 
//                 hidden.value = c.value; 
//                 dropdown.style.display = 'none';
//             });
//             dropdown.appendChild(li);
//         });
//         dropdown.style.display = 'block';
//     };
    
//     input.addEventListener('click', renderList); 

//     input.addEventListener('keydown', function(e) {
//         let items = dropdown.getElementsByTagName('li');
//         if (items.length === 0) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             currentFocus++;
//             addActive(items);
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             currentFocus--;
//             addActive(items);
//         } else if (e.key === 'Enter') {
//             e.preventDefault();
//             if (currentFocus > -1) {
//                 if (items[currentFocus]) {
//                     items[currentFocus].click();
//                 }
//             }
//         }
//     });

//     function addActive(x) {
//         if (!x) return false;
//         removeActive(x);
//         if (currentFocus >= x.length) currentFocus = 0;
//         if (currentFocus < 0) currentFocus = (x.length - 1);
        
//         x[currentFocus].style.backgroundColor = '#f1f5f9';
//         x[currentFocus].style.color = '#2563eb';
//         x[currentFocus].style.paddingLeft = '20px';
//     }

//     function removeActive(x) {
//         for (let i = 0; i < x.length; i++) {
//             x[i].style.backgroundColor = '';
//             x[i].style.color = '';
//             x[i].style.paddingLeft = '';
//         }
//     }
// }

// function calculateArrivalTime(startTime, durationHours) {
//     const [hrs, mins] = startTime.split(':').map(Number);
//     const totalMins = (hrs * 60) + mins + (durationHours * 60);
//     const endHrs = Math.floor(totalMins / 60) % 24;
//     const endMins = Math.round(totalMins % 60);
//     return `${String(endHrs).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
// }

// function calculatePrice(durationHours, cabinClass, isRoundTrip) {
//     let basePrice = durationHours * 1500; 
//     if (cabinClass === 'business') basePrice *= 2.5; 
//     if (cabinClass === 'first') basePrice *= 4.0;    
    
//     let rawPrice = basePrice;
//     if (isRoundTrip) basePrice *= 0.85; 
    
//     return {
//         rawPrice: Math.round(rawPrice).toLocaleString('tr-TR'),
//         finalPrice: Math.round(basePrice).toLocaleString('tr-TR')
//     };
// }

// function checkDateMatch(flightDate, searchDateIso) {
//     const [year, month, day] = searchDateIso.split('-');
//     const trDate = `${day}.${month}.${year}`;
//     const todayObj = new Date();
//     const todayIso = todayObj.toISOString().split('T')[0];
//     let tomorrowObj = new Date(); tomorrowObj.setDate(todayObj.getDate() + 1);
//     const tomorrowIso = tomorrowObj.toISOString().split('T')[0];

//     let textDate = "";
//     if (searchDateIso === todayIso) textDate = "Bugün";
//     else if (searchDateIso === tomorrowIso) textDate = "Yarın";

//     return (flightDate === searchDateIso || flightDate === trDate || flightDate === textDate || flightDate === `${day}/${month}/${year}`);
// }

// function handleFlightSearch(e) {
//     e.preventDefault();

//     const origin = document.getElementById('searchOrigin').value;
//     const dest = document.getElementById('searchDest').value;
//     const date = document.getElementById('searchDate').value;
//     const returnDate = document.getElementById('returnDate').value;
//     const cabinClass = document.getElementById('searchClass').value;
//     const tripType = document.querySelector('input[name="tripType"]:checked').value;
//     currentSearchIsRoundTrip = (tripType === 'roundtrip');

//     selectedOutboundFlight = null;
//     selectedReturnFlight = null;
//     outboundSeatNo = null;
//     returnSeatNo = null;

//     if (!origin || !dest || origin === "" || dest === "") {
//         alert("⚠️ Lütfen listeden geçerli bir kalkış ve varış noktası seçiniz!");
//         return;
//     }

//     if (currentSearchIsRoundTrip && (!returnDate || returnDate === "")) {
//         alert("⚠️ Gidiş-Dönüş uçuşu için lütfen Dönüş Tarihini seçiniz!");
//         return;
//     }

//     const originAirport = globalAirports.find(a => a.code === origin);
//     const destAirport = globalAirports.find(a => a.code === dest);

//     if (originAirport && destAirport) {
//         if (originAirport.cityId === destAirport.cityId) {
//             alert(`⚠️ Uçuş kuralları gereği kalkış ve varış noktası aynı şehirde (${originAirport.city}) olamaz!`);
//             return;
//         }
//     }

//     const resultsContainer = document.getElementById('flightResults');
//     resultsContainer.innerHTML = `<div class="text-center mt-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-2 text-muted">Uçuşlar aranıyor...</p></div>`;

//     setTimeout(() => {
//         const outboundRoute = `${origin}>${dest}`.replace(/\s+/g, '');
//         const outboundFlights = allFlights.filter(f => {
//             const dbRoute = f.route ? f.route.replace(/\s+/g, '') : "";
//             return dbRoute === outboundRoute && checkDateMatch(f.date, date) && f.status !== "İptal" && f.status !== "İndi";
//         });

//         let returnFlights = [];
//         if (currentSearchIsRoundTrip) {
//             const returnRoute = `${dest}>${origin}`.replace(/\s+/g, '');
//             returnFlights = allFlights.filter(f => {
//                 const dbRoute = f.route ? f.route.replace(/\s+/g, '') : "";
//                 return dbRoute === returnRoute && checkDateMatch(f.date, returnDate) && f.status !== "İptal" && f.status !== "İndi";
//             });
//         }

//         let html = '';

//         if (outboundFlights.length === 0) {
//             resultsContainer.innerHTML = `
//                 <div class="alert alert-warning text-center shadow-sm p-4 rounded-4 mt-4">
//                     <i class="fas fa-plane-slash fa-3x mb-3 text-warning"></i>
//                     <h4>Uçuş Bulunamadı</h4>
//                     <p class="mb-0">Seçtiğiniz tarihte (${origin} -> ${dest}) için gidiş uçuşu bulunmuyor.</p>
//                 </div>`;
//             return;
//         }

//         html += `<h4 class="mb-4 text-dark fw-bold" id="outboundFlightsHeader"><i class="fas fa-plane-departure me-2 text-primary"></i>Gidiş Uçuşları <span class="fs-6 fw-normal text-muted ms-2">(${origin} -> ${dest})</span></h4>`;
//         html += renderFlightCards(outboundFlights, origin, dest, cabinClass, currentSearchIsRoundTrip, 'outbound');

//         if (currentSearchIsRoundTrip) {
//             html += `<div id="returnFlightsWrapper" style="display: none; opacity: 0; transition: opacity 0.5s ease-in-out;">`;
//             html += `<hr class="my-5" style="border-top: 2px dashed #cbd5e1;">`;
            
//             if (returnFlights.length === 0) {
//                 html += `
//                 <div id="returnFlightsHeader" class="alert alert-danger text-center shadow-sm p-4 rounded-4 mt-2" style="border: 2px dashed #fca5a5;">
//                     <i class="fas fa-exclamation-triangle fa-3x mb-3 text-danger"></i>
//                     <h4 class="fw-bold text-danger">Dönüş Uçuşu Bulunamadı</h4>
//                     <p class="mb-0 text-dark">Seçtiğiniz tarihte <b>(${dest} -> ${origin})</b> yönünde planlanmış bir seferimiz bulunmuyor. Lütfen arama kriterlerinizi (Tarihi) değiştirin veya tek yön bilet almayı tercih edin.</p>
//                 </div>`;
//             } else {
//                 html += `<h4 class="mb-4 text-dark fw-bold" id="returnFlightsHeader"><i class="fas fa-plane-arrival me-2 text-success"></i>Dönüş Uçuşları <span class="fs-6 fw-normal text-muted ms-2">(${dest} -> ${origin})</span></h4>`;
//                 html += renderFlightCards(returnFlights, dest, origin, cabinClass, currentSearchIsRoundTrip, 'return');
//             }
//             html += `</div>`;
//         }

//         resultsContainer.innerHTML = html;

//     }, 600); 
// }

// function renderFlightCards(flights, originCode, destCode, cabinClass, isRoundTrip, direction) {
//     let html = '';
//     const routeData = routeDurations.find(r => r.id === `${originCode}-${destCode}`);
//     const duration = routeData ? parseFloat(routeData.duration) : 2.0;

//     let classBadge = 'bg-secondary';
//     let className = 'Ekonomi';
//     if (cabinClass === 'business') { classBadge = 'bg-primary'; className = 'Business'; }
//     if (cabinClass === 'first') { classBadge = 'bg-dark'; className = 'First Class'; }

//     const discountBadge = isRoundTrip ? `<br><span class="badge bg-success mt-2 p-2"><i class="fas fa-tags me-1"></i> %15 Gidiş-Dönüş İndirimli</span>` : '';

//     flights.forEach(flight => {
//         const arrivalTime = calculateArrivalTime(flight.time, duration);
//         const prices = calculatePrice(duration, cabinClass, isRoundTrip);
        
//         let priceDisplay = `<h3 class="fw-bold text-dark mb-2">${prices.finalPrice} ₺</h3>`;
//         if (isRoundTrip) {
//             priceDisplay = `<small class="text-decoration-line-through text-muted">${prices.rawPrice} ₺</small><h3 class="fw-bold text-success mb-2">${prices.finalPrice} ₺</h3>`;
//         }

//         let buttonText = 'Koltuk Seç <i class="fas fa-arrow-right ms-1"></i>';
//         if (isRoundTrip && direction === 'outbound') {
//             buttonText = 'Seç ve Devam Et <i class="fas fa-arrow-down ms-1"></i>';
//         }

//         html += `
//         <div class="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style="transition: transform 0.2s;">
//             <div class="card-body p-0">
//                 <div class="row g-0 align-items-center">
//                     <div class="col-md-3 bg-light p-4 text-center border-end">
//                         <i class="fas fa-plane-tail fa-2x text-primary mb-2"></i>
//                         <h5 class="fw-bold mb-0">${flight.flightNo}</h5>
//                         <small class="text-muted">SkyOps Airlines</small>
//                         <div class="mt-2"><span class="badge ${classBadge}">${className}</span></div>
//                     </div>
//                     <div class="col-md-6 p-4">
//                         <div class="d-flex justify-content-between align-items-center text-center px-4">
//                             <div>
//                                 <h3 class="fw-bold text-dark mb-0">${flight.time}</h3>
//                                 <span class="text-muted fw-semibold">${originCode}</span>
//                             </div>
//                             <div class="flex-grow-1 px-3 position-relative">
//                                 <div style="border-top: 2px dashed #cbd5e1; width: 100%; position: absolute; top: 50%; z-index: 1;"></div>
//                                 <i class="fas fa-plane text-primary bg-white px-2 position-relative" style="z-index: 2;"></i>
//                                 <div class="mt-1"><small class="text-muted">${duration} Saat</small></div>
//                             </div>
//                             <div>
//                                 <h3 class="fw-bold text-dark mb-0">${arrivalTime}</h3>
//                                 <span class="text-muted fw-semibold">${destCode}</span>
//                             </div>
//                         </div>
//                     </div>
//                     <div class="col-md-3 p-4 text-center border-start bg-light h-100">
//                         <p class="text-muted mb-1">Kişi Başı</p>
//                         ${priceDisplay}
//                         <button class="btn btn-primary w-100 rounded-pill fw-bold btn-select-${direction}" id="btn-${flight.id}" onclick="selectFlight('${flight.id}', '${direction}')">
//                             ${buttonText}
//                         </button>
//                         ${discountBadge}
//                     </div>
//                 </div>
//             </div>
//         </div>`;
//     });
//     return html;
// }

// function selectFlight(flightId, direction) {
//     if (direction === 'outbound') {
//         selectedOutboundFlight = flightId;
        
//         document.querySelectorAll('.btn-select-outbound').forEach(b => {
//             b.classList.remove('btn-success');
//             b.classList.add('btn-primary');
//             b.innerHTML = currentSearchIsRoundTrip ? 'Seç ve Devam Et <i class="fas fa-arrow-down ms-1"></i>' : 'Koltuk Seç <i class="fas fa-arrow-right ms-1"></i>';
//         });
        
//         const btn = document.getElementById(`btn-${flightId}`);
//         btn.classList.remove('btn-primary');
//         btn.classList.add('btn-success');
//         btn.innerHTML = 'Seçildi <i class="fas fa-check ms-1"></i>';

//         if (currentSearchIsRoundTrip) {
//             const returnWrapper = document.getElementById('returnFlightsWrapper');
//             if (returnWrapper) {
//                 returnWrapper.style.display = 'block'; 
//                 setTimeout(() => {
//                     returnWrapper.style.opacity = '1';
//                     document.getElementById('returnFlightsHeader').scrollIntoView({ behavior: 'smooth', block: 'start' });
//                 }, 50);
//             }
//         } 
//         else {
//             openSeatMap(flightId, "Tek Yön Uçuşu", "outbound");
//         }
//     } 
//     else if (direction === 'return') {
//         selectedReturnFlight = flightId;
        
//         document.querySelectorAll('.btn-select-return').forEach(b => {
//             b.classList.remove('btn-success');
//             b.classList.add('btn-primary');
//             b.innerHTML = 'Koltuk Seç <i class="fas fa-arrow-right ms-1"></i>';
//         });
        
//         const btn = document.getElementById(`btn-${flightId}`);
//         btn.classList.remove('btn-primary');
//         btn.classList.add('btn-success');
//         btn.innerHTML = 'Seçildi <i class="fas fa-check ms-1"></i>';

//         if (!selectedOutboundFlight) {
//             alert("Lütfen önce yukarıdan bir Gidiş Uçuşu seçin!");
//             window.scrollTo({ top: 0, behavior: 'smooth' });
//             return;
//         }

//         openSeatMap(selectedOutboundFlight, "Gidiş Uçuşu", "outbound");
//     }
// }

// // 🌟 GERÇEKÇİ UÇAK MİMARİSİ 🌟
// function openSeatMap(flightId, infoPrefix = "", direction = "outbound") {
//     currentMapDirection = direction; 
    
//     const selectedBtn = document.getElementById(`btn-${flightId}`);
//     if (selectedBtn) {
//         const priceElement = selectedBtn.parentElement.querySelector('.text-success') || selectedBtn.parentElement.querySelector('h3');
//         if (priceElement) finalTotalPrice = priceElement.innerText;
//     }

//     const modalElement = document.getElementById('seatMapModal');
//     let seatModal = bootstrap.Modal.getInstance(modalElement);
//     if (!seatModal) seatModal = new bootstrap.Modal(modalElement);
    
//     document.getElementById('seatMapFlightInfo').innerText = `${infoPrefix} | Uçuş ID: ${flightId}`;
//     const planeBody = document.getElementById('planeBody');
//     const searchClass = document.getElementById('searchClass').value; 
    
//     const totalRows = 15;
//     let html = '';

//     html += `
//     <div class="d-flex justify-content-center align-items-center mb-3">
//         <div style="width: 25px;"></div> 
//         <div class="d-flex justify-content-end" style="gap: 8px; width: 140px;">
//             <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">A</div>
//             <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">B</div>
//             <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">C</div>
//         </div>
//         <div style="width: 30px;"></div> 
//         <div class="d-flex justify-content-start" style="gap: 8px; width: 140px;">
//             <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">D</div>
//             <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">E</div>
//             <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">F</div>
//         </div>
//         <div style="width: 25px;"></div> 
//     </div>`;

//     for (let i = 1; i <= totalRows; i++) {
//         let rowClass = 'economy';
//         let leftLayout = ['A', 'B', 'C'];
//         let rightLayout = ['D', 'E', 'F'];
        
//         let seatW = '40px'; 
//         let seatH = '40px';

//         if (i === 1) {
//             rowClass = 'first';
//             leftLayout = ['A'];
//             rightLayout = ['F'];
//             seatW = '70px'; 
//             seatH = '50px';
//         } else if (i <= 3) {
//             rowClass = 'business';
//             leftLayout = ['A', 'C'];
//             rightLayout = ['D', 'F'];
//             seatW = '55px'; 
//             seatH = '45px';
//         }

//         if (i === 1) html += `<div class="class-divider mt-2 mb-3" data-label="FIRST CLASS"></div>`;
//         if (i === 2) html += `<div class="class-divider mt-4 mb-3" data-label="BUSINESS CLASS"></div>`;
//         if (i === 4) html += `<div class="class-divider mt-4 mb-3" data-label="ECONOMY CLASS"></div>`;

//         html += `<div class="d-flex justify-content-center align-items-center mb-2" style="gap: 8px;">`;
//         html += `<div style="width: 25px; text-align: right; font-weight: 800; color: #94a3b8; font-size: 0.9rem;">${i}</div>`;

//         html += `<div class="d-flex justify-content-end" style="gap: 8px; width: 140px;">`;
//         leftLayout.forEach(seatLetter => {
//             const seatId = `${i}${seatLetter}`;
//             const isOccupied = false; 
            
//             const isRestricted = (searchClass !== rowClass) && !(searchClass === 'business' && rowClass === 'first'); 
            
//             let seatStatusClass = isOccupied ? 'occupied' : 'available';
//             if (isRestricted && !isOccupied) seatStatusClass = 'occupied'; 
            
//             let innerIcon = seatStatusClass === 'occupied' && isOccupied ? '<i class="fas fa-times" style="opacity: 0.3;"></i>' : '';

//             html += `<div class="seat ${rowClass} ${seatStatusClass}" data-seat="${seatId}" data-letter="${seatLetter}" onclick="handleSeatSelection(this)" style="width: ${seatW}; height: ${seatH};">${innerIcon}</div>`;
//         });
//         html += `</div>`;

//         html += `<div style="width: 30px;"></div>`;

//         html += `<div class="d-flex justify-content-start" style="gap: 8px; width: 140px;">`;
//         rightLayout.forEach(seatLetter => {
//             const seatId = `${i}${seatLetter}`;
//             const isOccupied = false; 

//             const isRestricted = (searchClass !== rowClass);
            
//             let seatStatusClass = isOccupied ? 'occupied' : 'available';
//             if (isRestricted && !isOccupied) seatStatusClass = 'occupied'; 
            
//             let innerIcon = seatStatusClass === 'occupied' && isOccupied ? '<i class="fas fa-times" style="opacity: 0.3;"></i>' : '';

//             html += `<div class="seat ${rowClass} ${seatStatusClass}" data-seat="${seatId}" data-letter="${seatLetter}" onclick="handleSeatSelection(this)" style="width: ${seatW}; height: ${seatH};">${innerIcon}</div>`;
//         });
//         html += `</div>`;
        
//         html += `<div style="width: 25px; text-align: left; font-weight: 800; color: #94a3b8; font-size: 0.9rem;">${i}</div>`;
//         html += `</div>`;
//     }

//     planeBody.innerHTML = html;
    
//     document.getElementById('summarySeatNo').innerText = '--';
//     document.getElementById('summarySeatType').innerText = 'Lütfen Koltuk Seçin';
//     document.getElementById('summaryCabinClass').innerText = searchClass.toUpperCase();
    
//     const proceedBtn = document.getElementById('btnProceedToPayment');
//     proceedBtn.disabled = true;
    
//     if (currentSearchIsRoundTrip && direction === 'outbound') {
//         proceedBtn.innerHTML = 'Dönüş İçin Koltuk Seç <i class="fas fa-arrow-right ms-2"></i>';
//         proceedBtn.classList.replace('btn-success', 'btn-primary');
//     } else {
//         proceedBtn.innerHTML = 'Ödemeye Geç <i class="fas fa-lock ms-2"></i>';
//         proceedBtn.classList.replace('btn-primary', 'btn-success');
//     }

//     seatModal.show();
// }

// let currentlySelectedSeat = null;

// function handleSeatSelection(seatElement) {
//     if (seatElement.classList.contains('occupied')) return; 

//     const prevSelected = document.querySelector('.seat.selected');
//     if (prevSelected) {
//         prevSelected.classList.remove('selected');
//         prevSelected.innerHTML = ''; 
//     }

//     seatElement.classList.add('selected');
//     seatElement.innerHTML = '<i class="fas fa-check"></i>';
    
//     currentlySelectedSeat = seatElement.getAttribute('data-seat');
//     const seatLetter = seatElement.getAttribute('data-letter');

//     let seatTypeDesc = "Orta Koltuk";
//     if (seatLetter === 'A' || seatLetter === 'F') seatTypeDesc = "Cam Kenarı";
//     if (seatLetter === 'C' || seatLetter === 'D') seatTypeDesc = "Koridor Kenarı";

//     document.getElementById('summarySeatNo').innerText = currentlySelectedSeat;
//     document.getElementById('summarySeatType').innerText = seatTypeDesc;
    
//     document.getElementById('btnProceedToPayment').disabled = false;
// }

// function openPaymentModal() {
//     const seatModalEl = document.getElementById('seatMapModal');
//     const seatModal = bootstrap.Modal.getInstance(seatModalEl);
//     if (seatModal) seatModal.hide();

//     document.getElementById('paymentTotalAmount').innerText = finalTotalPrice;

//     const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
//     paymentModal.show();
// }


const API_BASE_URL = 'http://localhost:3000';

let globalAirports = [];
let filteredOriginAirports = []; 
let routeDurations = [];
let allFlights = [];
let globalAirlines = [];

const cabinClasses = [
    { value: 'economy', text: 'Ekonomi', icon: 'fa-chair' },
    { value: 'business', text: 'Business', icon: 'fa-chair' },
    { value: 'first', text: 'First Class', icon: 'fa-chair' }
];

let returnDatePicker; 
let currentSearchIsRoundTrip = false; 

let selectedOutboundFlight = null;
let selectedReturnFlight = null;

let currentMapDirection = 'outbound'; 
let finalTotalPrice = "0"; 
let outboundSeatNo = null; 
let returnSeatNo = null;   
let currentlySelectedSeat = null;

document.addEventListener('DOMContentLoaded', async () => {

    // --- 🌍 ÇEVİRİ SÖZLÜĞÜ VE DİL MOTORU 🌍 ---
    const translations = {
        tr: {
            title: "SkyOps - Uçak Bileti Al",
            myTicketsNav: "Biletlerim",
            myAccount: "Hesabım",
            editProfile: "Profili Düzenle",
            settings: "Ayarlar",
            logout: "Çıkış Yap",
            heroTitle: "Dünyayı Keşfetmeye Hazır Mısın?",
            heroSubtitle: "Yüzlerce nokta, 3 farklı kabin sınıfı ve kusursuz yolculuk deneyimi.",
            filterSearch: "Arama Daraltma (Opsiyonel)",
            filterPlaceholder: "Hangi şehir veya ülkeye uçmak istiyorsunuz? (Örn: İstanbul, Muğla...)",
            oneWay: "Tek Yön",
            roundTrip: "Gidiş-Dönüş",
            from: "Nereden",
            to: "Nereye",
            selectDeparture: "Kalkış Seç",
            selectArrival: "Varış Seç",
            departureDate: "Gidiş Tarihi",
            returnDate: "Dönüş Tarihi",
            datePlaceholder: "Tarih",
            cabinClassLabel: "Sınıf",
            btnSearch: "Bul",
            
            // Modal Çevirileri
            seatMapTitle: "Koltuk Seçimi",
            seatMapDesc: "Lütfen Koltuğunuzu Seçin",
            selectionSummary: "Seçim Özeti",
            selectedSeatLabel: "Seçilen Koltuk",
            notSelectedYet: "Henüz Seçilmedi",
            proceedPayment: "Ödemeye Geç",
            paymentTitle: "Güvenli Ödeme Adımı",
            academicProject: "Akademik Proje / Test Ortamı",
            academicProjectDesc: "Sistemi test etmek için gerçek kart bilgisi girmeyiniz. Rastgele sayılar kullanabilirsiniz.",
            totalAmount: "Bilet(ler) İçin Toplam Tutar",
            cardName: "Kart Üzerindeki İsim",
            cardNamePlaceholder: "Örn: ALİ YILMAZ",
            cardNumber: "Kart Numarası",
            expiryDate: "Son Kullanma Tarihi",
            completePayment: "Ödemeyi Tamamla ve Biletini Al",
            
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
            logoutTitle: "Çıkış Yapılıyor",
            logoutDesc: "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
            cancel: "İptal",
            
            // Dinamik JS Mesajları
            msgSearching: "Uçuşlar aranıyor...",
            msgNoFlightFound: "Uçuş Bulunamadı",
            msgSelectLocation: "⚠️ Lütfen listeden geçerli bir kalkış ve varış noktası seçiniz!",
            msgSelectReturnDate: "⚠️ Gidiş-Dönüş uçuşu için lütfen Dönüş Tarihini seçiniz!",
            msgSameCity: "⚠️ Uçuş kuralları gereği kalkış ve varış noktası aynı şehirde olamaz!",
            msgSaveSuccess: "✅ Profil bilgileriniz başarıyla güncellendi."
        },
        en: {
            title: "SkyOps - Buy Flight Ticket",
            myTicketsNav: "My Tickets",
            myAccount: "My Account",
            editProfile: "Edit Profile",
            settings: "Settings",
            logout: "Log Out",
            heroTitle: "Ready to Explore the World?",
            heroSubtitle: "Hundreds of destinations, 3 cabin classes, and a flawless travel experience.",
            filterSearch: "Narrow Search (Optional)",
            filterPlaceholder: "Which city or country do you want to fly to? (e.g. Istanbul, London...)",
            oneWay: "One Way",
            roundTrip: "Round Trip",
            from: "From",
            to: "To",
            selectDeparture: "Select Departure",
            selectArrival: "Select Arrival",
            departureDate: "Departure Date",
            returnDate: "Return Date",
            datePlaceholder: "Date",
            cabinClassLabel: "Class",
            btnSearch: "Search",

            // Modal Çevirileri
            seatMapTitle: "Seat Selection",
            seatMapDesc: "Please Select Your Seat",
            selectionSummary: "Selection Summary",
            selectedSeatLabel: "Selected Seat",
            notSelectedYet: "Not Selected Yet",
            proceedPayment: "Proceed to Payment",
            paymentTitle: "Secure Payment Step",
            academicProject: "Academic Project / Test Environment",
            academicProjectDesc: "Please do not enter real card details to test the system. You can use random numbers.",
            totalAmount: "Total Amount for Ticket(s)",
            cardName: "Name on Card",
            cardNamePlaceholder: "e.g. JOHN DOE",
            cardNumber: "Card Number",
            expiryDate: "Expiry Date",
            completePayment: "Complete Payment and Get Ticket",

            profileTitle: "Profile Information",
            fullNameLabel: "Full Name",
            emailLabel: "Email Address (Login ID)",
            emailWarning: "* For security reasons, Email address cannot be changed.",
            newPasswordLabel: "Set New Password (Optional)",
            newPasswordPlaceholder: "Leave blank if you do not want to change",
            saveChanges: "Save Changes",
            settingsTitle: "System Settings",
            emailNotifications: "Email Notifications",
            smsNotifications: "SMS Notifications",
            currencyLabel: "Currency",
            logoutTitle: "Logging Out",
            logoutDesc: "Are you sure you want to log out of your account?",
            cancel: "Cancel",

            // Dinamik JS Mesajları
            msgSearching: "Searching for flights...",
            msgNoFlightFound: "No Flights Found",
            msgSelectLocation: "⚠️ Please select a valid departure and arrival point from the list!",
            msgSelectReturnDate: "⚠️ Please select a Return Date for your Round-Trip flight!",
            msgSameCity: "⚠️ Flight rules dictate that departure and arrival points cannot be in the same city!",
            msgSaveSuccess: "✅ Your profile information has been successfully updated."
        }
    };

    window.currentLang = localStorage.getItem('skyOpsLang') || 'tr';
    const btnTR = document.getElementById('btnLangTR');
    const btnEN = document.getElementById('btnLangEN');

    function updateLanguage(lang) {
        window.currentLang = lang;
        localStorage.setItem('skyOpsLang', lang);

        if(btnTR && btnEN) {
            btnTR.classList.toggle('active', lang === 'tr');
            btnEN.classList.toggle('active', lang === 'en');
        }

        const titleEl = document.querySelector('title');
        if (titleEl && translations[lang]["title"]) titleEl.innerText = translations[lang]["title"];

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) el.innerHTML = translations[lang][key]; 
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) el.setAttribute('placeholder', translations[lang][key]);
        });
    }

    if (btnTR && btnEN) {
        btnTR.addEventListener('click', () => updateLanguage('tr'));
        btnEN.addEventListener('click', () => updateLanguage('en'));
    }

    updateLanguage(window.currentLang);

    // --- 🌟 KULLANICI ADINI YAZDIRMA VE NAVBAR İŞLEMLERİ 🌟 ---
    const systemUsers = JSON.parse(localStorage.getItem('skyOpsUsers')) || [];
    const activeUserName = sessionStorage.getItem('skyOpsActiveUser') || localStorage.getItem('skyOpsActiveUser');
    const activeUserData = systemUsers.find(u => u.name === activeUserName) || systemUsers[systemUsers.length - 1];

    if(activeUserData && activeUserData.name) {
        document.getElementById('navPassengerName').innerText = activeUserData.name.split(' ')[0]; 
    }

    // --- 🌟 PROFİL VE AYARLAR MODAL BINDING İŞLEMLERİ 🌟 ---
    const btnProfileEdit = document.getElementById('btnProfileEdit');
    const btnUserSettings = document.getElementById('btnUserSettings');
    
    const profileModalEl = document.getElementById('passengerProfileModal');
    const settingsModalEl = document.getElementById('passengerSettingsModal');
    
    const profileModal = profileModalEl ? new bootstrap.Modal(profileModalEl) : null;
    const settingsModal = settingsModalEl ? new bootstrap.Modal(settingsModalEl) : null;

    if (btnProfileEdit && profileModal) {
        btnProfileEdit.addEventListener('click', (e) => {
            e.preventDefault();
            if (activeUserData) {
                document.getElementById('profileEditName').value = activeUserData.name;
                document.getElementById('profileEditEmail').value = activeUserData.email;
                const passField = document.getElementById('profileEditPassword');
                if(passField) passField.value = ''; 
            }
            profileModal.show();
        });
    }

    if (btnUserSettings && settingsModal) {
        btnUserSettings.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.show();
        });
    }

    const profileForm = document.getElementById('passengerProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            
            const newName = document.getElementById('profileEditName').value.trim();
            const passwordInput = document.getElementById('profileEditPassword');
            const newPassword = passwordInput ? passwordInput.value.trim() : "";

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>...';
            submitBtn.disabled = true;

            setTimeout(() => {
                if (activeUserData) {
                    activeUserData.name = newName;
                    if (newPassword !== "") activeUserData.password = newPassword;
                    
                    localStorage.setItem('skyOpsUsers', JSON.stringify(systemUsers));
                    sessionStorage.setItem('skyOpsActiveUser', newName); 
                    localStorage.setItem('skyOpsActiveUser', newName); 
                    
                    document.getElementById('navPassengerName').innerText = newName.split(' ')[0]; 
                }

                submitBtn.innerHTML = translations[window.currentLang].saveChanges;
                submitBtn.disabled = false;
                if(profileModal) profileModal.hide();
                
                alert(translations[window.currentLang].msgSaveSuccess);
            }, 800);
        });
    }

    // --- 🌟 AYARLARI KALICI HALE GETİREN SİSTEM 🌟 ---
    const set_email = document.getElementById('set_emailNotify');
    const set_sms = document.getElementById('set_smsNotify');
    const set_curr = document.getElementById('set_currency');

    const savedSettings = JSON.parse(localStorage.getItem('skyOpsSettings')) || { email: true, sms: false, currency: 'TRY' };
    
    if(set_email) set_email.checked = savedSettings.email;
    if(set_sms) set_sms.checked = savedSettings.sms;
    if(set_curr) set_curr.value = savedSettings.currency;

    const saveToMemory = () => {
        const settings = {
            email: set_email ? set_email.checked : true,
            sms: set_sms ? set_sms.checked : false,
            currency: set_curr ? set_curr.value : 'TRY'
        };
        localStorage.setItem('skyOpsSettings', JSON.stringify(settings));
    };

    if(set_email) set_email.addEventListener('change', saveToMemory);
    if(set_sms) set_sms.addEventListener('change', saveToMemory);
    if(set_curr) set_curr.addEventListener('change', saveToMemory);

    // --- 🌟 ÇIKIŞ YAPMA MODAL YÖNETİMİ 🌟 ---
    const btnLogout = document.getElementById('btnLogout');
    const logoutModal = new bootstrap.Modal(document.getElementById('logoutConfirmModal'));

    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.show();
        });
    }

    const btnConfirmLogout = document.getElementById('btnConfirmLogout');
    if (btnConfirmLogout) {
        btnConfirmLogout.addEventListener('click', () => {
            btnConfirmLogout.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>...';
            btnConfirmLogout.disabled = true;

            setTimeout(() => {
                sessionStorage.removeItem('isLoggedIn');
                sessionStorage.removeItem('userRole');
                sessionStorage.removeItem('skyOpsActiveUser');
                window.location.href = 'login.html';
            }, 600);
        });
    }

    // --- UÇUŞ ARAMA VE BİLETLEME İŞLEMLERİ ---
    await fetchInitialData();

    const maxFlightDate = new Date();
    maxFlightDate.setDate(maxFlightDate.getDate() + 330);

    flatpickr("#searchDate", {
        locale: "tr", 
        altInput: true, 
        altFormat: "d.m.Y", 
        dateFormat: "Y-m-d",
        defaultDate: "today", 
        minDate: "today",
        maxDate: maxFlightDate,
        disableMobile: "true"
    });

    returnDatePicker = flatpickr("#returnDate", {
        locale: "tr", 
        altInput: true, 
        altFormat: "d.m.Y", 
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: maxFlightDate,
        disableMobile: "true"
    });

    document.querySelectorAll('input[name="tripType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const returnContainer = document.getElementById('returnDateContainer');
            const returnInput = document.getElementById('returnDate');
            if (e.target.value === 'roundtrip') {
                returnContainer.style.display = 'block';
                returnInput.required = true;
            } else {
                returnContainer.style.display = 'none';
                returnInput.required = false;
                if(returnDatePicker) returnDatePicker.clear();
            }
        });
    });

    document.getElementById('flightSearchForm').addEventListener('submit', handleFlightSearch);
    
    const filterInput = document.getElementById('globalFilterInput');
    if(filterInput) filterInput.addEventListener('input', handleGlobalFilter);

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
            if (!dropdown.parentElement.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });

    document.getElementById('btnProceedToPayment').addEventListener('click', () => {
        if (currentMapDirection === 'outbound') {
            outboundSeatNo = currentlySelectedSeat;
            if (currentSearchIsRoundTrip) {
                openSeatMap(selectedReturnFlight, "Dönüş Uçuşu", "return");
            } else {
                openPaymentModal();
            }
        } 
        else if (currentMapDirection === 'return') {
            returnSeatNo = currentlySelectedSeat;
            openPaymentModal();
        }
    });

    const cardNumberInput = document.getElementById('cardNumberInput');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = value;
        });
    }

    const expiryDateInput = document.getElementById('expiryDateInput');
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, ''); 
            
            if (value.length > 0) {
                let month = value.substring(0, 2);
                if (month.length === 1 && parseInt(month) > 1) {
                    month = '0' + month; 
                } else if (month.length === 2) {
                    if (parseInt(month) === 0) month = '01'; 
                    else if (parseInt(month) > 12) month = '12'; 
                }
                value = month + value.substring(2);
            }

            if (value.length >= 3) {
                e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
            } else {
                e.target.value = value;
            }
        });
    }

    document.getElementById('paymentForm').addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>...';
        submitBtn.disabled = true;

        const passengerName = document.getElementById('cardNameInput').value.toUpperCase();
        const pnrCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const selectedClass = document.getElementById('searchClassText').value;

        const ticketData = {
            pnr: pnrCode,
            passengerName: passengerName,
            cabinClass: selectedClass,
            outboundFlightId: selectedOutboundFlight,
            outboundSeat: outboundSeatNo,
            isRoundTrip: currentSearchIsRoundTrip,
            returnFlightId: currentSearchIsRoundTrip ? selectedReturnFlight : null,
            returnSeat: currentSearchIsRoundTrip ? returnSeatNo : null,
            price: finalTotalPrice,
            purchaseDate: new Date().toISOString()
        };

        let myTickets = JSON.parse(localStorage.getItem('skyOpsTickets')) || [];
        myTickets.push(ticketData);
        localStorage.setItem('skyOpsTickets', JSON.stringify(myTickets));

        setTimeout(() => {
            const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
            if(paymentModal) paymentModal.hide();
            window.location.href = 'bilet.html';
        }, 1500);
    });
});

async function fetchInitialData() {
    try {
        const [airportsRes, routesRes, flightsRes, airlinesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/airports`),
            fetch(`${API_BASE_URL}/routes_duration`),
            fetch(`${API_BASE_URL}/flights`),
            fetch(`${API_BASE_URL}/airlines`)
        ]);
        globalAirports = await airportsRes.json();
        filteredOriginAirports = [...globalAirports]; 
        routeDurations = await routesRes.json();
        allFlights = await flightsRes.json();
        globalAirlines = await airlinesRes.json();
        
        setupAutocomplete('searchOriginText', 'searchOrigin', 'originDropdown', 'origin');
        setupAutocomplete('searchDestText', 'searchDest', 'destDropdown', 'dest');
        setupClassAutocomplete();
    } catch (error) { console.error("Veriler çekilirken hata:", error); }
}

function handleGlobalFilter(e) {
    const term = e.target.value.toLocaleLowerCase('tr-TR').trim();
    const dropdown = document.getElementById('globalDropdown');
    dropdown.innerHTML = ''; 

    if (term === "") {
        dropdown.style.display = 'none';
        filteredOriginAirports = [...globalAirports]; 
        return;
    }

    const uniqueTerms = new Set();
    const suggestionsHTML = [];

    globalAirports.forEach(a => {
        if (a.city && a.city.toLocaleLowerCase('tr-TR').includes(term)) {
            if(!uniqueTerms.has(a.city)) {
                uniqueTerms.add(a.city);
                suggestionsHTML.push({text: a.city, icon: "fa-city", type: "city"});
            }
        }
        if (a.country && a.country.toLocaleLowerCase('tr-TR').includes(term)) {
            if(!uniqueTerms.has(a.country)) {
                uniqueTerms.add(a.country);
                suggestionsHTML.push({text: a.country, icon: "fa-globe-americas", type: "country"});
            }
        }
    });

    if (suggestionsHTML.length === 0) {
        dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-search-minus me-2"></i>Sonuç bulunamadı</li>';
        dropdown.style.display = 'block';
        return;
    }

    suggestionsHTML.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas ${item.icon} me-2 text-muted"></i> ${item.text}`;
        
        li.addEventListener('click', () => {
            document.getElementById('globalFilterInput').value = item.text;
            dropdown.style.display = 'none';
            filteredOriginAirports = globalAirports.filter(a => {
                if (item.type === "city") return a.city === item.text;
                if (item.type === "country") return a.country === item.text;
                return true;
            });
        });
        dropdown.appendChild(li);
    });
    dropdown.style.display = 'block'; 
}

function setupAutocomplete(inputId, hiddenId, dropdownId, boxType) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(dropdownId);
    let currentFocus = -1; 

    const renderList = function() {
        const term = input.value.toLocaleLowerCase('tr-TR').trim();
        dropdown.innerHTML = '';
        currentFocus = -1; 
        
        const dataToSearch = (boxType === 'origin') ? filteredOriginAirports : globalAirports;
        const searchTerms = term.split(/[\s\-]+/).filter(t => t.length > 0);

        const matched = dataToSearch.filter(a => {
            if (searchTerms.length === 0) return true;
            const fullText = `${a.code} ${a.name} ${a.city} ${a.country}`.toLocaleLowerCase('tr-TR');
            return searchTerms.every(part => fullText.includes(part));
        });

        if (matched.length === 0) {
            dropdown.innerHTML = '<li class="text-muted"><i class="fas fa-plane-slash me-2"></i>Nokta Bulunamadı</li>';
            dropdown.style.display = 'block'; 
            return;
        }

        matched.forEach(a => {
            const li = document.createElement('li');
            li.innerHTML = `<b>${a.code}</b> - ${a.name} <small class="text-muted ms-auto">(${a.city}, ${a.country})</small>`;
            li.addEventListener('click', () => {
                input.value = `${a.code} - ${a.name}`; 
                hidden.value = a.code; 
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(li);
        });
        dropdown.style.display = 'block';
    };

    input.addEventListener('input', () => { 
        document.getElementById(hiddenId).value = ''; 
        renderList(); 
    });
    
    input.addEventListener('click', renderList); 

    input.addEventListener('keydown', function(e) {
        let items = dropdown.getElementsByTagName('li');
        if (items.length === 0 || items[0].classList.contains('text-muted')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocus++;
            addActive(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocus--;
            addActive(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentFocus > -1) {
                if (items[currentFocus]) {
                    items[currentFocus].click(); 
                }
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        
        x[currentFocus].style.backgroundColor = '#f1f5f9';
        x[currentFocus].style.color = '#2563eb';
        x[currentFocus].style.paddingLeft = '20px';
        x[currentFocus].scrollIntoView({ block: 'nearest' });
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].style.backgroundColor = '';
            x[i].style.color = '';
            x[i].style.paddingLeft = '';
        }
    }
}

function setupClassAutocomplete() {
    const input = document.getElementById('searchClassText');
    const hidden = document.getElementById('searchClass');
    const dropdown = document.getElementById('searchClassDropdown');
    let currentFocus = -1; 

    const renderList = function() {
        dropdown.innerHTML = '';
        currentFocus = -1;
        
        cabinClasses.forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fas ${c.icon} me-2 text-muted"></i> <b>${c.text}</b>`;
            li.addEventListener('click', () => {
                input.value = c.text; 
                hidden.value = c.value; 
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(li);
        });
        dropdown.style.display = 'block';
    };
    
    if(input) input.addEventListener('click', renderList); 

    if(input) {
        input.addEventListener('keydown', function(e) {
            let items = dropdown.getElementsByTagName('li');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentFocus++;
                addActive(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentFocus--;
                addActive(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentFocus > -1) {
                    if (items[currentFocus]) {
                        items[currentFocus].click();
                    }
                }
            }
        });
    }

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        
        x[currentFocus].style.backgroundColor = '#f1f5f9';
        x[currentFocus].style.color = '#2563eb';
        x[currentFocus].style.paddingLeft = '20px';
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].style.backgroundColor = '';
            x[i].style.color = '';
            x[i].style.paddingLeft = '';
        }
    }
}

function calculateArrivalTime(startTime, durationHours) {
    const [hrs, mins] = startTime.split(':').map(Number);
    const totalMins = (hrs * 60) + mins + (durationHours * 60);
    const endHrs = Math.floor(totalMins / 60) % 24;
    const endMins = Math.round(totalMins % 60);
    return `${String(endHrs).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

function calculatePrice(durationHours, cabinClass, isRoundTrip) {
    let basePrice = durationHours * 1500; 
    if (cabinClass === 'business') basePrice *= 2.5; 
    if (cabinClass === 'first') basePrice *= 4.0;    
    
    let rawPrice = basePrice;
    if (isRoundTrip) basePrice *= 0.85; 
    
    return {
        rawPrice: Math.round(rawPrice).toLocaleString('tr-TR'),
        finalPrice: Math.round(basePrice).toLocaleString('tr-TR')
    };
}

function checkDateMatch(flightDate, searchDateIso) {
    if(!searchDateIso) return false;
    const [year, month, day] = searchDateIso.split('-');
    const trDate = `${day}.${month}.${year}`;
    const todayObj = new Date();
    const todayIso = todayObj.toISOString().split('T')[0];
    let tomorrowObj = new Date(); tomorrowObj.setDate(todayObj.getDate() + 1);
    const tomorrowIso = tomorrowObj.toISOString().split('T')[0];

    let textDate = "";
    if (searchDateIso === todayIso) textDate = "Bugün";
    else if (searchDateIso === tomorrowIso) textDate = "Yarın";

    return (flightDate === searchDateIso || flightDate === trDate || flightDate === textDate || flightDate === `${day}/${month}/${year}`);
}

function handleFlightSearch(e) {
    e.preventDefault();

    const origin = document.getElementById('searchOrigin').value;
    const dest = document.getElementById('searchDest').value;
    const date = document.getElementById('searchDate').value;
    const returnDate = document.getElementById('returnDate').value;
    const cabinClass = document.getElementById('searchClass').value;
    const tripType = document.querySelector('input[name="tripType"]:checked').value;
    currentSearchIsRoundTrip = (tripType === 'roundtrip');

    selectedOutboundFlight = null;
    selectedReturnFlight = null;
    outboundSeatNo = null;
    returnSeatNo = null;

    if (!origin || !dest || origin === "" || dest === "") {
        alert(translations[window.currentLang].msgSelectLocation);
        return;
    }

    if (currentSearchIsRoundTrip && (!returnDate || returnDate === "")) {
        alert(translations[window.currentLang].msgSelectReturnDate);
        return;
    }

    const originAirport = globalAirports.find(a => a.code === origin);
    const destAirport = globalAirports.find(a => a.code === dest);

    if (originAirport && destAirport) {
        if (originAirport.cityId === destAirport.cityId) {
            alert(translations[window.currentLang].msgSameCity);
            return;
        }
    }

    const resultsContainer = document.getElementById('flightResults');
    resultsContainer.innerHTML = `<div class="text-center mt-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-2 text-muted">${translations[window.currentLang].msgSearching}</p></div>`;

    setTimeout(() => {
        const outboundRoute = `${origin}>${dest}`.replace(/\s+/g, '');
        const outboundFlights = allFlights.filter(f => {
            const dbRoute = f.route ? f.route.replace(/\s+/g, '') : "";
            return dbRoute === outboundRoute && checkDateMatch(f.date, date) && f.status !== "İptal" && f.status !== "İndi";
        });

        let returnFlights = [];
        if (currentSearchIsRoundTrip) {
            const returnRoute = `${dest}>${origin}`.replace(/\s+/g, '');
            returnFlights = allFlights.filter(f => {
                const dbRoute = f.route ? f.route.replace(/\s+/g, '') : "";
                return dbRoute === returnRoute && checkDateMatch(f.date, returnDate) && f.status !== "İptal" && f.status !== "İndi";
            });
        }

        let html = '';

        if (outboundFlights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="alert alert-warning text-center shadow-sm p-4 rounded-4 mt-4">
                    <i class="fas fa-plane-slash fa-3x mb-3 text-warning"></i>
                    <h4>${translations[window.currentLang].msgNoFlightFound}</h4>
                    <p class="mb-0">Seçtiğiniz tarihte (${origin} -> ${dest}) için gidiş uçuşu bulunmuyor.</p>
                </div>`;
            return;
        }

        html += `<h4 class="mb-4 text-dark fw-bold" id="outboundFlightsHeader"><i class="fas fa-plane-departure me-2 text-primary"></i>Gidiş Uçuşları <span class="fs-6 fw-normal text-muted ms-2">(${origin} -> ${dest})</span></h4>`;
        html += renderFlightCards(outboundFlights, origin, dest, cabinClass, currentSearchIsRoundTrip, 'outbound');

        if (currentSearchIsRoundTrip) {
            html += `<div id="returnFlightsWrapper" style="display: none; opacity: 0; transition: opacity 0.5s ease-in-out;">`;
            html += `<hr class="my-5" style="border-top: 2px dashed #cbd5e1;">`;
            
            if (returnFlights.length === 0) {
                html += `
                <div id="returnFlightsHeader" class="alert alert-danger text-center shadow-sm p-4 rounded-4 mt-2" style="border: 2px dashed #fca5a5;">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3 text-danger"></i>
                    <h4 class="fw-bold text-danger">${translations[window.currentLang].msgNoFlightFound}</h4>
                    <p class="mb-0 text-dark">Seçtiğiniz tarihte <b>(${dest} -> ${origin})</b> yönünde planlanmış bir seferimiz bulunmuyor.</p>
                </div>`;
            } else {
                html += `<h4 class="mb-4 text-dark fw-bold" id="returnFlightsHeader"><i class="fas fa-plane-arrival me-2 text-success"></i>Dönüş Uçuşları <span class="fs-6 fw-normal text-muted ms-2">(${dest} -> ${origin})</span></h4>`;
                html += renderFlightCards(returnFlights, dest, origin, cabinClass, currentSearchIsRoundTrip, 'return');
            }
            html += `</div>`;
        }

        resultsContainer.innerHTML = html;

    }, 600); 
}

function renderFlightCards(flights, originCode, destCode, cabinClass, isRoundTrip, direction) {
    let html = '';
    const routeData = routeDurations.find(r => r.id === `${originCode}-${destCode}`);
    const duration = routeData ? parseFloat(routeData.duration) : 2.0;

    let classBadge = 'bg-secondary';
    let className = 'Ekonomi';
    if (cabinClass === 'business') { classBadge = 'bg-primary'; className = 'Business'; }
    if (cabinClass === 'first') { classBadge = 'bg-dark'; className = 'First Class'; }

    const discountBadge = isRoundTrip ? `<br><span class="badge bg-success mt-2 p-2"><i class="fas fa-tags me-1"></i> %15 Gidiş-Dönüş İndirimli</span>` : '';

    flights.forEach(flight => {
        const arrivalTime = calculateArrivalTime(flight.time, duration);
        const prices = calculatePrice(duration, cabinClass, isRoundTrip);
        
        let priceDisplay = `<h3 class="fw-bold text-dark mb-2">${prices.finalPrice} ₺</h3>`;
        if (isRoundTrip) {
            priceDisplay = `<small class="text-decoration-line-through text-muted">${prices.rawPrice} ₺</small><h3 class="fw-bold text-success mb-2">${prices.finalPrice} ₺</h3>`;
        }

        let buttonText = 'Koltuk Seç <i class="fas fa-arrow-right ms-1"></i>';
        if (isRoundTrip && direction === 'outbound') {
            buttonText = 'Seç ve Devam Et <i class="fas fa-arrow-down ms-1"></i>';
        }

        html += `
        <div class="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style="transition: transform 0.2s;">
            <div class="card-body p-0">
                <div class="row g-0 align-items-center">
                    <div class="col-md-3 bg-light p-4 text-center border-end">
                        <i class="fas fa-plane-tail fa-2x text-primary mb-2"></i>
                        <h5 class="fw-bold mb-0">${flight.flightNo}</h5>
                        <small class="text-muted">SkyOps Airlines</small>
                        <div class="mt-2"><span class="badge ${classBadge}">${className}</span></div>
                    </div>
                    <div class="col-md-6 p-4">
                        <div class="d-flex justify-content-between align-items-center text-center px-4">
                            <div>
                                <h3 class="fw-bold text-dark mb-0">${flight.time}</h3>
                                <span class="text-muted fw-semibold">${originCode}</span>
                            </div>
                            <div class="flex-grow-1 px-3 position-relative">
                                <div style="border-top: 2px dashed #cbd5e1; width: 100%; position: absolute; top: 50%; z-index: 1;"></div>
                                <i class="fas fa-plane text-primary bg-white px-2 position-relative" style="z-index: 2;"></i>
                                <div class="mt-1"><small class="text-muted">${duration} Saat</small></div>
                            </div>
                            <div>
                                <h3 class="fw-bold text-dark mb-0">${arrivalTime}</h3>
                                <span class="text-muted fw-semibold">${destCode}</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 p-4 text-center border-start bg-light h-100">
                        <p class="text-muted mb-1">Kişi Başı</p>
                        ${priceDisplay}
                        <button class="btn btn-primary w-100 rounded-pill fw-bold btn-select-${direction}" id="btn-${flight.id}" onclick="selectFlight('${flight.id}', '${direction}')">
                            ${buttonText}
                        </button>
                        ${discountBadge}
                    </div>
                </div>
            </div>
        </div>`;
    });
    return html;
}

function selectFlight(flightId, direction) {
    if (direction === 'outbound') {
        selectedOutboundFlight = flightId;
        
        document.querySelectorAll('.btn-select-outbound').forEach(b => {
            b.classList.remove('btn-success');
            b.classList.add('btn-primary');
            b.innerHTML = currentSearchIsRoundTrip ? 'Seç ve Devam Et <i class="fas fa-arrow-down ms-1"></i>' : 'Koltuk Seç <i class="fas fa-arrow-right ms-1"></i>';
        });
        
        const btn = document.getElementById(`btn-${flightId}`);
        if(btn) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-success');
            btn.innerHTML = 'Seçildi <i class="fas fa-check ms-1"></i>';
        }

        if (currentSearchIsRoundTrip) {
            const returnWrapper = document.getElementById('returnFlightsWrapper');
            if (returnWrapper) {
                returnWrapper.style.display = 'block'; 
                setTimeout(() => {
                    returnWrapper.style.opacity = '1';
                    const retHeader = document.getElementById('returnFlightsHeader');
                    if(retHeader) retHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
            }
        } 
        else {
            openSeatMap(flightId, "Tek Yön Uçuşu", "outbound");
        }
    } 
    else if (direction === 'return') {
        selectedReturnFlight = flightId;
        
        document.querySelectorAll('.btn-select-return').forEach(b => {
            b.classList.remove('btn-success');
            b.classList.add('btn-primary');
            b.innerHTML = 'Koltuk Seç <i class="fas fa-arrow-right ms-1"></i>';
        });
        
        const btn = document.getElementById(`btn-${flightId}`);
        if(btn) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-success');
            btn.innerHTML = 'Seçildi <i class="fas fa-check ms-1"></i>';
        }

        if (!selectedOutboundFlight) {
            alert("Lütfen önce yukarıdan bir Gidiş Uçuşu seçin!");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        openSeatMap(selectedOutboundFlight, "Gidiş Uçuşu", "outbound");
    }
}

function openSeatMap(flightId, infoPrefix = "", direction = "outbound") {
    currentMapDirection = direction; 
    
    const selectedBtn = document.getElementById(`btn-${flightId}`);
    if (selectedBtn) {
        const priceElement = selectedBtn.parentElement.querySelector('.text-success') || selectedBtn.parentElement.querySelector('h3');
        if (priceElement) finalTotalPrice = priceElement.innerText;
    }

    const modalElement = document.getElementById('seatMapModal');
    let seatModal = bootstrap.Modal.getInstance(modalElement);
    if (!seatModal) seatModal = new bootstrap.Modal(modalElement);
    
    document.getElementById('seatMapFlightInfo').innerText = `${infoPrefix} | Uçuş ID: ${flightId}`;
    const planeBody = document.getElementById('planeBody');
    const searchClass = document.getElementById('searchClass').value; 
    
    const totalRows = 15;
    let html = '';

    html += `
    <div class="d-flex justify-content-center align-items-center mb-3">
        <div style="width: 25px;"></div> 
        <div class="d-flex justify-content-end" style="gap: 8px; width: 140px;">
            <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">A</div>
            <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">B</div>
            <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">C</div>
        </div>
        <div style="width: 30px;"></div> 
        <div class="d-flex justify-content-start" style="gap: 8px; width: 140px;">
            <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">D</div>
            <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">E</div>
            <div style="width: 40px; text-align: center; font-weight: 800; color: #64748b;">F</div>
        </div>
        <div style="width: 25px;"></div> 
    </div>`;

    for (let i = 1; i <= totalRows; i++) {
        let rowClass = 'economy';
        let leftLayout = ['A', 'B', 'C'];
        let rightLayout = ['D', 'E', 'F'];
        
        let seatW = '40px'; 
        let seatH = '40px';

        if (i === 1) {
            rowClass = 'first';
            leftLayout = ['A'];
            rightLayout = ['F'];
            seatW = '70px'; 
            seatH = '50px';
        } else if (i <= 3) {
            rowClass = 'business';
            leftLayout = ['A', 'C'];
            rightLayout = ['D', 'F'];
            seatW = '55px'; 
            seatH = '45px';
        }

        if (i === 1) html += `<div class="class-divider mt-2 mb-3" data-label="FIRST CLASS"></div>`;
        if (i === 2) html += `<div class="class-divider mt-4 mb-3" data-label="BUSINESS CLASS"></div>`;
        if (i === 4) html += `<div class="class-divider mt-4 mb-3" data-label="ECONOMY CLASS"></div>`;

        html += `<div class="d-flex justify-content-center align-items-center mb-2" style="gap: 8px;">`;
        html += `<div style="width: 25px; text-align: right; font-weight: 800; color: #94a3b8; font-size: 0.9rem;">${i}</div>`;

        html += `<div class="d-flex justify-content-end" style="gap: 8px; width: 140px;">`;
        leftLayout.forEach(seatLetter => {
            const seatId = `${i}${seatLetter}`;
            const isOccupied = false; 
            const isRestricted = (searchClass !== rowClass) && !(searchClass === 'business' && rowClass === 'first'); 
            
            let seatStatusClass = isOccupied ? 'occupied' : 'available';
            if (isRestricted && !isOccupied) seatStatusClass = 'occupied'; 
            let innerIcon = seatStatusClass === 'occupied' && isOccupied ? '<i class="fas fa-times" style="opacity: 0.3;"></i>' : '';

            html += `<div class="seat ${rowClass} ${seatStatusClass}" data-seat="${seatId}" data-letter="${seatLetter}" onclick="handleSeatSelection(this)" style="width: ${seatW}; height: ${seatH};">${innerIcon}</div>`;
        });
        html += `</div>`;

        html += `<div style="width: 30px;"></div>`;

        html += `<div class="d-flex justify-content-start" style="gap: 8px; width: 140px;">`;
        rightLayout.forEach(seatLetter => {
            const seatId = `${i}${seatLetter}`;
            const isOccupied = false; 
            const isRestricted = (searchClass !== rowClass);
            
            let seatStatusClass = isOccupied ? 'occupied' : 'available';
            if (isRestricted && !isOccupied) seatStatusClass = 'occupied'; 
            let innerIcon = seatStatusClass === 'occupied' && isOccupied ? '<i class="fas fa-times" style="opacity: 0.3;"></i>' : '';

            html += `<div class="seat ${rowClass} ${seatStatusClass}" data-seat="${seatId}" data-letter="${seatLetter}" onclick="handleSeatSelection(this)" style="width: ${seatW}; height: ${seatH};">${innerIcon}</div>`;
        });
        html += `</div>`;
        
        html += `<div style="width: 25px; text-align: left; font-weight: 800; color: #94a3b8; font-size: 0.9rem;">${i}</div>`;
        html += `</div>`;
    }

    planeBody.innerHTML = html;
    
    document.getElementById('summarySeatNo').innerText = '--';
    document.getElementById('summarySeatType').innerText = translations[window.currentLang].notSelectedYet;
    if(document.getElementById('summaryCabinClass')) {
        document.getElementById('summaryCabinClass').innerText = searchClass.toUpperCase();
    }
    
    const proceedBtn = document.getElementById('btnProceedToPayment');
    proceedBtn.disabled = true;
    
    if (currentSearchIsRoundTrip && direction === 'outbound') {
        proceedBtn.innerHTML = 'Dönüş İçin Koltuk Seç <i class="fas fa-arrow-right ms-2"></i>';
        proceedBtn.classList.replace('btn-success', 'btn-primary');
    } else {
        proceedBtn.innerHTML = '<span data-i18n="proceedPayment">Ödemeye Geç</span> <i class="fas fa-lock ms-2"></i>';
        proceedBtn.classList.replace('btn-primary', 'btn-success');
    }

    seatModal.show();
}

function handleSeatSelection(seatElement) {
    if (seatElement.classList.contains('occupied')) return; 

    const prevSelected = document.querySelector('.seat.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
        prevSelected.innerHTML = ''; 
    }

    seatElement.classList.add('selected');
    seatElement.innerHTML = '<i class="fas fa-check"></i>';
    
    currentlySelectedSeat = seatElement.getAttribute('data-seat');
    const seatLetter = seatElement.getAttribute('data-letter');

    let seatTypeDesc = "Orta Koltuk";
    if (seatLetter === 'A' || seatLetter === 'F') seatTypeDesc = "Cam Kenarı";
    if (seatLetter === 'C' || seatLetter === 'D') seatTypeDesc = "Koridor Kenarı";

    document.getElementById('summarySeatNo').innerText = currentlySelectedSeat;
    document.getElementById('summarySeatType').innerText = seatTypeDesc;
    
    document.getElementById('btnProceedToPayment').disabled = false;
}

function openPaymentModal() {
    const seatModalEl = document.getElementById('seatMapModal');
    const seatModal = bootstrap.Modal.getInstance(seatModalEl);
    if (seatModal) seatModal.hide();

    document.getElementById('paymentTotalAmount').innerText = finalTotalPrice;

    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    paymentModal.show();
}
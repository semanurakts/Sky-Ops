document.addEventListener('DOMContentLoaded', () => {
    
    // 🌟 ŞIK BİLDİRİM (TOAST) FONKSİYONU 🌟
    function showNotification(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `skyops-toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        
        toast.innerHTML = `<i class="fas ${icon}"></i> <div>${message}</div>`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500); 
        }, 3500);
    }

    // Elementleri Tanımla
    const btnPass = document.getElementById('btnPassenger');
    const btnEmp = document.getElementById('btnEmployee');
    const slider = document.getElementById('toggleSlider');
    const roleToggle = document.getElementById('roleToggle');
    
    const formPass = document.getElementById('passengerForm');
    const formEmp = document.getElementById('employeeForm');
    const formReg = document.getElementById('registerForm'); 
    const formForgot = document.getElementById('forgotPasswordForm'); 

    const btnGoRegister = document.getElementById('btnGoRegister'); 
    const btnBackToLogin = document.getElementById('btnBackToLogin'); 
    const btnForgotPassword = document.getElementById('btnForgotPassword');
    const btnBackToLoginFromForgot = document.getElementById('btnBackToLoginFromForgot');
    const btnITSupport = document.getElementById('btnITSupport');

    // --- 1. GEÇİŞ ANİMASYONLARI (Kayıt Ol) ---
    if (btnGoRegister) {
        btnGoRegister.addEventListener('click', (e) => {
            e.preventDefault();
            formPass.classList.remove('active');
            roleToggle.style.display = 'none'; 
            setTimeout(() => formReg.classList.add('active'), 50);
        });
    }

    if (btnBackToLogin) {
        btnBackToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            formReg.classList.remove('active');
            setTimeout(() => {
                formPass.classList.add('active');
                roleToggle.style.display = 'flex'; 
            }, 50);
        });
    }

    // --- 2. GEÇİŞ ANİMASYONLARI (Şifremi Unuttum) ---
    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            formPass.classList.remove('active');
            roleToggle.style.display = 'none'; 
            setTimeout(() => formForgot.classList.add('active'), 50);
        });
    }

    if (btnBackToLoginFromForgot) {
        btnBackToLoginFromForgot.addEventListener('click', (e) => {
            e.preventDefault();
            formForgot.classList.remove('active');
            setTimeout(() => {
                formPass.classList.add('active');
                roleToggle.style.display = 'flex'; 
            }, 50);
        });
    }

    // --- 3. MOD (YOLCU / PERSONEL) GEÇİŞ ANİMASYONLARI ---
    btnPass.addEventListener('click', () => {
        btnPass.classList.add('active');
        btnEmp.classList.remove('active');
        slider.style.transform = 'translateX(0)';
        slider.style.background = '#3b82f6'; 
        
        formEmp.classList.remove('active');
        setTimeout(() => formPass.classList.add('active'), 50);
    });

    btnEmp.addEventListener('click', () => {
        btnEmp.classList.add('active');
        btnPass.classList.remove('active');
        slider.style.transform = 'translateX(100%)';
        slider.style.background = '#10b981'; 
        
        formPass.classList.remove('active');
        formReg.classList.remove('active'); 
        formForgot.classList.remove('active');
        setTimeout(() => formEmp.classList.add('active'), 50);
    });

    // --- 4. YOLCU GİRİŞ İŞLEMLERİ (LocalStorage) ---
    const passFormEl = formPass.querySelector('form');
    passFormEl.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const email = document.getElementById('passEmail').value.trim();
        const pass = document.getElementById('passPassword').value.trim();

        const users = JSON.parse(localStorage.getItem('skyOpsUsers')) || [];
        const foundUser = users.find(u => u.email === email && u.password === pass);

        if (foundUser || (false)) {
            const activeName = foundUser ? foundUser.name : "Test Kullanıcısı";
            localStorage.setItem('skyOpsActiveUser', activeName);

            // 🌟 YENİ: YOLCU KİMLİĞİ VE ROLÜNÜ KAYDET 🌟
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'passenger');

            const btn = passFormEl.querySelector('button');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Giriş Yapılıyor...';
            setTimeout(() => window.location.href = 'yolcu.html', 800);
        } else {
            showNotification("E-posta veya şifre hatalı! Hesabınız yoksa kayıt olun.", "error");
        }
    });

    // --- 5. YOLCU KAYIT OLMA ---
    const regFormEl = document.getElementById('formRegisterSubmit');
    if (regFormEl) {
        regFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const pass = document.getElementById('regPassword').value.trim();

            let users = JSON.parse(localStorage.getItem('skyOpsUsers')) || [];
            
            if (users.find(u => u.email === email)) {
                showNotification("Bu e-posta adresi zaten kullanımda!", "error");
                return;
            }

            users.push({ name: name, email: email, password: pass });
            localStorage.setItem('skyOpsUsers', JSON.stringify(users));
            
            showNotification(`Üyelik başarıyla oluşturuldu! Hoş geldin ${name}`, "success");
            
            formReg.classList.remove('active');
            setTimeout(() => {
                formPass.classList.add('active');
                roleToggle.style.display = 'flex';
                document.getElementById('passEmail').value = email;
                document.getElementById('passPassword').value = ''; 
            }, 50);
        });
    }

    // --- 6. ŞİFRE SIFIRLAMA İŞLEMİ (GERÇEK ZAMANLI MOCK) ---
    const formForgotSubmit = document.getElementById('formForgotSubmit');
    if (formForgotSubmit) {
        formForgotSubmit.addEventListener('submit', (e) => {
            e.preventDefault();
            const resetEmail = document.getElementById('forgotEmail').value.trim();
            const newPassword = document.getElementById('forgotNewPassword').value.trim();
            
            let users = JSON.parse(localStorage.getItem('skyOpsUsers')) || [];
            const userIndex = users.findIndex(u => u.email === resetEmail);

            if (userIndex !== -1) {
                users[userIndex].password = newPassword;
                localStorage.setItem('skyOpsUsers', JSON.stringify(users));
                
                showNotification("Şifreniz başarıyla güncellendi!", "success");
                
                document.getElementById('forgotEmail').value = '';
                document.getElementById('forgotNewPassword').value = '';
                formForgot.classList.remove('active');
                setTimeout(() => {
                    formPass.classList.add('active');
                    roleToggle.style.display = 'flex';
                    document.getElementById('passEmail').value = resetEmail;
                }, 50);
            } else {
                showNotification("Bu e-posta adresi sistemde bulunamadı!", "error");
            }
        });
    }

    // --- 7. PERSONEL/ADMİN GİRİŞ İŞLEMLERİ (Sabit) ---
    const empFormEl = formEmp.querySelector('form');
    empFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const empId = document.getElementById('empId').value.trim();
        const empPassword = document.getElementById('empPassword').value.trim();

        if (false) {
            // 🌟 YENİ: ADMİN KİMLİĞİ VE ROLÜNÜ KAYDET 🌟
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');

            const btn = empFormEl.querySelector('button');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Bağlanıyor...';
            setTimeout(() => window.location.href = 'index.html', 800);
        } else {
            showNotification("Yetkisiz erişim! Sicil No veya şifre hatalı.", "error");
        }
    });

    // --- 8. PERSONEL IT DESTEK BİRİMİ UYARISI ---
    if (btnITSupport) {
        btnITSupport.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification("Sistem erişimi ve şifre işlemleri için lütfen '444 0 911' numaralı IT Destek Hattı'nı arayınız.", "success");
        });
    }

});
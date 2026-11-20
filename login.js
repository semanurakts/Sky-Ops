document.addEventListener('DOMContentLoaded', () => {

    // --- 🌍 ÇEVİRİ SÖZLÜĞÜ VE DİL MOTORU ---
    const translations = {
        tr: {
            title: "SkyOps - Giriş Portalı", passengerLogin: "Yolcu Girişi", staffLogin: "Personel Girişi",
            exploreWorld: "Dünyayı Keşfetmeye Devam Et", emailPlaceholder: "E-posta", emailLabel: "E-posta Adresi",
            passwordPlaceholder: "Şifre", passwordLabel: "Şifre", forgotPasswordLink: "Şifremi Unuttum",
            loginBtn: "Giriş Yap", noAccount: "Hesabın yok mu?", registerNowLink: "Hemen Kayıt Ol",
            resetTitle: "Şifre Sıfırlama", resetDesc: "Kayıtlı e-posta adresinizi ve oluşturmak istediğiniz yeni şifrenizi girin.",
            newPasswordPlaceholder: "Yeni Şifre", newPasswordLabel: "Yeni Şifre", updatePasswordBtn: "Şifreyi Güncelle",
            rememberPassword: "Şifrenizi hatırladınız mı?", joinUs: "Aramıza Katılın", fullNamePlaceholder: "Ad Soyad",
            fullNameLabel: "Ad Soyad", registerBtn: "Kayıt Ol", alreadyHaveAccount: "Zaten hesabın var mı?",
            opsCenter: "Operasyon Kontrol Merkezi", badgePlaceholder: "Sicil No", badgeLabel: "Sicil Numarası",
            systemPasswordPlaceholder: "Şifre", systemPasswordLabel: "Sistem Şifresi", itSupportLink: "IT Destek Birimi",
            connectSystemBtn: "Sisteme Bağlan", unauthorizedWarning: "Yetkisiz erişim denemeleri kayıt altına alınmaktadır.",
            // Bildirim Mesajları (Toast)
            msgLoggingIn: "Giriş Yapılıyor...", msgConnecting: "Bağlanıyor...",
            msgAuthError: "E-posta veya şifre hatalı! Hesabınız yoksa kayıt olun.",
            msgEmailInUse: "Bu e-posta adresi zaten kullanımda!", msgRegisterSuccess: "Üyelik başarıyla oluşturuldu! Hoş geldin ",
            msgPasswordUpdated: "Şifreniz başarıyla güncellendi!", msgEmailNotFound: "Bu e-posta adresi sistemde bulunamadı!",
            msgStaffError: "Yetkisiz erişim! Sicil No veya şifre hatalı.",
            msgITSupportAlert: "Sistem erişimi ve şifre işlemleri için lütfen '444 0 911' numaralı IT Destek Hattı'nı arayınız."
        },
        en: {
            title: "SkyOps - Login Portal", passengerLogin: "Passenger Login", staffLogin: "Staff Login",
            exploreWorld: "Continue Exploring the World", emailPlaceholder: "Email", emailLabel: "Email Address",
            passwordPlaceholder: "Password", passwordLabel: "Password", forgotPasswordLink: "Forgot Password?",
            loginBtn: "Log In", noAccount: "Don't have an account?", registerNowLink: "Sign Up Now",
            resetTitle: "Password Reset", resetDesc: "Enter your registered email address and the new password.",
            newPasswordPlaceholder: "New Password", newPasswordLabel: "New Password", updatePasswordBtn: "Update Password",
            rememberPassword: "Remember your password?", joinUs: "Join Us", fullNamePlaceholder: "Full Name",
            fullNameLabel: "Full Name", registerBtn: "Sign Up", alreadyHaveAccount: "Already have an account?",
            opsCenter: "Operations Control Center", badgePlaceholder: "Staff ID", badgeLabel: "Staff ID Number",
            systemPasswordPlaceholder: "Password", systemPasswordLabel: "System Password", itSupportLink: "IT Support Unit",
            connectSystemBtn: "Connect to System", unauthorizedWarning: "Unauthorized access attempts are being logged.",
            // Bildirim Mesajları (Toast)
            msgLoggingIn: "Logging in...", msgConnecting: "Connecting...",
            msgAuthError: "Incorrect email or password! Please register if you don't have an account.",
            msgEmailInUse: "This email address is already in use!", msgRegisterSuccess: "Account successfully created! Welcome ",
            msgPasswordUpdated: "Your password has been successfully updated!", msgEmailNotFound: "This email address could not be found!",
            msgStaffError: "Unauthorized access! Staff ID or password incorrect.",
            msgITSupportAlert: "For system access and password procedures, please call the IT Support Hotline at '444 0 911'."
        }
    };

    let currentLang = localStorage.getItem('skyOpsLang') || 'tr';
    function updateLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('skyOpsLang', lang);

        document.getElementById('btnLangTR').classList.toggle('active', lang === 'tr');
        document.getElementById('btnLangEN').classList.toggle('active', lang === 'en');

        const titleEl = document.querySelector('[data-i18n="title"]');
        if (titleEl) document.title = translations[lang]["title"];

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key !== 'title' && translations[lang][key]) el.innerText = translations[lang][key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) el.setAttribute('placeholder', translations[lang][key]);
        });
    }

    document.getElementById('btnLangTR').addEventListener('click', () => updateLanguage('tr'));
    document.getElementById('btnLangEN').addEventListener('click', () => updateLanguage('en'));
    updateLanguage(currentLang);
    // ----------------------------------------------
    
    
// Güvenli bildirim gösterme fonksiyonu
function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `skyops-toast ${type}`;

    const icon = document.createElement('i');
    icon.className = `fas ${
        type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
    }`;

    const content = document.createElement('div');

    // Mesajı HTML olarak değil, düz metin olarak ekle.
    content.textContent = String(message);

    toast.appendChild(icon);
    toast.appendChild(content);

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

if (passFormEl) {
    passFormEl.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('passEmail').value.trim();
        const pass = document.getElementById('passPassword').value;

        // Kayıtlı kullanıcıları güvenli şekilde oku.
        let users = [];

        try {
            const storedUsers = JSON.parse(
                localStorage.getItem('skyOpsUsers') || '[]'
            );

            if (Array.isArray(storedUsers)) {
                users = storedUsers;
            }
        } catch (error) {
            console.error('Kullanıcı verileri okunamadı:', error);
        }

        // E-posta ve şifre eşleşmesini kontrol et.
        const foundUser = users.find(user =>
            typeof user.email === 'string' &&
            typeof user.password === 'string' &&
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === pass
        );

        if (foundUser) {
            sessionStorage.setItem('skyOpsActiveUser', foundUser.name);
            sessionStorage.setItem('skyOpsActiveUserEmail', foundUser.email);
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userRole', 'passenger');

            const btn = passFormEl.querySelector('button');

            if (btn) {
                btn.innerHTML =
                    '<i class="fas fa-spinner fa-spin me-2"></i>Giriş Yapılıyor...';
                btn.disabled = true;
            }

            setTimeout(() => {
                window.location.href = 'yolcu.html';
            }, 800);
        } else {
            showNotification(
                translations[currentLang].msgAuthError,
                'error'
            );
        }
    });
}

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


// --- 6. GÜVENLİ ŞİFRE SIFIRLAMA UYARISI ---
const formForgotSubmit = document.getElementById('formForgotSubmit');

if (formForgotSubmit) {
    formForgotSubmit.addEventListener('submit', (e) => {
        e.preventDefault();

        // Bu demo sürümünde e-posta sahipliği doğrulaması bulunmuyor.
        // Bu nedenle şifre değiştirme işlemi gerçekleştirilmez.
        showNotification(
            "Bu demo sürümünde güvenli şifre sıfırlama desteklenmemektedir.",
            "error"
        );
    });
}


// --- 7. PERSONEL GİRİŞİ (Public Demo Sürümünde Devre Dışı) ---
const empFormEl = formEmp.querySelector('form');

if (empFormEl) {
    empFormEl.addEventListener('submit', (e) => {
        e.preventDefault();

        const message = currentLang === 'en'
            ? 'Staff login is unavailable in the public demo version.'
            : 'Personel girişi public demo sürümünde kullanılamamaktadır.';

        showNotification(message, 'error');
    });
}


    // --- 8. PERSONEL IT DESTEK BİRİMİ UYARISI ---
    if (btnITSupport) {
        btnITSupport.addEventListener('click', (e) => {
            e.preventDefault();
            // currentLang değişkeni 'tr' ise Türkçe, 'en' ise İngilizce metni Toast olarak çıkarır:
            showNotification(translations[currentLang].msgITSupportAlert, "success");
        });
    }

});
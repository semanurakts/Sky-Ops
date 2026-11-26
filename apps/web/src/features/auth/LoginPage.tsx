import { useEffect, useState, type SubmitEvent, type MouseEvent } from 'react'
import './LoginPage.css'
import { useAuth } from './useAuth'

type Language = 'tr' | 'en'
type LoginRole = 'passenger' | 'employee'
type ActiveView = 'login' | 'register' | 'forgot'
type ToastType = 'success' | 'error'

interface ToastMessage {
  message: string
  type: ToastType
}

const translations = {
  tr: {
    title: 'SkyOps - Giriş Portalı',
    loginRole: 'Giriş türü',
    passengerLogin: 'Yolcu Girişi',
    staffLogin: 'Personel Girişi',
    exploreWorld: 'Dünyayı Keşfetmeye Devam Et',
    emailPlaceholder: 'E-posta',
    emailLabel: 'E-posta Adresi',
    passwordPlaceholder: 'Şifre',
    passwordLabel: 'Şifre',
    forgotPasswordLink: 'Şifremi Unuttum',
    loginBtn: 'Giriş Yap',
    noAccount: 'Hesabın yok mu?',
    registerNowLink: 'Hemen Kayıt Ol',
    resetTitle: 'Şifre Sıfırlama',
    resetDesc:
      'Kayıtlı e-posta adresinizi ve oluşturmak istediğiniz yeni şifrenizi girin.',
    newPasswordPlaceholder: 'Yeni Şifre',
    newPasswordLabel: 'Yeni Şifre',
    updatePasswordBtn: 'Şifreyi Güncelle',
    rememberPassword: 'Şifrenizi hatırladınız mı?',
    joinUs: 'Aramıza Katılın',
    fullNamePlaceholder: 'Ad Soyad',
    fullNameLabel: 'Ad Soyad',
    registerBtn: 'Kayıt Ol',
    alreadyHaveAccount: 'Zaten hesabın var mı?',
    opsCenter: 'Operasyon Kontrol Merkezi',
    badgePlaceholder: 'Sicil No',
    badgeLabel: 'Sicil Numarası',
    systemPasswordPlaceholder: 'Sistem Şifresi',
    systemPasswordLabel: 'Sistem Şifresi',
    itSupportLink: 'IT Destek Birimi',
    connectSystemBtn: 'Sisteme Bağlan',
    unauthorizedWarning:
      'Yetkisiz erişim denemeleri kayıt altına alınmaktadır.',
    passengerApiPending:
      'Yolcu girişi henüz yeni kimlik doğrulama servisine bağlanmadı.',
    registrationPending:
      'Kayıt işlemi henüz yeni kimlik doğrulama servisine bağlanmadı.',
    passwordResetUnavailable:
      'Güvenli şifre sıfırlama servisi henüz kullanıma açılmadı.',
    staffUnavailable:
      'Personel girişi henüz yeni kimlik doğrulama servisine bağlanmadı.',
    itSupportMessage:
      "Sistem erişimi ve şifre işlemleri için lütfen '444 0 911' numaralı IT Destek Hattı'nı arayınız.",
  },
  en: {
    title: 'SkyOps - Login Portal',
    loginRole: 'Login type',
    passengerLogin: 'Passenger Login',
    staffLogin: 'Staff Login',
    exploreWorld: 'Continue Exploring the World',
    emailPlaceholder: 'Email',
    emailLabel: 'Email Address',
    passwordPlaceholder: 'Password',
    passwordLabel: 'Password',
    forgotPasswordLink: 'Forgot Password?',
    loginBtn: 'Log In',
    noAccount: "Don't have an account?",
    registerNowLink: 'Sign Up Now',
    resetTitle: 'Password Reset',
    resetDesc:
      'Enter your registered email address and the new password you would like to use.',
    newPasswordPlaceholder: 'New Password',
    newPasswordLabel: 'New Password',
    updatePasswordBtn: 'Update Password',
    rememberPassword: 'Remember your password?',
    joinUs: 'Join Us',
    fullNamePlaceholder: 'Full Name',
    fullNameLabel: 'Full Name',
    registerBtn: 'Sign Up',
    alreadyHaveAccount: 'Already have an account?',
    opsCenter: 'Operations Control Center',
    badgePlaceholder: 'Staff ID',
    badgeLabel: 'Staff ID Number',
    systemPasswordPlaceholder: 'System Password',
    systemPasswordLabel: 'System Password',
    itSupportLink: 'IT Support Unit',
    connectSystemBtn: 'Connect to System',
    unauthorizedWarning: 'Unauthorized access attempts are being logged.',
    passengerApiPending:
      'Passenger login is not connected to the new authentication service yet.',
    registrationPending:
      'Registration is not connected to the new authentication service yet.',
    passwordResetUnavailable:
      'The secure password reset service is not available yet.',
    staffUnavailable:
      'Staff login is not connected to the new authentication service yet.',
    itSupportMessage:
      "For system access and password procedures, please call the IT Support Hotline at '444 0 911'.",
  },
} as const

type TranslationKey = keyof typeof translations.tr

function getInitialLanguage(): Language {
  try {
    return localStorage.getItem('skyOpsLang') === 'en' ? 'en' : 'tr'
  } catch {
    return 'tr'
  }
}

function LoginPage() {
    const { login, logout } = useAuth()

  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [activeRole, setActiveRole] = useState<LoginRole>('passenger')
  const [activeView, setActiveView] = useState<ActiveView>('login')
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const t = (key: TranslationKey) => translations[language][key]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = translations[language].title

    try {
      localStorage.setItem('skyOpsLang', language)
    } catch {
      // Language preference is optional when browser storage is unavailable.
    }
  }, [language])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => {
      setToast(null)
    }, 3500)

    return () => window.clearTimeout(timer)
  }, [toast])

  function showNotification(message: string, type: ToastType = 'success') {
    setToast({ message, type })
  }

  function changeRole(role: LoginRole) {
    setActiveRole(role)
    setActiveView('login')
  }

  function openRegister(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setActiveRole('passenger')
    setActiveView('register')
  }

  function openForgotPassword(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setActiveRole('passenger')
    setActiveView('forgot')
  }

  function backToLogin(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setActiveView('login')
  }

  function handlePassengerLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    showNotification(t('passengerApiPending'), 'error')
  }

  function handleRegistration(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    showNotification(t('registrationPending'), 'error')
  }

  function handlePasswordReset(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    showNotification(t('passwordResetUnavailable'), 'error')
  }

async function handleStaffLogin(event: SubmitEvent<HTMLFormElement>) {
  event.preventDefault();

  if (isSubmitting) return;

  setIsSubmitting(true);

  try {
    const user = await login(staffEmail.trim(), staffPassword);

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      await logout();

      showNotification(
        language === "tr"
          ? "Bu hesap personel Dashboard erişimine sahip değil."
          : "This account does not have staff dashboard access.",
        "error",
      );

      return;
    }

    window.location.assign("/dashboard");
  } catch (error) {
    showNotification(
      error instanceof Error
        ? error.message
        : language === "tr"
          ? "Giriş başarısız."
          : "Login failed.",
      "error",
    );
  } finally {
    setIsSubmitting(false);
  }
}

  function handleITSupport(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    showNotification(t('itSupportMessage'), 'success')
  }

  return (
    <div className="skyops-login-page">
      <div className="login-background" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />

      <div className="language-toggle" aria-label="Language selection">
        <button
          type="button"
          className={language === 'tr' ? 'active' : ''}
          aria-pressed={language === 'tr'}
          onClick={() => setLanguage('tr')}
        >
          TR
        </button>

        <button
          type="button"
          className={language === 'en' ? 'active' : ''}
          aria-pressed={language === 'en'}
          onClick={() => setLanguage('en')}
        >
          EN
        </button>
      </div>

      <main className="login-container">
        <section className="glass-card" aria-label="SkyOps login">
          <div className="brand-logo">
            <i className="fa-solid fa-plane-departure" aria-hidden="true" />
            <span>SkyOps</span>
          </div>

          {activeView === 'login' && (
            <div
              className="role-toggle"
              data-role={activeRole}
              role="group"
              aria-label={t('loginRole')}
            >
              <div className="toggle-slider" aria-hidden="true" />

              <button
                type="button"
                className={`role-btn ${activeRole === 'passenger' ? 'active' : ''}`}
                aria-pressed={activeRole === 'passenger'}
                onClick={() => changeRole('passenger')}
              >
                {t('passengerLogin')}
              </button>

              <button
                type="button"
                className={`role-btn ${activeRole === 'employee' ? 'active' : ''}`}
                aria-pressed={activeRole === 'employee'}
                onClick={() => changeRole('employee')}
              >
                {t('staffLogin')}
              </button>
            </div>
          )}

          {activeView === 'login' && activeRole === 'passenger' && (
            <section className="form-section" key="passenger-login">
              <h2 className="form-title">{t('exploreWorld')}</h2>

              <form onSubmit={handlePassengerLogin}>
                <div className="form-floating">
                  <input
                    type="email"
                    className="form-control"
                    id="passEmail"
                    placeholder=" "
                    autoComplete="email"
                    required
                  />
                  <label htmlFor="passEmail">
                    <i className="fa-solid fa-envelope" aria-hidden="true" />
                    <span>{t('emailLabel')}</span>
                  </label>
                </div>

                <div className="form-floating">
                  <input
                    type="password"
                    className="form-control"
                    id="passPassword"
                    placeholder=" "
                    autoComplete="current-password"
                    required
                  />
                  <label htmlFor="passPassword">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                    <span>{t('passwordLabel')}</span>
                  </label>
                </div>

                <div className="forgot-link-row">
                  <a href="#forgot-password" className="forgot-link" onClick={openForgotPassword}>
                    {t('forgotPasswordLink')}
                  </a>
                </div>

                <button type="submit" className="btn-login">
                  <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                  <span>{t('loginBtn')}</span>
                </button>

                <div className="register-text">
                  <span>{t('noAccount')} </span>
                  <a href="#register" onClick={openRegister}>
                    {t('registerNowLink')}
                  </a>
                </div>
              </form>
            </section>
          )}

          {activeView === 'forgot' && (
            <section className="form-section" key="forgot-password">
              <h2 className="form-title">{t('resetTitle')}</h2>

              <p className="form-description">{t('resetDesc')}</p>

              <form onSubmit={handlePasswordReset}>
                <div className="form-floating">
                  <input
                    type="email"
                    className="form-control"
                    id="forgotEmail"
                    placeholder=" "
                    autoComplete="email"
                    required
                  />
                  <label htmlFor="forgotEmail">
                    <i className="fa-solid fa-envelope" aria-hidden="true" />
                    <span>{t('emailLabel')}</span>
                  </label>
                </div>

                <div className="form-floating">
                  <input
                    type="password"
                    className="form-control"
                    id="forgotNewPassword"
                    placeholder=" "
                    autoComplete="new-password"
                    minLength={4}
                    required
                  />
                  <label htmlFor="forgotNewPassword">
                    <i className="fa-solid fa-key" aria-hidden="true" />
                    <span>{t('newPasswordLabel')}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-login btn-reset"
                >
                  <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
                  <span>{t('updatePasswordBtn')}</span>
                </button>

                <div className="register-text">
                  <span>{t('rememberPassword')} </span>
                  <a href="#login" onClick={backToLogin}>
                    {t('loginBtn')}
                  </a>
                </div>
              </form>
            </section>
          )}

          {activeView === 'register' && (
            <section className="form-section" key="register">
              <h2 className="form-title">{t('joinUs')}</h2>

              <form onSubmit={handleRegistration}>
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control"
                    id="regName"
                    placeholder=" "
                    autoComplete="name"
                    required
                  />
                  <label htmlFor="regName">
                    <i className="fa-solid fa-user" aria-hidden="true" />
                    <span>{t('fullNameLabel')}</span>
                  </label>
                </div>

                <div className="form-floating">
                  <input
                    type="email"
                    className="form-control"
                    id="regEmail"
                    placeholder=" "
                    autoComplete="email"
                    required
                  />
                  <label htmlFor="regEmail">
                    <i className="fa-solid fa-envelope" aria-hidden="true" />
                    <span>{t('emailLabel')}</span>
                  </label>
                </div>

                <div className="form-floating">
                  <input
                    type="password"
                    className="form-control"
                    id="regPassword"
                    placeholder=" "
                    autoComplete="new-password"
                    minLength={4}
                    required
                  />
                  <label htmlFor="regPassword">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                    <span>{t('passwordLabel')}</span>
                  </label>
                </div>

                <button type="submit" className="btn-login btn-register">
                  <i className="fa-solid fa-user-plus" aria-hidden="true" />
                  <span>{t('registerBtn')}</span>
                </button>

                <div className="register-text">
                  <span>{t('alreadyHaveAccount')} </span>
                  <a href="#login" onClick={backToLogin}>
                    {t('loginBtn')}
                  </a>
                </div>
              </form>
            </section>
          )}

          {activeView === 'login' && activeRole === 'employee' && (
            <section className="form-section" key="employee-login">
              <h2 className="form-title">{t('opsCenter')}</h2>

              <form onSubmit={handleStaffLogin}>
                <div className="form-floating">
<input
  type="email"
  className="form-control"
  id="empEmail"
  placeholder=" "
  autoComplete="username"
  value={staffEmail}
  onChange={(event) => setStaffEmail(event.target.value)}
  required
/>
                  <label htmlFor="empEmail">
                    <i className="fa-solid fa-id-badge" aria-hidden="true" />
                    <span>{t('emailLabel')}</span>
                  </label>
                </div>

                <div className="form-floating">
                  <input
                    type="password"
                    className="form-control"
                    id="empPassword"
                    placeholder=" "
                    autoComplete="current-password"
                    value={staffPassword}
                    onChange={(event) => setStaffPassword(event.target.value)}
                    required
                  />
                  <label htmlFor="empPassword">
                    <i className="fa-solid fa-key" aria-hidden="true" />
                    <span>{t('systemPasswordLabel')}</span>
                  </label>
                </div>

                <div className="forgot-link-row">
                  <a href="#it-support" className="forgot-link" onClick={handleITSupport}>
                    {t('itSupportLink')}
                  </a>
                </div>

<button
  type="submit"
  className="btn-login btn-employee"
  disabled={isSubmitting}
>
  <i className="fa-solid fa-user-shield" aria-hidden="true" />
  <span>
    {isSubmitting
      ? (language === 'tr' ? 'Bağlanıyor...' : 'Connecting...')
      : t('connectSystemBtn')}
  </span>
</button>

                <div className="employee-warning">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  <span>{t('unauthorizedWarning')}</span>
                </div>
              </form>
            </section>
          )}
        </section>
      </main>

      {toast && (
        <div
          className={`skyops-toast ${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <i
            className={`fa-solid ${
              toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'
            }`}
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default LoginPage
import React, { useState, useEffect, useRef } from 'react';
import LogoSVG from './LogoSVG';
import {
  User,
  Mail,
  AtSign,
  Droplets,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  Check,
  Search,
  ChevronRight,
  FlameKindling,
  Truck,
  FileSpreadsheet,
  Zap,
  HelpCircle,
  Phone,
  Send,
  UserCheck,
  ShieldCheck,
  Activity,
  FileText,
  Globe,
  Award,
  TrendingUp,
  Link2,
  ExternalLink,
  Sliders,
  RefreshCw,
  Gauge,
  Radio,
  Power,
  Layers,
  X
} from 'lucide-react';
import { WaterGridCanvas, BubblesCanvas, RaindropsCanvas } from './CanvasBackgrounds';
import LanguagePicker from './LanguagePicker';

// Lazy loaded components for optimized registration flow
const RegistrationWizard = React.lazy(() => import('./RegistrationWizard'));
const CommunityAdminVerifyView = React.lazy(() => import('./VerificationViews').then(m => ({ default: m.CommunityAdminVerifyView })));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-6 w-full min-h-[160px]">
    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const API_BASE_URL = typeof window !== 'undefined' ? `http://${window.location.hostname}:8080` : 'http://localhost:8080';

// Smooth Count-Up Animated Number Component
const CountUpNumber = ({ target, decimals = 0, suffix = '', duration = 2200 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing outExpo function for ultra-smooth decelerating count
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(easeProgress * target);
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [target, duration]);

  return (
    <span>
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export default function AuthView({ setToken, message, showMessage, darkMode, toggleDarkMode, lang = 'en', setLang }) {
  const [view, setView] = useState('login'); // 'login' (default), 'register', 'admin_verify'
  const [authModalOpen, setAuthModalOpen] = useState(false); // Auth popup modal visibility
  const [landingNav, setLandingNav] = useState('home'); // 'home' | 'features' | 'about' | 'contact'
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [formData, setFormData] = useState({
    name: '', email: '', username: '', password: '',
    role: 'ROLE_COMMUNITY_ADMIN', gender: '', mobileNo: '+91 ',
    colonyId: '', buildingId: ''
  });
  const [loading, setLoading] = useState(false);
  const [waterFill, setWaterFill] = useState(55);
  const [bgAnimation, setBgAnimation] = useState('bubbles');
  const [showPassword, setShowPassword] = useState(false);

  // Interactive Telemetry Showcase Card State
  const [telemetryTab, setTelemetryTab] = useState('telemetry'); // 'telemetry' | 'leak_scan' | 'billing'
  const [liveFlowRate, setLiveFlowRate] = useState(42.4);
  const [isScanningLeak, setIsScanningLeak] = useState(false);
  const [leakScanMessage, setLeakScanMessage] = useState(null);
  const [valveState, setValveState] = useState('OPEN');
  const [simulatedUsageKl, setSimulatedUsageKl] = useState(14.5);

  // Live telemetry flow rate fluctuation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveFlowRate(prev => {
        const delta = (Math.random() - 0.5) * 1.4;
        return Math.max(34.0, Math.min(52.0, parseFloat((prev + delta).toFixed(1))));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRunLeakDiagnostic = () => {
    setIsScanningLeak(true);
    setLeakScanMessage('Sweeping 148 ultrasonic pressure sensors...');
    setTimeout(() => {
      setLeakScanMessage('Checking Main Riser Differentials...');
    }, 1000);
    setTimeout(() => {
      setIsScanningLeak(false);
      setLeakScanMessage('✅ DIAGNOSTIC PASSED: 0 Leaks. Pressure nominal.');
    }, 2400);
  };

  // Colony/Building cascading dropdown state
  const [colonies, setColonies] = useState([]);
  const [availableBuildings, setAvailableBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  // Real-time username availability state
  const [usernameStatus, setUsernameStatus] = useState(null); // null | {available, message}
  const usernameCheckTimer = useRef(null);

  // Fetch colonies when register view loads
  useEffect(() => {
    if (view === 'register') {
      fetch(`${API_BASE_URL}/api/auth/colonies`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setColonies(data))
        .catch(() => setColonies([]));
    }
  }, [view]);

  // Fetch available buildings when colony changes
  useEffect(() => {
    if (formData.colonyId && formData.role === 'ROLE_COMMUNITY_ADMIN') {
      setLoadingBuildings(true);
      setFormData(prev => ({ ...prev, buildingId: '' }));
      setAvailableBuildings([]);
      fetch(`${API_BASE_URL}/api/auth/colonies/${formData.colonyId}/available-buildings`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { setAvailableBuildings(data); setLoadingBuildings(false); })
        .catch(() => { setAvailableBuildings([]); setLoadingBuildings(false); });
    } else {
      setAvailableBuildings([]);
    }
  }, [formData.colonyId, formData.role]);

  // Debounced username availability check
  const handleUsernameChange = (val) => {
    setFormData(prev => ({ ...prev, username: val }));
    setUsernameStatus(null);
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    if (val.length < 3) return;
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-username?username=${encodeURIComponent(val)}`);
        const data = await res.json();
        setUsernameStatus({ available: data.available === true, message: data.message });
      } catch { setUsernameStatus(null); }
    }, 500);
  };

  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      tick += 0.04;
      // Oscillate smoothly between 42% and 78%
      const value = Math.round(60 + Math.sin(tick) * 18);
      setWaterFill(value);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';
    let bodyPayload;
    if (view === 'login') {
      // Send as 'email' field (backend accepts email OR username via the same field)
      bodyPayload = { email: formData.email, password: formData.password };
    } else {
      bodyPayload = {
        name: formData.name,
        email: formData.email,
        username: formData.username || formData.email?.split('@')[0],
        password: formData.password,
        role: formData.role,
        gender: formData.gender,
        mobileNo: formData.mobileNo,
        ...(formData.colonyId ? { colonyId: parseInt(formData.colonyId) } : {}),
        ...(formData.buildingId && formData.buildingId !== 'CUSTOM' ? { buildingId: parseInt(formData.buildingId) } : {}),
        ...(formData.buildingId === 'CUSTOM' && formData.customBuildingName ? { customBuildingName: formData.customBuildingName } : {}),
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (response.ok) {
        if (view === 'login') {
          const data = await response.json();
          localStorage.setItem('jwt_token', data.token);
          setToken(data.token);
          showMessage('success', 'Successfully authenticated!');
        } else {
          const data = await response.json().catch(() => null);
          const targetUserId = data?.userId || data?.user?.id || formData.username || formData.email;
          if (formData.role === 'ROLE_COMMUNITY_ADMIN') {
            setAdminVerifyUserId(targetUserId);
            setView('admin_verify');
            showMessage('success', 'Registration submitted! Please upload your identity verification documents to finish onboarding.');
          } else {
            showMessage('success', 'Registration completed successfully! Please sign in.');
            setView('login');
          }
        }
      } else {
        let errorText = await response.text();
        try {
          const parsed = JSON.parse(errorText);
          if (parsed && typeof parsed === 'object') {
            if (parsed.message) errorText = parsed.message;
            else if (typeof parsed === 'object') {
              errorText = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
          }
        } catch {}
        showMessage('error', errorText || 'Registration failed.');
      }
    } catch (err) {
      showMessage('error', 'Could not establish connection to the Spring Boot REST server.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'admin_verify') {
    return <CommunityAdminVerifyView userId={adminVerifyUserId || formData.username || 'pending'} showMessage={showMessage} onComplete={() => setView('login')} darkMode={darkMode} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0edfb] via-[#b8d4f4] to-[#91b9e6] dark:from-[#030712] dark:via-[#09152a] dark:to-[#020617] flex flex-col justify-between relative overflow-x-hidden overflow-y-auto font-jakarta text-slate-900 dark:text-slate-100 select-none">

      {/* Shared Animation Keyframes */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
        }
        @keyframes pillGlowPulse {
          0%, 100% {
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.4), 0 0 20px rgba(16, 185, 129, 0.25);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 24px rgba(56, 189, 248, 0.75), 0 0 35px rgba(16, 185, 129, 0.5);
            transform: scale(1.03);
          }
        }
        .pill-glow-pulse {
          animation: pillGlowPulse 2.8s ease-in-out infinite;
        }
        @keyframes sideGlowPulse {
          0%, 100% {
            box-shadow: 0 0 25px rgba(56, 189, 248, 0.22), -12px 0 35px rgba(14, 165, 233, 0.2), 12px 0 35px rgba(6, 182, 212, 0.2);
          }
          50% {
            box-shadow: 0 0 45px rgba(56, 189, 248, 0.42), -18px 0 45px rgba(14, 165, 233, 0.32), 18px 0 45px rgba(6, 182, 212, 0.32);
          }
        }
        .card-side-glow {
          animation: sideGlowPulse 4s ease-in-out infinite;
        }
        .card-3d-tilt {
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .card-3d-tilt:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 50px -12px rgba(14, 165, 233, 0.25);
        }
        .hero-3d-float {
          animation: float3D 7s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        @keyframes aquaticMorphGlow {
          0% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
            border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
          }
          33% {
            transform: translate(35px, -30px) scale(1.08) rotate(120deg);
            border-radius: 65% 35% 30% 70% / 70% 30% 70% 30%;
          }
          66% {
            transform: translate(-25px, 25px) scale(0.95) rotate(240deg);
            border-radius: 30% 70% 55% 45% / 35% 65% 35% 65%;
          }
          100% {
            transform: translate(0px, 0px) scale(1) rotate(360deg);
            border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
          }
        }
        @keyframes waveLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveRight {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        .liquid-blob {
          position: absolute;
          animation: aquaticMorphGlow 22s ease-in-out infinite;
          pointer-events: none;
          filter: blur(65px);
        }
        .blob-blue { 
          width: 540px; 
          height: 540px; 
          background: radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(14, 165, 233, 0.2) 100%); 
        }
        .blob-cyan { 
          width: 600px; 
          height: 600px; 
          background: radial-gradient(circle, rgba(6, 182, 212, 0.45) 0%, rgba(56, 189, 248, 0.2) 100%); 
        }
        .blob-indigo { 
          width: 480px; 
          height: 480px; 
          background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(79, 70, 229, 0.15) 100%); 
        }
        .blob-indigo { 
          width: 480px; 
          height: 480px; 
          background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(79, 70, 229, 0.15) 100%); 
        }
        @keyframes waterParticleDrift {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0.7);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          85% {
            opacity: 0.95;
          }
          100% {
            transform: translate(140px, -240px) rotate(60deg) scale(1.35);
            opacity: 0;
          }
        }
        .water-particle {
          position: absolute;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.9), rgba(6, 182, 212, 0.75), rgba(56, 189, 248, 0.95));
          border-radius: 50% 50% 50% 0;
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.75), 0 0 30px rgba(14, 165, 233, 0.45);
          animation: waterParticleDrift 18s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.6));
        }
        .dark .water-particle {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(6, 182, 212, 0.65), rgba(14, 165, 233, 0.85));
          box-shadow: 0 0 22px rgba(56, 189, 248, 0.6), 0 0 35px rgba(6, 182, 212, 0.35);
        }
      `}</style>

      {/* Dynamic Background Canvas Overlay - Active in Light Theme Only */}
      {!darkMode && bgAnimation === 'grid' && <WaterGridCanvas />}
      {!darkMode && bgAnimation === 'bubbles' && <BubblesCanvas />}
      {!darkMode && bgAnimation === 'rain' && <RaindropsCanvas />}

      {/* Dynamic Animated Fluid Aquatic Background Blobs */}
      <div className="liquid-blob blob-blue top-[3%] left-[-6%] opacity-85 dark:opacity-40"></div>
      <div className="liquid-blob blob-cyan bottom-[8%] right-[-6%] opacity-85 dark:opacity-40"></div>
      <div className="liquid-blob blob-indigo top-[28%] left-[28%] opacity-70 dark:opacity-30"></div>

      {/* Enhanced Slow & High-Intensity Drifting Water Particles */}
      <div className="water-particle" style={{ width: 18, height: 18, top: '20%', left: '8%', animationDelay: '0s', animationDuration: '16s' }}></div>
      <div className="water-particle" style={{ width: 24, height: 24, top: '60%', left: '22%', animationDelay: '3s', animationDuration: '20s' }}></div>
      <div className="water-particle" style={{ width: 14, height: 14, top: '35%', left: '55%', animationDelay: '7s', animationDuration: '15s' }}></div>
      <div className="water-particle" style={{ width: 22, height: 22, top: '75%', left: '68%', animationDelay: '2s', animationDuration: '18s' }}></div>
      <div className="water-particle" style={{ width: 26, height: 26, top: '12%', left: '78%', animationDelay: '5s', animationDuration: '22s' }}></div>
      <div className="water-particle" style={{ width: 16, height: 16, top: '82%', left: '38%', animationDelay: '9s', animationDuration: '17s' }}></div>
      <div className="water-particle" style={{ width: 20, height: 20, top: '48%', left: '12%', animationDelay: '11s', animationDuration: '19s' }}></div>
      <div className="water-particle" style={{ width: 15, height: 15, top: '28%', left: '90%', animationDelay: '4s', animationDuration: '16s' }}></div>
      <div className="water-particle" style={{ width: 22, height: 22, top: '90%', left: '85%', animationDelay: '13s', animationDuration: '21s' }}></div>

      {/* SHARED COMMON HEADER ACROSS ALL PAGES WITH GLASSMORPHISM */}
      <header className="w-full bg-white/75 dark:bg-slate-900/80 border-b border-sky-200/70 dark:border-blue-500/20 px-3 sm:px-10 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-2 z-20 shadow-sm dark:shadow-xl backdrop-blur-lg relative shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            onClick={() => setLandingNav('home')}
            className="w-9 h-9 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(56,189,248,0.5)] shrink-0 cursor-pointer flex items-center justify-center bg-white dark:bg-slate-950 p-0.5 transition-all duration-300 hover:scale-110 hover:rotate-3"
          >
            <LogoSVG className="w-full h-full" />
          </div>
          <div
            onClick={() => setLandingNav('home')}
            className="flex items-center gap-1 sm:gap-2 cursor-pointer notranslate select-none transition-all duration-300 hover:opacity-90"
            translate="no"
          >
            <span className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-slate-100 uppercase font-jakarta notranslate drop-shadow-sm" translate="no">AQUA</span>
            <span className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 dark:from-cyan-400 dark:via-sky-400 dark:to-blue-400 bg-clip-text text-transparent uppercase font-jakarta notranslate drop-shadow" translate="no">TRACK</span>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex items-center gap-2 sm:gap-4 md:gap-6 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest font-bold font-jakarta flex-wrap justify-between sm:justify-end w-full sm:w-auto">
          {/* Main Page Links + Theme Toggle (Whole Row Expanded on Mobile) */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1 sm:gap-3 flex-nowrap shrink-0 py-0.5 max-w-full">
            <button
              type="button"
              onClick={() => setLandingNav('home')}
              className={`flex-1 sm:flex-initial text-center transition cursor-pointer px-2 sm:px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${landingNav === 'home' ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/15 border border-cyan-500/40 shadow-sm' : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'}`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setLandingNav('features')}
              className={`flex-1 sm:flex-initial text-center transition cursor-pointer px-2 sm:px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${landingNav === 'features' ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/15 border border-cyan-500/40 shadow-sm' : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'}`}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => setLandingNav('about')}
              className={`flex-1 sm:flex-initial text-center transition cursor-pointer px-2 sm:px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${landingNav === 'about' ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/15 border border-cyan-500/40 shadow-sm' : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'}`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setLandingNav('contact')}
              className={`flex-1 sm:flex-initial text-center transition cursor-pointer px-2 sm:px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${landingNav === 'contact' ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/15 border border-cyan-500/40 shadow-sm' : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'}`}
            >
              Contact
            </button>

            {/* Theme Toggle Button (Icon Only) */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-full bg-slate-100/90 dark:bg-slate-800/80 border-none outline-none text-slate-800 dark:text-slate-200 transition-all duration-300 hover:scale-110 cursor-pointer flex items-center justify-center shrink-0"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun size={18} className="text-amber-400" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                    fill="#1e3a8a"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 6.5C9.5 5.5 11 5 12 5.2c-2 1-3.5 3-3.5 5.8 0 2 .8 3.8 2 5-2-1-3.5-3-3.5-5.5 0-1.5.4-3 1-4z"
                    fill="#93c5fd"
                    opacity="0.5"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Language, Log In & Sign Up Controls (Right Shifted & Single Row) */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap whitespace-nowrap">
            {setLang && (
              <LanguagePicker
                currentLang={lang}
                onSelectLanguage={(langCode) => {
                  document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
                  document.cookie = `googtrans=/en/${langCode}; path=/`;
                  setLang(langCode);
                  localStorage.setItem('aquatrack_lang', langCode);
                  const selectElem = document.querySelector('.goog-te-combo');
                  if (selectElem) {
                    selectElem.value = langCode;
                    selectElem.dispatchEvent(new Event('change'));
                  } else {
                    window.location.reload();
                  }
                }}
              />
            )}

            <button
              type="button"
              onClick={() => { setView('login'); setAuthModalOpen(true); }}
              className="px-2.5 sm:px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition duration-200 cursor-pointer shrink-0"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setView('register'); setAuthModalOpen(true); }}
              className="px-2.5 sm:px-4.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 transition duration-200 cursor-pointer shrink-0"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </header>

      {/* DYNAMIC CONTENT AREA BASED ON LANDING NAV */}
      <main className="w-full flex-1 flex flex-col items-center justify-center p-3 sm:p-5 lg:p-6 z-10">

        {/* --- 1. HOME / LANDING PAGE VIEW --- */}
        {landingNav === 'home' && (
          <div className="w-full max-w-6xl space-y-2 py-0 my-auto">

            {/* Top First Viewport Hero Area */}
            <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8 min-h-0 lg:min-h-[calc(100vh-80px)] py-2 sm:py-4 lg:py-0">

              {/* Left Hero Water Conservation Section */}
              <div className="w-full lg:w-1/2 space-y-2 text-center lg:text-left flex flex-col justify-center py-0">

                {/* Top Badge with Harmonized Sky Contrast & Pulse Glow */}
                <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 rounded-full bg-white/90 dark:bg-cyan-500/15 border-2 border-cyan-400/60 dark:border-cyan-400/40 text-sky-950 dark:text-cyan-200 text-[10px] sm:text-[11px] font-black tracking-wide backdrop-blur-md shadow-md self-center lg:self-start pill-glow-pulse">
                  <Sparkles size={13} className="text-cyan-600 dark:text-cyan-400 animate-pulse shrink-0" />
                  <span>Smart Sub-Metering & Telemetry Engine</span>
                </div>

                {/* Dynamic Short & Powerful Refined Heading with Enhanced Light Mode Contrast */}
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-slate-950 dark:text-slate-100 drop-shadow-sm">
                  Smart Water Management & <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 dark:from-cyan-400 dark:via-sky-400 dark:to-blue-400 bg-clip-text text-transparent drop-shadow">
                    Billing Platform
                  </span>
                </h1>

                {/* SVG Animated Illustration & Slogan Centered Directly Below Title */}
                <div className="flex flex-col justify-center items-center pt-0 hero-3d-float space-y-1">
                  <img
                    src="/Girl watering plants animation.svg"
                    alt="Girl watering plants animation"
                    className="w-full max-w-xs sm:max-w-md lg:max-w-2xl max-h-36 sm:max-h-60 lg:max-h-[400px] object-contain drop-shadow-2xl transition-all duration-300"
                  />
                  {/* SAVE WATER, SAVE EARTH Slogan directly below SVG */}
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-center">
                    <Droplets size={18} className="text-cyan-600 dark:text-cyan-400 shrink-0 animate-bounce" />
                    <span className="text-xs sm:text-base lg:text-xl font-black tracking-wider text-emerald-800 dark:text-emerald-400 uppercase drop-shadow">
                      SAVE WATER, SAVE EARTH
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Side Theme-Compatible Telemetry Showcase Card */}
              <div className="w-full lg:w-[480px] shrink-0 self-center my-auto">
                <div className="relative rounded-3xl bg-white/90 dark:bg-slate-900/90 border-2 border-sky-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-2xl shadow-sky-950/10 dark:shadow-cyan-900/20 backdrop-blur-xl transition-all duration-300 space-y-4 hover:border-cyan-400 dark:hover:border-cyan-500/80">
                  
                  {/* Card Header & Live Status */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 shadow-md">
                        <Activity size={20} className="animate-pulse" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 uppercase tracking-wide">
                          Live Telemetry Console
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Real-time Sub-metering & Diagnostic Engine</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      ONLINE
                    </span>
                  </div>

                  {/* Interactive Sub-Metering View Switcher Tabs (2 Compatible Options) */}
                  <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTelemetryTab('telemetry')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${telemetryTab === 'telemetry' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                      <Gauge size={14} />
                      <span>Telemetry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTelemetryTab('leak_scan')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${telemetryTab === 'leak_scan' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                      <ShieldCheck size={14} />
                      <span>Leak Scan</span>
                    </button>
                  </div>

                  {/* TAB 1: LIVE TELEMETRY & TANK CAPACITY */}
                  {telemetryTab === 'telemetry' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      {/* Interactive Reservoir Level Control Slider */}
                      <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span className="flex items-center gap-2">
                            <Droplets size={15} className="text-cyan-600 dark:text-cyan-400 animate-pulse" />
                            <span>Overhead Reservoir Level</span>
                          </span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-black text-sm font-mono">{waterFill}% Reserve</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700 relative">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300 shadow-sm"
                            style={{ width: `${waterFill}%` }}
                          />
                        </div>
                        {/* Interactive Drag Control */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Test Reservoir Capacity:</span>
                          <input
                            type="range" min="10" max="100"
                            value={waterFill}
                            onChange={(e) => setWaterFill(parseInt(e.target.value))}
                            className="w-36 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                          />
                        </div>
                      </div>

                      {/* 4 Detailed Metric Badges */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 hover:border-cyan-500/40 transition">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span>Main Flow Velocity</span>
                            <Radio size={12} className="text-cyan-600 dark:text-cyan-400 animate-ping" />
                          </div>
                          <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                            {liveFlowRate} <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 font-sans">L/min</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 hover:border-cyan-500/40 transition">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span>Riser Pressure</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                          <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                            4.2 <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-sans">Bar (Nominal)</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 hover:border-cyan-500/40 transition">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span>Active IoT Nodes</span>
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          </div>
                          <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                            148 <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">Flats Synced</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 hover:border-cyan-500/40 transition">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span>System Efficiency</span>
                            <TrendingUp size={12} className="text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            99.4% <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">Zero Loss</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: AI LEAK DIAGNOSTICS & REMOTE VALVE ISOLATION */}
                  {telemetryTab === 'leak_scan' && (
                    <div className="space-y-3.5 animate-fade-in text-left">
                      {/* Diagnostic Status Box */}
                      <div className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-cyan-400">
                            <Activity size={15} className={isScanningLeak ? "animate-spin text-amber-400" : ""} />
                            Acoustic Pressure Sweep
                          </span>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            24/7 Monitoring
                          </span>
                        </div>

                        {leakScanMessage ? (
                          <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs font-mono text-cyan-300 leading-relaxed shadow-inner">
                            {leakScanMessage}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Continuous acoustic sensor sweep analyzing pipe vibration signatures for micro-cracks and pressure differentials.
                          </p>
                        )}

                        <button
                          type="button"
                          disabled={isScanningLeak}
                          onClick={handleRunLeakDiagnostic}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition duration-200 shadow-lg shadow-cyan-600/25 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} className={isScanningLeak ? "animate-spin" : ""} />
                          <span>{isScanningLeak ? 'Sweeping Pipe Sensors...' : 'Run Acoustic Diagnostic'}</span>
                        </button>
                      </div>

                      {/* Remote Valve Isolation Control */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${valveState === 'OPEN' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'}`}>
                            <Power size={18} />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900 dark:text-slate-100">Emergency Motorized Valve</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Status: <span className={valveState === 'OPEN' ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-600 dark:text-rose-400 font-black'}>{valveState}</span></div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setValveState(prev => prev === 'OPEN' ? 'SHUT' : 'OPEN')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition cursor-pointer ${valveState === 'OPEN' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'}`}
                        >
                          {valveState === 'OPEN' ? 'Isolate Main' : 'Open Valve'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* Seamless Continuation: Telemetry & Platform Capabilities Section */}
            <div className="pt-8 border-t border-slate-300/40 dark:border-slate-800/60 space-y-10 text-center">

              {/* Header Title */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-emerald-500/15 border-2 border-emerald-400/60 dark:border-emerald-400/40 text-emerald-950 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md pill-glow-pulse">
                  <Droplets size={14} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  Empowering Smart Communities
                </div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-slate-100 drop-shadow-sm">
                  Platform Telemetry & <span className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Enterprise Capabilities</span>
                </h3>
                <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto font-medium">
                  Comprehensive IoT pipe telemetry, automated flat-wise sub-billing, instant leak suppression, and AI-driven conservation insights.
                </p>
              </div>

              {/* Key Telemetry Stats Grid with Animated Count-Up Numbers & Enhanced UI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-center max-w-4xl mx-auto">

                {/* Card 1: Water Savings */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-cyan-500/15 via-white/80 to-white/95 dark:from-cyan-950/40 dark:via-slate-900/85 dark:to-slate-900/95 border-t-4 border-t-cyan-500 border-x border-b border-sky-300/80 dark:border-slate-800 shadow-xl backdrop-blur-xl group card-3d-tilt relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-115 transition-transform">
                      <TrendingUp size={18} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-black uppercase">
                      +3.4% YoY
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-400 font-extrabold uppercase tracking-wider text-left">Avg Water Savings</p>
                  <p className="text-4xl font-black text-cyan-600 dark:text-cyan-400 mt-1 text-left tracking-tight">
                    <CountUpNumber target={22.5} decimals={1} suffix="%" duration={2200} />
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1.5 text-left leading-tight">Reduced bill costs across gated societies</p>
                </div>

                {/* Card 2: Meter Uptime */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-500/15 via-white/80 to-white/95 dark:from-emerald-950/40 dark:via-slate-900/85 dark:to-slate-900/95 border-t-4 border-t-emerald-500 border-x border-b border-sky-300/80 dark:border-slate-800 shadow-xl backdrop-blur-xl group card-3d-tilt relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-115 transition-transform">
                      <Activity size={18} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                      Ultrasonic SLA
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-400 font-extrabold uppercase tracking-wider text-left">Meter Uptime & Precision</p>
                  <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1 text-left tracking-tight">
                    <CountUpNumber target={99.8} decimals={1} suffix="%" duration={2400} />
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1.5 text-left leading-tight">Real-time ultrasonic flow sensing</p>
                </div>

                {/* Card 3: Active Apartment Units */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-500/15 via-white/80 to-white/95 dark:from-blue-950/40 dark:via-slate-900/85 dark:to-slate-900/95 border-t-4 border-t-blue-500 border-x border-b border-sky-300/80 dark:border-slate-800 shadow-xl backdrop-blur-xl group card-3d-tilt relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-115 transition-transform">
                      <Building2 size={18} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase">
                      24/7 Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-400 font-extrabold uppercase tracking-wider text-left">Active Apartment Units</p>
                  <p className="text-4xl font-black text-blue-600 dark:text-blue-400 mt-1 text-left tracking-tight">
                    <CountUpNumber target={3.2} decimals={1} suffix="k+" duration={2000} />
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1.5 text-left leading-tight">Monitored 24/7 with zero manual effort</p>
                </div>

              </div>

              {/* Core Capabilities / Value Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 text-left">
                <div className="p-5 rounded-2xl bg-white/75 dark:bg-slate-900/85 border-l-4 border-l-cyan-500 border-y border-r border-sky-200/80 dark:border-slate-800 shadow-lg backdrop-blur-xl group card-3d-tilt">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ShieldAlert size={20} />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-950 dark:text-slate-100">Leak Protection</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                    Automatic abnormal flow anomaly detection & instant SMS/push notifications before major burst damage occurs.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/75 dark:bg-slate-900/85 border-l-4 border-l-emerald-500 border-y border-r border-sky-200/80 dark:border-slate-800 shadow-lg backdrop-blur-xl group card-3d-tilt">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Activity size={20} />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-950 dark:text-slate-100">Sub-Metering Telemetry</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                    Fair flat-wise water allocation telemetry, eliminating fixed split costs for low-consumption residents.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/75 dark:bg-slate-900/85 border-l-4 border-l-blue-500 border-y border-r border-sky-200/80 dark:border-slate-800 shadow-lg backdrop-blur-xl group card-3d-tilt">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileText size={20} />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-950 dark:text-slate-100">Automated Invoicing</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                    Monthly billing automation with detailed breakdown PDFs, online payment integration, and payment history.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/75 dark:bg-slate-900/85 border-l-4 border-l-amber-500 border-y border-r border-sky-200/80 dark:border-slate-800 shadow-lg backdrop-blur-xl group card-3d-tilt">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-950 dark:text-slate-100">AquaBot AI Helper</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                    Interactive AI companion for instant usage queries, smart bill forecasts, conservation tips, and ticket tracking.
                  </p>
                </div>
              </div>

              {/* Enterprise Security Badges Strip */}
              <div className="pt-6 border-t border-sky-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-bold text-slate-700 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-cyan-600 dark:text-cyan-400" />
                  <span>ISO 27001 Certified Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>24/7 Pipe Telemetry Monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-amber-600 dark:text-amber-400" />
                  <span>99.9% System Uptime SLA</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- 2. FEATURES VIEW --- */}
        {landingNav === 'features' && (
          <div className="w-full max-w-5xl space-y-8 py-6">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Platform Capabilities</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl mx-auto">
                End-to-end water telemetry platform engineered specifically for Indian housing societies and gated communities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-blue-500/20 shadow-xl backdrop-blur-md space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
                  <Droplets size={24} />
                </div>
                <h3 className="text-lg font-bold">IoT Sub-metering</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ultrasound digital water meters attached per flat measure precise consumption with zero moving mechanical parts.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-blue-500/20 shadow-xl backdrop-blur-md space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                  <Truck size={24} />
                </div>
                <h3 className="text-lg font-bold">Water Tanker Telemetry</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Log inbound private tanker deliveries, vendor receipts, capacity validation, and cost breakdown per building.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-blue-500/20 shadow-xl backdrop-blur-md space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className="text-lg font-bold">Automated Tariff Billing</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Generate monthly PDF invoices automatically based on tiered slab rates, fixed maintenance fees, and due dates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. ABOUT VIEW --- */}
        {landingNav === 'about' && (
          <div className="w-full max-w-4xl space-y-6 py-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black">About AquaTrack</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-2xl mx-auto">
              AquaTrack was founded to solve urban water scarcity by empowering gated communities with fair, usage-based water allocation and transparent sub-metering.
            </p>
          </div>
        )}

        {/* --- 4. CONTACT VIEW --- */}
        {landingNav === 'contact' && (
          <div className="w-full max-w-3xl py-6 space-y-6">
            {/* Developer Contact Quick Links Header Card */}
            <div className="rounded-3xl bg-white/95 dark:bg-slate-900 border-2 border-sky-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-black uppercase tracking-wider">
                  <Sparkles size={14} /> Developer & Platform Support
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-100">Get In Touch</h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-medium max-w-lg mx-auto">
                  Connect with the lead developer or reach out for enterprise inquiries and support.
                </p>
              </div>

              {/* Developer Links 2x2 Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">

                {/* Email */}
                <a
                  href="mailto:rahulamp2003@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-slate-900 border border-cyan-200 dark:border-slate-800 hover:border-cyan-400 transition-all flex items-center gap-3.5 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Mail size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-cyan-700 dark:text-cyan-400 tracking-wider">Email Support</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">rahulamp2003@gmail.com</p>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-slate-400 group-hover:text-cyan-500 shrink-0" />
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com/rahulkr-2004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-400 transition-all flex items-center gap-3.5 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.107-.776.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z" /></svg>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">GitHub Profile</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">github.com/rahulkr-2004</p>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-slate-400 group-hover:text-slate-600 shrink-0" />
                </a>

                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/rahulkr2004/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-slate-900 border border-blue-200 dark:border-slate-800 hover:border-blue-400 transition-all flex items-center gap-3.5 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0077B5] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 tracking-wider">LinkedIn Profile</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">linkedin.com/in/rahulkr2004</p>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-slate-400 group-hover:text-blue-500 shrink-0" />
                </a>

                {/* Portfolio */}
                <a
                  href="https://rahulkr-2004.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-slate-900 border border-emerald-200 dark:border-slate-800 hover:border-emerald-400 transition-all flex items-center gap-3.5 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Globe size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Developer Portfolio</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">rahulkr-2004.netlify.app</p>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-slate-400 group-hover:text-emerald-500 shrink-0" />
                </a>

              </div>

              {/* Message Contact Form */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-3 text-center tracking-tight">Or Send a Direct Message</h3>
                <form onSubmit={e => { e.preventDefault(); showMessage('success', 'Thank you! Your message has been sent successfully.'); setContactForm({ name: '', email: '', phone: '', message: '' }); }} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text" required placeholder="Your Name"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors shadow-sm"
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    />
                    <input
                      type="email" required placeholder="Your Email"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors shadow-sm"
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                  <textarea
                    rows={4} required placeholder="Your message..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors shadow-sm resize-none"
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                  />
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-sm transition shadow-lg cursor-pointer flex items-center justify-center gap-2 tracking-wide"
                  >
                    <Send size={15} /> Send Message
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ENHANCED RICH MULTI-COLUMN FOOTER WITH TRANSLUCENT GLASSMORPHISM */}
      <footer className="w-full bg-white/45 dark:bg-slate-950/80 backdrop-blur-xl border-t border-sky-300/50 dark:border-slate-800 py-10 px-6 mt-auto z-10 relative shrink-0 shadow-lg shadow-sky-950/5">
        <div className="max-w-6xl mx-auto space-y-8 font-jakarta">

          {/* Main 4-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">

            {/* Column 1: Brand & Mission */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500/60 shadow-sm bg-slate-900 p-0.5 flex items-center justify-center shrink-0">
                  <LogoSVG className="w-full h-full" />
                </div>
                <span className="font-black text-lg tracking-tight text-slate-950 dark:text-slate-100 uppercase font-brand">
                  AQUA<span className="text-cyan-600 dark:text-cyan-400">TRACK</span>
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-400 text-[11px] leading-relaxed font-semibold">
                Smart Water Management & Billing Platform for modern residential communities and commercial complexes.
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                All Telemetry Nodes Active
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-200">Platform Navigation</h4>
              <ul className="space-y-2 text-[11px] font-bold text-slate-700 dark:text-slate-400">
                <li>
                  <button onClick={() => setLandingNav('home')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-cyan-600 dark:text-cyan-400" /> Home Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => setLandingNav('features')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-cyan-600 dark:text-cyan-400" /> Key Features
                  </button>
                </li>
                <li>
                  <button onClick={() => setLandingNav('about')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-cyan-600 dark:text-cyan-400" /> About Platform
                  </button>
                </li>
                <li>
                  <button onClick={() => setLandingNav('contact')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-cyan-600 dark:text-cyan-400" /> Support & Contact
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact & Support */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-200">Contact & Support</h4>
              <div className="space-y-2 text-[11px] text-slate-700 dark:text-slate-400 font-bold">
                <a
                  href="mailto:rahulamp2003@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
                >
                  <Mail size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>rahulamp2003@gmail.com</span>
                </a>
                <a
                  href="https://github.com/rahulkr-2004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-cyan-600 dark:text-cyan-400 shrink-0"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.107-.776.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z" /></svg>
                  <span>github.com/rahulkr-2004</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/rahulkr2004/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-cyan-600 dark:text-cyan-400 shrink-0"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  <span>linkedin.com/in/rahulkr2004</span>
                </a>
                <a
                  href="https://rahulkr-2004.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
                >
                  <Globe size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>rahulkr-2004.netlify.app</span>
                </a>
              </div>
            </div>

            {/* Column 4: Newsletter Subscription */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-200">Stay Updated</h4>
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">
                Subscribe for smart telemetry updates.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); showMessage('Subscribed to newsletter successfully!'); }} className="flex items-center gap-1.5">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 bg-slate-100/90 dark:bg-slate-900 border-2 border-sky-200/80 dark:border-slate-800 rounded-xl text-[11px] text-slate-950 dark:text-slate-100 placeholder:text-slate-500 font-semibold focus:outline-none focus:border-cyan-600"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white font-black rounded-xl text-[11px] transition shadow-md shrink-0 cursor-pointer"
                >
                  Join
                </button>
              </form>
            </div>

          </div>

          {/* Bottom Divider Bar */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <div>
              © {new Date().getFullYear()} AquaTrack Systems. All rights reserved.
            </div>
            <div className="flex items-center gap-4 font-bold">
              <span className="hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer">Security SLA</span>
            </div>
          </div>

        </div>
      </footer>

      {/* DYNAMIC POPUP AUTH MODAL (EVERYWHERE ACROSS ALL DEVICES) */}
      {authModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border-2 border-cyan-500/50 dark:border-cyan-500/40 my-auto max-h-[85vh] flex flex-col z-[10000]">

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer hover:scale-110 z-10"
              title="Close modal"
              aria-label="Close auth modal"
            >
              <X size={18} />
            </button>

            {/* Modal Header & Logo */}
            <div className="text-center mb-4 shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-500/70 shadow-[0_0_20px_rgba(56,189,248,0.35)] mx-auto mb-2 flex items-center justify-center bg-white dark:bg-slate-950 p-1">
                <LogoSVG className="w-full h-full" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-100 tracking-tight">
                {view === 'login' ? 'Sign In to AquaTrack' : 'Create an Account'}
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {view === 'login' ? 'Access your smart society water portal' : 'Join AquaTrack smart sub-metering platform'}
              </p>

              {/* Toggle Mode Tabs */}
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-1 mt-3">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${view === 'login' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${view === 'register' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Modal Body - Internal Scroll Container */}
            <div className="flex-1 overflow-y-auto pr-1">
              {view === 'register' ? (
                <React.Suspense fallback={<ComponentLoader />}>
                  <RegistrationWizard
                    showMessage={showMessage}
                    onSwitchToLogin={() => setView('login')}
                    darkMode={darkMode}
                  />
                </React.Suspense>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="w-full relative flex items-center bg-white dark:bg-slate-950 rounded-2xl px-4 py-3 border-2 border-slate-300 dark:border-slate-700 hover:border-cyan-500 focus-within:border-cyan-600 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-200 shadow-sm group">
                    <Mail className="text-slate-500 group-hover:text-cyan-500 shrink-0 mr-3 transition" size={18} />
                    <input
                      type="text" required placeholder="Username or Email"
                      className="w-full bg-transparent border-none text-slate-900 dark:text-slate-100 text-sm font-semibold tracking-normal placeholder:text-slate-400 focus:outline-none antialiased"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="w-full relative flex items-center bg-white dark:bg-slate-950 rounded-2xl px-4 py-3 border-2 border-slate-300 dark:border-slate-700 hover:border-cyan-500 focus-within:border-cyan-600 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-200 shadow-sm group">
                    <Lock className="text-slate-500 group-hover:text-cyan-500 shrink-0 mr-3 transition" size={18} />
                    <input
                      type={showPassword ? "text" : "password"} required placeholder="Password"
                      className="w-full bg-transparent border-none text-slate-900 dark:text-slate-100 text-sm font-semibold tracking-normal placeholder:text-slate-400 pr-7 focus:outline-none antialiased"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-cyan-500 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-lg shadow-cyan-600/25 hover:shadow-xl hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 mt-1"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Authenticating...
                      </span>
                    ) : (
                      <span>LOG IN TO PORTAL</span>
                    )}
                  </button>

                  <div className="text-center pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setView('register')}
                      className="text-xs font-semibold text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
                    >
                      Don't have an account? <span className="text-cyan-600 dark:text-cyan-400 font-black hover:underline">Sign up now</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

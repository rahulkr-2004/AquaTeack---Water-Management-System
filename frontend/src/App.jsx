import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Droplets, 
  Upload, 
  Plus, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  User, 
  FileSpreadsheet, 
  LayoutDashboard, 
  Settings, 
  UserCheck, 
  Activity, 
  Building2, 
  Home, 
  ToggleLeft, 
  ToggleRight, 
  Mail, 
  ShieldAlert,
  Loader2,
  Edit3,
  List,
  DollarSign,
  FlameKindling,
  Truck,
  FileText,
  Bell,
  BarChart3,
  Globe,
  HelpCircle,
  Crown,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  UploadCloud,
  Camera,
  UserPlus,
  X,
  Check,
  Info,
  RefreshCw,
  MapPin,
  LifeBuoy,
  Download,
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  Zap,
  Search,
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { translations } from './translations';
import LanguagePicker, { ALL_LANGUAGES } from './components/LanguagePicker';
import { WaterGridCanvas, BubblesCanvas, RaindropsCanvas } from './components/CanvasBackgrounds';
import { InviteVerificationView, CommunityAdminVerifyView } from './components/VerificationViews';
import AuthView from './components/AuthView';
import { FormattedMarkdown, AquaBotChatWindow, ResidentChatbotTab, AquaBotFloatingWidget } from './components/AquaBot';
import InvoiceModal from './components/InvoiceModal';

const API_BASE_URL = 'http://localhost:8080';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch (e) {
    return null;
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Core Datasets
  const [apartments, setApartments] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [users, setUsers] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [bills, setBills] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('aq-theme') === 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('aquatrack_lang') || 'en');

  // Initialize Google Translate Script
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);

      window.googleTranslateElementInit = () => {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false
            },
            'google_translate_element'
          );
        }
      };
    }
  }, []);

  const toggleLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('aquatrack_lang', newLang);

    // Trigger Google Translate engine for full-page live translation
    try {
      if (newLang === 'en') {
        // Reset translation to original English
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
      } else {
        // Set Google Translate target language cookie
        document.cookie = `googtrans=/en/${newLang}; path=/;`;
        document.cookie = `googtrans=/en/${newLang}; domain=${window.location.hostname}; path=/;`;
      }

      const selectElem = document.querySelector('.goog-te-combo');
      if (selectElem) {
        selectElem.value = newLang === 'en' ? '' : newLang;
        selectElem.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.warn("Language switcher trigger:", err);
    }
  };

  const t = (key, params = {}) => {
    let text = translations[lang]?.[key] || translations['en']?.[key] || key;
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  };
  useEffect(() => {
    document.title = "AquaTrack - Smart Water Manager";
  }, []);

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      if (decoded) {
        setUserRole(decoded.roles);
      }
      fetchProfile();
      fetchDashboardData();
    } else {
      setUserRole(null);
      setProfile(null);
    }
  }, [token]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('aq-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    setUserRole(null);
    setProfile(null);
    setActiveTab('dashboard');
    showMessage('success', 'Logged out successfully.');
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        if (data.role) {
          setUserRole(data.role);
        }
      }
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const decoded = parseJwt(token);
      const isManager = decoded && (decoded.roles === 'ROLE_ADMIN' || decoded.roles === 'ROLE_COMMUNITY_ADMIN');

      
      // Fetch alerts count globally
      const alertsRes = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlertsCount(data.filter(a => !a.resolved).length);
      }

      // Fetch logs for table/charts
      const logsRes = await fetch(`${API_BASE_URL}/api/usage/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setUsageLogs(logsData);
      }

      // Fetch bills
      const billsRes = await fetch(`${API_BASE_URL}/api/billing/bills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setBills(billsData);
      }

      // Fetch onboard files if manager (Admin or Community Admin)
      if (isManager) {
        const aptRes = await fetch(`${API_BASE_URL}/api/admin/apartments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (aptRes.ok) {
          const aptData = await aptRes.json();
          setApartments(aptData);
        }

        const hhRes = await fetch(`${API_BASE_URL}/api/admin/households`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (hhRes.ok) {
          const hhData = await hhRes.json();
          setHouseholds(hhData);
        }

        const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        const pendingRes = await fetch(`${API_BASE_URL}/api/admin/pending-approvals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingUsers(pendingData);
        }
      }
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    const urlParams = new URLSearchParams(window.location.search);
    let inviteToken = urlParams.get('token');
    if (!inviteToken && window.location.pathname.startsWith('/invite/')) {
      inviteToken = window.location.pathname.replace('/invite/', '').trim();
    }
    
    const toastNode = message.text && (
      <div className="fixed top-5 right-5 z-[9999] animate-fade-in-up">
        <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-2xl text-xs backdrop-blur-md max-w-sm ${
          message.type === 'error' 
            ? 'bg-rose-950/95 border-rose-500/30 text-rose-200' 
            : message.type === 'info' 
              ? 'bg-blue-950/95 border-blue-500/30 text-blue-200'
              : 'bg-emerald-950/95 border-emerald-500/30 text-emerald-200'
        }`}>
          {message.type === 'error' ? (
            <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
          ) : message.type === 'info' ? (
            <Info size={18} className="text-blue-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          )}
          <span className="font-bold flex-1">{message.text}</span>
          <button 
            onClick={() => setMessage({ type: '', text: '' })} 
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded-lg hover:bg-slate-850/40 transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );

    if (window.location.pathname.startsWith('/invite') || inviteToken) {
      return (
        <>
          <InviteVerificationView inviteToken={inviteToken} showMessage={showMessage} darkMode={darkMode} toggleDarkMode={() => setDarkMode(prev => !prev)} />
          {toastNode}
        </>
      );
    }
    return (
      <>
        <AuthView setToken={setToken} message={message} showMessage={showMessage} darkMode={darkMode} toggleDarkMode={() => setDarkMode(prev => !prev)} lang={lang} setLang={setLang} />
        <AquaBotFloatingWidget isLanding={true} lang={lang} t={t} />
        {toastNode}
      </>
    );
  }

  const activeRole = profile?.role || userRole;
  const isSuperAdmin = activeRole === 'ROLE_ADMIN' || activeRole === 'ADMIN';
  const isCommunityAdmin = activeRole === 'ROLE_COMMUNITY_ADMIN' || activeRole === 'COMMUNITY_ADMIN';
  const isManager = isSuperAdmin || isCommunityAdmin;

  // Define sidebar items based on roles — all labels use t() for multi-lingual support
  let sidebarItems = isManager
    ? [
        { id: 'dashboard', label: t('nav_dashboard'), icon: <LayoutDashboard size={18} /> },
        ...(isSuperAdmin ? [{ id: 'colony_management', label: t('nav_colony'), icon: <Building2 size={18} /> }] : []),
        { id: 'households', label: t('nav_households'), icon: <Home size={18} /> },
        { id: 'residents', label: t('nav_residents'), icon: <UserCheck size={18} /> },
        { id: 'water_usage', label: t('nav_water_usage'), icon: <Activity size={18} /> },
        { id: 'meter_readings', label: t('nav_meter_readings'), icon: <List size={18} /> },
        { id: 'billing', label: t('nav_billing'), icon: <DollarSign size={18} /> },
        { id: 'tariff_plans', label: t('nav_tariff_plans'), icon: <FlameKindling size={18} /> },
        { id: 'water_purchase', label: t('nav_water_purchase'), icon: <Truck size={18} /> },
        { id: 'invoices', label: t('nav_invoices'), icon: <FileText size={18} /> },
        { id: 'alerts', label: t('nav_alerts'), icon: <Bell size={18} />, badge: alertsCount },
        { id: 'reports', label: t('nav_reports'), icon: <BarChart3 size={18} /> },
        { id: 'support', label: t('nav_support'), icon: <LifeBuoy size={18} />, badge: openTicketsCount },
        { id: 'profile', label: t('nav_profile'), icon: <User size={18} /> }
      ]
    : [
        { id: 'dashboard', label: t('nav_dashboard'), icon: <LayoutDashboard size={18} /> },
        { id: 'my_usage', label: t('nav_my_usage'), icon: <Activity size={18} /> },
        { id: 'usage_history', label: t('nav_usage_history'), icon: <List size={18} /> },
        { id: 'my_bills', label: t('nav_my_bills'), icon: <DollarSign size={18} /> },
        { id: 'my_invoices', label: t('nav_my_invoices'), icon: <FileText size={18} /> },
        { id: 'notifications', label: t('nav_notifications'), icon: <Bell size={18} />, badge: alertsCount },
        { id: 'water_tips', label: t('nav_water_tips'), icon: <HelpCircle size={18} /> },
        { id: 'support', label: t('nav_support'), icon: <LifeBuoy size={18} />, badge: openTicketsCount },
        { id: 'chatbot', label: t('nav_aquabot'), icon: <Bot size={18} /> },
        { id: 'profile', label: t('nav_profile'), icon: <User size={18} /> }
      ];

  if (isSuperAdmin) {
    sidebarItems = sidebarItems.filter(item => item.id !== 'water_usage' && item.id !== 'households');
  }

  // Role Badge Styling classes
  const getBadgeStyle = () => {
    if (isSuperAdmin) {
      return darkMode
        ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-md shadow-amber-500/5"
        : "bg-amber-100 border-amber-300 text-amber-800 shadow-sm";
    }
    if (isCommunityAdmin) {
      return darkMode
        ? "bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-md shadow-blue-500/5"
        : "bg-blue-100 border-blue-300 text-blue-800 shadow-sm";
    }
    return darkMode
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-emerald-100 border-emerald-300 text-emerald-800";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Hidden Google Translate mount element */}
      <div id="google_translate_element" className="hidden"></div>

      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center z-10 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-500/10">
            <Droplets size={22} className="animate-pulse" />
          </div>
          <div className="notranslate" translate="no">
            <h1 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-0.5" translate="no">
              Aqua<span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent font-black">Track</span>
              {isSuperAdmin && <Crown size={16} className="text-amber-400 animate-bounce ml-0.5" />}
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {isSuperAdmin ? t('portal_superadmin') : isCommunityAdmin ? t('portal_admin') : t('portal_resident')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {profile && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-400">{t('dash_welcome')}</span>
              <span className={`font-bold ${isSuperAdmin ? 'text-amber-400' : 'text-blue-400'}`}>{profile.name}</span>
            </div>
          )}
          {/* Searchable Browser Language Switcher with Indian & Global Languages */}
          <LanguagePicker
            currentLang={lang}
            onSelectLanguage={(langCode) => {
              // Set Google Translate cookie
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

          <button 
            onClick={() => { fetchDashboardData(); fetchProfile(); }}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 hover:text-slate-100 font-semibold"
          >
            {t('btn_refresh')}
          </button>
          <button
            onClick={() => setDarkMode(prev => !prev)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 hover:text-slate-100"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <span className={`border px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getBadgeStyle()}`}>
            {isSuperAdmin ? t('role_super_admin') : isCommunityAdmin ? t('role_community_admin') : t('role_resident')}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Menu */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 shadow-sm">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">{t('nav_menu')}</p>
            <nav className="space-y-1">
              {sidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'alerts' || item.id === 'notifications') {
                      setAlertsCount(0);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition duration-150 text-xs font-semibold cursor-pointer ${activeTab === item.id ? (isSuperAdmin ? 'bg-amber-600 text-white shadow-md shadow-amber-600/15' : 'bg-blue-600 text-white shadow-md' ) : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-150 text-xs font-semibold"
            >
              <LogOut size={18} />
              {t('nav_logout')}
            </button>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950 space-y-6">


          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-500 mb-3" size={28} />
              <span className="text-slate-400 text-xs font-medium">{lang === 'hi' ? 'डेटा लोड हो रहा है...' : 'Fetching details...'}</span>
            </div>
          ) : (
            <div>
              {/* Tab Switching */}
              {activeTab === 'dashboard' && (
                isManager 
                  ? <AdminDashboard usageLogs={usageLogs} bills={bills} apartments={apartments} households={households} users={users} isSuperAdmin={isSuperAdmin} token={token} fetchDashboardData={fetchDashboardData} lang={lang} t={t} />
                  : <ResidentDashboard usageLogs={usageLogs} bills={bills} profile={profile} token={token} fetchDashboardData={fetchDashboardData} lang={lang} t={t} />
              )}

              {/* Colony Management Tab — Super Admin only */}
              {activeTab === 'colony_management' && isSuperAdmin && (
                <ColonyManagementTab
                  token={token}
                  showMessage={showMessage}
                  fetchDashboardData={fetchDashboardData}
                  lang={lang} t={t}
                />
              )}

              {/* Households Tab */}
              {activeTab === 'households' && isManager && (
                <HouseholdsTab 
                  token={token} 
                  apartments={apartments} 
                  households={households} 
                  users={users}
                  showMessage={showMessage} 
                  fetchDashboardData={fetchDashboardData} 
                  isSuperAdmin={isSuperAdmin}
                  profile={profile}
                  lang={lang} t={t}
                />
              )}

              {/* Residents Tab */}
              {activeTab === 'residents' && isManager && (
                <ResidentsTab 
                  token={token} 
                  users={users} 
                  households={households} 
                  apartments={apartments}
                  showMessage={showMessage} 
                  fetchDashboardData={fetchDashboardData} 
                  isSuperAdmin={isSuperAdmin}
                  userRole={userRole}
                  pendingUsers={pendingUsers}
                  darkMode={darkMode}
                  profile={profile}
                  lang={lang} t={t}
                />
              )}

              {/* Water Usage / My Usage Tab */}
              {(activeTab === 'water_usage' || activeTab === 'my_usage') && (
                <WaterUsageTab 
                  token={token} 
                  households={households} 
                  isAdmin={isManager} 
                  profile={profile} 
                  showMessage={showMessage} 
                  fetchDashboardData={fetchDashboardData} 
                  usageLogs={usageLogs}
                  users={users}
                  lang={lang} t={t}
                />
              )}

              {/* Meter Readings / Usage History Tab */}
              {(activeTab === 'meter_readings' || activeTab === 'usage_history') && (
                <MeterReadingsTab 
                  usageLogs={usageLogs} 
                  households={households} 
                  apartments={apartments} 
                  profile={profile}
                  isAdmin={isManager}
                  setActiveTab={setActiveTab}
                  lang={lang} t={t} 
                />
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <ProfileTab 
                  token={token} 
                  profile={profile} 
                  fetchProfile={fetchProfile} 
                  fetchDashboardData={fetchDashboardData}
                  onResetSuccess={handleLogout}
                  showMessage={showMessage} 
                  isSuperAdmin={isSuperAdmin}
                  lang={lang} t={t}
                />
              )}

              {/* Support Tab */}
              {activeTab === 'support' && (
                <SupportTab 
                  token={token} 
                  profile={profile}
                  showMessage={showMessage} 
                  isSuperAdmin={isSuperAdmin}
                  isCommunityAdmin={isCommunityAdmin}
                  onTicketCountChange={setOpenTicketsCount}
                  lang={lang} t={t}
                />
              )}

              {/* Tariffs Tab */}
              {activeTab === 'tariff_plans' && isManager && (
                <TariffPlansTab 
                  token={token} 
                  apartments={apartments} 
                  showMessage={showMessage} 
                  isSuperAdmin={isSuperAdmin}
                  profile={profile}
                  lang={lang} t={t}
                />
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && isManager && (
                <BillingTab 
                  token={token} 
                  apartments={apartments}
                  users={users}
                  showMessage={showMessage} 
                  isSuperAdmin={isSuperAdmin}
                  profile={profile}
                  lang={lang} t={t}
                />
              )}

              {/* Water Purchase Tab */}
              {activeTab === 'water_purchase' && isManager && (
                <WaterPurchaseTab 
                  token={token} 
                  apartments={apartments} 
                  showMessage={showMessage}
                  isSuperAdmin={isSuperAdmin}
                  profile={profile}
                  lang={lang} t={t}
                />
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && isManager && (
                <InvoicesTab 
                  token={token} 
                  showMessage={showMessage}
                  lang={lang} t={t}
                />
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && isManager && (
                <AlertsTab 
                  token={token} 
                  households={households} 
                  showMessage={showMessage} 
                  isAdmin={true}
                  fetchDashboardData={fetchDashboardData}
                  lang={lang} t={t}
                />
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && isManager && (
                <ReportsTab token={token} lang={lang} t={t} />
              )}

              {/* My Bills Tab */}
              {activeTab === 'my_bills' && !isManager && (
                <MyBillsTab 
                  token={token} 
                  showMessage={showMessage}
                  lang={lang} t={t}
                />
              )}

              {/* My Invoices Tab */}
              {activeTab === 'my_invoices' && !isManager && (
                <MyInvoicesTab 
                  token={token} 
                  showMessage={showMessage}
                  lang={lang} t={t}
                />
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && !isManager && (
                <AlertsTab 
                  token={token} 
                  households={[]} 
                  showMessage={showMessage} 
                  isAdmin={false}
                  fetchDashboardData={fetchDashboardData}
                  lang={lang} t={t}
                />
              )}

              {/* Water Tips Tab */}
              {activeTab === 'water_tips' && !isManager && (
                <WaterTipsTab lang={lang} t={t} />
              )}

              {/* AquaBot Assistant Tab */}
              {activeTab === 'chatbot' && !isManager && (
                <ResidentChatbotTab
                  profile={profile}
                  usageLogs={usageLogs}
                  bills={bills}
                  token={token}
                  setActiveTab={setActiveTab}
                  lang={lang}
                  t={t}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating AquaBot Widget for All Dashboards */}
      {activeTab !== 'chatbot' && (
        <AquaBotFloatingWidget
          profile={profile}
          usageLogs={usageLogs}
          bills={bills}
          apartments={apartments}
          households={households}
          users={users}
          token={token}
          setActiveTab={setActiveTab}
          lang={lang}
          t={t}
        />
      )}

      {message.text && (
        <div className="fixed top-5 right-5 z-[9999] animate-fade-in-up">
          <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-2xl text-xs backdrop-blur-md max-w-sm ${
            message.type === 'error' 
              ? 'bg-rose-950/95 border-rose-500/30 text-rose-200' 
              : message.type === 'info' 
                ? 'bg-blue-950/95 border-blue-500/30 text-blue-200'
                : 'bg-emerald-950/95 border-emerald-500/30 text-emerald-200'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
            ) : message.type === 'info' ? (
              <Info size={18} className="text-blue-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            )}
            <span className="font-bold flex-1">{message.text}</span>
            <button 
              onClick={() => setMessage({ type: '', text: '' })} 
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded-lg hover:bg-slate-850/40 transition"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 1. ADMIN DASHBOARD VIEW
// -------------------------------------------------------------
function AdminDashboard({ usageLogs, apartments, households, users, isSuperAdmin, token, fetchDashboardData, lang, t }) {
  const [localLogs, setLocalLogs] = useState(usageLogs || []);
  const [localAlerts, setLocalAlerts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [expandedAdmins, setExpandedAdmins] = useState({});
  const [blockChartData, setBlockChartData] = useState([]);
  const [blockChartLoading, setBlockChartLoading] = useState(false);

  // Sync with parent data
  useEffect(() => { setLocalLogs(usageLogs || []); }, [usageLogs]);

  // Fetch block-wise consumption from backend
  const fetchBlockConsumption = async () => {
    setBlockChartLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/block-consumption`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBlockChartData(data);
      }
    } catch (_) {}
    finally { setBlockChartLoading(false); }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLocalAlerts(await res.json());
    } catch (_) {}
  };

  // Real-time polling every 60 seconds (silent background refresh without full page loader flicker)
  useEffect(() => {
    fetchAlerts();
    fetchBlockConsumption();
    const interval = setInterval(() => {
      fetchAlerts();
      fetchBlockConsumption();
      setLastUpdated(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const communityAdmins = (users || []).filter(u => u.role === 'ROLE_COMMUNITY_ADMIN');
  const householdUsers = (users || []).filter(u => u.role === 'ROLE_USER');
  const totalWaterUsed = Math.round(localLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0));

  // Today's usage (with timezone fix)
  const getLocalDateString = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d - tzOffset)).toISOString().split('T')[0];
  };
  const today = getLocalDateString();
  const todayUsage = Math.round(localLogs
    .filter(l => l.date && l.date.startsWith(today))
    .reduce((s, l) => s + (l.consumptionLiters || 0), 0));

  // Helper to map a log's household to its managing Community Admin
  const getAdminForHousehold = (logHousehold) => {
    if (!logHousehold) return 'Unassigned';
    const household = (households || []).find(h => h.id === logHousehold.id) || logHousehold;
    if (!household || !household.apartment) return 'Unassigned';

    const admin = communityAdmins.find(a => {
      if (!a.managedApartment || a.managedApartment.id !== household.apartment.id) {
        return false;
      }
      if (a.managedBuilding) {
        return household.block && household.block.trim().toLowerCase() === a.managedBuilding.name.trim().toLowerCase();
      }
      return true;
    });
    return admin ? admin.name : 'Unassigned';
  };

  // Build block chart labels (still used by block chart)
  const now = new Date();
  const currentMonthLabel = now.toLocaleString('default', { month: 'short', year: 'numeric' });
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthLabel = prevMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });

  // Build original chart data — admin-wise (super admin) or 14-day daily (community admin)
  let chartData = [];
  let maxVal = 10;
  if (isSuperAdmin) {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const adminMonthlyUsage = {};
    communityAdmins.forEach(admin => { adminMonthlyUsage[admin.name] = 0; });
    adminMonthlyUsage['Unassigned'] = 0;
    localLogs.forEach(log => {
      if (log.date && log.date.startsWith(currentMonthPrefix)) {
        const adminName = getAdminForHousehold(log.household);
        adminMonthlyUsage[adminName] = (adminMonthlyUsage[adminName] || 0) + (log.consumptionLiters || 0);
      }
    });
    for (const [name, val] of Object.entries(adminMonthlyUsage)) {
      chartData.push({ label: name, value: Math.round(val) });
    }
    maxVal = Math.max(...chartData.map(d => d.value), 10);
  } else {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });
    const dailyMap = {};
    localLogs.forEach(l => { if (l.date) dailyMap[l.date] = (dailyMap[l.date] || 0) + (l.consumptionLiters || 0); });
    chartData = last14Days.map(date => ({
      label: date.substring(5).replace('-', '/'),
      value: Math.round(dailyMap[date] || 0)
    }));
    maxVal = Math.max(...chartData.map(d => d.value), 10);
  }

  // Grouped by admin (for super admin)
  const groupedByAdmin = {};
  
  // Initialize with all community admins so they always show up
  communityAdmins.forEach(admin => {
    groupedByAdmin[admin.id] = {
      adminName: admin.name,
      adminEmail: admin.email,
      managedApartment: admin.managedApartment,
      users: []
    };
  });
  
  // Also add Unassigned Residents key
  groupedByAdmin[0] = {
    adminName: 'Unassigned Residents',
    adminEmail: '',
    managedApartment: null,
    users: []
  };

  // Group household users
  householdUsers.forEach(u => {
    const key = u.managedByAdmin ? u.managedByAdmin.id : 0;
    if (!groupedByAdmin[key]) {
      groupedByAdmin[key] = {
        adminName: u.managedByAdmin ? u.managedByAdmin.name : 'Unassigned Residents',
        adminEmail: u.managedByAdmin ? u.managedByAdmin.email : '',
        managedApartment: u.managedByAdmin ? u.managedByAdmin.managedApartment : null,
        users: []
      };
    }
    groupedByAdmin[key].users.push(u);
  });

  const activeAlerts = localAlerts.filter(a => !a.resolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isSuperAdmin
            ? (lang === 'hi' ? 'सुपर एडमिन डैशबोर्ड' : 'Super Admin Dashboard')
            : (lang === 'hi' ? 'कम्युनिटी एडमिन डैशबोर्ड' : 'Community Admin Dashboard')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-500 font-mono">
            {lang === 'hi' ? 'अपडेट: ' : 'Updated '}{lastUpdated.toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-1.5 text-[9px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse inline-block"></span>
            {lang === 'hi' ? 'लाइव' : 'Live'}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isSuperAdmin && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm dark:shadow-md">
            <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{lang === 'hi' ? 'कम्युनिटी एडमिन' : 'Community Admins'}</p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{communityAdmins.length}</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1">{lang === 'hi' ? 'पंजीकृत प्रबंधक' : 'Registered managers'}</p>
          </div>
        )}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm dark:shadow-md">
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
            {isSuperAdmin ? (lang === 'hi' ? 'सभी निवासी' : 'All Residents') : (lang === 'hi' ? 'मेरे निवासी' : 'My Residents')}
          </p>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">{householdUsers.length}</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1">{lang === 'hi' ? 'सक्रिय घरेलू उपभोक्ता' : 'Active household users'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm dark:shadow-md">
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{lang === 'hi' ? 'कुल उपभोक्ता' : 'Total Users'}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{users?.length || 0}</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1">{lang === 'hi' ? 'पंजीकृत उपभोक्ता' : 'Registered users'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm dark:shadow-md">
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{lang === 'hi' ? 'आज की खपत' : "Today's Usage"}</p>
          <p className="text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-2">{todayUsage} L</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1">{lang === 'hi' ? `कुल: ${totalWaterUsed.toLocaleString()} L (सर्वकालिक)` : `Total: ${totalWaterUsed.toLocaleString()} L all-time`}</p>
        </div>
      </section>

      {/* Block-wise Horizontal Bar Chart — Super Admin Only */}
      {isSuperAdmin && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md dark:shadow-2xl overflow-hidden">
          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="p-6">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  {lang === 'hi' ? 'ब्लॉक-वार जल खपत' : 'Block-wise Water Consumption'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  {lang === 'hi' ? 'रियल-टाइम • वर्तमान माह बनाम पिछला माह' : 'Real-time · Current Month vs Previous Month'}
                </p>
              </div>
              <div className="flex items-center gap-5">
                {/* Legend */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-500 inline-block shadow" />
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-bold">{currentMonthLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-slate-400 dark:bg-slate-500 inline-block shadow" />
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-bold">{prevMonthLabel}</span>
                  </div>
                </div>
                <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-5">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalWaterUsed.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Litres total</p>
                </div>
              </div>
            </div>

            {/* Chart */}
            {blockChartLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-10 h-10">
                    <div className="w-10 h-10 rounded-full border-2 border-blue-200 dark:border-slate-700" />
                    <Loader2 className="animate-spin text-blue-500 absolute inset-0 m-auto" size={20} />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                    {lang === 'hi' ? 'डेटा लोड हो रहा है...' : 'Fetching live data...'}
                  </span>
                </div>
              </div>
            ) : blockChartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <TrendingUp size={28} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-center">
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-bold">
                    {lang === 'hi' ? 'अभी तक कोई डेटा नहीं' : 'No block data yet'}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-medium">
                    {lang === 'hi' ? 'मीटर रीडिंग दर्ज होने पर ग्राफ दिखेगा' : 'Graph appears once meter readings are logged'}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ height: Math.max(220, blockChartData.length * 72) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={blockChartData}
                    margin={{ top: 6, right: 80, left: 12, bottom: 6 }}
                    barCategoryGap="30%"
                    barGap={4}
                  >
                    <defs>
                      <linearGradient id="hGradCurrent" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="hGradPrev" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#475569" stopOpacity={1} />
                        <stop offset="100%" stopColor="#64748b" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      horizontal={false}
                      stroke="#94a3b8"
                      opacity={0.25}
                    />

                    {/* Y-axis — block names */}
                    <YAxis
                      type="category"
                      dataKey="block"
                      width={64}
                      tick={{ fontSize: 13, fontWeight: 800, fill: '#1e293b' }}
                      tickLine={false}
                      axisLine={false}
                    />

                    {/* X-axis — litre values */}
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickMargin={6}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k L` : `${v} L`}
                    />

                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.07)', rx: 6 }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '14px',
                        fontSize: '13px',
                        color: '#f8fafc',
                        boxShadow: '0 25px 50px -10px rgba(0,0,0,0.9)',
                        padding: '12px 16px',
                        minWidth: '170px'
                      }}
                      labelStyle={{ color: '#93c5fd', fontWeight: 800, fontSize: 13, marginBottom: 6 }}
                      formatter={(value, name) => [
                        <span key="v" style={{ fontWeight: 900, color: '#ffffff', fontSize: 15 }}>
                          {value.toLocaleString()} L
                        </span>,
                        <span key="n" style={{ color: name === 'currentMonth' ? '#818cf8' : '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                          {name === 'currentMonth' ? currentMonthLabel : prevMonthLabel}
                        </span>
                      ]}
                      labelFormatter={label => `📍 Block ${label}`}
                    />

                    {/* Previous Month */}
                    <Bar
                      dataKey="prevMonth"
                      name="prevMonth"
                      fill="url(#hGradPrev)"
                      radius={[0, 6, 6, 0]}
                      barSize={22}
                      label={{
                        position: 'right',
                        fontSize: 12,
                        fontWeight: 700,
                        fill: '#64748b',
                        formatter: v => v > 0 ? `${v.toLocaleString()} L` : ''
                      }}
                    />

                    {/* Current Month */}
                    <Bar
                      dataKey="currentMonth"
                      name="currentMonth"
                      fill="url(#hGradCurrent)"
                      radius={[0, 6, 6, 0]}
                      barSize={22}
                      label={{
                        position: 'right',
                        fontSize: 12,
                        fontWeight: 800,
                        fill: '#4f46e5',
                        formatter: v => v > 0 ? `${v.toLocaleString()} L` : ''
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      )}


      {/* Real-time Analytics & Visual Graphs — Community Admin Exclusive */}
      {!isSuperAdmin && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 14-Day Daily Consumption Trend */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  {lang === 'hi' ? '14-दिवसीय खपत प्रवृत्ति' : '14-Day Consumption Trend'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'hi' ? 'दैनिक समाज जल खपत (लीटर)' : 'Daily community water usage (Liters)'}
                </p>
              </div>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase">
                {lang === 'hi' ? 'रियल-टाइम' : 'Real-time'}
              </span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    formatter={(val) => [`${val.toLocaleString()} L`, 'Consumption']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#commGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Flat-wise Consumption Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Activity size={16} className="text-cyan-500" />
                  {lang === 'hi' ? 'फ्लैट-वार खपत वितरण' : 'Flat-wise Usage Distribution'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'hi' ? 'प्रबंधित निवासियों की जल खपत' : 'Water consumed across managed units'}
                </p>
              </div>
              <span className="text-[10px] bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold px-2 py-0.5 rounded-full uppercase">
                {lang === 'hi' ? 'सक्रिय डेटा' : 'Active Units'}
              </span>
            </div>
            <div className="h-56 w-full">
              {householdUsers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  {lang === 'hi' ? 'कोई निवासी पंजीकृत नहीं है' : 'No managed residents logged yet'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={householdUsers.slice(0, 8).map(u => {
                      const uHousehold = households.find(h => h.id === u.household?.id) || u.household;
                      const flatName = uHousehold?.flatNo ? `F-${uHousehold.flatNo}` : u.name.split(' ')[0];
                      const uUsage = Math.round(localLogs
                        .filter(l => l.household?.id === uHousehold?.id)
                        .reduce((sum, l) => sum + (l.consumptionLiters || 0), 0));
                      return { flat: flatName, usage: uUsage };
                    })}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                    <XAxis dataKey="flat" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                      formatter={(val) => [`${val.toLocaleString()} L`, 'Water Used']}
                    />
                    <Bar dataKey="usage" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Apartments + Alerts row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Apartments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">{lang === 'hi' ? 'अपार्टमेंट परिसर' : 'Apartment Complexes'}</h3>
          {apartments.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4 text-center">{lang === 'hi' ? 'अभी तक कोई अपार्टमेंट पंजीकृत नहीं है।' : 'No apartments registered yet.'}</p>
          ) : (
            <div className="space-y-2">
              {apartments.map(a => {
                const aptIdStr = String(a.id);
                // Collect household IDs belonging to this apartment
                const matchingHouseholdIds = new Set(
                  (households || [])
                    .filter(h => {
                      const id = h.apartment?.id || h.apartmentId || (typeof h.apartment === 'number' || typeof h.apartment === 'string' ? h.apartment : null);
                      return String(id) === aptIdStr;
                    })
                    .map(h => h.id)
                );
                (users || []).forEach(u => {
                  if (u.household) {
                    const uAptId = u.household.apartment?.id || u.household.apartmentId || u.managedByAdmin?.managedApartment?.id;
                    if (uAptId && String(uAptId) === aptIdStr && u.household.id) {
                      matchingHouseholdIds.add(u.household.id);
                    }
                  }
                });

                const count = Math.max(
                  matchingHouseholdIds.size,
                  (households || []).filter(h => {
                    const id = h.apartment?.id || h.apartmentId || (typeof h.apartment === 'number' || typeof h.apartment === 'string' ? h.apartment : null);
                    return String(id) === aptIdStr;
                  }).length,
                  (users || []).filter(u => {
                    const uAptId = u.household?.apartment?.id || u.household?.apartmentId || u.managedByAdmin?.managedApartment?.id;
                    return uAptId && String(uAptId) === aptIdStr;
                  }).length
                );

                const waterUsed = Math.round(localLogs
                  .filter(l => {
                    const lAptId = l.household?.apartment?.id || l.household?.apartmentId;
                    if (lAptId && String(lAptId) === aptIdStr) return true;
                    if (l.household?.id && matchingHouseholdIds.has(l.household.id)) return true;
                    return false;
                  })
                  .reduce((s, l) => s + (l.consumptionLiters || 0), 0));
                return (
                  <div key={a.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500/50 transition">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200">{a.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{a.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 text-blue-700 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase block mb-1">
                        {count} {lang === 'hi' ? 'फ्लैट्स' : 'flats'}
                      </span>
                      <span className="text-[9px] text-slate-600 dark:text-slate-500 font-semibold">{waterUsed > 0 ? `${waterUsed.toLocaleString()} L` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase">{lang === 'hi' ? 'सक्रिय अलर्ट' : 'Active Alerts'}</h3>
            {activeAlerts.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeAlerts.length}</span>
            )}
          </div>
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-2xl mb-2">✅</span>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold">{lang === 'hi' ? 'कोई सक्रिय अलर्ट नहीं' : 'No active alerts'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {activeAlerts.map(a => (
                <div key={a.id} className={`p-3 rounded-lg border text-xs ${
                  a.type === 'LEAK' ? 'bg-red-50 dark:bg-slate-800 border-red-200 dark:border-red-500/50' :
                  a.type === 'BILLING' ? 'bg-amber-50 dark:bg-slate-800 border-amber-200 dark:border-amber-500/50' :
                  'bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-blue-500/50'
                }`}>
                  <p className={`font-bold ${a.type === 'LEAK' ? 'text-red-700 dark:text-red-400' : a.type === 'BILLING' ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>
                    {a.title}
                  </p>
                  <p className="text-slate-700 dark:text-slate-400 text-[10px] mt-0.5 line-clamp-2">{a.message}</p>
                  <p className="text-slate-500 dark:text-slate-500 text-[9px] mt-1">{a.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* User hierarchy (super admin only) */}
      {isSuperAdmin && Object.keys(groupedByAdmin).length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Hierarchy Overview</h3>
          <div className="space-y-3">
            {Object.entries(groupedByAdmin)
              .filter(([adminId, group]) => !(adminId === '0' && group.users.length === 0))
              .map(([adminId, group]) => {
                const isOpen = !!expandedAdmins[adminId];
                return (
                  <div key={adminId} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-200">
                    {/* Header */}
                    <div 
                      onClick={() => setExpandedAdmins(prev => ({ ...prev, [adminId]: !prev[adminId] }))}
                      className="flex justify-between items-center cursor-pointer p-4 bg-slate-100/90 dark:bg-slate-950 hover:bg-slate-200/80 dark:hover:bg-slate-900/40 transition select-none"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          adminId === '0' 
                            ? 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400' 
                            : 'bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/25 text-blue-700 dark:text-blue-400'
                        }`}>
                          {adminId === '0' ? 'Unassigned' : 'Community Admin'}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-200">{group.adminName}</span>
                        {group.adminEmail && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-500 font-mono hidden md:inline">{group.adminEmail}</span>
                        )}
                        {adminId !== '0' && (
                          group.managedApartment ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                              <Building2 size={10} /> Managing: {group.managedApartment.name}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 flex items-center gap-1">
                              <ShieldAlert size={10} /> No Apartment Assigned
                            </span>
                          )
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-700 dark:text-slate-400 font-semibold">
                          {group.users.length} {group.users.length === 1 ? 'resident' : 'residents'}
                        </span>
                        {isOpen ? <ChevronDown size={16} className="text-slate-500 dark:text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </div>
                    </div>

                    {/* Expandable Body */}
                    {isOpen && (
                      <div className="border-t border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-4 space-y-2.5">
                        {group.users.length === 0 ? (
                          <div className="text-slate-500 text-xs italic py-3 pl-2">
                            No residents assigned to this admin.
                          </div>
                        ) : (
                          group.users.map(u => (
                            <div key={u.id} className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold uppercase shrink-0 border border-blue-300 dark:border-blue-500/20">
                                {u.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-slate-900 dark:text-slate-200 font-bold text-[13px]">{u.name}</span>
                                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                  <span className="text-slate-600 dark:text-slate-400 font-mono bg-slate-200 dark:bg-slate-950/80 px-1.5 py-0.5 rounded font-semibold">{u.email}</span>
                                  {u.household && (
                                    <span className="text-emerald-700 dark:text-emerald-400/80 font-bold border border-emerald-300 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <Home size={10} /> {u.household.apartment?.name} | Block {u.household.block} | Flat {u.household.flatNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. RESIDENT DASHBOARD VIEW
// -------------------------------------------------------------
// 2. RESIDENT DASHBOARD COMPONENT (Enhanced & Real-time Synced)
// -------------------------------------------------------------
function ResidentDashboard({ usageLogs, bills, profile, token, fetchDashboardData }) {
  const [localLogs, setLocalLogs] = useState(usageLogs || []);
  const [localBills, setLocalBills] = useState(bills || []);
  const [localAlerts, setLocalAlerts] = useState([]);
  const [aptAvg, setAptAvg] = useState(0);
  const [simAvg, setSimAvg] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());

  useEffect(() => { setLocalLogs(usageLogs || []); }, [usageLogs]);
  useEffect(() => { setLocalBills(bills || []); }, [bills]);

  const fetchAveragesAndAlerts = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [resApt, resSim, resAlerts] = await Promise.all([
        fetch(`${API_BASE_URL}/api/usage/apartment-average`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/usage/similar-average`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/alerts`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resApt.ok) {
        const data = await resApt.json();
        setAptAvg(data.average || 0);
      }
      if (resSim.ok) {
        const data = await resSim.json();
        setSimAvg(data.average || 0);
      }
      if (resAlerts.ok) {
        const data = await resAlerts.json();
        setLocalAlerts(data);
      }
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error("Error fetching resident insights", err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAveragesAndAlerts();
    // Silent background sync every 30 seconds without parent loading spinner
    const interval = setInterval(() => {
      fetchAveragesAndAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (fetchDashboardData) await fetchDashboardData();
    await fetchAveragesAndAlerts(true);
    setIsRefreshing(false);
  };

  // Date helper
  const getLocalDateString = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d - tzOffset)).toISOString().split('T')[0];
  };
  const today = getLocalDateString();

  // Metrics Calculations
  const todayLogs = localLogs.filter(l => l.date && l.date.startsWith(today));
  const todayUsage = todayLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0);

  // This Week (last 7 days)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0,0,0,0);
  const weekLogs = localLogs.filter(l => l.date && new Date(l.date) >= weekStart);
  const weekUsage = weekLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0);

  // This Month
  const currentMonthPrefix = today.substring(0, 7);
  const monthLogs = localLogs.filter(l => l.date && l.date.startsWith(currentMonthPrefix));
  const monthUsage = monthLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0);

  // Latest Bill
  const sortedBills = [...localBills].sort((a, b) => b.id - a.id);
  const latestBill = sortedBills[0] || null;

  // Helper to format local date YYYY-MM-DD
  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Monthly 30-Day Trend Chart
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return formatLocalDate(d);
  });
  const dailyMap = {};
  localLogs.forEach(l => {
    if (l.date) {
      dailyMap[l.date] = (dailyMap[l.date] || 0) + (l.consumptionLiters || 0);
    }
  });

  const monthlyChart = last30.map(date => {
    const d = new Date(date + 'T00:00:00');
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date,
      value: Math.round((dailyMap[date] || 0) * 10) / 10
    };
  });

  // Weekly 7-Day Chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return formatLocalDate(d);
  });
  const weeklyChart = last7.map(date => {
    const d = new Date(date + 'T00:00:00');
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      value: Math.round((dailyMap[date] || 0) * 10) / 10
    };
  });

  const activeAlerts = localAlerts.filter(a => !a.resolved);
  const leakAlerts = activeAlerts.filter(a => a.type === 'LEAK');

  // Estimate bill projection strictly adhering to tariff plan:
  // Base: up to 15 kL @ ₹30/kL. Excess: @ ₹60/kL. + 5% tax + ₹5 platform fee.
  const estimatedCost = useMemo(() => {
    const baseRate = 30.0;
    const excessRate = 60.0;
    const baseLimitLiters = 15000;
    let subtotal = 0;
    if (monthUsage <= baseLimitLiters) {
      subtotal = (monthUsage / 1000) * baseRate;
    } else {
      subtotal = (baseLimitLiters / 1000) * baseRate + ((monthUsage - baseLimitLiters) / 1000) * excessRate;
    }
    const tax = subtotal * 0.05;
    const platformFee = 5.0;
    return (subtotal + tax + platformFee).toFixed(2);
  }, [monthUsage]);
  const household = profile?.household;

  return (
    <div className="space-y-6">

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-sky-50/90 dark:from-slate-900 dark:via-indigo-950/60 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Resident Portal
              </span>
              {household?.hasMeter && (
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span> Smart Meter Online
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100">
              Welcome back, {profile?.name || 'Resident'} 👋
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {household ? `${household.apartment?.name || 'Community'} • Block ${household.block} - Flat ${household.flatNumber}` : 'Flat assignment pending'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500">Live Sync Status</p>
              <p className="text-[10px] font-mono text-slate-400">
                Synced at {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Refresh Dashboard"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-cyan-400" : "text-slate-400"} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banner if leak detected */}
      {leakAlerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-pulse">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider">Potential Water Leak Alert Detected!</h4>
            <p className="text-xs text-red-200/80 mt-0.5">{leakAlerts[0].message}</p>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Usage */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Today's Consumption</p>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Droplets size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-400 mt-3 font-mono">{todayUsage.toFixed(1)} <span className="text-sm font-normal text-slate-400">L</span></p>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">{today}</span>
            <span className={todayUsage > (aptAvg || 150) ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {todayUsage > (aptAvg || 150) ? '▲ Above Avg' : '✓ Normal'}
            </span>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">This Week's Usage</p>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-400 mt-3 font-mono">{weekUsage.toFixed(1)} <span className="text-sm font-normal text-slate-400">L</span></p>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Last 7 Days</span>
            <span className="text-blue-300 font-semibold">Avg {(weekUsage / 7).toFixed(0)} L/day</span>
          </div>
        </div>

        {/* Current Month & Est. Cost */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Monthly Consumption</p>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-indigo-300 mt-3 font-mono">{monthUsage.toFixed(1)} <span className="text-sm font-normal text-slate-400">L</span></p>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Est. Usage Cost</span>
            <span className="text-indigo-400 font-bold">~ ₹{estimatedCost}</span>
          </div>
        </div>

        {/* Latest Bill Status */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Latest Bill</p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100 mt-3 font-mono">
            {latestBill ? `₹${latestBill.amount.toFixed(2)}` : '₹0.00'}
          </p>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">{latestBill ? latestBill.billingMonth : 'Current Period'}</span>
            {latestBill ? (
              <span className={`font-bold px-2 py-0.5 rounded ${latestBill.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {latestBill.paid ? '✓ Paid' : '⚠ Pending'}
              </span>
            ) : (
              <span className="text-slate-500">No active bill</span>
            )}
          </div>
        </div>
      </section>

      {/* Main Charts & Benchmarking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 30-Day Usage Trend Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-xs tracking-wider uppercase flex items-center gap-2">
                <Activity className="text-cyan-400" size={16} /> 30-Day Consumption Trend
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Daily recorded water usage in liters</p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg font-bold">
              Total {monthUsage.toFixed(0)} L
            </span>
          </div>

          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValueResident" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val, i) => i % 5 === 0 ? val : ''} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                />
                <Area type="monotone" dataKey="value" name="Liters" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValueResident)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peer Benchmarking & Comparison (1 col) */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-xs tracking-wider uppercase flex items-center gap-2">
              <BarChart3 className="text-emerald-400" size={16} /> Peer Benchmarking
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Compare your flat with community averages</p>

            <div className="h-48 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'My Avg', value: Math.round(localLogs.length ? localLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0) / localLogs.length : 0) },
                  { name: 'Similar Size', value: Math.round(simAvg) },
                  { name: 'Colony Avg', value: Math.round(aptAvg) }
                ]} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={75} />
                  <Tooltip 
                    cursor={{ fill: '#0f172a' }} 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Bar dataKey="value" name="Daily Liters" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-100/90 dark:bg-slate-950/70 p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-xs font-medium">
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span className="font-bold">Your Daily Avg:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {Math.round(localLogs.length ? localLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0) / localLogs.length : 0)} L
              </span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span className="font-bold">Colony Average:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{Math.round(aptAvg)} L</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span className="font-bold">Similar Flat Avg:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{Math.round(simAvg)} L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown & Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Weekly Bar Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="text-blue-400" size={16} /> Weekly Breakdown (Last 7 Days)
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">{weekUsage.toFixed(0)} L total</span>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#0f172a' }} 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="value" name="Liters" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notifications & System Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Bell className="text-amber-400" size={16} /> Notifications & System Alerts
            </h3>
            {activeAlerts.length > 0 && (
              <span className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {activeAlerts.length} Active
              </span>
            )}
          </div>

          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-100/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <CheckCircle className="text-emerald-500 dark:text-emerald-400 mb-2" size={28} />
              <p className="text-slate-900 dark:text-slate-100 text-xs font-bold antialiased">No Active Alerts</p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium mt-1 antialiased">Your water system is functioning normally with no leaks detected.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {activeAlerts.map(a => (
                <div key={a.id} className={`p-3.5 rounded-xl border text-xs ${
                  a.type === 'LEAK' ? 'bg-red-500/10 border-red-500/30 text-red-200' :
                  a.type === 'BILLING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <p className={`font-bold text-xs ${a.type === 'LEAK' ? 'text-red-400' : a.type === 'BILLING' ? 'text-amber-400' : 'text-blue-400'}`}>
                      {a.title}
                    </p>
                    <span className="text-[9px] text-slate-500">{a.date}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}


// -------------------------------------------------------------
// 3. HOUSEHOLDS TAB
// -------------------------------------------------------------
function HouseholdsTab({ token, apartments, households, users, showMessage, fetchDashboardData, isSuperAdmin, profile }) {
  const [aptData, setAptData] = useState({ name: '', address: '' });
  const [hhData, setHhData] = useState({ apartmentId: '', block: '', flatNumber: '', hasMeter: true });
  const [loadingApt, setLoadingApt] = useState(false);
  const [loadingHh, setLoadingHh] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin && profile) {
      setHhData(prev => ({
        ...prev,
        apartmentId: profile.managedApartment ? profile.managedApartment.id.toString() : '',
        block: profile.managedBuilding ? profile.managedBuilding.name : ''
      }));
    }
  }, [isSuperAdmin, profile]);

  const handleAptSubmit = async (e) => {
    e.preventDefault();
    setLoadingApt(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/apartment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aptData)
      });
      if (response.ok) {
        showMessage('success', 'Building added successfully!');
        setAptData({ name: '', address: '' });
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Building registration failed.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    } finally {
      setLoadingApt(false);
    }
  };

  const handleHhSubmit = async (e) => {
    e.preventDefault();
    setLoadingHh(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/household`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...hhData,
          apartmentId: parseInt(hhData.apartmentId)
        })
      });
      if (response.ok) {
        showMessage('success', 'Household registered successfully!');
        setHhData({ apartmentId: '', block: '', flatNumber: '', hasMeter: true });
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Household registration failed.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    } finally {
      setLoadingHh(false);
    }
  };

  const toggleMeterConfig = async (hhId, currentVal) => {
    if (!isSuperAdmin) {
      showMessage('error', 'Access Denied: Only Super Admin can change meter configuration.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/household/${hhId}/meter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ hasMeter: !currentVal })
      });
      if (response.ok) {
        showMessage('success', `Meter configuration toggled ${!currentVal ? 'ON' : 'OFF'}!`);
        fetchDashboardData();
      } else {
        showMessage('error', 'Failed to update meter configuration.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleDeleteHousehold = async (hhId) => {
    if (!window.confirm('Are you sure you want to delete this flat/household configuration?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/household/${hhId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        showMessage('success', 'Unassigned flat configuration deleted successfully.');
        fetchDashboardData();
      } else {
        const txt = await response.text();
        showMessage('error', txt || 'Failed to delete flat.');
      }
    } catch (err) {
      showMessage('error', 'Network failure while deleting flat.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Households Directory</h2>
        {!isSuperAdmin && (
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-400 font-semibold italic border border-slate-200 dark:border-slate-700">
            Read-only view (Super Admin privileges required to modify)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isSuperAdmin && (
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
                <Building2 className="text-amber-500" size={16} /> Step 1: Onboard Apartment Building
              </h3>
              <form onSubmit={handleAptSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Building Name</label>
                  <input
                    type="text" required placeholder="Block A, Sky Heights"
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-semibold"
                    value={aptData.name}
                    onChange={e => setAptData({...aptData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Building Address</label>
                  <input
                    type="text" required placeholder="7th Cross St, Tech Corridor"
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-semibold"
                    value={aptData.address}
                    onChange={e => setAptData({...aptData, address: e.target.value})}
                  />
                </div>
                <button
                  type="submit" disabled={loadingApt}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md shadow-amber-600/10 cursor-pointer"
                >
                  {loadingApt ? 'Saving...' : 'Register Building'}
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col max-h-[300px] shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
                <Building2 className="text-amber-500" size={16} /> Registered Buildings ({apartments.length})
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {apartments.length === 0 ? (
                  <div className="text-slate-500 dark:text-slate-400 text-xs italic py-8 text-center font-medium">No buildings registered yet.</div>
                ) : (
                  apartments.map(apt => (
                    <div key={apt.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-900 dark:text-slate-100 text-xs font-bold">{apt.name}</span>
                        <span className="text-[9px] bg-slate-200 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-mono font-bold">ID: {apt.id}</span>
                      </div>
                      <span className="text-slate-600 dark:text-slate-300 text-[10.5px] font-medium flex items-center gap-1.5 mt-0.5">
                        <MapPin size={11} className="text-amber-500 shrink-0" />
                        {apt.address || 'No address specified'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {!isSuperAdmin && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
              <Home className="text-amber-500" size={16} /> Step 2: Register Flat (Household)
            </h3>
            <form onSubmit={handleHhSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Choose Apartment</label>
                <select
                  required
                  disabled={!isSuperAdmin && !!profile?.managedApartment}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100"
                  value={hhData.apartmentId}
                  onChange={e => setHhData({...hhData, apartmentId: e.target.value})}
                >
                  <option value="">-- Choose Apartment --</option>
                  {apartments.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Block Identifier</label>
                  <input
                    type="text" required placeholder="A, B, C"
                    disabled={!isSuperAdmin && !!profile?.managedBuilding}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    value={hhData.block}
                    onChange={e => setHhData({...hhData, block: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Flat Number</label>
                  <input
                    type="text" required placeholder="101, 202"
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-semibold"
                    value={hhData.flatNumber}
                    onChange={e => setHhData({...hhData, flatNumber: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs text-slate-700 dark:text-slate-400 font-medium">Enable Water Meter Config?</span>
                <button
                  type="button"
                  onClick={() => setHhData({...hhData, hasMeter: !hhData.hasMeter})}
                  className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 transition cursor-pointer"
                >
                  {hhData.hasMeter ? <ToggleRight size={24} className="text-amber-500" /> : <ToggleLeft size={24} className="text-slate-400 dark:text-slate-650" />}
                </button>
              </div>
              <button
                type="submit" disabled={loadingHh}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md shadow-amber-600/10 cursor-pointer"
              >
                {loadingHh ? 'Saving...' : 'Register Flat'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Household configurations Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase mb-4">Household Configurations & Meters</h3>
        <div className="overflow-x-auto">
          {households.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4">No households registered yet.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Apartment</th>
                  <th className="pb-3">Block - Flat</th>
                  <th className="pb-3">Assigned Resident</th>
                  <th className="pb-3 text-center">Meter Active</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                {households.map(h => {
                  const resident = (users || []).find(u => u.household?.id === h.id);
                  return (
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                    <td className="py-3 pl-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold">HH-{h.id}</td>
                    <td className="font-medium">{h.apartment?.name}</td>
                    <td className="font-medium">Block {h.block} - Flat {h.flatNumber}</td>
                    <td>
                      {resident ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-[10px] uppercase font-extrabold">{resident.name.charAt(0)}</span>{resident.name}</span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px] bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">Unassigned</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${h.hasMeter ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-500/20 text-slate-600 dark:text-slate-400'}`}>
                        {h.hasMeter ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="text-right pr-2 space-x-2">
                      {isSuperAdmin && (
                        <button
                          onClick={() => toggleMeterConfig(h.id, h.hasMeter)}
                          className={`text-[9px] px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${h.hasMeter ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'}`}
                        >
                          {h.hasMeter ? 'Disable Meter' : 'Enable Meter'}
                        </button>
                      )}
                      {!resident && (
                        <button
                          onClick={() => handleDeleteHousehold(h.id)}
                          className="text-[9px] px-2.5 py-1.5 rounded-lg border font-semibold transition bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 cursor-pointer"
                        >
                          Delete Flat
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. RESIDENTS TAB
// -------------------------------------------------------------
function ResidentsTab({ token, users, households, apartments = [], showMessage, fetchDashboardData, isSuperAdmin, userRole, pendingUsers = [], darkMode, profile }) {
  const [assignData, setAssignData] = useState({ userId: '', householdId: '' });
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({ name: '', email: '', password: '', role: 'ROLE_USER' });
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', apartmentId: '', block: '', flatNumber: '' });
  const [loadingInvite, setLoadingInvite] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', householdId: '' });

  const [viewingDocs, setViewingDocs] = useState(null);

  const isCommunityAdmin = userRole === 'ROLE_COMMUNITY_ADMIN';

  // Automatically pre-fill and disable colony/apartment and block/building for Community Admins
  useEffect(() => {
    if (showInviteForm && isCommunityAdmin && profile) {
      setInviteData(prev => ({
        ...prev,
        apartmentId: profile.managedApartment ? String(profile.managedApartment.id) : (profile.household?.apartment ? String(profile.household.apartment.id) : ''),
        block: profile.managedBuilding ? profile.managedBuilding.name : (profile.household?.block ? profile.household.block : '')
      }));
    }
  }, [showInviteForm, isCommunityAdmin, profile]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setLoadingAssign(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-resident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: parseInt(assignData.userId),
          householdId: assignData.householdId ? parseInt(assignData.householdId) : null
        })
      });
      if (response.ok) {
        showMessage('success', 'Resident assignment updated successfully!');
        setAssignData({ userId: '', householdId: '' });
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Assignment failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    } finally {
      setLoadingAssign(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/approve-user/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        showMessage('success', 'User registration approved successfully!');
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Approval failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm("Are you sure you want to reject and delete this registration?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reject-user/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        showMessage('success', 'User registration rejected and removed.');
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Rejection failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleRequestReupload = async (userId) => {
    const reason = window.prompt("Optional: Enter reason for document rejection:");
    if (reason === null) return; // User cancelled prompt
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/request-reupload/${userId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        showMessage('success', 'Document reupload requested and email sent to user.');
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Failed to request reupload.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user permanently?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/delete-user/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        showMessage('success', 'User deleted successfully.');
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Deletion failed.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLoadingCreate(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createData)
      });
      if (response.ok) {
        showMessage('success', 'User created successfully!');
        setCreateData({ name: '', email: '', password: '', role: 'ROLE_USER' });
        setShowCreateForm(false);
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Failed to create user.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setLoadingInvite(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/invite-resident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inviteData)
      });
      if (response.ok) {
        showMessage('success', 'Invitation sent successfully!');
        setInviteData({ name: '', email: '', apartmentId: '', block: '', flatNumber: '' });
        setShowInviteForm(false);
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Failed to send invite.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    } finally {
      setLoadingInvite(false);
    }
  };

  const startEdit = (u) => {
    setEditingUserId(u.id);
    setEditData({
      name: u.name || '',
      email: u.email || '',
      householdId: u.household ? String(u.household.id) : '',
      apartmentId: u.managedApartment ? String(u.managedApartment.id) : '',
      communityAdminId: u.managedByAdmin ? String(u.managedByAdmin.id) : ''
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditData({ name: '', email: '', householdId: '', apartmentId: '', communityAdminId: '' });
  };

  const handleUpdateUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/update-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
          householdId: editData.householdId ? parseInt(editData.householdId) : null
        })
      });

      if (response.ok) {
        // If updating Community Admin Apartment
        const u = users.find(x => x.id === userId);
        if (u && u.role === 'ROLE_COMMUNITY_ADMIN' && isSuperAdmin) {
          const newAptId = editData.apartmentId ? parseInt(editData.apartmentId) : null;
          const currAptId = u.managedApartment ? u.managedApartment.id : null;
          if (newAptId !== currAptId) {
            await handleAssignAdminApartment(userId, editData.apartmentId);
          }
        }

        // If updating Managing Admin
        if (u && u.role === 'ROLE_USER' && isSuperAdmin) {
          const newAdminId = editData.communityAdminId ? parseInt(editData.communityAdminId) : null;
          const currAdminId = u.managedByAdmin ? u.managedByAdmin.id : null;
          if (newAdminId !== currAdminId) {
            await handleAssignAdmin(userId, editData.communityAdminId);
          }
        }

        showMessage('success', 'User updated successfully!');
        cancelEdit();
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Failed to update user.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    }
  };

  const handleAssignAdmin = async (userId, communityAdminId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-managing-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          communityAdminId: communityAdminId ? parseInt(communityAdminId) : null
        })
      });
      if (response.ok) {
        showMessage('success', 'Managing admin assigned successfully!');
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Assignment failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleAssignAdminApartment = async (adminId, apartmentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-admin-apartment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adminId: adminId,
          apartmentId: apartmentId ? parseInt(apartmentId) : null
        })
      });
      if (response.ok) {
        showMessage('success', 'Apartment assigned to admin successfully!');
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Assignment failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  // Filter function for user search by Name, Email, Username, User ID, or Household ID/Block
  const filterUserBySearch = (u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(q);
    const emailMatch = u.email?.toLowerCase().includes(q);
    const usernameMatch = u.username?.toLowerCase().includes(q);
    const userIdMatch = String(u.id).includes(q) || `usr-${u.id}`.includes(q);
    
    // Household ID & details matching
    const hhIdMatch = u.household ? (
      String(u.household.id).includes(q) ||
      `hh-${u.household.id}`.includes(q) ||
      u.household.block?.toLowerCase().includes(q) ||
      u.household.flatNumber?.toLowerCase().includes(q)
    ) : false;

    return nameMatch || emailMatch || usernameMatch || userIdMatch || hhIdMatch;
  };

  const communityAdmins = users.filter(u => u.role === 'ROLE_COMMUNITY_ADMIN').filter(filterUserBySearch);
  const householdUsers = users.filter(u => u.role === 'ROLE_USER').filter(filterUserBySearch);
  const assignableUsers = isSuperAdmin ? [...communityAdmins, ...householdUsers] : householdUsers;

  // Get all household IDs that are already allocated to any resident
  const allocatedHouseholdIds = users.filter(u => u.household).map(u => u.household.id);
  const selectedUserForAssign = users.find(u => u.id === parseInt(assignData.userId));
  const availableHouseholdsForForm = households.filter(h =>
    !allocatedHouseholdIds.includes(h.id) || (selectedUserForAssign && selectedUserForAssign.household && selectedUserForAssign.household.id === h.id)
  );

  const renderUserTable = (title, tableUsers, showAdminAssign = false, isCommunityAdminTable = false) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl mb-6 shadow-sm">
      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">{title}</h3>
      <div className="overflow-x-auto">
        {tableUsers.length === 0 ? (
          <p className="text-slate-500 text-xs italic py-4">No users matching search filter.</p>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                <th className="pb-3 pl-2">User ID</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">{isCommunityAdminTable ? "Assigned Apartment" : "Allocation"}</th>
                {showAdminAssign && <th className="pb-3">Managed By</th>}
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {tableUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                  <td className="py-3 pl-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold">USR-{u.id}</td>
                  
                  {editingUserId === u.id ? (
                    <td colSpan={2} className="py-2 pr-2">
                      <div className="flex flex-col gap-2">
                        <input type="text" className="px-2 py-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Name" />
                        <input type="email" className="px-2 py-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} placeholder="Email" />
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="font-bold text-slate-900 dark:text-slate-100">{u.name}</td>
                      <td className="font-medium text-slate-800 dark:text-slate-200">{u.email}</td>
                    </>
                  )}
                  
                  <td>
                    {isCommunityAdminTable ? (
                      editingUserId === u.id && isSuperAdmin ? (
                        <select
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100"
                          value={editData.apartmentId || ''}
                          onChange={(e) => setEditData({ ...editData, apartmentId: e.target.value })}
                        >
                          <option value="">-- Unassigned --</option>
                          {apartments.map(apt => {
                            const blockText = apt.buildings && apt.buildings.length > 0
                              ? ` (${apt.buildings.map(b => b.name).join(', ')})`
                              : '';
                            return (
                              <option key={apt.id} value={apt.id}>
                                {apt.name}{blockText}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        u.managedApartment ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                            {u.managedApartment.name}
                            {u.managedBuilding ? ` (${u.managedBuilding.name})` : (
                              u.managedApartment.buildings && u.managedApartment.buildings.length > 0
                                ? ` (${u.managedApartment.buildings.map(b => b.name).join(', ')})`
                                : ''
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">No apartment</span>
                        )
                      )
                    ) : (
                      editingUserId === u.id ? (
                        <select
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100"
                          value={editData.householdId || ''}
                          onChange={e => setEditData({...editData, householdId: e.target.value})}
                        >
                          <option value="">-- Unassign Resident --</option>
                          {households.filter(h =>
                            !allocatedHouseholdIds.includes(h.id) || (u.household && u.household.id === h.id)
                          ).map(h => (
                            <option key={h.id} value={h.id}>{h.apartment?.name} - Block {h.block} - Flat {h.flatNumber}</option>
                          ))}
                        </select>
                      ) : (
                        u.household ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                            {u.household.apartment?.name} - Block {u.household.block} / Flat {u.household.flatNumber}
                            <span className="ml-1 text-[10px] opacity-75 font-mono text-slate-500">(HH-{u.household.id})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">No allocation</span>
                        )
                      )
                    )}
                  </td>

                  {showAdminAssign && (
                    <td className="py-2">
                      {editingUserId === u.id ? (
                        <select
                          className="w-full max-w-[140px] px-2 py-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-[10px] font-semibold focus:outline-none [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100"
                          value={editData.communityAdminId || ''}
                          onChange={(e) => setEditData({ ...editData, communityAdminId: e.target.value })}
                        >
                          <option value="">-- Unassigned --</option>
                          {communityAdmins.map(admin => (
                            <option key={admin.id} value={admin.id}>{admin.name}</option>
                          ))}
                        </select>
                      ) : (
                        u.managedByAdmin ? (
                          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-xs">
                            {u.managedByAdmin.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                        )
                      )}
                    </td>
                  )}
                  
                  <td className="text-right pr-2 py-1">
                    <div className="flex items-center justify-end gap-2">
                      {editingUserId === u.id ? (
                        <>
                          <button onClick={() => handleUpdateUser(u.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition cursor-pointer">Save</button>
                          <button onClick={cancelEdit} className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition cursor-pointer">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(u)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition cursor-pointer">Edit</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition cursor-pointer">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">User Management Registry</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Manage user roles, apartment allocations, and resident credentials</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Filter Input */}
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, username, HH-ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus size={16} /> Create User
            </button>
          )}
          {!isSuperAdmin && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Mail size={16} /> Invite Resident
            </button>
          )}
        </div>
      </div>

      {/* Banner: Community Admin without apartment */}
      {isCommunityAdmin && apartments.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldAlert className="text-amber-600 dark:text-amber-400" size={16} />
          </div>
          <div>
            <p className="text-amber-800 dark:text-amber-300 font-bold text-sm">No Apartment Assigned</p>
            <p className="text-amber-700 dark:text-amber-400/70 text-xs mt-1 font-medium">
              You have not been assigned to manage any apartment yet. Please contact the Super Admin to assign you to an apartment. Until then, you cannot manage any residents or households.
            </p>
          </div>
        </div>
      )}

      {isCommunityAdmin && apartments.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Building2 className="text-emerald-600 dark:text-emerald-400" size={16} />
          </div>
          <div>
            <p className="text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              Managing: {apartments[0]?.name} {profile?.managedBuilding ? `(${profile.managedBuilding.name})` : (profile?.household?.block ? `(Block ${profile.household.block})` : '')}
            </p>
            <p className="text-emerald-700 dark:text-emerald-400/70 text-xs mt-1 font-medium">
              You are the Community Admin for <strong className="text-emerald-900 dark:text-emerald-300">{apartments[0]?.name}</strong>
              {profile?.managedBuilding ? <> (managing <strong className="text-emerald-900 dark:text-emerald-300">{profile.managedBuilding.name}</strong> only)</> : (profile?.household?.block ? <> (managing <strong className="text-emerald-900 dark:text-emerald-300">Block {profile.household.block}</strong>)</> : '')}. 
              You can manage residents and households for this sector only.
            </p>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Create New User</h3>
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Name</label>
              <input type="text" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none" value={createData.name} onChange={e => setCreateData({...createData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none" value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none" value={createData.password} onChange={e => setCreateData({...createData, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Role</label>
              <select required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100" value={createData.role} onChange={e => setCreateData({...createData, role: e.target.value})}>
                <option value="ROLE_USER">Resident (Household User)</option>
                {isSuperAdmin && <option value="ROLE_COMMUNITY_ADMIN">Community Admin</option>}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition cursor-pointer">Cancel</button>
              <button type="submit" disabled={loadingCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-md">{loadingCreate ? 'Creating...' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}
      {showInviteForm && !isSuperAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-amber-600 dark:text-amber-500 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
            <Mail size={16} /> Invite New Resident
          </h3>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Apartment</label>
                <select
                  required
                  disabled={isCommunityAdmin && (!!profile?.managedApartment || !!profile?.household?.apartment)}
                  className={`w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100 ${isCommunityAdmin && (profile?.managedApartment || profile?.household?.apartment) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={inviteData.apartmentId}
                  onChange={e => setInviteData({...inviteData, apartmentId: e.target.value})}
                >
                  <option value="">-- Choose --</option>
                  {apartments.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Block / Building</span>
                  {isCommunityAdmin && <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400/90 lowercase">(locked)</span>}
                </label>
                <input
                  type="text"
                  required
                  readOnly={isCommunityAdmin}
                  placeholder="e.g. Block A"
                  className={`w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none ${isCommunityAdmin ? 'opacity-80 cursor-not-allowed bg-slate-200 dark:bg-slate-900 border-amber-400/50 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold' : ''}`}
                  value={inviteData.block}
                  onChange={e => setInviteData({...inviteData, block: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Flat Number</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.flatNumber} onChange={e => setInviteData({...inviteData, flatNumber: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowInviteForm(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition cursor-pointer">Cancel</button>
              <button type="submit" disabled={loadingInvite} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md">
                {loadingInvite ? 'Sending...' : <><Mail size={14} /> Send Invite</>}
              </button>
            </div>
          </form>
        </div>
      )}


      {pendingUsers.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/20 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 rounded-lg flex items-center justify-center">
              <ShieldAlert className="text-amber-600 dark:text-amber-400" size={16} />
            </div>
            <div>
              <h3 className="font-bold text-amber-700 dark:text-amber-400 text-xs tracking-wide uppercase">Pending Approvals</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">{pendingUsers.length} account{pendingUsers.length !== 1 ? 's' : ''} awaiting review</p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingUsers.map(pu => (
              <div key={pu.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm flex-shrink-0 border border-slate-300 dark:border-slate-700">
                    {pu.name ? pu.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{pu.name}</p>
                    <p className="text-slate-500 dark:text-slate-300 text-[11px] truncate">{pu.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      pu.role === 'ROLE_COMMUNITY_ADMIN' 
                        ? (darkMode 
                            ? 'bg-violet-950/40 border-violet-800/40 text-violet-300' 
                            : 'bg-violet-100 border-violet-300 text-violet-800') 
                        : (darkMode 
                            ? 'bg-blue-950/30 border-blue-800/30 text-blue-300' 
                            : 'bg-blue-100 border-blue-300 text-blue-800')
                    }`}>
                      {pu.role === 'ROLE_COMMUNITY_ADMIN' ? 'Community Admin' : 'Resident'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {pu.documentAadhar && (
                    <button onClick={() => setViewingDocs(pu)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm flex items-center gap-1 cursor-pointer">
                      <FileText size={12} /> Docs
                    </button>
                  )}
                  <button onClick={() => handleApprove(pu.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm flex items-center gap-1 cursor-pointer">
                    <Check size={12} /> Approve
                  </button>
                  <button onClick={() => handleRequestReupload(pu.id)} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm flex items-center gap-1 cursor-pointer" title="Reject documents and email user to reupload">
                    <RefreshCw size={12} /> Request Reupload
                  </button>
                  <button onClick={() => handleReject(pu.id)} className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm cursor-pointer" title="Permanently reject and delete">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Assignment panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl h-fit md:col-span-1 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
            <UserCheck className="text-amber-600 dark:text-amber-500" size={16} /> Flat Allocation
          </h3>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Household Resident</label>
              <select required className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100" value={assignData.userId} onChange={e => setAssignData({...assignData, userId: e.target.value})}>
                <option value="">-- Choose User --</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email}){u.role === 'ROLE_COMMUNITY_ADMIN' ? ' [Admin]' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Household Flat</label>
              <select className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-slate-900 [&>option]:dark:text-slate-100" value={assignData.householdId} onChange={e => setAssignData({...assignData, householdId: e.target.value})}>
                <option value="">-- Unassign Resident --</option>
                {availableHouseholdsForForm.map(h => (
                  <option key={h.id} value={h.id}>{h.apartment?.name} - Block {h.block} - Flat {h.flatNumber}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loadingAssign} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md cursor-pointer">
              {loadingAssign ? 'Updating...' : 'Assign Flat'}
            </button>
          </form>
        </div>

        {/* Residents Tables Container */}
        <div className="md:col-span-2">
          {isSuperAdmin && renderUserTable("Community Admins Registry", communityAdmins, false, true)}
          {renderUserTable(isSuperAdmin ? "Household Users Registry" : "My Household Users", householdUsers, isSuperAdmin, false)}
        </div>

        {/* Document Verification Modal */}
        {viewingDocs && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-4xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-900 dark:text-slate-100">
              <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="text-amber-600 dark:text-amber-500" />
                  Document Verification for {viewingDocs.name}
                </h2>
                <button onClick={() => setViewingDocs(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <h3 className="font-bold text-slate-600 dark:text-slate-400 text-xs tracking-wide uppercase mb-4">Aadhar / PAN Card</h3>
                  {viewingDocs.documentAadhar ? (
                    viewingDocs.documentAadhar.startsWith('data:application/pdf') || viewingDocs.documentAadhar.includes('application/pdf') ? (
                      <object data={viewingDocs.documentAadhar} type="application/pdf" className="w-full h-[400px] rounded-lg">
                        <iframe src={viewingDocs.documentAadhar} className="w-full h-[400px] border-0 rounded-lg" title="Aadhar PDF">
                          <p>Alternate link: <a href={viewingDocs.documentAadhar} download="document.pdf" className="text-blue-600 dark:text-blue-400 underline">Download PDF</a></p>
                        </iframe>
                      </object>
                    ) : (
                      <img src={viewingDocs.documentAadhar} alt="Aadhar Card" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '400px' }} />
                    )
                  ) : (
                    <p className="text-slate-500 text-sm">No document provided</p>
                  )}
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <h3 className="font-bold text-slate-600 dark:text-slate-400 text-xs tracking-wide uppercase mb-4">Recent Photo</h3>
                  {viewingDocs.documentPhoto ? (
                    <img src={viewingDocs.documentPhoto} alt="User Photo" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '400px' }} />
                  ) : (
                    <p className="text-slate-500 text-sm">No photo provided</p>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
                <button onClick={() => setViewingDocs(null)} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer">
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleApprove(viewingDocs.id);
                    setViewingDocs(null);
                  }} 
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                >
                  <Check size={18} /> Approve Resident
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. WATER USAGE LOGGING TAB
// -------------------------------------------------------------
function WaterUsageTab({ token, households, isAdmin, profile, showMessage, fetchDashboardData, usageLogs = [], users = [] }) {
  const [logData, setLogData] = useState({ householdId: '', date: '', readingLiters: '' });
  const [file, setFile] = useState(null);
  const [savingManual, setSavingManual] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateMode, setTemplateMode] = useState('month'); // 'month' or 'range'
  const [templateMonth, setTemplateMonth] = useState(
    new Date().toISOString().slice(0, 7) // e.g. "2026-07"
  );
  const [customRange, setCustomRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = useRef(null);

  // Sync customRange whenever templateMonth changes if in month mode
  useEffect(() => {
    if (templateMode === 'month' && templateMonth) {
      const [year, month] = templateMonth.split('-').map(Number);
      const startDate = `${templateMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${templateMonth}-${String(lastDay).padStart(2, '0')}`;
      setCustomRange({ startDate, endDate });
    }
  }, [templateMonth, templateMode]);

  useEffect(() => {
    if (!isAdmin && profile?.household) {
      setLogData(prev => ({ ...prev, householdId: profile.household.id }));
    }
  }, [profile, isAdmin]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!logData.householdId) {
      showMessage('error', 'Select a household first.');
      return;
    }
    setSavingManual(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/usage/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          householdId: parseInt(logData.householdId),
          date: logData.date,
          readingLiters: parseFloat(logData.readingLiters)
        })
      });
      if (response.ok) {
        showMessage('success', 'Reading logged successfully!');
        setLogData({ ...logData, readingLiters: '', date: '' });
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Failed to submit reading.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSavingBulk(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/api/usage/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const text = await response.text();
      if (response.ok) {
        showMessage('success', text);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDashboardData();
      } else {
        showMessage('error', text || 'Upload failed.');
      }
    } catch (err) {
      showMessage('error', 'Communication error.');
    } finally {
      setSavingBulk(false);
    }
  };

  const handleDownloadTemplate = async (e) => {
    e.preventDefault();
    let startDate = customRange.startDate;
    let endDate = customRange.endDate;

    if (templateMode === 'month') {
      if (!templateMonth) {
        showMessage('error', 'Please select a billing month.');
        return;
      }
      const [year, month] = templateMonth.split('-').map(Number);
      startDate = `${templateMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${templateMonth}-${String(lastDay).padStart(2, '0')}`;
    } else {
      if (!startDate || !endDate) {
        showMessage('error', 'Please select both start and end dates.');
        return;
      }
      if (endDate < startDate) {
        showMessage('error', 'End date cannot be before start date.');
        return;
      }
    }

    setDownloadingTemplate(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${API_BASE_URL}/api/usage/bulk-template?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const text = await response.text();
        showMessage('error', text || 'Failed to generate template.');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      let filenameLabel = `${startDate}_to_${endDate}`;
      if (templateMode === 'month') {
        const [year, month] = templateMonth.split('-').map(Number);
        const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        filenameLabel = monthLabel.replace(' ', '_');
      }
      link.download = `meter_readings_${filenameLabel}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showMessage('success', `Template for period (${startDate} to ${endDate}) downloaded. Fill in the readingLiters column and upload.`);
      setShowTemplateModal(false);
    } catch (err) {
      showMessage('error', 'Network error while downloading template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Filter usage logs for the resident's household, sorted chronologically ASC for delta computation
  const householdLogsAsc = !isAdmin && profile?.household
    ? [...usageLogs]
        .filter(l => l.household?.id === profile.household.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id)
    : [];

  // Compute proper delta-consumption per row (in case old DB data has consumptionLiters == readingLiters)
  const householdLogs = householdLogsAsc.map((log, idx) => {
    const prevReading = idx === 0 ? 0 : (householdLogsAsc[idx - 1].readingLiters || 0);
    return {
      ...log,
      computedConsumption: Math.max(0, (log.readingLiters || 0) - prevReading)
    };
  }).reverse(); // Show most recent at top

  // Current reading = the log with the highest readingLiters value (actual meter position)
  const latestReading = householdLogsAsc.length > 0
    ? householdLogsAsc.reduce((max, l) => (l.readingLiters || 0) > (max.readingLiters || 0) ? l : max, householdLogsAsc[0])
    : null;

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          {isAdmin ? 'Log Cumulative Meter Readings' : 'My Water Consumption'}
        </h2>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
              <Plus className="text-emerald-600 dark:text-emerald-500" size={16} /> Manual Meter Reading Entry
            </h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Household</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  value={logData.householdId}
                  onChange={e => setLogData({...logData, householdId: e.target.value})}
                >
                  <option value="">-- Choose Flat --</option>
                  {households.map(h => {
                    const resident = users.find(u => u.household?.id === h.id);
                    return (
                      <option key={h.id} value={h.id}>
                        {resident ? resident.name : 'No Resident'} - {h.apartment?.name ? h.apartment.name + ' - ' : ''}Block {h.block} - Flat {h.flatNumber}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date" required max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  value={logData.date}
                  onChange={e => setLogData({...logData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cumulative Meter Reading (Liters)</label>
                <input
                  type="number" required step="0.1" min="0" placeholder="e.g. 14200.5 (Cumulative value from dial)"
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  value={logData.readingLiters}
                  onChange={e => setLogData({...logData, readingLiters: e.target.value})}
                />
                <p className="text-[10px] text-amber-600 dark:text-amber-400/90 mt-1 italic font-medium">
                  * Enter the cumulative meter dial value (NOT daily consumption). Delta consumption is calculated automatically.
                </p>
              </div>
              <button
                type="submit" disabled={savingManual}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md cursor-pointer"
              >
                {savingManual ? 'Saving...' : 'Submit Reading Entry'}
              </button>
            </form>
          </div>

          {/* CSV Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
                <FileSpreadsheet className="text-purple-600 dark:text-purple-500" size={16} /> Bulk CSV Meter Reading Uploader
              </h3>
              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div 
                  className="border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 text-center bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-950/40 transition cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <Upload size={28} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Choose CSV or drop here</p>
                  <input
                    type="file" accept=".csv" className="hidden" ref={fileInputRef}
                    onChange={e => setFile(e.target.files[0])}
                  />
                </div>
                {file && (
                  <div className="bg-slate-100 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 flex justify-between items-center">
                    <span className="truncate">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-red-500 font-bold cursor-pointer">&times;</button>
                  </div>
                )}
                <button
                  type="submit" disabled={!file || savingBulk}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingBulk ? 'Uploading...' : 'Process Upload'}
                </button>
              </form>
            </div>
            <div className="bg-slate-100 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mt-4 text-[10px] text-slate-500 flex justify-between items-center">
              <span>Format: householdId, date, readingLiters (Cumulative Meter Reading)</span>
              <button 
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 font-bold underline cursor-pointer transition text-[9px] uppercase tracking-wider flex items-center gap-1"
              >
                <Download size={10} /> Download Template
              </button>
            </div>
          </div>

          {/* Admin Recent Community Logs Table */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wider uppercase flex items-center gap-2">
                <Activity className="text-blue-600 dark:text-blue-500" size={16} /> Recent Community Water Logs
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Total {usageLogs.length} logs recorded</span>
            </div>

            <div className="overflow-x-auto">
              {usageLogs.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-slate-500 text-xs italic">No water consumption logs recorded yet in your community.</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600">Use the manual log entry or bulk CSV upload above to add meter readings.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-3 pl-1">Date</th>
                      <th className="pb-3">Household / Resident</th>
                      <th className="pb-3">Flat Details</th>
                      <th className="pb-3">Cumulative Reading</th>
                      <th className="pb-3 text-right">Logged Consumption</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                    {usageLogs.slice(0, 10).map(l => {
                      const resident = users.find(u => u.household?.id === l.household?.id);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">{l.date}</td>
                          <td className="py-3 font-bold text-slate-900 dark:text-slate-200">
                            {resident ? resident.name : (l.household?.residentName || 'Unassigned Resident')}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            {l.household ? `Block ${l.household.block} - Flat ${l.household.flatNumber}` : '-'}
                          </td>
                          <td className="py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {l.readingLiters != null ? `${l.readingLiters.toLocaleString()} L` : '-'}
                          </td>
                          <td className="py-3 font-mono text-blue-600 dark:text-blue-400 font-bold text-right">
                            {l.consumptionLiters != null ? `+${l.consumptionLiters.toLocaleString()} L` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Household Meter Card */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Home size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Household Meter</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Allocation Status</p>
                </div>
              </div>

              {profile?.household ? (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Apartment</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-300">{profile.household.apartment?.name || 'Assigned'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Flat Details</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-300">Block {profile.household.block} - Flat {profile.household.flatNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Meter Installed</span>
                    <span className={`font-semibold ${profile.household.hasMeter ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {profile.household.hasMeter ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Current Reading</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                      {latestReading ? `${latestReading.readingLiters.toLocaleString()} L` : '0 L'}
                    </span>
                  </div>
                  {latestReading && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Last Checked</span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{latestReading.date}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic py-6">No flat has been allocated to your profile yet.</p>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-800 rounded-xl mt-4 flex items-start gap-2.5">
              <Info size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                As a resident, you have view-only access. To update or correct readings, please contact your community admin.
              </p>
            </div>
          </div>

          {/* Right Side: Usage Log Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wider uppercase mb-4 flex items-center gap-2">
              <Activity className="text-blue-600 dark:text-blue-500" size={16} /> Recent Usage Logs
            </h3>

            <div className="overflow-x-auto">
              {householdLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-slate-500 text-xs italic">No consumption logs recorded yet.</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">Your logged readings will show up here once updated by an admin.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                      <th className="pb-3 pl-1">Log ID</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Cumulative Value</th>
                      <th className="pb-3 text-right">Consumption</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                    {householdLogs.slice(0, 5).map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                        <td className="py-3 pl-1 font-mono text-indigo-600 dark:text-indigo-400 font-bold">LOG-{l.id}</td>
                        <td className="py-3 font-medium text-slate-800 dark:text-slate-300">{l.date}</td>
                        <td className="py-3 font-mono font-medium text-slate-800 dark:text-slate-300">{l.readingLiters.toLocaleString()} L</td>
                        <td className="py-3 font-mono text-blue-600 dark:text-blue-400 font-bold text-right">
                          +{(l.computedConsumption ?? l.consumptionLiters ?? 0).toLocaleString()} L
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Download Template Modal ===== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
                  <FileSpreadsheet className="text-purple-600 dark:text-purple-400" size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Download CSV Template</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Pre-filled with all community residents</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleDownloadTemplate} className="p-6 space-y-5">

              {/* Mode Toggle Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTemplateMode('month')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    templateMode === 'month'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Month Cycle (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode('range')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    templateMode === 'range'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Custom Date Range
                </button>
              </div>

              {/* Month Picker View */}
              {templateMode === 'month' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Billing Cycle Month
                  </label>
                  <input
                    type="month"
                    required
                    max={new Date().toISOString().slice(0, 7)}
                    value={templateMonth}
                    onChange={e => setTemplateMonth(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition cursor-pointer"
                  />
                  {templateMonth && (() => {
                    const [y, m] = templateMonth.split('-').map(Number);
                    const lastDay = new Date(y, m, 0).getDate();
                    const monthLabel = new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                    return (
                      <div className="mt-2.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 flex-shrink-0"></span>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                          Billing period: <span className="text-purple-700 dark:text-purple-300 font-bold">{monthLabel}</span>
                          <span className="text-slate-400 dark:text-slate-600 mx-1">•</span>
                          <span className="font-mono text-slate-700 dark:text-slate-400 font-semibold">{templateMonth}-01 → {templateMonth}-{String(lastDay).padStart(2, '0')}</span>
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Custom Date Range View */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={customRange.startDate}
                        onChange={e => setCustomRange({ ...customRange, startDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        End Date (Reading Date)
                      </label>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={customRange.endDate}
                        onChange={e => setCustomRange({ ...customRange, endDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                      />
                    </div>
                  </div>
                  {customRange.startDate && customRange.endDate && (
                    <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 flex-shrink-0"></span>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        Selected Range: <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">{customRange.startDate} → {customRange.endDate}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">What the template contains</p>
                <ul className="space-y-2">
                  {[
                    { label: 'One row per metered household in your community', color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: `Pre-filled: Household ID, reading date (${templateMode === 'month' ? 'end of month' : 'end date'}), resident & flat details`, color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Previous meter reading shown for reference', color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Only enter Cumulative Reading in the readingLiters column (NOT daily consumption)', color: 'text-amber-600 dark:text-amber-400' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                      <span className={`${item.color} mt-0.5 flex-shrink-0 font-bold`}>✓</span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={downloadingTemplate || (templateMode === 'month' ? !templateMonth : (!customRange.startDate || !customRange.endDate))}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {downloadingTemplate ? (
                    <>
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Download Template
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 6. METER READINGS LIST TAB
// -------------------------------------------------------------
function MeterReadingsTab({ usageLogs = [], households = [], apartments = [], profile, isAdmin, setActiveTab }) {
  const [expandedApts, setExpandedApts] = useState({});
  const [expandedHH, setExpandedHH]     = useState({});
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  // Generate last 12 months options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      options.push({ val, label });
    }
    return options;
  }, []);

  // Filter logs by selected month
  const filteredUsageLogs = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'ALL') return usageLogs || [];
    return (usageLogs || []).filter(log => log.date && log.date.startsWith(selectedMonth));
  }, [usageLogs, selectedMonth]);

  // Fallback: If households array is empty (e.g. resident view), extract household directly from profile or usageLogs
  const effectiveHouseholds = useMemo(() => {
    if (households && households.length > 0) return households;
    const map = {};
    if (profile?.household?.id) {
      map[profile.household.id] = profile.household;
    }
    (filteredUsageLogs || []).forEach(log => {
      const hh = log.household || (log.householdId ? { id: log.householdId, block: 'Main', flatNumber: 'Unit' } : null);
      if (hh && hh.id && !map[hh.id]) {
        map[hh.id] = hh;
      }
    });
    return Object.values(map);
  }, [households, filteredUsageLogs, profile]);

  // Group logs by householdId, sorted newest first
  const logsByHH = useMemo(() => {
    const map = {};
    // Sort all logs oldest → newest so delta is computed correctly
    const sorted = [...(filteredUsageLogs || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
    sorted.forEach((log) => {
      const hhId = log.household?.id ?? log.householdId ?? (profile?.household?.id);
      if (!hhId) return;
      if (!map[hhId]) map[hhId] = [];
      const prev = map[hhId].length > 0 ? map[hhId][map[hhId].length - 1].readingLiters : null;
      const delta = prev !== null ? Math.max(0, log.readingLiters - prev) : (log.consumptionLiters || 0);
      map[hhId].push({ ...log, delta });
    });
    // Reverse each so newest is first for display
    Object.keys(map).forEach(k => map[k].reverse());
    return map;
  }, [filteredUsageLogs, profile]);

  // Group households by apartmentId
  const hhByApt = useMemo(() => {
    const map = {};
    effectiveHouseholds.forEach(hh => {
      const aptId = hh.apartment?.id ?? hh.apartmentId ?? 1;
      if (!map[aptId]) map[aptId] = [];
      map[aptId].push(hh);
    });
    return map;
  }, [effectiveHouseholds]);

  // Auto-expand Level 1 (Apartment level) by default while keeping Level 2 (Household level) collapsed
  useEffect(() => {
    if (effectiveHouseholds.length > 0) {
      const aptMap = {};
      effectiveHouseholds.forEach(hh => {
        const aptId = hh.apartment?.id ?? hh.apartmentId ?? 1;
        aptMap[aptId] = true;
      });
      setExpandedApts(prev => ({ ...aptMap, ...prev }));
    }
  }, [effectiveHouseholds]);

  const toggleApt = (id) => setExpandedApts(p => ({ ...p, [id]: !p[id] }));
  const toggleHH  = (id) => setExpandedHH(p  => ({ ...p, [id]: !p[id]  }));

  const aptList = apartments.length > 0 ? apartments : Object.keys(hhByApt).map(id => {
    const sampleHh = hhByApt[id]?.[0];
    const name = sampleHh?.apartment?.name || `Apartment ${id}`;
    return { id: Number(id) || id, name };
  });

  const isResident = !isAdmin;

  // Compute Resident Summary Stats
  const residentLogs = filteredUsageLogs || [];
  const latestReading = residentLogs.length > 0 ? residentLogs[0].readingLiters : 0;
  const totalConsumption = residentLogs.reduce((sum, l) => sum + (l.consumptionLiters || 0), 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isResident ? 'My Usage History' : 'Meter Readings'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {isResident 
              ? 'Complete history of your submitted meter readings and daily water consumption'
              : 'Browse readings grouped by apartment and household'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 12-Month Search Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors">
            <Calendar size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Filter Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">All Available Months</option>
              {monthOptions.map(m => (
                <option key={m.val} value={m.val} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {isResident && setActiveTab && (
            <button
              onClick={() => setActiveTab('my_usage')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-blue-900/20"
            >
              <Plus size={16} /> Log New Reading
            </button>
          )}
        </div>
      </div>

      {/* Resident Summary Header Cards */}
      {isResident && residentLogs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3 shadow-sm dark:shadow-md">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Readings</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100">{residentLogs.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3 shadow-sm dark:shadow-md">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <Droplets size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Latest Reading</p>
              <p className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono">{latestReading.toLocaleString()} L</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-3 shadow-sm dark:shadow-md">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Water Used</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{Math.round(totalConsumption).toLocaleString()} L</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no logs exist for selected month */}
      {residentLogs.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3 max-w-md mx-auto my-6 shadow-sm">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <Activity size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Meter Readings Logged</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mt-1">
              {selectedMonth !== 'ALL' 
                ? `There are no water usage logs recorded for the selected month (${monthOptions.find(m => m.val === selectedMonth)?.label || selectedMonth}).`
                : "No water usage logs recorded yet."}
            </p>
          </div>
          {isResident && setActiveTab && (
            <button
              onClick={() => setActiveTab('my_usage')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md inline-flex items-center gap-2"
            >
              <Plus size={15} /> Log New Reading
            </button>
          )}
        </div>
      )}

      {residentLogs.length > 0 && isResident ? (
        /* Resident Direct Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Consumption Logs History</h3>
            <span className="text-[10px] text-slate-500 font-semibold">{residentLogs.length} Entries Recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Cumulative Reading</th>
                  <th className="py-3 px-4 text-right">Water Consumed</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                {residentLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">LOG-{log.id}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">{log.date}</td>
                    <td className="py-3 px-4 font-mono text-slate-900 dark:text-slate-100 font-bold">{(log.readingLiters || 0).toLocaleString()} L</td>
                    <td className="py-3 px-4 font-mono text-right">
                      {log.consumptionLiters > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{Math.round(log.consumptionLiters).toLocaleString()} L</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">0 L</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Recorded</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Admin Accordion View */
        <div className="space-y-4">
          {aptList.map(apt => {
            const aptHouseholds = hhByApt[apt.id] || [];
            const totalReadings = aptHouseholds.reduce((s, hh) => s + (logsByHH[hh.id]?.length || 0), 0);
            const isAptOpen = !!expandedApts[apt.id];

            return (
              <div key={apt.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-md">
                {/* Apartment Header */}
                <button
                  onClick={() => toggleApt(apt.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-slate-50/80 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-500/30">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">{apt.name}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{aptHouseholds.length} household{aptHouseholds.length !== 1 ? 's' : ''} · {totalReadings} readings</p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${isAptOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Households */}
                {isAptOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800/60">
                    {aptHouseholds.length === 0 ? (
                      <p className="text-slate-500 text-xs italic py-4 px-6">No households in this apartment.</p>
                    ) : (
                      aptHouseholds.map(hh => {
                        const logs = logsByHH[hh.id] || [];
                        const isHHOpen = !!expandedHH[hh.id];
                        const latestReading = logs.length > 0 ? logs[0].readingLiters : null;
                        const totalConsumption = logs.reduce((s, l) => s + (l.delta || 0), 0);
                        const residentName = hh.resident?.name || hh.residentName || null;

                        return (
                          <div key={hh.id} className="bg-slate-50/50 dark:bg-slate-950/30">
                            {/* Household Row */}
                            <button
                              onClick={() => toggleHH(hh.id)}
                              className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/20 transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0 border border-emerald-200 dark:border-emerald-500/30">
                                  <svg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-slate-900 dark:text-slate-200 font-bold text-xs">
                                    Block {hh.block} / Flat {hh.flatNumber}
                                    {residentName && <span className="ml-2 text-slate-600 dark:text-slate-400 font-normal">— {residentName}</span>}
                                  </p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] text-slate-600 dark:text-slate-500 font-medium">{logs.length} reading{logs.length !== 1 ? 's' : ''}</span>
                                    {latestReading !== null && (
                                      <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold">Latest: {latestReading.toLocaleString()} L</span>
                                    )}
                                    {totalConsumption > 0 && (
                                      <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono font-bold">Total used: {Math.round(totalConsumption).toLocaleString()} L</span>
                                    )}
                                    {hh.hasMeter ? (
                                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Metered</span>
                                    ) : (
                                      <span className="text-[9px] bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Unmetered</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <svg className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform ${isHHOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Meter Readings Table */}
                            {isHHOpen && (
                              <div className="px-6 pb-4">
                                {logs.length === 0 ? (
                                  <p className="text-slate-500 text-[11px] italic py-3">No readings recorded for this household.</p>
                                ) : (
                                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100/90 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                                          <th className="py-2.5 px-4">Log ID</th>
                                          <th className="py-2.5 px-4">Date</th>
                                          <th className="py-2.5 px-4">Meter Reading</th>
                                          <th className="py-2.5 px-4 text-right">Consumption</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-900">
                                        {logs.map((log, idx) => (
                                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                                            <td className="py-2.5 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">LOG-{log.id}</td>
                                            <td className="py-2.5 px-4 text-slate-800 dark:text-slate-300 font-medium">{log.date}</td>
                                            <td className="py-2.5 px-4 font-mono text-slate-900 dark:text-slate-100 font-bold">{(log.readingLiters || 0).toLocaleString()} L</td>
                                            <td className="py-2.5 px-4 font-mono text-right">
                                              {idx === logs.length - 1 ? (
                                                <span className="text-slate-500 text-[10px]">— (first entry)</span>
                                              ) : log.delta > 0 ? (
                                                <span className="text-blue-600 dark:text-blue-400 font-bold">+{Math.round(log.delta).toLocaleString()} L</span>
                                              ) : (
                                                <span className="text-slate-400 dark:text-slate-500">0 L</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// -------------------------------------------------------------
// 7. PROFILE TAB
// -------------------------------------------------------------
function ProfileTab({ token, profile, fetchProfile, fetchDashboardData, onResetSuccess, showMessage }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', gender: '', mobileNo: '+91 ' });
  const [updating, setUpdating] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resettingDb, setResettingDb] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({ name: profile.name, email: profile.email, password: '', gender: profile.gender || '', mobileNo: profile.mobileNo ? (profile.mobileNo.startsWith('+') ? profile.mobileNo : '+91 ' + profile.mobileNo) : '+91 ' });
    }
  }, [profile]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // Build payload — only include fields that have a value, never send empty password
      const payload = {
        name: formData.name,
        email: formData.email,
      };
      if (formData.password.trim()) payload.password = formData.password;
      if (formData.gender)           payload.gender   = formData.gender;
      if (formData.mobileNo.trim())  payload.mobileNo = formData.mobileNo;

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        showMessage('success', 'Profile updated successfully!');
        // Fetch fresh profile then clear password field
        await fetchProfile();
        setFormData(prev => ({ ...prev, password: '' }));
      } else {
        const text = await response.text();
        showMessage('error', text || 'Profile update failed.');
      }
    } catch { showMessage('error', 'Network failure.'); }
    finally { setUpdating(false); }
  };

  const handleResetDatabase = async (e) => {
    e.preventDefault();
    if (!resetPassword) return showMessage('error', 'Password is required.');
    setResettingDb(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reset-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: resetPassword })
      });
      const txt = await res.text();
      if (res.ok) { 
        showMessage('success', 'Database reset successful! Logging you out to refresh your session...');
        setResetPassword('');
        setShowResetConfirm(false);
        // Auto-logout after 2.5s so admin gets a fresh session
        setTimeout(() => { if (onResetSuccess) onResetSuccess(); }, 2500);
      }
      else { showMessage('error', txt || 'Failed to reset database.'); }
    } catch { showMessage('error', 'Network failure.'); }
    finally { setResettingDb(false); }
  };

  const roleColor = profile?.role === 'ROLE_ADMIN'
    ? { from: '#f59e0b', to: '#d97706', text: 'text-amber-300', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', label: 'SUPER ADMIN' }
    : profile?.role === 'ROLE_COMMUNITY_ADMIN'
    ? { from: '#3b82f6', to: '#6366f1', text: 'text-blue-300', bg: 'rgba(59,130,246,0.15)', border: 'rgba(99,102,241,0.4)', label: 'COMMUNITY ADMIN' }
    : { from: '#10b981', to: '#059669', text: 'text-emerald-300', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', label: 'RESIDENT' };

  const initials = profile ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <div className="space-y-6">
      {/* ── PROFILE HERO BANNER & HEADER ───────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 border border-blue-500/20 p-6 shadow-lg backdrop-blur-md">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-100">Profile Settings</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Verified Account
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Manage your personal credentials, contact details, and account security.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Access Level</div>
              <div className="text-xs font-extrabold text-blue-400">{roleColor.label}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── UIVERSE-INSPIRED PROFILE CARD ────────────── */}
        <div className="lg:col-span-1 flex justify-center w-full">
          <div className="profile-card">
            {/* Glowing blobs on hover */}
            <div className="profile-card-blob profile-card-blob-left" />
            <div className="profile-card-blob profile-card-blob-right" />

            {/* Inner card-info panel */}
            <div className="profile-card-info">

              {/* Smart Avatar matching Gender */}
              <span className="profile-card-avatar-wrap">
                {profile?.gender?.toLowerCase() === 'female' ? (
                  /* Female Smart SVG Avatar */
                  <svg className="profile-card-avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="femBg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4c1d95" />
                        <stop offset="50%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#db2777" />
                      </linearGradient>
                      <linearGradient id="femHair" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#31103f" />
                        <stop offset="100%" stopColor="#581c87" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="50" fill="url(#femBg)" />
                    {/* Background long hair */}
                    <path d="M 24 45 C 20 65, 26 85, 34 95 L 66 95 C 74 85, 80 65, 76 45 Z" fill="url(#femHair)" />
                    {/* Neck */}
                    <path d="M 44 60 L 56 60 L 56 72 L 44 72 Z" fill="#fbcfe8" />
                    {/* Face */}
                    <ellipse cx="50" cy="46" rx="17" ry="20" fill="#fde047" opacity="0.1" />
                    <ellipse cx="50" cy="45" rx="16" ry="19" fill="#fde68a" />
                    {/* Front hair style & bangs */}
                    <path d="M 32 38 C 30 20, 70 20, 68 38 C 62 26, 38 26, 32 38 Z" fill="url(#femHair)" />
                    <path d="M 34 32 C 40 22, 50 24, 52 35 C 50 25, 36 26, 34 32 Z" fill="#6b21a8" />
                    {/* Eyes */}
                    <ellipse cx="44" cy="44" rx="2" ry="2.5" fill="#1e1b4b" />
                    <ellipse cx="56" cy="44" rx="2" ry="2.5" fill="#1e1b4b" />
                    <circle cx="44.8" cy="43.2" r="0.7" fill="#ffffff" />
                    <circle cx="56.8" cy="43.2" r="0.7" fill="#ffffff" />
                    {/* Eyelashes */}
                    <path d="M 41 42 Q 44 40 47 42" stroke="#31103f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    <path d="M 53 42 Q 56 40 59 42" stroke="#31103f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    {/* Cheeks */}
                    <circle cx="41" cy="48" r="3" fill="#f43f5e" opacity="0.35" />
                    <circle cx="59" cy="48" r="3" fill="#f43f5e" opacity="0.35" />
                    {/* Smile */}
                    <path d="M 45 52 Q 50 56 55 52" stroke="#e11d48" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    {/* Modern Top Attire */}
                    <path d="M 28 85 C 32 70, 68 70, 72 85 L 75 100 L 25 100 Z" fill="#ec4899" />
                    <path d="M 40 70 L 50 82 L 60 70 Z" fill="#be185d" />
                    {/* Smart Earrings */}
                    <circle cx="33" cy="49" r="2" fill="#facc15" />
                    <circle cx="67" cy="49" r="2" fill="#facc15" />
                  </svg>
                ) : profile?.gender?.toLowerCase() === 'male' ? (
                  /* Male Smart SVG Avatar */
                  <svg className="profile-card-avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="maleBg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="50%" stopColor="#1e3a8a" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                      <linearGradient id="maleHair" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="50" fill="url(#maleBg)" />
                    {/* Neck */}
                    <path d="M 44 60 L 56 60 L 56 72 L 44 72 Z" fill="#fde68a" />
                    {/* Face */}
                    <ellipse cx="50" cy="44" rx="16" ry="19" fill="#fef3c7" />
                    {/* Smart haircut */}
                    <path d="M 32 38 C 30 18, 70 18, 68 38 C 64 24, 36 24, 32 38 Z" fill="url(#maleHair)" />
                    <path d="M 34 32 L 42 22 L 58 24 L 66 32 Z" fill="#1e293b" />
                    {/* Eyebrows */}
                    <path d="M 40 38 Q 44 36 47 38" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M 53 38 Q 56 36 60 38" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    {/* Eyes */}
                    <circle cx="44" cy="43" r="2" fill="#0f172a" />
                    <circle cx="56" cy="43" r="2" fill="#0f172a" />
                    <circle cx="44.6" cy="42.4" r="0.6" fill="#ffffff" />
                    <circle cx="56.6" cy="42.4" r="0.6" fill="#ffffff" />
                    {/* Nose */}
                    <path d="M 50 43 L 49 48 L 52 48" stroke="#d97706" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
                    {/* Smile */}
                    <path d="M 45 52 Q 50 55 55 52" stroke="#b45309" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    {/* Smart Suit / Collar */}
                    <path d="M 26 88 C 32 68, 68 68, 74 88 L 78 100 L 22 100 Z" fill="#1e293b" />
                    <path d="M 42 68 L 50 82 L 58 68 Z" fill="#3b82f6" />
                    <path d="M 48 74 L 50 100 L 52 74 Z" fill="#0284c7" />
                  </svg>
                ) : (
                  /* Neutral / Other / Default Smart Avatar */
                  <svg className="profile-card-avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="otherBg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#065f46" />
                        <stop offset="50%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="50" fill="url(#otherBg)" />
                    {/* Futuristic Geometric Inner Ring */}
                    <circle cx="50" cy="50" r="42" stroke="#5eead4" strokeWidth="1.5" fill="none" strokeDasharray="4 2" opacity="0.7" />
                    {/* Avatar Initials or Universal Avatar Icon */}
                    <text x="50" y="58" fontSize="28" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="1" style={{ fontFamily: 'sans-serif' }}>
                      {initials}
                    </text>
                    <circle cx="50" cy="24" r="3" fill="#a7f3d0" />
                  </svg>
                )}
              </span>

              {/* Name */}
              <h3 className="profile-card-title">{profile?.name || 'Loading…'}</h3>

              {/* Role badge */}
              <div className="profile-card-role" style={{ color: roleColor.from, background: roleColor.bg, border: `1px solid ${roleColor.border}` }}>
                {roleColor.label}
              </div>

              {/* Detail rows */}
              <div className="profile-card-details">
                <div className="profile-card-row">
                  <span className="profile-card-label">Gender</span>
                  <span className="profile-card-value">{profile?.gender || '—'}</span>
                </div>
                <div className="profile-card-row">
                  <span className="profile-card-label">Mobile</span>
                  <span className="profile-card-value profile-card-mono">{profile?.mobileNo ? (profile.mobileNo.startsWith('+') ? profile.mobileNo : '+91 ' + profile.mobileNo) : '—'}</span>
                </div>
                <div className="profile-card-row">
                  <span className="profile-card-label">Email</span>
                  <span className="profile-card-value profile-card-mono text-[11px] select-all">{profile?.email || '—'}</span>
                </div>
                {profile?.household && <>
                  <div className="profile-card-row">
                    <span className="profile-card-label">Society</span>
                    <span className="profile-card-value">{profile.household.apartment?.name || '—'}</span>
                  </div>
                  <div className="profile-card-row">
                    <span className="profile-card-label">Flat</span>
                    <span className="profile-card-value">Block {profile.household.block} / {profile.household.flatNumber}</span>
                  </div>
                </>}
                {profile?.managedApartment && (
                  <div className="profile-card-row">
                    <span className="profile-card-label">Society</span>
                    <span className="profile-card-value">{profile.managedApartment.name}</span>
                  </div>
                )}
              </div>

              {/* Household ID chip (residents only) */}
              {profile?.household && (
                <div className="profile-card-id-chip">
                  <span className="profile-card-id-label">Household ID</span>
                  <span className="profile-card-id-value">HH-{profile.household.id}</span>
                </div>
              )}

            </div>

            {/* Bottom links strip */}
            <ul className="profile-card-links">
              <li><span className="profile-card-link-badge" style={{ color: roleColor.from }}>● Active</span></li>
              <li><span className="profile-card-link-badge">AquaTrack Portal</span></li>
            </ul>
          </div>
        </div>

        {/* ── Edit Form ─────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800/90 p-4 sm:p-6 rounded-2xl lg:col-span-2 w-full space-y-6 shadow-xl backdrop-blur-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-5">
              <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase flex items-center gap-2">
                <Edit3 size={15} className="text-blue-400" /> Update Profile Details
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Keep your credentials up to date</span>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User size={12} className="text-slate-400" /> Full Name
                  </label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition shadow-sm"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-400" /> Email Address
                  </label>
                  <input
                    type="email" required
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition shadow-sm"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserCheck size={12} className="text-slate-400" /> Gender
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer transition shadow-sm"
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 size={12} className="text-slate-400" /> Mobile Number
                  </label>
                  <input
                    type="tel" placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition shadow-sm"
                    value={formData.mobileNo}
                    onChange={e => setFormData({ ...formData, mobileNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <KeyRound size={12} className="text-amber-400" /> Change Password <span className="text-[9px] text-slate-500 font-normal lowercase">(leave blank to keep current)</span>
                </label>
                <input
                  type="password" placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition shadow-sm"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit" disabled={updating}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition duration-200 text-xs cursor-pointer shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {updating ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {profile?.role === 'ROLE_ADMIN' && (
            <div className="border-t border-slate-800/80 pt-6">
              <div className="bg-rose-950/10 border border-rose-500/25 p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="font-extrabold text-rose-400 text-xs tracking-wide uppercase flex items-center gap-2">
                    <ShieldAlert size={18} /> Danger Zone — Administrative Reset
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Wipe all system records, registered apartments, households, bills, usage history logs, alerts, and other users.
                    Your own Super Admin account will remain intact so you stay logged in. This operation is irreversible.
                  </p>
                </div>
                {!showResetConfirm ? (
                  <button type="button" onClick={() => setShowResetConfirm(true)}
                    className="bg-rose-700 hover:bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-md cursor-pointer">
                    Reset System Database
                  </button>
                ) : (
                  <form onSubmit={handleResetDatabase} className="space-y-3.5 max-w-sm pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-rose-300 uppercase tracking-wider pl-1">Enter Your Password to Confirm</label>
                      <input type="password" required placeholder="Password required"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-rose-500/30 focus:border-rose-500 rounded-xl text-slate-200 focus:outline-none transition text-xs"
                        value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => { setShowResetConfirm(false); setResetPassword(''); }}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition border border-slate-700/50 cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" disabled={resettingDb}
                        className="flex-grow bg-rose-700 hover:bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer">
                        {resettingDb ? 'Wiping Database...' : 'Permanently Delete All Data'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// COLONY & BUILDINGS MANAGEMENT TAB (SUPER ADMIN ONLY)
// -------------------------------------------------------------
function ColonyManagementTab({ token, showMessage, fetchDashboardData }) {
  const [colonies, setColonies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [colonyName, setColonyName] = useState('');
  const [colonyAddress, setColonyAddress] = useState('');
  const [blocksInput, setBlocksInput] = useState(''); // comma separated
  const [selectedColony, setSelectedColony] = useState(null);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  const fetchColonies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/apartments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setColonies(data);
      }
    } catch (err) {
      showMessage('error', 'Failed to fetch colonies.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async (colonyId) => {
    setLoadingBuildings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/colony/${colonyId}/buildings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
      }
    } catch (err) {
      showMessage('error', 'Failed to fetch buildings.');
    } finally {
      setLoadingBuildings(false);
    }
  };

  useEffect(() => {
    fetchColonies();
  }, []);

  const handleCreateColony = async (e) => {
    e.preventDefault();
    if (!colonyName.trim() || !colonyAddress.trim()) {
      return showMessage('error', 'Colony Name and Address are required.');
    }
    const blocksList = blocksInput
      .split(',')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/colony`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: colonyName,
          address: colonyAddress,
          buildings: blocksList
        })
      });
      if (res.ok) {
        showMessage('success', 'Colony created successfully.');
        setColonyName('');
        setColonyAddress('');
        setBlocksInput('');
        fetchColonies();
        fetchDashboardData();
      } else {
        const txt = await res.text();
        showMessage('error', txt || 'Failed to create colony.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    }
  };

  const handleAddBuilding = async (e) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    if (!selectedColony || !selectedColony.id) {
      return showMessage('error', 'Please select a colony first.');
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/colony/${selectedColony.id}/building`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBuildingName })
      });
      if (res.ok) {
        showMessage('success', 'Building added.');
        setNewBuildingName('');
        fetchBuildings(selectedColony.id);
        if (fetchDashboardData) fetchDashboardData();
      } else {
        const txt = await res.text();
        showMessage('error', txt || `Failed to add building (HTTP ${res.status}).`);
      }
    } catch (err) {
      showMessage('error', 'Network error while adding building.');
    }
  };

  const handleDeleteBuilding = async (buildingId) => {
    if (!confirm('Are you sure you want to delete this building?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/building/${buildingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Building deleted successfully.');
        fetchBuildings(selectedColony.id);
        fetchDashboardData();
      } else {
        const txt = await res.text();
        showMessage('error', txt || 'Failed to delete building.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Colony & Buildings</h2>
          <p className="text-xs text-slate-600 dark:text-slate-500">Add communities, colonies or areas, and manage their associated building blocks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Colony Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide">Add New Colony</h3>
          <form onSubmit={handleCreateColony} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Colony / Apartment Name</label>
              <input
                type="text" required placeholder="e.g. Green Meadows"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                value={colonyName}
                onChange={e => setColonyName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Address</label>
              <input
                type="text" required placeholder="e.g. Sector 4, HSR Layout"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                value={colonyAddress}
                onChange={e => setColonyAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Initial Buildings / Blocks (Comma separated)</label>
              <input
                type="text" placeholder="e.g. Block A, Block B, Tower C"
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                value={blocksInput}
                onChange={e => setBlocksInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-xs shadow-md cursor-pointer"
            >
              Register Colony
            </button>
          </form>
        </div>

        {/* Colony List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl md:col-span-2 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide">Registered Colonies</h3>
          {loading ? (
            <div className="text-center py-6 text-slate-500 text-xs">Loading...</div>
          ) : colonies.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">No colonies found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {colonies.map(c => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedColony(c); fetchBuildings(c.id); }}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedColony?.id === c.id
                      ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <h4 className="font-bold text-slate-900 dark:text-slate-200 text-xs">{c.name}</h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1">{c.address}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buildings list under Selected Colony */}
      {selectedColony && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
                Manage Buildings under: <span className="text-blue-600 dark:text-blue-400 font-extrabold normal-case">{selectedColony.name}</span>
              </h3>
              <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1">Add or remove building blocks/towers in this colony.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Add Building Form */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Add Building / Block</h4>
              <form onSubmit={handleAddBuilding} className="space-y-3">
                <input
                  type="text" required placeholder="e.g. Block D"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                  value={newBuildingName}
                  onChange={e => setNewBuildingName(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition text-xs shadow-sm cursor-pointer"
                >
                  Add Building
                </button>
              </form>
            </div>

            {/* Buildings List */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Buildings / Blocks</h4>
              {loadingBuildings ? (
                <div className="text-slate-500 text-xs">Loading buildings...</div>
              ) : buildings.length === 0 ? (
                <div className="text-slate-500 text-xs">No buildings in this colony.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {buildings.map(b => (
                    <div key={b.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between group">
                      <span className="text-xs text-slate-900 dark:text-slate-300 font-bold">{b.name}</span>
                      <button
                        onClick={() => handleDeleteBuilding(b.id)}
                        className="text-rose-600 hover:text-rose-500 dark:text-rose-500 dark:hover:text-rose-400 text-[10px] uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// PLACEHOLDER TAB FOR LATER WEEKS (3-8)
// -------------------------------------------------------------
// NEW AND IMPLEMENTED TABS (TARIFFS, BILLING, TANKERS, INVOICES, ALERTS, CALCULATOR)
// -------------------------------------------------------------
function PlaceholderTab({ tabName }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
      <div className="bg-blue-50 dark:bg-slate-950/65 border border-blue-200 dark:border-slate-800 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-md">
        <Activity size={24} />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-wide uppercase capitalize">
          {tabName.replace('_', ' ')} Panel
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-500 max-w-sm mx-auto mt-2 font-medium">
          This feature is scheduled for implementation in a later module cycle (Weeks 3 to 8). Week 1-2 core REST APIs and client views are fully functional.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NEW AND IMPLEMENTED TABS (TARIFFS, BILLING, TANKERS, INVOICES, ALERTS, CALCULATOR)
// -------------------------------------------------------------

function TariffPlansTab({ token, apartments = [], showMessage, isSuperAdmin, profile }) {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ apartmentId: '', baseRate: '', excessRate: '', baseLimitKl: '', baseLimitDays: 30 });

  const loadTariffForApartment = async (apartmentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tariffs/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTariffs(data);
        const existing = data.find(t => t.apartment && t.apartment.id.toString() === apartmentId.toString());
        if (existing) {
          setFormData({
            apartmentId: apartmentId.toString(),
            baseRate: existing.baseRate != null ? existing.baseRate.toString() : '',
            excessRate: existing.excessRate != null ? existing.excessRate.toString() : '',
            baseLimitKl: existing.baseLimitKl != null ? existing.baseLimitKl.toString() : '',
            baseLimitDays: existing.baseLimitDays != null ? existing.baseLimitDays.toString() : 30
          });
        } else {
          setFormData(prev => ({
            ...prev,
            apartmentId: apartmentId.toString(),
            baseLimitDays: 30
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let targetId = profile?.managedApartment?.id || (apartments && apartments.length > 0 ? apartments[0].id : null);
    if (!isSuperAdmin && targetId) {
      const val = targetId.toString();
      setFormData(prev => ({ ...prev, apartmentId: val }));
      loadTariffForApartment(val);
    } else {
      fetchTariffs();
    }
  }, [isSuperAdmin, profile?.managedApartment?.id, apartments?.length]);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tariffs/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTariffs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let targetAptId = formData.apartmentId;
    if (!targetAptId && profile?.managedApartment?.id) {
      targetAptId = profile.managedApartment.id.toString();
    } else if (!targetAptId && apartments.length > 0) {
      targetAptId = apartments[0].id.toString();
    }

    if (!targetAptId) {
      showMessage('error', 'Please select an apartment block.');
      return;
    }

    if (!isSuperAdmin && profile?.managedApartment && profile.managedApartment.id.toString() !== targetAptId.toString()) {
      showMessage('error', 'You can only configure tariff plans for your managed apartment.');
      return;
    }

    const payload = {
      apartmentId: targetAptId,
      baseRate: formData.baseRate !== '' ? formData.baseRate : '0',
      excessRate: formData.excessRate !== '' ? formData.excessRate : '0',
      baseLimitKl: formData.baseLimitKl !== '' ? formData.baseLimitKl : '0',
      baseLimitDays: formData.baseLimitDays ? formData.baseLimitDays : 30
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/tariffs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showMessage('success', 'Tariff plan saved successfully!');
        setFormData({
          apartmentId: targetAptId,
          baseRate: payload.baseRate,
          excessRate: payload.excessRate,
          baseLimitKl: payload.baseLimitKl,
          baseLimitDays: payload.baseLimitDays
        });
        fetchTariffs();
      } else {
        const text = await res.text();
        showMessage('error', text || 'Failed to save tariff plan.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Tariff Configurations</h2>
      </div>

      {(isSuperAdmin || profile?.managedApartment) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-2">Set Tariff Rates</h3>
          {!isSuperAdmin && profile?.managedApartment && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mb-3 font-medium">
              ⚙️ You are configuring the tariff plan for <span className="font-bold text-amber-600 dark:text-amber-400">{profile.managedApartment.name}</span>. This will override any super admin-defined rates for your apartment.
            </p>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Apartment Block</label>
              <select
                required
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={formData.apartmentId}
                disabled={!isSuperAdmin}
                onChange={e => {
                  const aptId = e.target.value;
                  const existing = tariffs.find(t => t.apartment && t.apartment.id.toString() === aptId.toString());
                  if (existing) {
                    setFormData({
                      ...formData,
                      apartmentId: aptId,
                      baseRate: existing.baseRate || '',
                      excessRate: existing.excessRate || '',
                      baseLimitKl: existing.baseLimitKl || '',
                      baseLimitDays: existing.baseLimitDays || 30
                    });
                  } else {
                    setFormData({ ...formData, apartmentId: aptId, baseRate: '', excessRate: '', baseLimitKl: '', baseLimitDays: 30 });
                  }
                }}
              >
                <option value="">-- Choose Building --</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Base Rate (₹/kL)</label>
              <input
                type="number" step="0.01" required placeholder="30.00"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={formData.baseRate}
                onChange={e => setFormData({ ...formData, baseRate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Base Limit (kL)</label>
              <input
                type="number" step="any" required placeholder="1.5"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={formData.baseLimitKl}
                onChange={e => setFormData({ ...formData, baseLimitKl: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Cycle Length (Days)</label>
              <input
                type="number" step="1" required placeholder="30"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={formData.baseLimitDays || ''}
                onChange={e => setFormData({ ...formData, baseLimitDays: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Excess Rate (₹/kL)</label>
                <input
                  type="number" step="0.01" required placeholder="60.00"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={formData.excessRate}
                  onChange={e => setFormData({ ...formData, excessRate: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition h-fit shrink-0 cursor-pointer shadow-md"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase mb-4">Active Tariff Rates Table</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 text-xs py-4 text-center">Loading tariffs...</p>
          ) : tariffs.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4 text-center">No tariff plans defined. Default rates (₹30.00 base, ₹60.00 excess, 15000L limit) will apply.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Apartment Name</th>
                  <th className="pb-3">Base Rate (per kL)</th>
                  <th className="pb-3">Base Limit (Liters / kL)</th>
                  <th className="pb-3">Excess Rate (per kL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                {tariffs.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                    <td className="py-3 pl-2 font-bold text-slate-900 dark:text-slate-100">{t.apartment?.name}</td>
                    <td className="font-medium text-slate-800 dark:text-slate-300">₹{t.baseRate?.toFixed(2)}</td>
                    <td className="font-medium text-slate-800 dark:text-slate-300">
                      {t.baseLimitKl != null ? (t.baseLimitKl * 1000).toLocaleString() : 0} Liters ({t.baseLimitKl} kL)
                    </td>
                    <td className="text-blue-600 dark:text-blue-400 font-bold">₹{t.excessRate?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function BillingTab({ token, apartments = [], users = [], showMessage, isSuperAdmin, profile }) {
  const [cycles, setCycles] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [finalizingId, setFinalizingId] = useState(null);
  const [formData, setFormData] = useState({ apartmentId: '', startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], endDate: '', totalBulkCost: '' });
  
  // Auto pre-select apartment for Community Admin / single apartment view and sync cost with Tariff Plan
  useEffect(() => {
    let targetAptId = formData.apartmentId;
    if (!targetAptId && apartments && apartments.length > 0) {
      const defaultApt = profile?.managedApartment ? profile.managedApartment : apartments[0];
      targetAptId = defaultApt.id.toString();
    }

    if (targetAptId) {
      const existingTariff = tariffs.find(t => t.apartment && t.apartment.id.toString() === targetAptId.toString());
      if (existingTariff && existingTariff.baseRate != null) {
        const tariffCost = existingTariff.baseRate.toString();
        setFormData(prev => {
          if (prev.totalBulkCost !== tariffCost || prev.apartmentId !== targetAptId) {
            return { ...prev, apartmentId: targetAptId, totalBulkCost: tariffCost };
          }
          return prev;
        });
      } else {
        setFormData(prev => {
          if (prev.apartmentId !== targetAptId) {
            return { ...prev, apartmentId: targetAptId };
          }
          return prev;
        });
      }
    }
  }, [apartments, tariffs, profile, formData.apartmentId]);

  // For Super Admin creating a direct Admin Bill
  const [adminBillData, setAdminBillData] = useState({ targetUserId: '', billingCycleId: '', amount: '', description: '' });
  const [creatingAdminBill, setCreatingAdminBill] = useState(false);

  // For viewing/editing invoices
  const [selectedCycleBills, setSelectedCycleBills] = useState(null);
  
  // Editing a bill
  const [editingBillId, setEditingBillId] = useState(null);
  const [editBillData, setEditBillData] = useState({ amount: '', paid: false });

  const fetchCycles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/cycles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCycles(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTariffs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tariffs/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTariffs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCycles();
    fetchTariffs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showMessage('success', 'Billing cycle created successfully!');
        const defaultAptId = (apartments && apartments.length > 0) ? (profile?.managedApartment ? profile.managedApartment.id.toString() : apartments[0].id.toString()) : '';
        setFormData({ apartmentId: defaultAptId, startDate: '', endDate: '', totalBulkCost: '' });
        fetchCycles();
      } else {
        const text = await res.text();
        showMessage('error', text || 'Failed to create billing cycle.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    } finally {
      setCreating(false);
    }
  };

  const [deletingId, setDeletingId] = useState(null);

  const handleFinalize = async (cycleId) => {
    setFinalizingId(cycleId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/cycle/${cycleId}/finalize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Calculations completed! Billing cycle finalized.');
        fetchCycles();
      } else {
        const text = await res.text();
        showMessage('error', text || 'Finalization failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    } finally {
      setFinalizingId(null);
    }
  };

  const handleDeleteCycle = async (cycleId) => {
    if (!window.confirm("Are you sure you want to delete this unfinalized billing cycle?")) return;
    setDeletingId(cycleId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/cycle/${cycleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Billing cycle deleted successfully!');
        fetchCycles();
      } else {
        const text = await res.text();
        showMessage('error', text || 'Failed to delete billing cycle.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    } finally {
      setDeletingId(null);
    }
  };

  const viewInvoices = async (cycleId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/cycle/${cycleId}/bills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCycleBills(data);
      }
    } catch (err) {
      showMessage('error', 'Could not load bills.');
    }
  };

  const startEditBill = (bill) => {
    setEditingBillId(bill.id);
    setEditBillData({ amount: bill.amount, paid: bill.paid });
  };

  const cancelEditBill = () => {
    setEditingBillId(null);
  };

  const handleUpdateBill = async (billId, cycleId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/bill/${billId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editBillData)
      });
      if (res.ok) {
        showMessage('success', 'Bill updated successfully!');
        setEditingBillId(null);
        viewInvoices(cycleId); // refresh invoices
      } else {
        const text = await res.text();
        showMessage('error', text || 'Update failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleDeleteBill = async (billId, cycleId) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/bill/${billId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Bill deleted successfully!');
        viewInvoices(cycleId); // refresh invoices
      } else {
        const text = await res.text();
        showMessage('error', text || 'Deletion failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleCreateAdminBill = async (e) => {
    e.preventDefault();
    setCreatingAdminBill(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/admin-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adminBillData)
      });
      if (res.ok) {
        showMessage('success', 'Admin bill generated successfully!');
        setAdminBillData({ targetUserId: '', billingCycleId: '', amount: '', description: '' });
      } else {
        const text = await res.text();
        showMessage('error', text || 'Failed to generate admin bill.');
      }
    } catch (err) {
      showMessage('error', 'Network error.');
    } finally {
      setCreatingAdminBill(false);
    }
  };

  const communityAdmins = users?.filter(u => u.role === 'ROLE_COMMUNITY_ADMIN') || [];

  const getResidentName = (householdId) => {
    if (!users) return 'Unassigned';
    const resident = users.find(u => u.household?.id === householdId && u.role === 'ROLE_USER');
    return resident ? resident.name : 'Unassigned';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{isSuperAdmin ? 'Billing History' : 'Billing Operations'}</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          {isSuperAdmin ? 'View and monitor past billing cycles and invoices.' : 'Manage and monitor billing cycles for each apartment block. Open new billing cycles to start tracking water consumption and associated costs. Once the cycle period is complete, finalize it to automatically calculate charges based on tariff plans and generate invoices for all registered households.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isSuperAdmin && <div className="space-y-6 lg:col-span-1">
          {/* Create Cycle Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Open Billing Cycle</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Apartment Block</label>
                {(!isSuperAdmin || apartments.length === 1) ? (
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-semibold flex items-center justify-between">
                    <span className="truncate">
                      {apartments.find(a => a.id.toString() === formData.apartmentId?.toString())?.name || profile?.managedApartment?.name || apartments[0]?.name || 'Assigned Apartment'}
                      {(apartments.find(a => a.id.toString() === formData.apartmentId?.toString())?.address || profile?.managedApartment?.address || apartments[0]?.address) && (
                        <span className="text-slate-500 dark:text-slate-400 font-normal"> — {apartments.find(a => a.id.toString() === formData.apartmentId?.toString())?.address || profile?.managedApartment?.address || apartments[0]?.address}</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <select required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.apartmentId} onChange={e => {
                    const aptId = e.target.value;
                    const existingTariff = tariffs.find(t => t.apartment && t.apartment.id.toString() === aptId.toString());
                    const defaultCost = (existingTariff && existingTariff.baseRate != null) ? existingTariff.baseRate.toString() : '';
                    setFormData({ ...formData, apartmentId: aptId, totalBulkCost: defaultCost });
                  }}>
                    {apartments.length > 1 && <option value="">-- Choose Apartment --</option>}
                    {apartments.map(a => <option key={a.id} value={a.id}>{a.name} — {a.address}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input type="date" required max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input type="date" required max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cost (₹)</label>
                  {(() => {
                    const activeTariff = tariffs.find(t => t.apartment && t.apartment.id.toString() === formData.apartmentId?.toString());
                    return activeTariff && activeTariff.baseRate != null ? (
                      <span className="text-[9px] text-blue-700 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800/40 px-1.5 py-0.2 rounded">
                        Synced with Tariff: ₹{activeTariff.baseRate}
                      </span>
                    ) : null;
                  })()}
                </div>
                <input type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.totalBulkCost} onChange={e => setFormData({ ...formData, totalBulkCost: e.target.value })} />
              </div>
              <button type="submit" disabled={creating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs transition shadow-md cursor-pointer">
                {creating ? 'Opening...' : 'Create Cycle'}
              </button>
            </form>
          </div>

          {/* Admin Bill Panel (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/50 p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-amber-600 dark:text-amber-500 text-xs tracking-wide uppercase mb-4">Generate Admin Bill</h3>
              <form onSubmit={handleCreateAdminBill} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Community Admin</label>
                  <select required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:outline-none" value={adminBillData.targetUserId} onChange={e => setAdminBillData({ ...adminBillData, targetUserId: e.target.value })}>
                    <option value="">-- Select Admin --</option>
                    {communityAdmins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Billing Cycle</label>
                  <select required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:outline-none" value={adminBillData.billingCycleId} onChange={e => setAdminBillData({ ...adminBillData, billingCycleId: e.target.value })}>
                    <option value="">-- Select Cycle --</option>
                    {cycles.map(c => <option key={c.id} value={c.id}>{c.startDate} ({c.apartment?.name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input type="number" step="0.01" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:outline-none" value={adminBillData.amount} onChange={e => setAdminBillData({ ...adminBillData, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <input type="text" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none" value={adminBillData.description} onChange={e => setAdminBillData({ ...adminBillData, description: e.target.value })} placeholder="e.g. Infrastructure Maintenance" />
                </div>
                <button type="submit" disabled={creatingAdminBill} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 rounded-lg text-xs transition cursor-pointer shadow-md">
                  {creatingAdminBill ? 'Generating...' : 'Issue Admin Bill'}
                </button>
              </form>
            </div>
          )}
        </div>}

        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl h-fit shadow-sm ${isSuperAdmin ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Billing Cycles Directory</h3>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-slate-500 text-xs py-4 text-center">Loading cycles...</p>
            ) : cycles.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4 text-center">No billing cycles opened yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                    <th className="pb-3 pl-2">Apartment</th>
                    <th className="pb-3">Period</th>
                    <th className="pb-3">Cost</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                  {cycles.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                      <td className="py-3 pl-2">
                        <div className="font-bold text-slate-900 dark:text-slate-200">{c.apartment?.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{c.apartment?.address}</div>
                      </td>
                      <td className="font-medium text-slate-800 dark:text-slate-300">{c.startDate} to {c.endDate}</td>
                      <td className="font-bold text-slate-900 dark:text-slate-100">₹{c.totalBulkCost?.toFixed(2) || '0.00'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${c.finalized ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400'}`}>
                          {c.finalized ? 'Finalized' : 'Active'}
                        </span>
                      </td>
                      <td className="text-right py-2">
                        <div className="flex items-center justify-end gap-2">
                        {c.finalized ? (
                          <button
                            onClick={() => viewInvoices(c.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 px-2.5 py-1 rounded-lg font-bold text-[10px] transition shadow-sm cursor-pointer"
                          >
                            View Invoices
                          </button>
                        ) : (
                          !isSuperAdmin && (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={deletingId === c.id || finalizingId === c.id}
                                onClick={() => handleDeleteCycle(c.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-sm border border-red-500 transition cursor-pointer disabled:opacity-50"
                              >
                                {deletingId === c.id ? 'Deleting...' : 'Delete'}
                              </button>
                              <button
                                disabled={finalizingId === c.id || deletingId === c.id}
                                onClick={() => handleFinalize(c.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-sm border border-emerald-500 transition cursor-pointer disabled:opacity-50"
                              >
                                {finalizingId === c.id ? 'Running...' : 'Finalize & Bill'}
                              </button>
                            </div>
                          )
                        )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selectedCycleBills && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mt-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase">Calculated Invoices for Selected Cycle</h3>
            <button onClick={() => setSelectedCycleBills(null)} className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer">Close List</button>
          </div>
          <div className="overflow-x-auto">
            {selectedCycleBills.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-2">No invoices generated. Check if this apartment has registered households.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                    <th className="pb-3 pl-2">Invoice No</th>
                    <th className="pb-3">Target</th>
                    <th className="pb-3">Consumption</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                  {selectedCycleBills.map(b => {
                    const cycleId = b.billingCycle?.id;
                    const isTargetAdmin = !!b.targetUser;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-2 pl-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">{b.invoiceNumber}</td>
                        <td className="py-2">
                          {isTargetAdmin ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">Admin: {b.targetUser?.name}</span>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-200">Block {b.household?.block} - Flat {b.household?.flatNumber}</span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{getResidentName(b.household?.id)}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-2 font-medium">
                          {isTargetAdmin ? <span className="text-slate-400 italic">N/A</span> : `${b.consumptionLiters.toLocaleString()} L`}
                        </td>
                        <td className="py-2 font-bold">
                          {editingBillId === b.id ? (
                            <input type="number" step="0.01" className="w-20 px-1 py-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100" value={editBillData.amount} onChange={(e) => setEditBillData({...editBillData, amount: e.target.value})} />
                          ) : (
                            <span className="font-bold text-slate-900 dark:text-slate-100">₹{b.amount.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-2">
                          {editingBillId === b.id ? (
                            <select className="w-20 px-1 py-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100" value={editBillData.paid} onChange={(e) => setEditBillData({...editBillData, paid: e.target.value === 'true'})}>
                              <option value="false">Unpaid</option>
                              <option value="true">Paid</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${b.paid ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'}`}>
                              {b.paid ? 'Paid' : 'Unpaid'}
                            </span>
                          )}
                        </td>
                        <td className="text-right py-2">
                          {editingBillId === b.id ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleUpdateBill(b.id, cycleId)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold cursor-pointer">Save</button>
                              <button onClick={cancelEditBill} className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold cursor-pointer">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              {!isSuperAdmin && <button onClick={() => startEditBill(b)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold cursor-pointer">Edit</button>}
                              {!isSuperAdmin && <button onClick={() => handleDeleteBill(b.id, cycleId)} className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold cursor-pointer">Delete</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WaterPurchaseTab({ token, apartments = [], showMessage, isSuperAdmin, profile }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ apartmentId: '', date: '', liters: '', cost: '', supplierName: '', invoiceNumber: '' });

  useEffect(() => {
    if (apartments && apartments.length > 0 && !formData.apartmentId) {
      const defaultApt = profile?.managedApartment ? profile.managedApartment : apartments[0];
      setFormData(prev => ({ ...prev, apartmentId: defaultApt.id.toString() }));
    }
  }, [apartments, profile]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showMessage('success', 'Bulk water tanker purchase logged successfully!');
        const defaultAptId = (apartments && apartments.length > 0) ? (profile?.managedApartment ? profile.managedApartment.id.toString() : apartments[0].id.toString()) : '';
        setFormData({ apartmentId: defaultAptId, date: '', liters: '', cost: '', supplierName: '', invoiceNumber: '' });
        fetchPurchases();
      } else {
        const text = await res.text();
        showMessage('error', text || 'Logging failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Log Bulk Water Purchase (Tankers)</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl h-fit shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Log Tanker Delivery</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Apartment Block</label>
              {(!isSuperAdmin || apartments.length === 1) ? (
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-semibold flex items-center justify-between">
                  <span className="truncate">
                    {apartments.find(a => a.id.toString() === formData.apartmentId?.toString())?.name || profile?.managedApartment?.name || apartments[0]?.name || 'Assigned Apartment'}
                  </span>
                  <span className="text-[9px] bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30 px-2 py-0.5 rounded uppercase font-bold flex-shrink-0 ml-2">Managed</span>
                </div>
              ) : (
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  value={formData.apartmentId}
                  onChange={e => setFormData({ ...formData, apartmentId: e.target.value })}
                >
                  {apartments.length > 1 && <option value="">-- Choose Apartment --</option>}
                  {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Delivery Date</label>
              <input
                type="date" required max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Quantity (Liters)</label>
              <input
                type="number" step="1" required placeholder="e.g. 10000"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.liters}
                onChange={e => setFormData({ ...formData, liters: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Price (₹)</label>
              <input
                type="number" step="0.01" required placeholder="e.g. 150.00"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.cost}
                onChange={e => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Supplier / Tanker Provider</label>
              <input
                type="text" required placeholder="Metro Water Supply"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.supplierName}
                onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Invoice / Receipt No</label>
              <input
                type="text" placeholder="TXN-984394"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.invoiceNumber}
                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>
            <button
              type="submit" disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-lg text-xs transition shadow-md cursor-pointer"
            >
              {saving ? 'Saving...' : 'Record Purchase'}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl lg:col-span-2 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Tanker Deliveries History</h3>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-slate-500 text-xs py-4 text-center">Loading purchases...</p>
            ) : purchases.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4 text-center">No purchases recorded.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                    <th className="pb-3 pl-2">Date</th>
                    <th className="pb-3">Apartment</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Supplier</th>
                    <th className="pb-3">Invoice No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                      <td className="py-3 pl-2 text-slate-800 dark:text-slate-300 font-medium">{p.date}</td>
                      <td className="font-bold text-slate-900 dark:text-slate-100">{p.apartment?.name}</td>
                      <td className="font-medium text-slate-800 dark:text-slate-300">{p.liters.toLocaleString()} L</td>
                      <td className="font-bold text-emerald-600 dark:text-emerald-400">₹{p.cost.toFixed(2)}</td>
                      <td className="text-slate-800 dark:text-slate-300 font-medium">{p.supplierName}</td>
                      <td className="font-mono text-purple-600 dark:text-purple-400 font-bold">{p.invoiceNumber || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicesTab({ token, showMessage }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/bills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Invoices & Surcharges</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase mb-4 font-sans">System Generated Invoices</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 text-xs py-4 text-center">Loading invoices...</p>
          ) : bills.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4 text-center">No invoices found. Generate them by finalizing billing cycles.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Invoice ID</th>
                  <th className="pb-3">Resident / Flat</th>
                  <th className="pb-3">Billing Cycle</th>
                  <th className="pb-3">Total Volume</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                {bills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                    <td className="py-3 pl-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{b.invoiceNumber}</td>
                    <td>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{b.household?.apartment?.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Block {b.household?.block} - Flat {b.household?.flatNumber}</p>
                    </td>
                    <td className="font-medium text-slate-800 dark:text-slate-300">{b.billingCycle?.startDate} to {b.billingCycle?.endDate}</td>
                    <td className="font-medium text-slate-800 dark:text-slate-300">{b.consumptionLiters.toLocaleString()} Liters</td>
                    <td className="font-bold text-slate-900 dark:text-slate-100">₹{b.amount.toFixed(2)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${b.paid ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950/20 border-red-300 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {b.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <button
                        onClick={() => setActiveInvoice(b)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer shadow-sm"
                      >
                        Print/View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeInvoice && (
        <InvoiceModal 
          invoice={activeInvoice} 
          onClose={() => setActiveInvoice(null)} 
          onDownload={(id) => handleDownloadPdf(id, token, showMessage)}
        />
      )}
    </div>
  );
}

function AlertsTab({ token, households, showMessage, isAdmin, onUpdate, fetchDashboardData }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', type: 'MAINTENANCE', householdId: '' });

  const formatAlertDateTime = (dateVal, createdAtVal) => {
    const val = createdAtVal || dateVal;
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch (_) {
      return String(val);
    }
  };

  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'All notifications marked as read!');
        fetchAlerts(true);
        if (fetchDashboardData) fetchDashboardData();
      } else {
        showMessage('error', 'Failed to mark notifications as read.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          householdId: formData.householdId ? parseInt(formData.householdId) : null
        })
      });
      if (res.ok) {
        showMessage('success', 'Alert broadcasted successfully!');
        setFormData({ title: '', message: '', type: 'MAINTENANCE', householdId: '' });
        fetchAlerts();
        if (fetchDashboardData) fetchDashboardData();
      } else {
        showMessage('error', 'Failed to submit broadcast.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/resolve/${alertId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Alert resolved!');
        fetchAlerts();
        if (fetchDashboardData) fetchDashboardData();
      } else {
        showMessage('error', 'Failed to resolve alert.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/clear-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'All notifications cleared!');
        fetchAlerts();
        if (fetchDashboardData) fetchDashboardData();
      } else {
        showMessage('error', 'Failed to clear notifications.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">{isAdmin ? 'System Notifications & Leak Alerts' : 'My Notifications'}</h2>
        {alerts.length > 0 && (
          <div className="flex gap-2">
            {alerts.filter(a => !a.resolved).length > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold px-3 py-1.5 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors bg-blue-950/20"
              >
                Mark all as read
              </button>
            )}
            <button 
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors bg-red-950/20"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Broadcast System Notice</h3>
          <form onSubmit={handleBroadcast} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title</label>
              <input
                type="text" required placeholder="Scheduled Maintenance"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notification Category</label>
              <select
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="MAINTENANCE">Maintenance</option>
                <option value="BILLING">Billing Notification</option>
                <option value="GENERAL">General Notice</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Flat (Optional)</label>
              <select
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                value={formData.householdId}
                onChange={e => setFormData({ ...formData, householdId: e.target.value })}
              >
                <option value="">-- All Residents --</option>
                {households.map(h => <option key={h.id} value={h.id}>{h.apartment?.name} - Block {h.block} - Flat {h.flatNumber}</option>)}
              </select>
            </div>
            <div>
              <button type="submit" disabled={broadcasting} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-xs transition">
                {broadcasting ? 'Sending...' : 'Publish Broadcast'}
              </button>
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notice Message</label>
              <textarea
                required placeholder="Water tankers will be closed from 2PM to 5PM on Sunday due to pipeline upgrades..."
                rows="2"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase">Active Alerts ({alerts.filter(a => !a.resolved).length})</h3>
        {loading ? (
          <p className="text-slate-500 text-xs text-center py-4">Checking alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-555 text-xs italic">
            No system warnings or notifications at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {alerts.map(a => (
              <div
                key={a.id}
                className={`border p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-slate-200 ${a.resolved ? 'bg-slate-950 border-slate-800 opacity-60' : (a.type === 'LEAK' ? 'bg-slate-800 border-red-500/50' : a.type === 'BILLING' ? 'bg-slate-800 border-amber-500/50' : 'bg-slate-800 border-blue-500/50')}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide border uppercase ${a.type === 'LEAK' ? 'bg-red-950 text-red-400 border-red-500/20' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                      {a.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">{formatAlertDateTime(a.date, a.createdAt)}</span>
                  </div>
                  <h4 className="text-sm font-bold">{a.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{a.message}</p>
                </div>
                {!a.resolved && isAdmin && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-slate-100 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsTab({ token }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fixingData, setFixingData] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  const fetchSummary = async (monthVal = selectedMonth) => {
    setLoading(true);
    try {
      const url = monthVal && monthVal !== 'ALL'
        ? `${API_BASE_URL}/api/reports/summary?month=${monthVal}`
        : `${API_BASE_URL}/api/reports/summary`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        console.error('Reports API response not OK:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);
    fetchSummary(val);
  };

  const handleRecalculate = async () => {
    if (!window.confirm('This will recalculate all historical consumption values as proper meter deltas. Proceed?')) return;
    setFixingData(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/usage/recalculate-consumption`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const msg = await res.text();
      alert(msg);
      fetchSummary(selectedMonth);
    } catch (err) {
      alert('Failed to recalculate: ' + err.message);
    } finally {
      setFixingData(false);
    }
  };

  useEffect(() => { fetchSummary('ALL'); }, []);

  const formatMonthLabel = (mStr) => {
    if (!mStr || mStr === 'ALL') return 'All Time (Overall)';
    try {
      const [year, month] = mStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (_) {
      return mStr;
    }
  };

  const consumptionMap = summary?.consumptionByApartment || {};
  const aptNames = Object.keys(consumptionMap);
  const totalConsumed = summary?.totalConsumedLiters || 0;
  const totalPurchased = summary?.totalPurchasedLiters || 0;
  
  // Generate last 12 months options (matching Meter Readings search filter)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      options.push({ val, label });
    }
    return options;
  }, []);

  const chartData = aptNames.map(name => ({
    name,
    consumption: consumptionMap[name] || 0
  }));

  const balanceData = [
    { category: 'Procured Water', volume: totalPurchased },
    { category: 'Consumed Water', volume: totalConsumed }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp size={22} className="text-blue-600 dark:text-blue-400" />
            System Performance & Analytics Reports
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Filter water procurement, consumption, and financial billing reports by month
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 12-Month Search Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors">
            <Calendar size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Filter Month:</label>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">All Available Months</option>
              {monthOptions.map(m => (
                <option key={m.val} value={m.val} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={fixingData}
            className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-3 py-2 rounded-xl font-bold uppercase tracking-wide transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {fixingData ? '⟳ Fixing...' : '🔧 Recalculate'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-slate-500 text-xs font-semibold animate-pulse">Updating analytics for {formatMonthLabel(selectedMonth)}...</p>
        </div>
      ) : (!summary || (totalConsumed === 0 && totalPurchased === 0 && selectedMonth !== 'ALL')) ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3 max-w-md mx-auto my-8 shadow-sm">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <Activity size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Analytics & Usage Data Found</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mt-1">
              There are no water usage readings, procurement purchases, or billing records logged for <strong>{formatMonthLabel(selectedMonth)}</strong>.
            </p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Select another month from the filter dropdown above to view historical reports.
          </p>
        </div>
      ) : (
        <>
          {/* Active Period Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-medium">
            <span>Showing Data For: <strong>{formatMonthLabel(selectedMonth)}</strong></span>
            <span className="text-[11px] opacity-75 font-mono">{aptNames.length} Active Building Blocks</span>
          </div>

          {/* Metric Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Total Water Procured</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">{totalPurchased.toLocaleString()} L</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Total Water Consumed</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">{totalConsumed.toLocaleString()} L</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Procurement Cost</p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1 font-mono">₹{summary.totalPurchasedCost?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Total Revenue Billed</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">₹{summary.totalBilledAmount?.toFixed(2) || '0.00'}</p>
            </div>
          </section>

          {/* Visual Charts & Analytics */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Bar Chart: Block-wise Water Consumption */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase mb-4 flex items-center justify-between">
                <span>Block-wise Consumption ({formatMonthLabel(selectedMonth)})</span>
                <span className="text-[10px] text-blue-500 font-bold">Liters</span>
              </h3>
              {chartData.length === 0 ? (
                <p className="text-slate-500 text-xs italic text-center py-12">No consumption recorded for this period.</p>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#f8fafc', fontSize: '11px' }}
                        formatter={(val) => [`${val.toLocaleString()} Liters`, 'Consumed']}
                      />
                      <Bar dataKey="consumption" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Visual Area Balance: Procured vs Consumed */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase mb-4 flex items-center justify-between">
                <span>Procured vs Consumed Balance ({formatMonthLabel(selectedMonth)})</span>
                <span className="text-[10px] text-emerald-500 font-bold">Water Volume</span>
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#f8fafc', fontSize: '11px' }}
                      formatter={(val) => [`${val.toLocaleString()} Liters`, 'Volume']}
                    />
                    <Bar dataKey="volume" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Breakdown Table & Progress Bars */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase mb-4">Building Block Usage Breakdown</h3>
            <div className="space-y-3">
              {aptNames.length === 0 ? (
                <p className="text-slate-500 text-xs italic text-center py-4">No block consumption data logged for {formatMonthLabel(selectedMonth)}.</p>
              ) : (
                aptNames.map(name => {
                  const val = consumptionMap[name];
                  const percentage = totalConsumed ? (val / totalConsumed) * 100 : 0;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-300">
                        <span>{name}</span>
                        <span className="font-mono">{val.toLocaleString()} L ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden">
                        <div style={{ width: `${percentage}%` }} className="bg-blue-500 h-full rounded-full transition-all duration-500"></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const handleDownloadPdf = async (billId, token, showMessage) => {
  try {
    showMessage && showMessage('info', 'Generating PDF...');
    const res = await fetch(`${API_BASE_URL}/api/billing/bill/${billId}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showMessage && showMessage('success', 'PDF downloaded successfully!');
    } else {
      showMessage && showMessage('error', 'Failed to download PDF.');
    }
  } catch (err) {
    showMessage && showMessage('error', 'Network error while downloading PDF.');
  }
};

function MyBillsTab({ token, showMessage }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [modalMode, setModalMode] = useState('view');

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/bills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async (billId) => {
    setPayingId(billId);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showMessage('error', 'Failed to load Razorpay SDK. Check network connection.');
        setPayingId(null);
        return;
      }

      // Step 1: Request order creation on backend
      const orderRes = await fetch(`${API_BASE_URL}/api/billing/pay/razorpay/create-order/${billId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!orderRes.ok) {
        showMessage('error', 'Failed to initialize Razorpay payment.');
        setPayingId(null);
        return;
      }

      const orderData = await orderRes.json();
      const targetBill = bills.find(b => b.id === billId);


      // Step 2: Configure Razorpay Checkout options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'AquaTrack Portal',
        description: `Payment for Invoice #${targetBill?.invoiceNumber || billId}`,
        handler: async function (response) {
          try {
            setPayingId(billId);
            // Step 3: Verify signature and settle payment on backend
            const verifyRes = await fetch(`${API_BASE_URL}/api/billing/pay/razorpay/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id || 'pay_mock_' + Date.now(),
                razorpayOrderId: response.razorpay_order_id || orderData.orderId,
                razorpaySignature: response.razorpay_signature || 'mock_signature',
                billId: billId
              })
            });
            if (verifyRes.ok) {
              showMessage('success', 'Payment successful! Invoice marked as paid.');
              setActiveInvoice(null);
              fetchBills();
            } else {
              const errMsg = await verifyRes.text();
              showMessage('error', errMsg || 'Payment verification failed.');
            }
          } catch (err) {
            showMessage('error', 'Payment verification failed due to network error.');
          } finally {
            setPayingId(null);
          }
        },
        prefill: {
          email: activeInvoice?.targetUser?.email || ''
        },
        theme: {
          color: '#3b82f6'
        },
        modal: {
          ondismiss: function() {
            setPayingId(null);
          }
        }
      };

      options.order_id = orderData.orderId;

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      showMessage('error', 'Communication error while establishing payment transaction.');
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">My Household Bills</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase mb-4">Flat Invoices</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 text-xs py-4 text-center">Loading bills...</p>
          ) : bills.length === 0 ? (
            <p className="text-slate-555 text-xs italic py-4 text-center">No bills logged for your household yet.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-2">Invoice No</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Water Consumption</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {bills.map(b => (
                  <tr key={b.id}>
                    <td className="py-3 pl-2 font-mono text-indigo-400">{b.invoiceNumber}</td>
                    <td>{b.billingCycle?.startDate} to {b.billingCycle?.endDate}</td>
                    <td>{b.consumptionLiters.toLocaleString()} Liters</td>
                    <td className="font-bold text-slate-100">₹{b.amount.toFixed(2)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${b.paid ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/20 text-red-400'}`}>
                        {b.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="text-right py-1">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setActiveInvoice(b); setModalMode('view'); }}
                          className="bg-slate-800 hover:bg-slate-800 text-blue-400 border border-slate-800 px-2.5 py-1 rounded-lg font-bold text-[10px]"
                        >
                          View Receipt
                        </button>
                        {!b.paid && (
                          <button
                            onClick={() => { setActiveInvoice(b); setModalMode('pay'); }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeInvoice && (
        <InvoiceModal 
          invoice={activeInvoice} 
          onClose={() => setActiveInvoice(null)} 
          allowPay={modalMode === 'pay'}
          onPay={handlePay}
          payingId={payingId}
          onDownload={(id) => handleDownloadPdf(id, token, showMessage)}
        />
      )}
    </div>
  );
}

function MyInvoicesTab({ token, showMessage }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/billing/bills`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBills(data.filter(b => b.paid));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">My Paid Receipts</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-wide uppercase mb-4">Invoice Downloads</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 text-xs py-4 text-center">Loading paid receipts...</p>
          ) : bills.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4 text-center">No paid receipts found.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Invoice No</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Volume Used</th>
                  <th className="pb-3">Settled Cost</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                {bills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition">
                    <td className="py-3 pl-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{b.invoiceNumber}</td>
                    <td className="font-medium text-slate-800 dark:text-slate-300">{b.billingCycle?.startDate} to {b.billingCycle?.endDate}</td>
                    <td className="font-medium text-slate-800 dark:text-slate-300">{b.consumptionLiters.toLocaleString()} Liters</td>
                    <td className="font-bold text-emerald-600 dark:text-emerald-400">₹{b.amount.toFixed(2)}</td>
                    <td className="text-right py-1">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveInvoice(b)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer transition"
                        >
                          View Receipt
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(b.id, token, showMessage)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer shadow-xs"
                        >
                          Download PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeInvoice && (
        <InvoiceModal 
          invoice={activeInvoice} 
          onClose={() => setActiveInvoice(null)} 
          onDownload={(id) => handleDownloadPdf(id, token, showMessage)}
        />
      )}
    </div>
  );
}

function WaterTipsTab() {
  const [calculator, setCalculator] = useState({ familySize: '3', showerTime: '8', flushCount: '4', washingLoads: '3' });
  const [result, setResult] = useState(null);

  const calculateFootprint = (e) => {
    e.preventDefault();
    const family = parseInt(calculator.familySize) || 1;
    const shower = parseInt(calculator.showerTime) || 5;
    const flushes = parseInt(calculator.flushCount) || 3;
    const loads = parseInt(calculator.washingLoads) || 2;

    const showerLit = 8 * shower * family;
    const flushLit = 6 * flushes * family;
    const washLit = (80 * loads) / 7;
    const basicLit = 30 * family;

    const dailyTotal = Math.round(showerLit + flushLit + washLit + basicLit);
    const perCapita = Math.round(dailyTotal / family);

    let score = 'Excellent';
    let style = 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400';
    if (perCapita > 150) {
      score = 'High Usage';
      style = 'bg-red-950/20 border-red-500/20 text-red-400';
    } else if (perCapita > 90) {
      score = 'Moderate';
      style = 'bg-amber-950/20 border-amber-500/20 text-amber-400';
    }

    setResult({ total: dailyTotal, perCapita, score, style });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Water Conservation Hub</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl h-fit shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Household Water Footprint Calculator</h3>
          <form onSubmit={calculateFootprint} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Family Members</label>
                <input
                  type="number" min="1" required
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.familySize}
                  onChange={e => setCalculator({ ...calculator, familySize: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Avg Shower Duration (Mins)</label>
                <input
                  type="number" min="1" required
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.showerTime}
                  onChange={e => setCalculator({ ...calculator, showerTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Toilet Flushes per Day / Person</label>
                <input
                  type="number" min="1" required
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.flushCount}
                  onChange={e => setCalculator({ ...calculator, flushCount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Washing Machine Loads / Week</label>
                <input
                  type="number" min="0" required
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.washingLoads}
                  onChange={e => setCalculator({ ...calculator, washingLoads: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer shadow-md">
              Calculate Consumption Rating
            </button>
          </form>

          {result && (
            <div className={`mt-6 p-4 rounded-xl border ${result.style} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase">Estimated Daily Footprint</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-current uppercase">{result.score}</span>
              </div>
              <p className="text-3xl font-black">{result.total.toLocaleString()} L/day</p>
              <p className="text-[10px] opacity-80 font-medium">
                This equals approx <span className="font-bold">{result.perCapita} Liters</span> per member daily. (Target: &lt; 90L)
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide uppercase mb-4">Everyday Conservation Tips</h3>
          <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="flex gap-3">
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-200">Fix Taps Promptly</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">A single dripping tap can waste more than 15 liters of fresh water a day.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-200">Full Washing Cycles Only</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Run clothes washer and dishwasher machines only when they are fully loaded to save up to 100L/week.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-200">Aerated Taps</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Installing low-flow aerators on bathroom and kitchen taps can reduce faucet water consumption by 50% without affecting pressure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// X. SUPPORT TAB
// -------------------------------------------------------------
function SupportTab({ token, profile, showMessage, isSuperAdmin, isCommunityAdmin, onTicketCountChange }) {
  const [tickets, setTickets] = useState({ raisedByMe: [], assignedToMe: [] });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | OPEN | IN_PROGRESS | RESOLVED
  const [section, setSection] = useState('assigned'); // 'assigned' | 'raised'
  
  const [formData, setFormData] = useState({ title: '', description: '', attachment: '' });
  const [resolveData, setResolveData] = useState({ status: 'RESOLVED', resolutionNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const isManager = isSuperAdmin || isCommunityAdmin;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, attachment: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        // Count open tickets for badge
        const allOpen = [
          ...(data.assignedToMe || []).filter(t => t.status === 'OPEN'),
          ...(data.raisedByMe || []).filter(t => t.status === 'OPEN')
        ].length;
        if (onTicketCountChange) onTicketCountChange(allOpen);
      }
    } catch (err) {
      console.error('Error fetching tickets', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showMessage('success', 'Support ticket raised successfully!');
        setFormData({ title: '', description: '', attachment: '' });
        setShowModal(false);
        fetchTickets();
      } else {
        const text = await res.text();
        showMessage('error', text || 'Failed to raise ticket');
      }
    } catch (err) {
      showMessage('error', 'Network error');
    }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: resolveData.status, resolutionNotes: resolveData.resolutionNotes })
      });
      if (res.ok) {
        showMessage('success', 'Ticket updated successfully');
        setResolveModalOpen(false);
        setSelectedTicket(null);
        setResolveData({ status: 'RESOLVED', resolutionNotes: '' });
        fetchTickets();
      } else {
        const text = await res.text();
        showMessage('error', text || 'Failed to update status');
      }
    } catch (err) {
      showMessage('error', 'Network error');
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':   return { cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', dot: 'bg-emerald-400' };
      case 'IN_PROGRESS': return { cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', dot: 'bg-blue-400' };
      default:           return { cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', dot: 'bg-amber-400' };
    }
  };

  const allTickets = [
    ...(tickets.assignedToMe || []).map(t => ({ ...t, _isAssigned: true })),
    ...(tickets.raisedByMe || []).map(t => ({ ...t, _isAssigned: false }))
  ];
  
  const currentList = isManager
    ? (section === 'assigned' ? (tickets.assignedToMe || []).map(t => ({ ...t, _isAssigned: true })) : (tickets.raisedByMe || []).map(t => ({ ...t, _isAssigned: false })))
    : (tickets.raisedByMe || []).map(t => ({ ...t, _isAssigned: false }));

  // Chronological sorting (newest first)
  const sortedList = [...currentList].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const filtered = filterStatus === 'ALL' ? sortedList : sortedList.filter(t => t.status === filterStatus);

  const formatTicketDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (_) {
      return dateStr;
    }
  };

  const countByStatus = (list, status) => status === 'ALL' ? list.length : list.filter(t => t.status === status).length;

  const openTicketRow = (t) => {
    setSelectedTicket(t);
    setDetailModalOpen(true);
  };

  const statusFilters = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LifeBuoy size={22} className="text-blue-600 dark:text-blue-500" />
            Support Tickets
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            {!isManager ? 'Raise issues to your community admin.' : (isCommunityAdmin ? 'Manage resident tickets & raise issues to super admin.' : 'Manage tickets raised by community admins.')}
          </p>
        </div>
        {!isSuperAdmin && (
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center gap-2 shadow-md shrink-0 cursor-pointer">
            <LifeBuoy size={15} /> Raise Ticket
          </button>
        )}
      </div>

      {/* Section Tabs (manager only) */}
      {isManager && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-1 w-fit shadow-xs">
          {[
            { key: 'assigned', label: 'Assigned to Me', count: (tickets.assignedToMe || []).filter(t => t.status === 'OPEN').length },
            { key: 'raised', label: 'Raised by Me', count: 0 }
          ].map(s => (
            <button
              key={s.key}
              onClick={() => { setSection(s.key); setFilterStatus('ALL'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${section === s.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              {s.label}
              {s.count > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">{s.count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Status Filter Dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider shrink-0">Filter by Status</label>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer shadow-sm"
          >
            {statusFilters.map(f => (
              <option key={f.key} value={f.key}>
                {f.label} ({countByStatus(currentList, f.key)})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {filterStatus !== 'ALL' && (
          <button
            onClick={() => setFilterStatus('ALL')}
            className="text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold transition-colors"
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={22} className="animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <LifeBuoy size={36} className="mx-auto text-slate-400 dark:text-slate-700 mb-3" />
          <p className="text-slate-800 dark:text-slate-400 text-sm font-semibold">No tickets found</p>
          <p className="text-slate-500 dark:text-slate-600 text-xs mt-1">
            {filterStatus !== 'ALL' ? `No ${filterStatus.replace('_', ' ').toLowerCase()} tickets.` : 'No support tickets yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* List header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Subject</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">{section === 'assigned' && isManager ? 'From' : 'Assigned To'}</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1"></div>
          </div>
          {filtered.map(t => {
            const badge = getStatusBadge(t.status);
            return (
              <button
                key={t.id}
                onClick={() => openTicketRow(t)}
                className="w-full grid grid-cols-12 gap-3 items-center px-4 py-3.5 bg-white dark:bg-slate-900/50 hover:bg-sky-50/80 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 hover:border-sky-300 dark:hover:border-slate-700 rounded-xl transition-all duration-200 text-left group cursor-pointer shadow-sm dark:shadow-none"
              >
                <div className="col-span-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">#{t.id}</div>
                <div className="col-span-4">
                  <p className="text-slate-900 dark:text-slate-100 font-semibold text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{t.title}</p>
                  {t.resolutionNotes && <p className="text-[10px] text-emerald-600 dark:text-emerald-400/90 truncate mt-0.5 font-medium">↳ {t.resolutionNotes}</p>}
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-extrabold tracking-wider ${badge.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-2 text-[10px] text-slate-700 dark:text-slate-400 font-medium truncate">
                  {t._isAssigned ? (t.raisedBy?.name || 'Unknown') : (t.assignedTo?.name || 'Super Admin')}
                </div>
                <div className="col-span-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  {formatTicketDateTime(t.createdAt)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <svg className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* MODAL — Ticket Detail View */}
      {detailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDetailModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="bg-slate-100/90 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-extrabold tracking-wider ${getStatusBadge(selectedTicket.status).cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(selectedTicket.status).dot}`}></span>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">#{selectedTicket.id}</span>
                </div>
                <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-base leading-tight">{selectedTicket.title}</h3>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 p-1.5 rounded-lg transition shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</p>
                <p className="text-slate-800 dark:text-slate-300 text-sm leading-relaxed">{selectedTicket.description}</p>
              </div>

              {selectedTicket.attachment && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Attachment</p>
                  <a href={selectedTicket.attachment} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <img src={selectedTicket.attachment} alt="Attachment" className="w-full max-h-48 object-cover" />
                  </a>
                </div>
              )}

              {selectedTicket.resolutionNotes && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Resolution Notes</p>
                  <p className="text-emerald-900 dark:text-emerald-300 text-sm italic">"{selectedTicket.resolutionNotes}"</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-100/80 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Raised By</p>
                  <p className="text-slate-800 dark:text-slate-300 font-semibold">{selectedTicket.raisedBy?.name || 'Unknown'}</p>
                </div>
                <div className="bg-slate-100/80 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Assigned To</p>
                  <p className="text-slate-800 dark:text-slate-300 font-semibold">{selectedTicket.assignedTo?.name || 'Super Admin'}</p>
                </div>
                <div className="bg-slate-100/80 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Created</p>
                  <p className="text-slate-800 dark:text-slate-300 font-semibold">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
                <div className="bg-slate-100/80 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-extrabold tracking-wider ${getStatusBadge(selectedTicket.status).cls}`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            {selectedTicket._isAssigned && selectedTicket.status !== 'RESOLVED' && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    setResolveData({ status: selectedTicket.status, resolutionNotes: selectedTicket.resolutionNotes || '' });
                    setResolveModalOpen(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  Update Status
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL — Create Ticket */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-slate-900 dark:text-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <LifeBuoy size={18} className="text-blue-600 dark:text-blue-500" /> Raise Support Ticket
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded-lg transition cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Subject / Title</label>
                <input type="text" required className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  placeholder="e.g. Water leak in Block A"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea required rows="4" className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                  placeholder="Describe the issue in detail..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Attachment (Image, optional, max 5MB)</label>
                <input type="file" accept="image/*" onChange={handleFileUpload}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-xs font-medium file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" />
                {formData.attachment && <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold mt-1.5">✓ Image attached</p>}
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-md cursor-pointer">
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL — Update Status */}
      {resolveModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => { setResolveModalOpen(false); setSelectedTicket(null); }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-slate-900 dark:text-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Update Ticket Status</h3>
              <button onClick={() => { setResolveModalOpen(false); setSelectedTicket(null); }} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded-lg transition cursor-pointer"><X size={16} /></button>
            </div>
            <div className="mb-5 p-3.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-900 dark:text-slate-200 font-bold">{selectedTicket.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-medium">{selectedTicket.description}</p>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                <select className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={resolveData.status} onChange={e => setResolveData({...resolveData, status: e.target.value})}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Resolution / Update Notes</label>
                <textarea rows="3" className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                  placeholder="Provide resolution details or status update..."
                  value={resolveData.resolutionNotes} onChange={e => setResolveData({...resolveData, resolutionNotes: e.target.value})} />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// END OF APP COMPONENTS
// -------------------------------------------------------------


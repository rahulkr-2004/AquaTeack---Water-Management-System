import React, { useState, useEffect, useRef } from 'react';
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
  HelpCircle,
  Crown,
  Sun,
  Moon,
  ChevronRight,
  UploadCloud,
  Camera,
  UserPlus,
  X,
  Check,
  Info,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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
    const inviteToken = urlParams.get('token');
    
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

    if (window.location.pathname === '/invite' || inviteToken) {
      return (
        <>
          <InviteVerificationView inviteToken={inviteToken} showMessage={showMessage} darkMode={darkMode} toggleDarkMode={() => setDarkMode(prev => !prev)} />
          {toastNode}
        </>
      );
    }
    return (
      <>
        <AuthView setToken={setToken} message={message} showMessage={showMessage} darkMode={darkMode} toggleDarkMode={() => setDarkMode(prev => !prev)} />
        {toastNode}
      </>
    );
  }

  const isSuperAdmin = userRole === 'ROLE_ADMIN';
  const isCommunityAdmin = userRole === 'ROLE_COMMUNITY_ADMIN';
  const isManager = isSuperAdmin || isCommunityAdmin;

  // Define sidebar items based on roles matching mockup exactly
  const sidebarItems = isManager 
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'households', label: isSuperAdmin ? 'Buildings' : 'Apartments / Flats', icon: isSuperAdmin ? <Building2 size={18} /> : <Home size={18} /> },
        { id: 'residents', label: 'Residents', icon: <UserCheck size={18} /> },
        { id: 'water_usage', label: 'Water Usage', icon: <Activity size={18} /> },
        { id: 'meter_readings', label: 'Meter Readings', icon: <List size={18} /> },
        { id: 'billing', label: 'Billing', icon: <DollarSign size={18} /> },
        { id: 'tariff_plans', label: 'Tariff Plans', icon: <FlameKindling size={18} /> },
        { id: 'water_purchase', label: 'Water Purchase', icon: <Truck size={18} /> },
        { id: 'invoices', label: 'Invoices', icon: <FileText size={18} /> },
        { id: 'alerts', label: 'Alerts', icon: <Bell size={18} />, badge: alertsCount },
        { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
        { id: 'profile', label: 'Profile', icon: <User size={18} /> }
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'my_usage', label: 'My Usage', icon: <Activity size={18} /> },
        { id: 'usage_history', label: 'Usage History', icon: <List size={18} /> },
        { id: 'my_bills', label: 'My Bills', icon: <DollarSign size={18} /> },
        { id: 'my_invoices', label: 'My Invoices', icon: <FileText size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, badge: alertsCount },
        { id: 'water_tips', label: 'Water Tips', icon: <HelpCircle size={18} /> },
        { id: 'profile', label: 'Profile', icon: <User size={18} /> }
      ];

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
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center z-10 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-500/10">
            <Droplets size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-0.5">
              Aqua<span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent font-black">Track</span>
              {isSuperAdmin && <Crown size={16} className="text-amber-400 animate-bounce ml-0.5" />}
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {isSuperAdmin ? 'Super Admin Portal' : isCommunityAdmin ? 'Community Admin Portal' : 'Resident Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {profile && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-400">Welcome,</span>
              <span className={`font-bold ${isSuperAdmin ? 'text-amber-400' : 'text-blue-400'}`}>{profile.name}</span>
            </div>
          )}
          <button 
            onClick={() => { fetchDashboardData(); fetchProfile(); }}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 hover:text-slate-100 font-semibold"
          >
            Refresh
          </button>
          <button
            onClick={() => setDarkMode(prev => !prev)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 hover:text-slate-100"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <span className={`border px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getBadgeStyle()}`}>
            {isSuperAdmin ? 'Super Admin' : isCommunityAdmin ? 'Community Admin' : 'Resident'}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Menu */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">Navigation Menu</p>
            <nav className="space-y-1">
              {sidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition duration-150 text-xs font-semibold ${activeTab === item.id ? (isSuperAdmin ? 'bg-amber-600 text-white shadow-md shadow-amber-600/15' : 'bg-blue-600 text-white shadow-md' ) : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
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

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-150 text-xs font-semibold"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950 space-y-6">


          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-500 mb-3" size={28} />
              <span className="text-slate-400 text-xs font-medium">Fetching details...</span>
            </div>
          ) : (
            <div>
              {/* Tab Switching */}
              {activeTab === 'dashboard' && (
                isManager 
                  ? <AdminDashboard usageLogs={usageLogs} bills={bills} apartments={apartments} households={households} users={users} isSuperAdmin={isSuperAdmin} token={token} fetchDashboardData={fetchDashboardData} />
                  : <ResidentDashboard usageLogs={usageLogs} bills={bills} profile={profile} token={token} fetchDashboardData={fetchDashboardData} />
              )}

              {/* Households Tab */}
              {activeTab === 'households' && isManager && (
                <HouseholdsTab 
                  token={token} 
                  apartments={apartments} 
                  households={households} 
                  showMessage={showMessage} 
                  fetchDashboardData={fetchDashboardData} 
                  isSuperAdmin={isSuperAdmin}
                />
              )}

              {/* Residents Tab */}
              {activeTab === 'residents' && isManager && (
                <ResidentsTab 
                  token={token} 
                  users={users} 
                  households={households} 
                  showMessage={showMessage} 
                  fetchDashboardData={fetchDashboardData} 
                  isSuperAdmin={isSuperAdmin}
                  pendingUsers={pendingUsers}
                  darkMode={darkMode}
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
                />
              )}

              {/* Meter Readings / Usage History Tab */}
              {(activeTab === 'meter_readings' || activeTab === 'usage_history') && (
                <MeterReadingsTab usageLogs={usageLogs} />
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <ProfileTab 
                  token={token} 
                  profile={profile} 
                  fetchProfile={fetchProfile} 
                  showMessage={showMessage} 
                  isSuperAdmin={isSuperAdmin}
                />
              )}

              {/* Tariffs Tab */}
              {activeTab === 'tariff_plans' && isManager && (
                <TariffPlansTab 
                  token={token} 
                  apartments={apartments} 
                  showMessage={showMessage} 
                  isSuperAdmin={isSuperAdmin}
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
                />
              )}

              {/* Water Purchase Tab */}
              {activeTab === 'water_purchase' && isManager && (
                <WaterPurchaseTab 
                  token={token} 
                  apartments={apartments} 
                  showMessage={showMessage} 
                />
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && isManager && (
                <InvoicesTab 
                  token={token} 
                  showMessage={showMessage} 
                />
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && isManager && (
                <AlertsTab 
                  token={token} 
                  households={households} 
                  showMessage={showMessage} 
                  isAdmin={true} 
                />
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && isManager && (
                <ReportsTab 
                  token={token} 
                />
              )}

              {/* My Bills Tab */}
              {activeTab === 'my_bills' && !isManager && (
                <MyBillsTab 
                  token={token} 
                  showMessage={showMessage} 
                />
              )}

              {/* My Invoices Tab */}
              {activeTab === 'my_invoices' && !isManager && (
                <MyInvoicesTab 
                  token={token} 
                  showMessage={showMessage}
                />
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && !isManager && (
                <AlertsTab 
                  token={token} 
                  households={[]} 
                  showMessage={showMessage} 
                  isAdmin={false} 
                />
              )}

              {/* Water Tips Tab */}
              {activeTab === 'water_tips' && !isManager && (
                <WaterTipsTab />
              )}
            </div>
          )}
        </main>
      </div>
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
function AdminDashboard({ usageLogs, apartments, households, users, isSuperAdmin, token, fetchDashboardData }) {
  const [localLogs, setLocalLogs] = useState(usageLogs || []);
  const [localAlerts, setLocalAlerts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Sync with parent data
  useEffect(() => { setLocalLogs(usageLogs || []); }, [usageLogs]);

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLocalAlerts(await res.json());
    } catch (_) {}
  };

  // Real-time polling every 30 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      if (fetchDashboardData) fetchDashboardData();
      fetchAlerts();
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const communityAdmins = (users || []).filter(u => u.role === 'ROLE_COMMUNITY_ADMIN');
  const householdUsers = (users || []).filter(u => u.role === 'ROLE_USER');
  const totalWaterUsed = Math.round(localLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0));

  // Today's usage
  const today = new Date().toISOString().split('T')[0];
  const todayUsage = Math.round(localLogs
    .filter(l => l.date && l.date.startsWith(today))
    .reduce((s, l) => s + (l.consumptionLiters || 0), 0));

  // Build last-14-days daily chart
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
  const dailyMap = {};
  localLogs.forEach(l => { if (l.date) dailyMap[l.date] = (dailyMap[l.date] || 0) + (l.consumptionLiters || 0); });
  const chartData = last14Days.map(date => ({
    label: date.substring(5).replace('-', '/'),
    value: Math.round(dailyMap[date] || 0)
  }));
  const maxVal = Math.max(...chartData.map(d => d.value), 10);

  // Grouped by admin (for super admin)
  const groupedByAdmin = {};
  householdUsers.forEach(u => {
    const key = u.managedByAdmin ? u.managedByAdmin.id : 0;
    if (!groupedByAdmin[key]) groupedByAdmin[key] = { adminName: u.managedByAdmin ? u.managedByAdmin.name : 'Unassigned', users: [] };
    groupedByAdmin[key].users.push(u);
  });

  const activeAlerts = localAlerts.filter(a => !a.resolved).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          {isSuperAdmin ? 'Super Admin Dashboard' : 'Community Admin Dashboard'}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-500 font-mono">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-1.5 text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
            Live
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isSuperAdmin && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Community Admins</p>
            <p className="text-3xl font-black text-amber-400 mt-2">{communityAdmins.length}</p>
            <p className="text-[10px] text-slate-500 mt-1">Registered managers</p>
          </div>
        )}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">
            {isSuperAdmin ? 'All Residents' : 'My Residents'}
          </p>
          <p className="text-3xl font-black text-blue-400 mt-2">{householdUsers.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Active household users</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Total Households</p>
          <p className="text-3xl font-black text-slate-100 mt-2">{households.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Registered flats</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Today's Usage</p>
          <p className="text-3xl font-black text-cyan-400 mt-2">{todayUsage} L</p>
          <p className="text-[10px] text-slate-500 mt-1">Total: {totalWaterUsed.toLocaleString()} L all-time</p>
        </div>
      </section>

      {/* 14-Day Bar Chart */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">Daily Water Consumption (Last 14 Days)</h3>
          <span className="text-[9px] text-slate-500 font-mono">{totalWaterUsed.toLocaleString()} L total</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#0f172a' }} 
                contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
                itemStyle={{ color: '#38bdf8' }}
              />
              <Bar dataKey="value" name="Liters" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Apartments + Alerts row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Apartments */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Apartment Complexes</h3>
          {apartments.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4 text-center">No apartments registered yet.</p>
          ) : (
            <div className="space-y-2">
              {apartments.map(a => {
                const count = households.filter(h => h.apartment?.id === a.id).length;
                const waterUsed = Math.round(localLogs
                  .filter(l => l.household?.apartment?.id === a.id || households.find(h => h.id === l.household?.id)?.apartment?.id === a.id)
                  .reduce((s, l) => s + (l.consumptionLiters || 0), 0));
                return (
                  <div key={a.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between hover:border-blue-500/50 transition">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{a.name}</p>
                      <p className="text-[10px] text-slate-500">{a.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase block mb-1">
                        {count} flats
                      </span>
                      <span className="text-[9px] text-slate-500">{waterUsed > 0 ? `${waterUsed.toLocaleString()} L` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">Active Alerts</h3>
            {activeAlerts.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeAlerts.length}</span>
            )}
          </div>
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-2xl mb-2">✅</span>
              <p className="text-slate-500 text-xs">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map(a => (
                <div key={a.id} className={`p-3 rounded-lg border text-xs ${
                  a.type === 'LEAK' ? 'bg-slate-800 border-red-500/50' :
                  a.type === 'BILLING' ? 'bg-slate-800 border-amber-500/50' :
                  'bg-slate-800 border-blue-500/50'
                }`}>
                  <p className={`font-bold ${a.type === 'LEAK' ? 'text-red-400' : a.type === 'BILLING' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {a.title}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2">{a.message}</p>
                  <p className="text-slate-600 text-[9px] mt-1">{a.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* User hierarchy (super admin only) */}
      {isSuperAdmin && Object.keys(groupedByAdmin).length > 0 && (
        <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Hierarchy Overview</h3>
          <div className="space-y-3">
            {Object.entries(groupedByAdmin).map(([adminId, group]) => (
              <div key={adminId} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold uppercase tracking-wider">
                    {adminId === '0' ? 'Unassigned' : 'Community Admin'}
                  </span>
                  <span className="font-bold text-sm text-slate-200">{group.adminName}</span>
                  <span className="text-[10px] text-slate-500">({group.users.length} users)</span>
                </div>
                <div className="pl-6 space-y-1">
                  {group.users.map(u => (
                    <div key={u.id} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-slate-300 font-medium">{u.name}</span>
                      <span className="text-slate-600">({u.email})</span>
                      {u.household && (
                        <span className="text-emerald-500/70 text-[10px]">
                          — {u.household.apartment?.name} {u.household.block}/{u.household.flatNumber}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. RESIDENT DASHBOARD VIEW
// -------------------------------------------------------------
function ResidentDashboard({ usageLogs, bills, profile, token, fetchDashboardData }) {
  const [localLogs, setLocalLogs] = useState(usageLogs || []);
  const [localBills, setLocalBills] = useState(bills || []);
  const [localAlerts, setLocalAlerts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => { setLocalLogs(usageLogs || []); }, [usageLogs]);
  useEffect(() => { setLocalBills(bills || []); }, [bills]);
  const [aptAvg, setAptAvg] = useState(0);
  const [simAvg, setSimAvg] = useState(0);

  useEffect(() => {
    const fetchAverages = async () => {
      try {
        const resApt = await fetch(`${API_BASE_URL}/api/usage/apartment-average`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resApt.ok) {
          const data = await resApt.json();
          setAptAvg(data.average || 0);
        }

        const resSim = await fetch(`${API_BASE_URL}/api/usage/similar-average`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resSim.ok) {
          const data = await resSim.json();
          setSimAvg(data.average || 0);
        }
      } catch (err) {}
    };
    fetchAverages();
  }, [token]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLocalAlerts(await res.json());
    } catch (_) {}
  };

  // Background data polling every 10 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      if (fetchDashboardData) fetchDashboardData();
      fetchAlerts();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's usage (with timezone fix)
  const getLocalDateString = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d - tzOffset)).toISOString().split('T')[0];
  };
  const today = getLocalDateString();
  const todayUsage = localLogs
    .filter(l => l.date && l.date.startsWith(today))
    .reduce((s, l) => s + (l.consumptionLiters || 0), 0).toFixed(1);

  // This week total
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0,0,0,0);
  const weekUsage = localLogs
    .filter(l => l.date && new Date(l.date) >= weekStart)
    .reduce((s, l) => s + (l.consumptionLiters || 0), 0).toFixed(1);

  // Latest bill
  const sortedBills = [...localBills].sort((a, b) => b.id - a.id);
  const latestBill = sortedBills[0] || null;

  // Monthly bar chart — group by date
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 29);
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });
  const dailyMap = {};
  localLogs.forEach(l => { if (l.date) dailyMap[l.date] = (dailyMap[l.date] || 0) + (l.consumptionLiters || 0); });
  const monthlyChart = last30.map(date => ({
    label: date.substring(8),
    fullDate: date,
    value: Math.round(dailyMap[date] || 0)
  }));
  const maxMonthlyVal = Math.max(...monthlyChart.map(d => d.value), 10);

  // Weekly chart — last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const weeklyChart = last7.map(date => {
    const d = new Date(date);
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      value: Math.round(dailyMap[date] || 0)
    };
  });
  const maxWeeklyVal = Math.max(...weeklyChart.map(d => d.value), 10);

  const activeAlerts = localAlerts.filter(a => !a.resolved).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Resident Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-500 font-mono">Updated {lastUpdated.toLocaleTimeString()}</span>
          <span className="flex items-center gap-1.5 text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
            Live
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Today's Usage</p>
          <p className="text-3xl font-black text-cyan-400 mt-2">{todayUsage} L</p>
          <p className="text-[10px] text-slate-500 mt-1">{today}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">This Week</p>
          <p className="text-3xl font-black text-blue-400 mt-2">{weekUsage} L</p>
          <p className="text-[10px] text-slate-500 mt-1">Last 7 days</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Current Bill</p>
          <p className="text-2xl font-black text-slate-100 mt-2">
            {latestBill ? `₹${latestBill.amount.toFixed(2)}` : '—'}
          </p>
          {latestBill && (
            <span className={`text-[10px] font-bold ${latestBill.paid ? 'text-emerald-400' : 'text-red-400'}`}>
              {latestBill.paid ? '✓ Paid' : '⚠ Unpaid'}
            </span>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">My Avg vs Apartment</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-emerald-400">
              {Math.round(localLogs.length ? localLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0) / localLogs.length : 0)} L
            </p>
            <p className="text-xs text-slate-500 font-medium">/ {Math.round(aptAvg)} L</p>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Sim Size Avg: {Math.round(simAvg)} L</p>
        </div>
      </section>

      {/* Peer Benchmarking Chart */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">Peer Benchmarking</h3>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'My Avg', value: Math.round(localLogs.length ? localLogs.reduce((s, l) => s + (l.consumptionLiters || 0), 0) / localLogs.length : 0) },
              { name: 'Similar Flats', value: Math.round(simAvg) },
              { name: 'Apt Avg', value: Math.round(aptAvg) }
            ]} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} width={80} />
              <Tooltip 
                cursor={{ fill: '#0f172a' }} 
                contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="value" name="Liters" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 30-Day Chart */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">Monthly Consumption (Last 30 Days)</h3>
          <span className="text-[9px] text-slate-500">{weekUsage} L this week</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val, i) => i % 5 === 0 ? val : ''} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
                itemStyle={{ color: '#38bdf8' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
              />
              <Area type="monotone" dataKey="value" name="Liters" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Weekly chart + Alerts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-5">Weekly Breakdown</h3>
          <div className="h-40 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#0f172a' }} 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="value" name="Liters" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Recent Notifications</h3>
            {activeAlerts.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeAlerts.length}</span>
            )}
          </div>
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-2xl mb-2">🔔</span>
              <p className="text-slate-500 text-xs">No active alerts</p>
              <p className="text-slate-600 text-[10px] mt-1">You're all clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map(a => (
                <div key={a.id} className={`p-3 rounded-lg border text-xs ${
                  a.type === 'LEAK' ? 'bg-slate-800 border-red-500/50' :
                  a.type === 'BILLING' ? 'bg-slate-800 border-amber-500/50' :
                  'bg-slate-800 border-blue-500/50'
                }`}>
                  <p className={`font-bold ${a.type === 'LEAK' ? 'text-red-400' : a.type === 'BILLING' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {a.title}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2">{a.message}</p>
                  <p className="text-slate-600 text-[9px] mt-1">{a.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


// -------------------------------------------------------------
// 3. HOUSEHOLDS TAB
// -------------------------------------------------------------
function HouseholdsTab({ token, apartments, households, showMessage, fetchDashboardData, isSuperAdmin }) {
  const [aptData, setAptData] = useState({ name: '', address: '' });
  const [hhData, setHhData] = useState({ apartmentId: '', block: '', flatNumber: '', hasMeter: true });
  const [loadingApt, setLoadingApt] = useState(false);
  const [loadingHh, setLoadingHh] = useState(false);

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

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Households Directory</h2>
        {!isSuperAdmin && (
          <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 font-semibold italic">
            Read-only view (Super Admin privileges required to modify)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isSuperAdmin && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
              <Building2 className="text-amber-500" size={16} /> Step 1: Onboard Apartment Building
            </h3>
            <form onSubmit={handleAptSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Building Name</label>
                <input
                  type="text" required placeholder="Block A, Sky Heights"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  value={aptData.name}
                  onChange={e => setAptData({...aptData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Building Address</label>
                <input
                  type="text" required placeholder="7th Cross St, Tech Corridor"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  value={aptData.address}
                  onChange={e => setAptData({...aptData, address: e.target.value})}
                />
              </div>
              <button
                type="submit" disabled={loadingApt}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md shadow-amber-600/10"
              >
                {loadingApt ? 'Saving...' : 'Register Building'}
              </button>
            </form>
          </div>
        )}

        {!isSuperAdmin && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
              <Home className="text-amber-500" size={16} /> Step 2: Register Flat (Household)
            </h3>
            <form onSubmit={handleHhSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Choose Apartment</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Block Identifier</label>
                  <input
                    type="text" required placeholder="A, B, C"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    value={hhData.block}
                    onChange={e => setHhData({...hhData, block: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Flat Number</label>
                  <input
                    type="text" required placeholder="101, 202"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    value={hhData.flatNumber}
                    onChange={e => setHhData({...hhData, flatNumber: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-xs text-slate-400 pl-1">Enable Water Meter Config?</span>
                <button
                  type="button"
                  onClick={() => setHhData({...hhData, hasMeter: !hhData.hasMeter})}
                  className="p-1 text-blue-400 hover:text-blue-300 transition"
                >
                  {hhData.hasMeter ? <ToggleRight size={24} className="text-amber-500" /> : <ToggleLeft size={24} className="text-slate-650" />}
                </button>
              </div>
              <button
                type="submit" disabled={loadingHh}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md shadow-amber-600/10"
              >
                {loadingHh ? 'Saving...' : 'Register Flat'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Household configurations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase mb-4">Household Configurations & Meters</h3>
        <div className="overflow-x-auto">
          {households.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4">No households registered yet.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Apartment</th>
                  <th className="pb-3">Block - Flat</th>
                  <th className="pb-3 text-center">Meter Active</th>
                  {isSuperAdmin && <th className="pb-3 text-right pr-2">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {households.map(h => (
                  <tr key={h.id} className="hover:bg-slate-800/10">
                    <td className="py-3 pl-2 font-mono text-indigo-400">HH-{h.id}</td>
                    <td>{h.apartment?.name}</td>
                    <td>Block {h.block} - Flat {h.flatNumber}</td>
                    <td className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${h.hasMeter ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' : 'bg-slate-950/40 border-slate-500/20 text-slate-400'}`}>
                        {h.hasMeter ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="text-right pr-2">
                        <button
                          onClick={() => toggleMeterConfig(h.id, h.hasMeter)}
                          className={`text-[9px] px-2.5 py-1 rounded-lg border font-semibold transition ${h.hasMeter ? 'bg-red-950/20 hover:bg-red-900/30 border-red-500/20 text-red-400' : 'bg-amber-950/20 hover:bg-amber-900/30 border-amber-500/20 text-amber-400'}`}
                        >
                          {h.hasMeter ? 'Disable Meter' : 'Enable Meter'}
                        </button>
                      </td>
                    )}
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

// -------------------------------------------------------------
// 4. RESIDENTS TAB
// -------------------------------------------------------------
function ResidentsTab({ token, users, households, showMessage, fetchDashboardData, isSuperAdmin, pendingUsers = [], darkMode }) {
  const [assignData, setAssignData] = useState({ userId: '', householdId: '' });
  const [loadingAssign, setLoadingAssign] = useState(false);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({ name: '', email: '', password: '', role: 'ROLE_USER' });
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', apartmentId: '', block: '', flatNumber: '' });
  const [loadingInvite, setLoadingInvite] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', householdId: '' });

  const [viewingDocs, setViewingDocs] = useState(null);

  const isCommunityAdmin = !isSuperAdmin;

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

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditData({ name: user.name, email: user.email, householdId: user.household ? user.household.id : '' });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditData({ name: '', email: '', householdId: '' });
  };

  const handleUpdateUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/update-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      if (response.ok) {
        showMessage('success', 'User updated successfully!');
        setEditingUserId(null);
        fetchDashboardData();
      } else {
        const text = await response.text();
        showMessage('error', text || 'Update failed.');
      }
    } catch (err) {
      showMessage('error', 'Network failure.');
    }
  };

  const handleAssignAdmin = async (userId, communityAdminId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-managed-admin`, {
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

  const communityAdmins = users.filter(u => u.role === 'ROLE_COMMUNITY_ADMIN');
  const householdUsers = users.filter(u => u.role === 'ROLE_USER');
  const assignableUsers = isSuperAdmin ? [...communityAdmins, ...householdUsers] : householdUsers;

  // Get all household IDs that are already allocated to any resident
  const allocatedHouseholdIds = users.filter(u => u.household).map(u => u.household.id);
  const selectedUserForAssign = users.find(u => u.id === parseInt(assignData.userId));
  const availableHouseholdsForForm = households.filter(h =>
    !allocatedHouseholdIds.includes(h.id) || (selectedUserForAssign && selectedUserForAssign.household && selectedUserForAssign.household.id === h.id)
  );

  const renderUserTable = (title, tableUsers, showAdminAssign = false) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6">
      <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">{title}</h3>
      <div className="overflow-x-auto">
        {tableUsers.length === 0 ? (
          <p className="text-slate-500 text-xs italic py-4">No users found.</p>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="pb-3 pl-2">User ID</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Allocation</th>
                {showAdminAssign && <th className="pb-3">Managed By</th>}
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {tableUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/10">
                  <td className="py-3 pl-2 font-mono text-indigo-400">USR-{u.id}</td>
                  
                  {editingUserId === u.id ? (
                    <td colSpan={2} className="py-2 pr-2">
                      <div className="flex flex-col gap-2">
                        <input type="text" className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs focus:outline-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Name" />
                        <input type="email" className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs focus:outline-none" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} placeholder="Email" />
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="font-bold text-slate-200">{u.name}</td>
                      <td>{u.email}</td>
                    </>
                  )}
                  
                  <td>
                    {editingUserId === u.id ? (
                      <select
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                        <span className="text-emerald-400 font-semibold">
                          {u.household.apartment?.name} - {u.household.block}/{u.household.flatNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No allocation</span>
                      )
                    )}
                  </td>

                  {showAdminAssign && (
                    <td className="py-2">
                      <select
                        className="w-full max-w-[140px] px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[10px] focus:outline-none"
                        value={u.managedByAdmin ? u.managedByAdmin.id : ''}
                        onChange={(e) => handleAssignAdmin(u.id, e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {communityAdmins.map(admin => (
                          <option key={admin.id} value={admin.id}>{admin.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  
                  <td className="text-right pr-2 py-1">
                    <div className="flex items-center justify-end gap-2">
                      {editingUserId === u.id ? (
                        <>
                          <button onClick={() => handleUpdateUser(u.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition">Save</button>
                          <button onClick={cancelEdit} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(u)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition">Edit</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold transition">Delete</button>
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
      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">User Management Registry</h2>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Plus size={16} /> Create User
            </button>
          )}
          {!isSuperAdmin && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Mail size={16} /> Invite Resident
            </button>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Create New User</h3>
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
              <input type="text" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={createData.name} onChange={e => setCreateData({...createData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={createData.password} onChange={e => setCreateData({...createData, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role</label>
              <select required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={createData.role} onChange={e => setCreateData({...createData, role: e.target.value})}>
                <option value="ROLE_USER">Resident (Household User)</option>
                {isSuperAdmin && <option value="ROLE_COMMUNITY_ADMIN">Community Admin</option>}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition">Cancel</button>
              <button type="submit" disabled={loadingCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition">{loadingCreate ? 'Creating...' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}
      {showInviteForm && !isSuperAdmin && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-amber-500 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
            <Mail size={16} /> Invite New Resident
          </h3>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Apartment</label>
                <select required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.apartmentId} onChange={e => setInviteData({...inviteData, apartmentId: e.target.value})}>
                  <option value="">-- Choose --</option>
                  {households.map(h => h.apartment).filter((v,i,a)=>a.findIndex(t=>(t.id===v.id))===i).map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Block</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.block} onChange={e => setInviteData({...inviteData, block: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Flat Number</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none" value={inviteData.flatNumber} onChange={e => setInviteData({...inviteData, flatNumber: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowInviteForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition">Cancel</button>
              <button type="submit" disabled={loadingInvite} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2">
                {loadingInvite ? 'Sending...' : <><Mail size={14} /> Send Invite</>}
              </button>
            </div>
          </form>
        </div>
      )}


      {pendingUsers.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/20 p-5 rounded-2xl shadow-lg shadow-amber-900/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
              <ShieldAlert className="text-amber-400" size={16} />
            </div>
            <div>
              <h3 className="font-bold text-amber-400 text-xs tracking-wide uppercase">Pending Approvals</h3>
              <p className="text-slate-500 text-[10px]">{pendingUsers.length} account{pendingUsers.length !== 1 ? 's' : ''} awaiting review</p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingUsers.map(pu => (
              <div key={pu.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-700 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold text-sm flex-shrink-0 border border-slate-700">
                    {pu.name ? pu.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-200 text-sm truncate">{pu.name}</p>
                    <p className="text-slate-500 text-[11px] truncate">{pu.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      pu.role === 'ROLE_COMMUNITY_ADMIN' 
                        ? (darkMode 
                            ? 'bg-violet-950/40 border-violet-800/40 text-violet-400' 
                            : 'bg-violet-100 border-violet-300 text-violet-800') 
                        : (darkMode 
                            ? 'bg-blue-950/30 border-blue-800/30 text-blue-400' 
                            : 'bg-blue-100 border-blue-300 text-blue-800')
                    }`}>
                      {pu.role === 'ROLE_COMMUNITY_ADMIN' ? 'Community Admin' : 'Resident'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {pu.documentAadhar && (
                    <button onClick={() => setViewingDocs(pu)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm flex items-center gap-1">
                      <FileText size={12} /> Docs
                    </button>
                  )}
                  <button onClick={() => handleApprove(pu.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm flex items-center gap-1">
                    <Check size={12} /> Approve
                  </button>
                  <button onClick={() => handleRequestReupload(pu.id)} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm flex items-center gap-1" title="Reject documents and email user to reupload">
                    <RefreshCw size={12} /> Request Reupload
                  </button>
                  <button onClick={() => handleReject(pu.id)} className="bg-rose-700/80 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg transition text-[10px] shadow-sm" title="Permanently reject and delete">
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit md:col-span-1">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
            <UserCheck className="text-amber-500" size={16} /> Flat Allocation
          </h3>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Household Resident</label>
              <select required className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs" value={assignData.userId} onChange={e => setAssignData({...assignData, userId: e.target.value})}>
                <option value="">-- Choose User --</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email}){u.role === 'ROLE_COMMUNITY_ADMIN' ? ' [Admin]' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Household Flat</label>
              <select className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs" value={assignData.householdId} onChange={e => setAssignData({...assignData, householdId: e.target.value})}>
                <option value="">-- Unassign Resident --</option>
                {availableHouseholdsForForm.map(h => (
                  <option key={h.id} value={h.id}>{h.apartment?.name} - Block {h.block} - Flat {h.flatNumber}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loadingAssign} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-md shadow-amber-600/10">
              {loadingAssign ? 'Updating...' : 'Assign Flat'}
            </button>
          </form>
        </div>

        {/* Residents Tables Container */}
        <div className="md:col-span-2">
          {isSuperAdmin && renderUserTable("Community Admins Registry", communityAdmins, false)}
          {renderUserTable(isSuperAdmin ? "Household Users Registry" : "My Household Users", householdUsers, isSuperAdmin)}
        </div>

        {/* Document Verification Modal */}
        {viewingDocs && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <UserCheck className="text-amber-500" />
                  Document Verification for {viewingDocs.name}
                </h2>
                <button onClick={() => setViewingDocs(null)} className="text-slate-400 hover:text-slate-200 transition">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <h3 className="font-bold text-slate-400 text-xs tracking-wide uppercase mb-4">Aadhar / PAN Card</h3>
                  {viewingDocs.documentAadhar ? (
                    viewingDocs.documentAadhar.startsWith('data:application/pdf') || viewingDocs.documentAadhar.includes('application/pdf') ? (
                      <object data={viewingDocs.documentAadhar} type="application/pdf" className="w-full h-[400px] rounded-lg">
                        <iframe src={viewingDocs.documentAadhar} className="w-full h-[400px] border-0 rounded-lg" title="Aadhar PDF">
                          <p>Alternate link: <a href={viewingDocs.documentAadhar} download="document.pdf" className="text-blue-400 underline">Download PDF</a></p>
                        </iframe>
                      </object>
                    ) : (
                      <img src={viewingDocs.documentAadhar} alt="Aadhar Card" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '400px' }} />
                    )
                  ) : (
                    <p className="text-slate-500 text-sm">No document provided</p>
                  )}
                </div>
                
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <h3 className="font-bold text-slate-400 text-xs tracking-wide uppercase mb-4">Recent Photo</h3>
                  {viewingDocs.documentPhoto ? (
                    <img src={viewingDocs.documentPhoto} alt="User Photo" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '400px' }} />
                  ) : (
                    <p className="text-slate-500 text-sm">No photo provided</p>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-4 border-t border-slate-800 pt-6">
                <button onClick={() => setViewingDocs(null)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition">
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
  const fileInputRef = useRef(null);

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

  // Filter usage logs for the resident's household
  const householdLogs = !isAdmin && profile?.household
    ? usageLogs.filter(l => l.household?.id === profile.household.id)
    : [];

  const latestReading = householdLogs.length > 0 ? householdLogs[0] : null;

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          {isAdmin ? 'Log Water Consumption' : 'My Water Consumption'}
        </h2>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Widget */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
              <Plus className="text-emerald-500" size={16} /> Manual Log Entry
            </h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Household</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  value={logData.householdId}
                  onChange={e => setLogData({...logData, householdId: e.target.value})}
                >
                  <option value="">-- Choose Flat --</option>
                  {households.filter(h => users.some(u => u.household?.id === h.id)).map(h => {
                    const resident = users.find(u => u.household?.id === h.id);
                    return (
                      <option key={h.id} value={h.id}>
                        {resident ? resident.name : 'No Resident'} - {h.apartment?.name} - Block {h.block} - Flat {h.flatNumber}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date" required max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  value={logData.date}
                  onChange={e => setLogData({...logData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cumulative Meter (Liters)</label>
                <input
                  type="number" required step="0.1" min="0" placeholder="e.g. 14200.5"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  value={logData.readingLiters}
                  onChange={e => setLogData({...logData, readingLiters: e.target.value})}
                />
              </div>
              <button
                type="submit" disabled={savingManual}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-lg"
              >
                {savingManual ? 'Saving...' : 'Submit Entry'}
              </button>
            </form>
          </div>

          {/* CSV Widget */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4 flex items-center gap-2">
                <FileSpreadsheet className="text-purple-500" size={16} /> Bulk Upload Uploader
              </h3>
              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div 
                  className="border border-dashed border-slate-800 rounded-xl p-6 text-center bg-slate-950/20 hover:bg-slate-950/40 transition cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <Upload size={28} className="mx-auto text-slate-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Choose CSV or drop here</p>
                  <input
                    type="file" accept=".csv" className="hidden" ref={fileInputRef}
                    onChange={e => setFile(e.target.files[0])}
                  />
                </div>
                {file && (
                  <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
                    <span className="truncate">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-red-400 font-bold">&times;</button>
                  </div>
                )}
                <button
                  type="submit" disabled={!file || savingBulk}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl transition duration-205 text-xs shadow-lg"
                >
                  {savingBulk ? 'Uploading...' : 'Process Upload'}
                </button>
              </form>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 mt-4 text-[10px] text-slate-500 flex justify-between items-center">
              <span>Format: householdId, date, readingLiters</span>
              <button 
                type="button"
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8,householdId,date,readingLiters\n1,2026-07-15,350\n2,2026-07-15,420\n";
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "water_usage_template.csv");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer transition text-[9px] uppercase tracking-wider"
              >
                Download Template
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side: Household Meter Card */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                  <Home size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Household Meter</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Allocation Status</p>
                </div>
              </div>

              {profile?.household ? (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-455">Apartment</span>
                    <span className="font-semibold text-slate-300">{profile.household.apartment?.name || 'Assigned'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-455">Flat Details</span>
                    <span className="font-semibold text-slate-300">Block {profile.household.block} - Flat {profile.household.flatNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-455">Meter Installed</span>
                    <span className={`font-semibold ${profile.household.hasMeter ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {profile.household.hasMeter ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-455">Current Reading</span>
                    <span className="font-mono font-bold text-slate-200">
                      {latestReading ? `${latestReading.readingLiters.toLocaleString()} L` : '0 L'}
                    </span>
                  </div>
                  {latestReading && (
                    <div className="flex justify-between">
                      <span className="text-slate-455">Last Checked</span>
                      <span className="text-slate-400">{latestReading.date}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic py-6">No flat has been allocated to your profile yet.</p>
              )}
            </div>

            <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl mt-4 flex items-start gap-2.5">
              <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                As a resident, you have view-only access. To update or correct readings, please contact your community admin.
              </p>
            </div>
          </div>

          {/* Right Side: Usage Log Table */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md">
            <h3 className="font-bold text-slate-200 text-xs tracking-wider uppercase mb-4 flex items-center gap-2">
              <Activity className="text-blue-500" size={16} /> Recent Usage Logs
            </h3>

            <div className="overflow-x-auto">
              {householdLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-slate-500 text-xs italic">No consumption logs recorded yet.</p>
                  <p className="text-[10px] text-slate-600">Your logged readings will show up here once updated by an admin.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="pb-3 pl-1">Log ID</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Cumulative Value</th>
                      <th className="pb-3 text-right">Consumption</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {householdLogs.slice(0, 5).map(l => (
                      <tr key={l.id} className="hover:bg-slate-800/10">
                        <td className="py-3 pl-1 font-mono text-indigo-400">LOG-{l.id}</td>
                        <td className="py-3">{l.date}</td>
                        <td className="py-3 font-mono">{l.readingLiters.toLocaleString()} L</td>
                        <td className="py-3 font-mono text-blue-400 font-bold text-right">
                          +{l.consumptionLiters.toLocaleString()} L
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
    </div>
  );
}

// -------------------------------------------------------------
// 6. METER READINGS LIST TAB
// -------------------------------------------------------------
function MeterReadingsTab({ usageLogs }) {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Usage Meter Readings</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="overflow-x-auto">
          {usageLogs.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4 text-center">No meter readings logged yet.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-2">Log ID</th>
                  <th className="pb-3">Household Address</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Cumulative Value</th>
                  <th className="pb-3">Consumption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {usageLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/10">
                    <td className="py-3 pl-2 font-mono text-indigo-400">LOG-{l.id}</td>
                    <td>
                      {l.household 
                        ? `${l.household.apartment?.name || 'Apt'} - Block ${l.household.block} / Flat ${l.household.flatNumber}`
                        : `HH-${l.householdId}`}
                    </td>
                    <td>{l.date}</td>
                    <td className="font-mono">{l.readingLiters.toLocaleString()} L</td>
                    <td className="font-mono text-blue-400 font-bold">{l.consumptionLiters.toLocaleString()} L</td>
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

// -------------------------------------------------------------
// 7. PROFILE TAB
// -------------------------------------------------------------
function ProfileTab({ token, profile, fetchProfile, showMessage }) {
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
      if (res.ok) { showMessage('success', 'Database cleared successfully!'); setResetPassword(''); setShowResetConfirm(false); }
      else { const txt = await res.text(); showMessage('error', txt || 'Failed to reset database.'); }
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
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Profile Settings</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* ── UIVERSE-INSPIRED PROFILE CARD ────────────── */}
        <div className="md:col-span-1 flex justify-center">
          <div className="profile-card">
            {/* Glowing blobs on hover */}
            <div className="profile-card-blob profile-card-blob-left" />
            <div className="profile-card-blob profile-card-blob-right" />

            {/* Inner card-info panel */}
            <div className="profile-card-info">

              {/* Avatar */}
              <span className="profile-card-avatar-wrap">
                {profile?.gender?.toLowerCase() === 'female' ? (
                  /* Female SVG avatar */
                  <svg className="profile-card-avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#1e3a5f"/>
                    <ellipse cx="50" cy="38" rx="18" ry="20" fill="#fddbb8"/>
                    <path d="M32 38 Q28 20 50 16 Q72 20 68 38" fill="#5c2e91"/>
                    <path d="M28 42 Q24 34 32 30 Q30 38 32 38Z" fill="#5c2e91"/>
                    <path d="M72 42 Q76 34 68 30 Q70 38 68 38Z" fill="#5c2e91"/>
                    <ellipse cx="50" cy="72" rx="22" ry="16" fill="#7c3aed"/>
                    <ellipse cx="50" cy="38" rx="18" ry="20" fill="#fddbb8"/>
                    <circle cx="50" cy="40" r="8" fill="#f9c9a0"/>
                    <path d="M44 44 Q50 48 56 44" stroke="#e8956d" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                    <circle cx="45.5" cy="39" r="1.5" fill="#3d2000"/>
                    <circle cx="54.5" cy="39" r="1.5" fill="#3d2000"/>
                    <path d="M34 58 Q50 52 66 58 Q66 80 50 88 Q34 80 34 58Z" fill="#7c3aed"/>
                    <path d="M42 56 Q50 60 58 56 L60 70 Q50 75 40 70Z" fill="#a78bfa"/>
                  </svg>
                ) : (
                  /* Male / default SVG avatar */
                  <svg className="profile-card-avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#1e3a5f"/>
                    <ellipse cx="50" cy="38" rx="18" ry="20" fill="#fddbb8"/>
                    <path d="M32 35 Q32 18 50 16 Q68 18 68 35 Q66 28 50 26 Q34 28 32 35Z" fill="#1e3a5f"/>
                    <ellipse cx="50" cy="40" rx="8" ry="9" fill="#f9c9a0"/>
                    <path d="M44 44 Q50 48 56 44" stroke="#e8956d" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                    <circle cx="45.5" cy="39" r="1.5" fill="#1a1a2e"/>
                    <circle cx="54.5" cy="39" r="1.5" fill="#1a1a2e"/>
                    <path d="M34 58 Q50 52 66 58 Q66 80 50 88 Q34 80 34 58Z" fill="#1d4ed8"/>
                    <path d="M42 56 Q50 60 58 56 L60 70 Q50 75 40 70Z" fill="#3b82f6"/>
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
                  <span className="profile-card-value profile-card-mono">{profile?.email || '—'}</span>
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl md:col-span-2 space-y-6">
          <div>
            <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Update Profile Details</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email" required
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer"
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                  <input
                    type="tel" placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    value={formData.mobileNo}
                    onChange={e => setFormData({ ...formData, mobileNo: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Change Password (Leave blank to keep current)</label>
                <input
                  type="password" placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <button
                type="submit" disabled={updating}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition duration-205 text-xs cursor-pointer shadow-md"
              >
                {updating ? 'Saving...' : 'Save Profile Changes'}
              </button>
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
// PLACEHOLDER TAB FOR LATER WEEKS (3-8)
// -------------------------------------------------------------
function PlaceholderTab({ tabName }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
      <div className="bg-slate-950/65 border border-slate-800 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-blue-400 shadow-md">
        <Activity size={24} />
      </div>
      <div>
        <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase capitalize">
          {tabName.replace('_', ' ')} Panel
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2">
          This feature is scheduled for implementation in a later module cycle (Weeks 3 to 8). Week 1-2 core REST APIs and client views are fully functional.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// WATER GRID NETWORK BACKGROUND ANIMATION
// -------------------------------------------------------------
function WaterGridCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 35;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particleCount; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.18;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw points
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Update positions
        p.x += p.vx;
        p.y += p.vy;

        // Bounce boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70 animate-fade-in"
    />
  );
}

function BubblesCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const bubbleCount = 25;
    const bubbles = [];

    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: height + Math.random() * 100,
        radius: Math.random() * 8 + 3,
        speed: Math.random() * 0.8 + 0.3,
        opacity: Math.random() * 0.2 + 0.05,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
        wobbleRange: Math.random() * 1.5 + 0.5,
        angle: Math.random() * Math.PI,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < bubbleCount; i++) {
        const b = bubbles[i];
        ctx.strokeStyle = `rgba(56, 189, 248, ${b.opacity})`;
        ctx.fillStyle = `rgba(56, 189, 248, ${b.opacity * 0.4})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(b.x + Math.sin(b.angle) * b.wobbleRange, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Update position
        b.y -= b.speed;
        b.angle += b.wobbleSpeed;

        // Recycle
        if (b.y < -b.radius * 2) {
          b.y = height + Math.random() * 100;
          b.x = Math.random() * width;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80 animate-fade-in"
    />
  );
}

function RaindropsCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const dropCount = 45;
    const drops = [];

    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 15 + 10,
        speed: Math.random() * 4 + 2,
        opacity: Math.random() * 0.15 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;

      for (let i = 0; i < dropCount; i++) {
        const d = drops[i];
        ctx.globalAlpha = d.opacity;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 1, d.y + d.length);
        ctx.stroke();

        // Update position
        d.y += d.speed;
        d.x += 0.2; // light diagonal wind

        // Loop around
        if (d.y > height) {
          d.y = -d.length;
          d.x = Math.random() * width;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80 animate-fade-in"
    />
  );
}

// -------------------------------------------------------------
function InviteVerificationView({ inviteToken, showMessage, darkMode, toggleDarkMode }) {
  const [formData, setFormData] = useState({ gender: 'Male', mobileNo: '+91 ', alternateNo: '' });
  const [invitationDetails, setInvitationDetails] = useState(null);
  const [docs, setDocs] = useState({ documentAadhar: null, documentPhoto: null });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/invitation/${inviteToken}`);
        if (response.ok) {
          const data = await response.json();
          setInvitationDetails(data);
        }
      } catch (err) {
        console.error('Failed to fetch invitation details.');
      }
    };
    if (inviteToken) fetchInviteDetails();
  }, [inviteToken]);

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
         showMessage('error', 'File size exceeds 10MB limit. Please choose a smaller file.');
         return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000;
            const MAX_HEIGHT = 1000;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setDocs(prev => ({ ...prev, [field]: dataUrl }));
          };
          img.src = reader.result;
        } else {
          setDocs(prev => ({ ...prev, [field]: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    if (!formData.mobileNo || formData.mobileNo.replace(/\\D/g, '').length < 12) {
      return showMessage('error', 'Please enter a valid mobile number with country code (e.g. +91 9876543210).');
    }
    if (!docs.documentAadhar || !docs.documentPhoto) {
      return showMessage('error', 'Please upload both Aadhar/PAN and a recent photo.');
    }
    if (password.length < 6) {
      return showMessage('error', 'Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      // Step 1: Submit Documents & Details
      const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken,
          ...docs,
          ...formData
        })
      });

      if (!verifyRes.ok) {
        const text = await verifyRes.text();
        throw new Error(text || 'Document verification failed.');
      }

      // Step 2: Set password & complete registration
      const registerRes = await fetch(`${API_BASE_URL}/api/auth/register-invited`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken,
          password: password
        })
      });

      if (!registerRes.ok) {
        const text = await registerRes.text();
        throw new Error(text || 'Registration password save failed.');
      }

      showMessage('success', 'Registration completed successfully!');
      setCompleted(true);
    } catch (err) {
      showMessage('error', err.message || 'Network failure.');
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6 relative overflow-hidden">
        <BubblesCanvas />
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-10 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl relative z-10 animate-fade-in-up">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">Welcome Home!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">Your account has been successfully set up and is now pending admin approval. You can log in to check your status.</p>
          <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/30">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6 relative overflow-y-auto">
      <WaterGridCanvas />
      
      <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800/60 p-8 rounded-[2rem] max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 my-8 transition-all duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner border border-amber-500/20">
            <UserPlus size={32} />
          </div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500 bg-clip-text text-transparent mb-2">Register Yourself</h2>
          <p className="text-slate-400 text-xs">Please complete your details to register</p>
        </div>

        <form onSubmit={handleRegistration} className="space-y-6">
          
          {/* Section 0: Invitation Details (Read-only) */}
          {invitationDetails && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-amber-400 border-b border-slate-800 pb-2 uppercase tracking-wider">Pre-filled Invitation Details</h3>
              <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Name</p>
                    <input type="text" readOnly disabled value={invitationDetails.name} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/80 rounded-lg text-slate-400 text-xs cursor-not-allowed" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Email</p>
                    <input type="text" readOnly disabled value={invitationDetails.email} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/80 rounded-lg text-slate-400 text-xs cursor-not-allowed truncate" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Apartment / Flat</p>
                  <input type="text" readOnly disabled value={`${invitationDetails.apartmentName}, Block ${invitationDetails.block}, Flat ${invitationDetails.flatNumber}`} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/80 rounded-lg text-slate-400 text-xs cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Personal Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-amber-400 border-b border-slate-800 pb-2 uppercase tracking-wider">1. Personal Information</h3>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
              <div className="flex bg-slate-950/50 p-1.5 rounded-xl border border-slate-800/80">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g} type="button"
                    onClick={() => setFormData({...formData, gender: g})}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${formData.gender === g ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mobile Number</label>
                <input
                  type="tel" required placeholder="9876543210" pattern="[0-9]{10}"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                  value={formData.mobileNo}
                  onChange={e => setFormData({...formData, mobileNo: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Alternate No</label>
                <input
                  type="tel" placeholder="Optional"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                  value={formData.alternateNo}
                  onChange={e => setFormData({...formData, alternateNo: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Verification Documents */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-amber-400 border-b border-slate-800 pb-2 uppercase tracking-wider">2. Identity Verification</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Govt ID (Aadhar / PAN)</label>
                <div className={`relative overflow-hidden border-2 border-dashed ${docs.documentAadhar ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/50'} rounded-2xl p-5 text-center cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/50 transition-all duration-300 group shadow-inner h-44 flex flex-col items-center justify-center`}>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, 'documentAadhar')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center justify-center pointer-events-none w-full h-full">
                    {docs.documentAadhar ? (
                      docs.documentAadhar.startsWith('data:image') ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <img src={docs.documentAadhar} className="w-full h-20 object-contain rounded-lg drop-shadow-[0_5px_15px_rgba(16,185,129,0.15)] mb-2" />
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] py-1 px-3 rounded-full font-semibold inline-flex items-center gap-1"><CheckCircle2 size={12}/> Verified</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="text-emerald-400 mb-2 drop-shadow-md" size={40} />
                          <span className="text-emerald-300 text-xs font-bold">PDF Selected</span>
                          <span className="text-[10px] text-emerald-500/80 mt-1 font-medium">Click to replace</span>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-800/80 rounded-full flex items-center justify-center group-hover:bg-amber-500/20 group-hover:scale-110 transition-all duration-300 mb-3 shadow-md">
                          <UploadCloud className="text-slate-400 group-hover:text-amber-400 transition-colors" size={24} />
                        </div>
                        <span className="text-slate-300 text-sm font-bold group-hover:text-amber-300">Upload ID Document</span>
                        <span className="text-slate-500 text-[10px] mt-1">JPEG, PNG, or PDF</span>
                        <span className="text-slate-600 text-[9px] mt-0.5">Max size 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Photo</label>
                <div className={`relative overflow-hidden border-2 border-dashed ${docs.documentPhoto ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/50'} rounded-2xl p-5 text-center cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/50 transition-all duration-300 group shadow-inner h-44 flex flex-col items-center justify-center`}>
                  <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'documentPhoto')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center justify-center pointer-events-none w-full h-full">
                    {docs.documentPhoto ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <img src={docs.documentPhoto} className="w-20 h-20 object-cover rounded-full border-2 border-emerald-500/50 drop-shadow-[0_5px_15px_rgba(16,185,129,0.15)] mb-2" />
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] py-1 px-3 rounded-full font-semibold inline-flex items-center gap-1"><CheckCircle2 size={12}/> Verified</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-800/80 rounded-full flex items-center justify-center group-hover:bg-amber-500/20 group-hover:scale-110 transition-all duration-300 mb-3 shadow-md">
                          <Camera className="text-slate-400 group-hover:text-amber-400 transition-colors" size={24} />
                        </div>
                        <span className="text-slate-300 text-sm font-bold group-hover:text-amber-300">Upload Selfie</span>
                        <span className="text-slate-500 text-[10px] mt-1">JPEG or PNG</span>
                        <span className="text-slate-600 text-[9px] mt-0.5">Max size 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Password */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-amber-400 border-b border-slate-800 pb-2 uppercase tracking-wider">3. Secure Your Account</h3>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Create Password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="password" required placeholder="••••••••" minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold rounded-xl text-sm transition duration-300 shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2">
            {loading ? 'Registering...' : <>Complete Registration & Submit <ChevronRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// COMMUNITY ADMIN DOCUMENT VERIFICATION VIEW
// -------------------------------------------------------------
function CommunityAdminVerifyView({ userId, showMessage, onComplete, darkMode }) {
  const [formData, setFormData] = useState({ gender: 'Male', mobileNo: '+91 ', alternateNo: '' });
  const [docs, setDocs] = useState({ documentAadhar: null, documentPhoto: null });
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showMessage('error', 'File too large (max 10MB).'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1000;
          let w = img.width, h = img.height;
          if (w > MAX) { h = h * MAX / w; w = MAX; }
          if (h > MAX) { w = w * MAX / h; h = MAX; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          setDocs(prev => ({ ...prev, [field]: canvas.toDataURL('image/jpeg', 0.7) }));
        };
        img.src = reader.result;
      } else {
        setDocs(prev => ({ ...prev, [field]: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mobileNo || formData.mobileNo.replace(/\\D/g, '').length < 12) return showMessage('error', 'Please enter a valid mobile number with country code (e.g. +91 9876543210).');
    if (!docs.documentAadhar || !docs.documentPhoto) return showMessage('error', 'Please upload both Aadhar/PAN and photograph.');
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-admin-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: String(userId), ...docs, ...formData })
      });
      if (res.ok) { 
        setCompleted(true); 
        showMessage('success', 'Documents submitted! Awaiting Super Admin approval.'); 
      } else { 
        const txt = await res.text(); 
        showMessage('error', txt || 'Submission failed.'); 
      }
    } catch { 
      showMessage('error', 'Network error.'); 
    } finally { 
      setLoading(false); 
    }
  };

  if (completed) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <BubblesCanvas />
      <div className="relative z-10 bg-slate-900/80 backdrop-blur-2xl border border-violet-500/20 p-10 rounded-3xl max-w-md w-full text-center space-y-5 shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={40} className="text-emerald-400" /></div>
        <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">All Done!</h2>
        <p className="text-slate-400 text-sm leading-relaxed">Your documents have been submitted. A Super Admin will review and approve your account. You'll be notified by email once approved.</p>
        <button onClick={onComplete} className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white font-bold rounded-xl transition">Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-y-auto text-slate-100">
      <WaterGridCanvas />
      
      <div className="relative z-10 bg-slate-900/70 backdrop-blur-2xl border border-violet-500/20 p-8 rounded-[2rem] max-w-lg w-full my-8 shadow-[0_20px_60px_rgba(109,40,217,0.15)] animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600/20 to-indigo-500/10 border border-violet-500/20 text-violet-400 rounded-2xl flex items-center justify-center mx-auto mb-5"><ShieldAlert size={32} /></div>
          <h2 className={`text-3xl font-black bg-gradient-to-r bg-clip-text text-transparent mb-2 ${darkMode ? 'from-violet-200 via-indigo-300 to-violet-400' : 'from-violet-700 via-indigo-700 to-violet-800'}`}>Admin Verification</h2>
          <p className="text-slate-400 text-xs">Please submit your details for verification</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Personal Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-violet-400 border-b border-slate-800 pb-2 uppercase tracking-wider">1. Personal Information</h3>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
              <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
                {['Male', 'Female', 'Other'].map(g => (
                  <button key={g} type="button" onClick={() => setFormData({...formData, gender: g})}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${formData.gender === g ? 'bg-violet-800/60 text-violet-300 border border-violet-700/50' : 'text-slate-500 hover:text-slate-300'}`}>{g}</button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mobile Number *</label>
                <input type="tel" required placeholder="9876543210" pattern="[0-9]{10}"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                  value={formData.mobileNo} onChange={e => setFormData({...formData, mobileNo: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Alternate No</label>
                <input type="tel" placeholder="Optional"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800/80 focus:border-violet-500/50 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                  value={formData.alternateNo} onChange={e => setFormData({...formData, alternateNo: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 2: Identity Documents */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-violet-400 border-b border-slate-800 pb-2 uppercase tracking-wider">2. Identity Documents</h3>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Govt ID — Aadhar / PAN</label>
              <div className={`relative overflow-hidden border-2 border-dashed ${docs.documentAadhar ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-700 bg-slate-950/40'} rounded-2xl p-6 text-center cursor-pointer hover:border-violet-500/50 transition group`}>
                <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, 'documentAadhar')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  {docs.documentAadhar ? (
                    docs.documentAadhar.startsWith('data:image') ? (
                      <div className="relative"><img src={docs.documentAadhar} className="w-32 h-24 object-cover rounded-xl border border-emerald-500/40 mb-2 mx-auto" /><div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full"><Check size={12}/></div></div>
                    ) : <><FileText className="text-emerald-400 mb-2" size={36}/><span className="text-emerald-300 text-xs font-bold">PDF Uploaded ✓</span></>
                  ) : <><UploadCloud className="text-slate-500 group-hover:text-violet-400 mb-3 transition" size={36}/><span className="text-slate-300 text-sm font-bold group-hover:text-violet-300">Upload ID Document</span><span className="text-slate-500 text-[10px] mt-1">JPEG, PNG or PDF — Max 10MB</span></>}
                  {docs.documentAadhar && <span className="text-[10px] text-emerald-500/70 mt-3">Click to replace</span>}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Photograph</label>
              <div className={`relative overflow-hidden border-2 border-dashed ${docs.documentPhoto ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-700 bg-slate-950/40'} rounded-2xl p-6 text-center cursor-pointer hover:border-violet-500/50 transition group`}>
                <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'documentPhoto')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  {docs.documentPhoto ? (
                    <div className="relative"><img src={docs.documentPhoto} className="w-24 h-24 object-cover rounded-full border-2 border-emerald-500/40 mb-2 mx-auto" /><div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full"><Check size={12}/></div></div>
                  ) : <><Camera className="text-slate-500 group-hover:text-violet-400 mb-3 transition" size={36}/><span className="text-slate-300 text-sm font-bold group-hover:text-violet-300">Upload Selfie / Photo</span><span className="text-slate-500 text-[10px] mt-1">JPEG or PNG — Max 10MB</span></>}
                  {docs.documentPhoto && <span className="text-[10px] text-emerald-500/70 mt-3">Click to replace</span>}
                </div>
              </div>
            </div>
          </div>
          
          <div className={`border rounded-xl p-4 text-[11px] leading-relaxed ${darkMode ? 'bg-violet-900/10 border-violet-500/20 text-violet-300/80' : 'bg-violet-100 border-violet-200 text-violet-800'}`}>
            <strong className={darkMode ? 'text-violet-300' : 'text-violet-900'}>Account Safety:</strong> Document verification ensures platforms integrity. Your details are secured and are only shared with platform developers for account vetting.
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2">
            {loading ? 'Submitting...' : <>Submit for Review <ChevronRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// AUTH REGISTER & LOGIN VIEW COMPONENT
// -------------------------------------------------------------
function AuthView({ setToken, message, showMessage, darkMode, toggleDarkMode }) {
  const [view, setView] = useState('landing'); // 'landing', 'login', 'register', 'admin_verify'
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'ROLE_COMMUNITY_ADMIN', gender: '', mobileNo: '+91 ' });
  const [loading, setLoading] = useState(false);
  const [waterFill, setWaterFill] = useState(55);
  const [bgAnimation, setBgAnimation] = useState('bubbles');
  const [adminVerifyUserId, setAdminVerifyUserId] = useState(null);

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
    const bodyPayload = view === 'login' 
      ? { email: formData.email, password: formData.password }
      : { name: formData.name, email: formData.email, password: formData.password, role: formData.role, gender: formData.gender, mobileNo: formData.mobileNo };

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
          // Community admin registration requires doc verification
          if (data && data.requiresVerification && data.userId) {
            setAdminVerifyUserId(data.userId);
            setView('admin_verify');
            showMessage('success', 'Account created! Please upload your verification documents.');
          } else {
            showMessage('success', 'Registration completed successfully! Please sign in.');
            setView('login');
          }
        }
      } else {
        const errorText = await response.text();
        if (response.status === 403 || errorText.toLowerCase().includes("pending approval")) {
          showMessage('info', 'Your registration is complete! Please wait until the community admin reviews and approves your document verification.');
        } else {
          showMessage('error', errorText || 'Verification failed.');
        }
      }
    } catch (err) {
      showMessage('error', 'Could not establish connection to the Spring Boot REST server.');
    } finally {
      setLoading(false);
    }
  };

  // Render Community Admin doc verification view
  if (view === 'admin_verify' && adminVerifyUserId) {
    return <CommunityAdminVerifyView userId={adminVerifyUserId} showMessage={showMessage} onComplete={() => setView('login')} darkMode={darkMode} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-y-auto text-slate-100 font-sans">
      
      {/* Inline styles for circular wave animations */}
      <style>{`
        @keyframes waveLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveRight {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
      `}</style>

      {/* Dynamic Background Animation Canvas Overlay */}
      {bgAnimation === 'grid' && <WaterGridCanvas />}
      {bgAnimation === 'bubbles' && <BubblesCanvas />}
      {bgAnimation === 'rain' && <RaindropsCanvas />}

      {/* Header Banner inspired by FlowReporter (Premium Dark Slate with thin Amber/Blue edge) */}
      <header className="bg-slate-900 border-b border-blue-500/20 px-6 py-4 flex items-center justify-between z-10 shadow-lg relative">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-500/10">
            <Droplets size={26} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-xl font-black tracking-tight text-slate-100">Aqua</span>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Track</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 hidden sm:block">
          <span>Smart Water Solutions</span>
        </div>
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 hover:text-slate-100 transition"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      {/* Dynamic Animated Background Blobs for Glass Refraction */}
      <div className="liquid-blob blob-blue top-[10%] left-[5%]"></div>
      <div className="liquid-blob blob-cyan bottom-[15%] right-[10%]"></div>
      <div className="liquid-blob blob-indigo top-[40%] left-[35%]"></div>

      {/* Main Container splits into Left (Info) and Right (Visuals/Form) */}
      <div className="flex-grow max-w-6xl w-full mx-auto flex flex-col md:flex-row items-center justify-center px-6 py-16 md:py-24 gap-12 md:gap-16 z-10">
        
        {/* Left Side: Intelligent Water Management Info Panel */}
        <div className="flex-1 space-y-6 text-center md:text-left max-w-lg">
          <div className="flex items-center gap-3.5 justify-center md:justify-start">
            <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/20">
              <Droplets size={38} className="text-blue-400 animate-bounce" />
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-100 flex items-center gap-0.5">
              Aqua<span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent font-black">Track</span>
            </h2>
          </div>

          <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            <span className="text-intelligent-gradient font-black">Intelligent</span>
            <span className="text-slate-100"> Water Management</span>
          </h3>
          
          <p className="text-slate-400 text-sm leading-relaxed">
            AquaTrack lets you monitor and control your water consumption, track meter readings, and manage community allocation from anywhere in the world.
          </p>
          {/* Premium styled Feature Cards */}
          <div className="space-y-3.5 pl-1">
            <div className="glass-liquid-card p-3.5 rounded-2xl flex items-start gap-3.5">
              <div className="p-2 rounded-xl text-blue-400 bg-blue-950/40 border border-blue-800/20 shrink-0">
                <ShieldAlert size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Real-Time Leak Alerts</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Powered by advanced sensors to detect abnormal water flows instantly.</p>
              </div>
            </div>

            <div className="glass-liquid-card p-3.5 rounded-2xl flex items-start gap-3.5">
              <div className="p-2 rounded-xl text-blue-400 bg-blue-950/40 border border-blue-800/20 shrink-0">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Remote Consumption Tracker</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Track multi-location flat water usage seamlessly in one central hub.</p>
              </div>
            </div>

            <div className="glass-liquid-card p-3.5 rounded-2xl flex items-start gap-3.5">
              <div className="p-2 rounded-xl text-blue-400 bg-blue-950/40 border border-blue-800/20 shrink-0">
                <DollarSign size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Automated Smart Valve</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Custom configurations to help you <span className="text-blue-400 font-semibold">save money</span> and mitigate water damage.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Wave Circle Visuals OR Form Cards */}
        <div className="w-full max-w-sm flex flex-col items-center">
          {view === 'landing' ? (
            <div className="space-y-8 w-full text-center">
              
              {/* Circular Water Visual (matching FlowReporter) */}
              <div className="relative w-56 h-56 mx-auto group">
                {/* Glowing drop shadow behind circle */}
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-105"></div>
                
                {/* Image Container with premium smart-meter device bezel frame */}
                <div className="relative w-full h-full bg-white rounded-full border-[10px] border-slate-900 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:ring-8 group-hover:ring-blue-500/20">
                  {/* FlowReporter GIF Visual */}
                  <img 
                    src="https://flowreporter.com/images/fr_landing_water.gif" 
                    alt="Animated Fluid Circle" 
                    className="w-full h-full rounded-full object-cover select-none pointer-events-none"
                  />
                </div>
              </div>

              {/* Action Buttons matching FlowReporter layout */}
              <div className="space-y-3.5 w-full">
                <button
                  onClick={() => setView('login')}
                  className="w-full py-3.5 btn-liquid-secondary border rounded-xl font-bold text-xs cursor-pointer shadow-md active:scale-98"
                >
                  Login
                </button>
                <button
                  onClick={() => setView('register')}
                  className="w-full py-3.5 btn-liquid-primary text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg active:scale-98"
                >
                  Create your account
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Don't have a device?{' '}
                <a href="mailto:rahulamp2003@gmail.com?subject=AquaTrack%20Device%20Inquiry" className="text-blue-400 hover:text-blue-300 font-medium underline">
                  Contact us to discover more.
                </a>
              </div>

            </div>
          ) : (
            // Glassmorphic Auth Form Wrapper
            <div className="glass-liquid-card p-8 rounded-[2rem] w-full shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
              <div className="flex flex-col items-center mb-6">
                <h3 className="text-xl font-black bg-gradient-to-r from-sky-400 via-sky-300 to-blue-200 bg-clip-text text-transparent">
                  {view === 'login' ? 'Sign In' : 'Register Account'}
                </h3>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">
                  {view === 'login' ? 'Enter credentials' : 'Choose security role'}
                </p>
              </div>

              {message && message.text && (
                <div className={`p-4 rounded-xl border mb-5 flex items-start gap-3 text-xs leading-relaxed ${
                  message.type === 'error' 
                    ? (darkMode 
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' 
                        : 'bg-rose-50 border-rose-200 text-rose-800') 
                    : message.type === 'info'
                      ? (darkMode 
                          ? 'bg-blue-950/30 border-blue-500/30 text-blue-200' 
                          : 'bg-blue-50 border-blue-200 text-blue-800')
                      : (darkMode 
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                }`}>
                  {message.type === 'error' ? (
                    <AlertCircle size={18} className={darkMode ? "text-rose-400 shrink-0 mt-0.5" : "text-rose-700 shrink-0 mt-0.5"} />
                  ) : message.type === 'info' ? (
                    <Info size={18} className={darkMode ? "text-blue-400 shrink-0 mt-0.5" : "text-blue-700 shrink-0 mt-0.5"} />
                  ) : (
                    <CheckCircle2 size={18} className={darkMode ? "text-emerald-400 shrink-0 mt-0.5" : "text-emerald-700 shrink-0 mt-0.5"} />
                  )}
                  <span className="font-bold flex-1">{message.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {view === 'register' && (
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider pl-1">Full Name</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="text" required placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {view === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider pl-1">Gender</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-slate-350 text-xs focus:outline-none cursor-pointer"
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider pl-1">Mobile No.</label>
                      <input
                        type="tel" placeholder="+91 XXXXX XXXXX"
                        className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                        value={formData.mobileNo}
                        onChange={e => setFormData({...formData, mobileNo: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider pl-1">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="email" required placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider pl-1">Password</label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="password" required placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-550 focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none transition text-xs"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                {view === 'register' && (
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider pl-1">Account Role</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-slate-350 text-xs focus:outline-none cursor-pointer"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="ROLE_COMMUNITY_ADMIN">Community Admin</option>
                      <option value="ROLE_ADMIN">Super Admin</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-655 hover:from-blue-550 hover:to-indigo-550 text-white font-bold py-3.5 rounded-xl transition duration-350 text-xs flex justify-center items-center shadow-lg cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : (view === 'login' ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              {/* Navigation buttons inside Form Panel */}
              <div className="mt-5 flex flex-col gap-3 text-center border-t border-slate-800/80 pt-4">
                <button
                  onClick={() => setView(view === 'login' ? 'register' : 'login')}
                  className="text-xs text-blue-400 font-bold hover:text-blue-300 transition"
                >
                  {view === 'login' ? 'Need an account? Register here' : 'Already registered? Sign in here'}
                </button>
                <button
                  onClick={() => setView('landing')}
                  className="text-[11px] text-slate-500 font-semibold hover:text-slate-400 transition"
                >
                  ← Back to landing page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium Footer at the very bottom */}
      <footer className="w-full bg-slate-900/60 backdrop-blur-md border-t border-blue-500/10 py-10 px-6 mt-auto z-10 relative shrink-0">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Droplets size={20} className="text-blue-400" />
              <span className="font-black tracking-tight text-slate-100">Aqua<span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent font-black">Track</span></span>
            </div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto md:mx-0">
              Smart community water management and remote consumption tracking. Ensuring water efficiency for modern societies.
            </p>
          </div>
          
          {/* Quick Links Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Solutions</h4>
            <div className="flex flex-col gap-2 text-xs text-slate-500">
              <span>Automatic Leak Detection</span>
              <span>Individual Flat Billing</span>
              <span>Community Allocations</span>
            </div>
          </div>
          
          {/* Contact Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Contact & Support</h4>
            <div className="text-xs text-slate-500 space-y-1.5">
              <p>Email: <a href="mailto:support@aquatrack.com" className="text-blue-400 hover:underline">rahulamp2003@gmail.com</a></p>
              <p>Device Queries: <a href="mailto:rahulamp2003@gmail.com" className="text-blue-400 hover:underline">Inquiry Center</a></p>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto border-t border-slate-800/80 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <p>© 2026 AquaTrack Inc. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <Droplets size={12} className="text-blue-400 animate-pulse" /> Every Drop Counts
          </p>
        </div>
      </footer>

    </div>
  );
}

// -------------------------------------------------------------
// NEW AND IMPLEMENTED TABS (TARIFFS, BILLING, TANKERS, INVOICES, ALERTS, CALCULATOR)
// -------------------------------------------------------------

function TariffPlansTab({ token, apartments, showMessage, isSuperAdmin }) {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ apartmentId: '', baseRate: '', excessRate: '', baseLimitKl: '' });

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

  useEffect(() => {
    fetchTariffs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showMessage('error', 'Only Super Admins can save tariff plans.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/tariffs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showMessage('success', 'Tariff plan saved successfully!');
        setFormData({ apartmentId: '', baseRate: '', excessRate: '', baseLimitKl: '' });
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
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Tariff Configurations</h2>
      </div>

      {isSuperAdmin && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Set Tariff Rates</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Apartment Block</label>
              <select
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={formData.apartmentId}
                onChange={e => setFormData({ ...formData, apartmentId: e.target.value })}
              >
                <option value="">-- Choose Building --</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Base Rate (₹/L)</label>
              <input
                type="number" step="0.01" required placeholder="1.50"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={formData.baseRate}
                onChange={e => setFormData({ ...formData, baseRate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Base Limit (kL)</label>
              <input
                type="number" step="1" required placeholder="10"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={formData.baseLimitKl}
                onChange={e => setFormData({ ...formData, baseLimitKl: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Excess Rate (₹/L)</label>
                <input
                  type="number" step="0.01" required placeholder="3.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={formData.excessRate}
                  onChange={e => setFormData({ ...formData, excessRate: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition h-fit shrink-0"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase mb-4">Active Tariff Rates Table</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 text-xs py-4 text-center">Loading tariffs...</p>
          ) : tariffs.length === 0 ? (
            <p className="text-slate-555 text-xs italic py-4 text-center">No tariff plans defined. Default rates (1.50 base, 3.00 excess, 10000L limit) will apply.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-2">Apartment Name</th>
                  <th className="pb-3">Base Rate (per L)</th>
                  <th className="pb-3">Base Limit (Liters)</th>
                  <th className="pb-3">Excess Rate (per L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {tariffs.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/10">
                    <td className="py-3 pl-2 font-bold">{t.apartment?.name}</td>
                    <td>₹{t.baseRate.toFixed(2)}</td>
                    <td>{t.baseLimitKl * 1000} Liters</td>
                    <td className="text-blue-400 font-bold">₹{t.excessRate.toFixed(2)}</td>
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

function BillingTab({ token, apartments, users, showMessage, isSuperAdmin }) {
  const [cycles, setCycles] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [finalizingId, setFinalizingId] = useState(null);
  const [formData, setFormData] = useState({ apartmentId: '', startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], endDate: '', totalBulkCost: '' });
  
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
        setFormData({ apartmentId: '', startDate: '', endDate: '', totalBulkCost: '' });
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
      <div className="border-b border-slate-800 pb-4 flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Billing Operations</h2>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Manage and monitor billing cycles for each apartment block. Open new billing cycles to start tracking water consumption and associated costs. Once the cycle period is complete, finalize it to automatically calculate charges based on tariff plans and generate invoices for all registered households.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          {/* Create Cycle Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Open Billing Cycle</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Apartment Block</label>
                <select required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.apartmentId} onChange={e => {
                  const aptId = e.target.value;
                  const matchingTariff = tariffs.find(t => t.apartment && t.apartment.id.toString() === aptId.toString());
                  const defaultCost = matchingTariff ? matchingTariff.baseRate.toString() : '';
                  setFormData({ ...formData, apartmentId: aptId, totalBulkCost: defaultCost });
                }}>
                  <option value="">-- Choose Apartment --</option>
                  {apartments.map(a => <option key={a.id} value={a.id}>{a.name} — {a.address}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input type="date" required max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input type="date" required max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cost (₹)</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none" value={formData.totalBulkCost} onChange={e => setFormData({ ...formData, totalBulkCost: e.target.value })} />
              </div>
              <button type="submit" disabled={creating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs transition">
                {creating ? 'Opening...' : 'Create Cycle'}
              </button>
            </form>
          </div>

          {/* Admin Bill Panel (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="bg-slate-900 border border-amber-800/50 p-6 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.05)]">
              <h3 className="font-bold text-amber-500 text-xs tracking-wide uppercase mb-4">Generate Admin Bill</h3>
              <form onSubmit={handleCreateAdminBill} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Community Admin</label>
                  <select required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none" value={adminBillData.targetUserId} onChange={e => setAdminBillData({ ...adminBillData, targetUserId: e.target.value })}>
                    <option value="">-- Select Admin --</option>
                    {communityAdmins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Cycle</label>
                  <select required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none" value={adminBillData.billingCycleId} onChange={e => setAdminBillData({ ...adminBillData, billingCycleId: e.target.value })}>
                    <option value="">-- Select Cycle --</option>
                    {cycles.map(c => <option key={c.id} value={c.id}>{c.startDate} ({c.apartment?.name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input type="number" step="0.01" required className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none" value={adminBillData.amount} onChange={e => setAdminBillData({ ...adminBillData, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <input type="text" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none" value={adminBillData.description} onChange={e => setAdminBillData({ ...adminBillData, description: e.target.value })} placeholder="e.g. Infrastructure Maintenance" />
                </div>
                <button type="submit" disabled={creatingAdminBill} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 rounded-lg text-xs transition">
                  {creatingAdminBill ? 'Generating...' : 'Issue Admin Bill'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl lg:col-span-2 h-fit">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Billing Cycles Directory</h3>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-slate-500 text-xs py-4 text-center">Loading cycles...</p>
            ) : cycles.length === 0 ? (
              <p className="text-slate-555 text-xs italic py-4 text-center">No billing cycles opened yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="pb-3 pl-2">Apartment</th>
                    <th className="pb-3">Period</th>
                    <th className="pb-3">Cost</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {cycles.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/10">
                      <td className="py-3 pl-2">
                        <div className="font-bold text-slate-200">{c.apartment?.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{c.apartment?.address}</div>
                      </td>
                      <td>{c.startDate} to {c.endDate}</td>
                      <td>₹{c.totalBulkCost?.toFixed(2) || '0.00'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${c.finalized ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                          {c.finalized ? 'Finalized' : 'Active'}
                        </span>
                      </td>
                      <td className="text-right py-2">
                        <div className="flex items-center justify-end gap-2">
                        {c.finalized ? (
                          <button
                            onClick={() => viewInvoices(c.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 px-2.5 py-1 rounded-lg font-bold text-[10px] transition"
                          >
                            View Invoices
                          </button>
                        ) : (
                          <button
                            disabled={finalizingId === c.id}
                            onClick={() => handleFinalize(c.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                          >
                            {finalizingId === c.id ? 'Running...' : 'Finalize & Bill'}
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
      </div>

      {selectedCycleBills && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mt-6 shadow-lg shadow-black/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase">Calculated Invoices for Selected Cycle</h3>
            <button onClick={() => setSelectedCycleBills(null)} className="text-xs text-red-400 font-bold hover:underline">Close List</button>
          </div>
          <div className="overflow-x-auto">
            {selectedCycleBills.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-2">No invoices generated. Check if this apartment has registered households.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="pb-3 pl-2">Invoice No</th>
                    <th className="pb-3">Target</th>
                    <th className="pb-3">Consumption</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {selectedCycleBills.map(b => {
                    const cycleId = b.billingCycle?.id;
                    const isTargetAdmin = !!b.targetUser;
                    return (
                      <tr key={b.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-2 pl-2 font-mono text-indigo-400 text-[10px]">{b.invoiceNumber}</td>
                        <td className="py-2">
                          {isTargetAdmin ? (
                            <span className="text-amber-400 font-bold">Admin: {b.targetUser?.name}</span>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-200">Block {b.household?.block} - Flat {b.household?.flatNumber}</span>
                              <div className="text-[10px] text-slate-500 mt-0.5">{getResidentName(b.household?.id)}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-2">
                          {isTargetAdmin ? <span className="text-slate-500 italic">N/A</span> : `${b.consumptionLiters.toLocaleString()} L`}
                        </td>
                        <td className="py-2">
                          {editingBillId === b.id ? (
                            <input type="number" step="0.01" className="w-20 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs" value={editBillData.amount} onChange={(e) => setEditBillData({...editBillData, amount: e.target.value})} />
                          ) : (
                            <span className="font-bold text-slate-100">₹{b.amount.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-2">
                          {editingBillId === b.id ? (
                            <select className="w-20 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs" value={editBillData.paid} onChange={(e) => setEditBillData({...editBillData, paid: e.target.value === 'true'})}>
                              <option value="false">Unpaid</option>
                              <option value="true">Paid</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${b.paid ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                              {b.paid ? 'Paid' : 'Unpaid'}
                            </span>
                          )}
                        </td>
                        <td className="text-right py-2">
                          {editingBillId === b.id ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleUpdateBill(b.id, cycleId)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold">Save</button>
                              <button onClick={cancelEditBill} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded shadow text-[10px] font-bold">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEditBill(b)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold">Edit</button>
                              <button onClick={() => handleDeleteBill(b.id, cycleId)} className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded shadow text-[10px] font-bold">Delete</button>
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

function WaterPurchaseTab({ token, apartments, showMessage }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ apartmentId: '', date: '', liters: '', cost: '', supplierName: '', invoiceNumber: '' });

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
        setFormData({ apartmentId: '', date: '', liters: '', cost: '', supplierName: '', invoiceNumber: '' });
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
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Log Bulk Water Purchase (Tankers)</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Log Tanker Delivery</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Apartment Block</label>
              <select
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.apartmentId}
                onChange={e => setFormData({ ...formData, apartmentId: e.target.value })}
              >
                <option value="">-- Choose Apartment --</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Date</label>
              <input
                type="date" required max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity (Liters)</label>
              <input
                type="number" step="1" required placeholder="e.g. 10000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.liters}
                onChange={e => setFormData({ ...formData, liters: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Price (₹)</label>
              <input
                type="number" step="0.01" required placeholder="e.g. 150.00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.cost}
                onChange={e => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier / Tanker Provider</label>
              <input
                type="text" required placeholder="Metro Water Supply"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.supplierName}
                onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice / Receipt No</label>
              <input
                type="text" placeholder="TXN-984394"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                value={formData.invoiceNumber}
                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>
            <button
              type="submit" disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-lg text-xs transition"
            >
              {saving ? 'Saving...' : 'Record Purchase'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl lg:col-span-2">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Tanker Deliveries History</h3>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-slate-500 text-xs py-4 text-center">Loading purchases...</p>
            ) : purchases.length === 0 ? (
              <p className="text-slate-555 text-xs italic py-4 text-center">No purchases recorded.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="pb-3 pl-2">Date</th>
                    <th className="pb-3">Apartment</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Supplier</th>
                    <th className="pb-3">Invoice No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/10">
                      <td className="py-3 pl-2">{p.date}</td>
                      <td className="font-bold">{p.apartment?.name}</td>
                      <td>{p.liters.toLocaleString()} L</td>
                      <td className="font-bold text-emerald-400">₹{p.cost.toFixed(2)}</td>
                      <td>{p.supplierName}</td>
                      <td className="font-mono text-purple-400">{p.invoiceNumber || 'N/A'}</td>
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
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Invoices & Surcharges</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase mb-4 font-sans">System Generated Invoices</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 text-xs py-4 text-center">Loading invoices...</p>
          ) : bills.length === 0 ? (
            <p className="text-slate-555 text-xs italic py-4 text-center">No invoices found. Generate them by finalizing billing cycles.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-2">Invoice ID</th>
                  <th className="pb-3">Resident / Flat</th>
                  <th className="pb-3">Billing Cycle</th>
                  <th className="pb-3">Total Volume</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {bills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/10">
                    <td className="py-3 pl-2 font-mono text-indigo-400">{b.invoiceNumber}</td>
                    <td>
                      <p className="font-bold">{b.household?.apartment?.name}</p>
                      <p className="text-[10px] text-slate-500">Block {b.household?.block} - Flat {b.household?.flatNumber}</p>
                    </td>
                    <td>{b.billingCycle?.startDate} to {b.billingCycle?.endDate}</td>
                    <td>{b.consumptionLiters.toLocaleString()} Liters</td>
                    <td className="font-bold">₹{b.amount.toFixed(2)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${b.paid ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' : 'bg-red-950/20 border-red-500/20 text-red-400'}`}>
                        {b.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="text-right py-2">
                      <button
                        onClick={() => setActiveInvoice(b)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg font-semibold transition"
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

function AlertsTab({ token, households, showMessage, isAdmin, onUpdate }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', type: 'MAINTENANCE', householdId: '' });

  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        if(onUpdate) onUpdate();
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
                    <span className="text-[10px] text-slate-500 font-bold font-mono">{a.date}</span>
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

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/reports/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return <p className="text-slate-500 text-xs text-center py-10">Compiling report statistics...</p>;
  }

  if (!summary) {
    return <p className="text-slate-555 text-xs italic py-10 text-center">No reports data available.</p>;
  }

  const consumptionMap = summary.consumptionByApartment || {};
  const aptNames = Object.keys(consumptionMap);
  const totalConsumed = summary.totalConsumedLiters;
  const totalPurchased = summary.totalPurchasedLiters;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">System Performance Metrics</h2>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Total Water Procured</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{totalPurchased.toLocaleString()} L</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Total Water Consumed</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{totalConsumed.toLocaleString()} L</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Procurement Cost</p>
          <p className="text-2xl font-bold text-red-400 mt-1">₹{summary.totalPurchasedCost?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Total Revenue Billed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">₹{summary.totalBilledAmount?.toFixed(2) || '0.00'}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase mb-4">Procured vs Consumed Balance</h3>
          <div className="h-44 bg-slate-950 rounded-lg border border-slate-800 p-6 flex flex-col justify-around">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>TOTAL WATER PURCHASED (TANKERS)</span>
                <span>{totalPurchased.toLocaleString()} Liters</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div style={{ width: `${totalPurchased ? 100 : 0}%` }} className="bg-indigo-605 h-full rounded-full"></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>TOTAL WATER CONSUMED BY FLATS</span>
                <span>{totalConsumed.toLocaleString()} Liters</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div style={{ width: `${totalPurchased ? Math.min((totalConsumed / totalPurchased) * 100, 100) : 0}%` }} className="bg-blue-500 h-full rounded-full"></div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Discrepancy (if consumption &gt; purchased) represents meter variance or backlogged readings.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase mb-4">Consumption by Building Block</h3>
          <div className="h-44 bg-slate-950 rounded-lg border border-slate-800 p-4 flex flex-col justify-center overflow-y-auto space-y-3">
            {aptNames.length === 0 ? (
              <p className="text-slate-500 text-xs italic text-center">No block consumption data logged.</p>
            ) : (
              aptNames.map(name => {
                const val = consumptionMap[name];
                const percentage = totalConsumed ? (val / totalConsumed) * 100 : 0;
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400">
                      <span>{name}</span>
                      <span>{val.toLocaleString()} L ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${percentage}%` }} className="bg-blue-400 h-full rounded-full"></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
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
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">My Paid Receipts</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-bold text-slate-200 text-xs tracking-wide uppercase mb-4">Invoice Downloads</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 text-xs py-4 text-center">Loading paid receipts...</p>
          ) : bills.length === 0 ? (
            <p className="text-slate-555 text-xs italic py-4 text-center">No paid receipts found.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3 pl-2">Invoice No</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Volume Used</th>
                  <th className="pb-3">Settled Cost</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {bills.map(b => (
                  <tr key={b.id}>
                    <td className="py-3 pl-2 font-mono text-indigo-400">{b.invoiceNumber}</td>
                    <td>{b.billingCycle?.startDate} to {b.billingCycle?.endDate}</td>
                    <td>{b.consumptionLiters.toLocaleString()} Liters</td>
                    <td className="font-bold text-emerald-400">₹{b.amount.toFixed(2)}</td>
                    <td className="text-right py-1">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveInvoice(b)}
                          className="bg-slate-800 hover:bg-slate-800 text-blue-400 border border-slate-800 px-2.5 py-1 rounded-lg font-bold text-[10px]"
                        >
                          View Receipt
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(b.id, token, showMessage)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] transition"
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
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Water Conservation Hub</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Household Water Footprint Calculator</h3>
          <form onSubmit={calculateFootprint} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Family Members</label>
                <input
                  type="number" min="1" required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.familySize}
                  onChange={e => setCalculator({ ...calculator, familySize: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Shower Duration (Mins)</label>
                <input
                  type="number" min="1" required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.showerTime}
                  onChange={e => setCalculator({ ...calculator, showerTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Toilet Flushes per Day / Person</label>
                <input
                  type="number" min="1" required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.flushCount}
                  onChange={e => setCalculator({ ...calculator, flushCount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Washing Machine Loads / Week</label>
                <input
                  type="number" min="0" required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={calculator.washingLoads}
                  onChange={e => setCalculator({ ...calculator, washingLoads: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition">
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
              <p className="text-[10px] text-slate-400">
                This equals approx <span className="font-bold">{result.perCapita} Liters</span> per member daily. (Target: &lt; 90L)
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase mb-4">Everyday Conservation Tips</h3>
          <div className="space-y-4 text-xs leading-relaxed text-slate-300">
            <div className="flex gap-3">
              <span className="bg-blue-950 text-blue-400 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <div>
                <h4 className="font-bold text-slate-200">Fix Taps Promptly</h4>
                <p className="text-slate-400 mt-0.5">A single dripping tap can waste more than 15 liters of fresh water a day.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-950 text-blue-400 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <div>
                <h4 className="font-bold text-slate-200">Full Washing Cycles Only</h4>
                <p className="text-slate-400 mt-0.5">Run clothes washer and dishwasher machines only when they are fully loaded to save up to 100L/week.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-950 text-blue-400 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
              <div>
                <h4 className="font-bold text-slate-200">Aerated Taps</h4>
                <p className="text-slate-400 mt-0.5">Installing low-flow aerators on bathroom and kitchen taps can reduce faucet water consumption by 50% without affecting pressure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ invoice, onClose, allowPay = false, onPay, payingId, onDownload }) {
  if (!invoice) return null;
  const amount = invoice.amount.toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-slate-100 font-black text-lg">Invoice Details</h3>
            <p className="text-slate-400 text-[10px] font-mono mt-0.5">#{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center">
            {onDownload && (
              <button onClick={() => onDownload(invoice.id)} className="text-blue-400 hover:text-blue-300 transition mr-4" title="Download PDF">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block text-slate-500 uppercase tracking-wide font-bold text-[9px] mb-1">Billing Period</span>
              <span className="text-slate-200">{invoice.billingCycle?.startDate} to {invoice.billingCycle?.endDate}</span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase tracking-wide font-bold text-[9px] mb-1">Consumption</span>
              <span className="text-slate-200">{invoice.consumptionLiters?.toLocaleString()} Liters</span>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">Itemized Breakdown</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Base Charge</span>
                <span>₹{(invoice.baseCharge || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Excess Charge</span>
                <span>₹{(invoice.excessCharge || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Shared Area Allocation</span>
                <span>₹{(invoice.sharedCostAllocation || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Amount</span>
              <span className="text-emerald-400 font-black text-2xl">₹{amount}</span>
            </div>
          </div>

          {invoice.paid ? (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-emerald-500/30 rounded-xl bg-emerald-950/20">
              <div className="bg-emerald-500/20 p-3 rounded-full mb-3">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h4 className="text-emerald-400 font-black tracking-widest uppercase text-xl">PAID</h4>
              <p className="text-slate-400 text-[10px] mt-1 text-center">This invoice has been successfully settled.</p>
              
              {(invoice.razorpayPaymentId || invoice.razorpayOrderId) && (
                <div className="mt-4 w-full px-4 text-center border-t border-emerald-500/20 pt-3">
                  <p className="text-emerald-500/80 text-[10px] uppercase font-bold tracking-wider mb-1">Transaction Details</p>
                  {invoice.razorpayPaymentId && <p className="text-emerald-400/80 text-[10px] font-mono mb-0.5">ID: {invoice.razorpayPaymentId}</p>}
                  {invoice.razorpayOrderId && <p className="text-emerald-400/80 text-[10px] font-mono">Order: {invoice.razorpayOrderId}</p>}
                </div>
              )}
            </div>
          ) : !invoice.paid && allowPay ? (
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              {/* Razorpay branded payment section */}
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <svg width="28" height="28" viewBox="0 0 135 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M45.8 30.2L51.5 8.8H57.2L55.6 14.7C56.9 13 58.6 12.1 60.7 12.1C63.6 12.1 65.5 13.9 65.5 16.9C65.5 17.6 65.4 18.4 65.1 19.3L62.7 30.2H57.1L59.3 20.3C59.4 19.9 59.5 19.4 59.5 18.9C59.5 17.6 58.8 16.8 57.5 16.8C55.8 16.8 54.4 18 53.9 20.1L51.6 30.2H45.8Z" fill="#2EB8E6"/>
                    <path d="M67.5 30.2L72 12.5H77.7L73.2 30.2H67.5ZM78.1 10.3C78.1 11.9 76.8 13.2 75.1 13.2C73.4 13.2 72.2 12 72.2 10.4C72.2 8.8 73.5 7.5 75.2 7.5C76.9 7.5 78.1 8.7 78.1 10.3Z" fill="#2EB8E6"/>
                    <path d="M22 7.7L11.5 31.3L0 8.8H7.3L11.6 18.3L18.5 7.7H22Z" fill="#2EB8E6"/>
                    <path d="M33.6 7.7L24.4 23.4L22.4 31.3H16.1L20.7 12.8L33.6 7.7Z" fill="#072654"/>
                  </svg>
                  <span className="text-slate-200 font-bold text-sm">Pay Securely with Razorpay</span>
                </div>
                <p className="text-slate-400 text-[11px] text-center leading-relaxed">
                  Pay via Credit/Debit Card, UPI, Net Banking, or Wallets.<br/>
                  Secured by 256-bit SSL encryption.
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {['VISA', 'MC', 'UPI', 'NB'].map(m => (
                    <span key={m} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-bold tracking-wider border border-slate-700">{m}</span>
                  ))}
                </div>
              </div>
              <button
                disabled={payingId === invoice.id}
                onClick={() => onPay && onPay(invoice.id)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20"
              >
                {payingId === invoice.id ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    Pay ₹{invoice.amount?.toFixed(2)} Now
                  </>
                )}
              </button>
              <p className="text-slate-600 text-[9px] text-center">You'll be redirected to Razorpay secure checkout</p>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-red-500/30 rounded-xl bg-red-950/20">
               <h4 className="text-red-400 font-black tracking-widest uppercase text-xl">UNPAID</h4>
               <p className="text-slate-400 text-[10px] mt-1 text-center">Payment is pending for this cycle.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
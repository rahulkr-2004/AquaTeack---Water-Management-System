import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  UserPlus, 
  ChevronRight, 
  FileText, 
  UploadCloud, 
  Camera, 
  KeyRound, 
  ShieldAlert, 
  Check,
  Droplets,
  Phone,
  Mail,
  User,
  Home,
  ShieldCheck,
  Lock,
  Sparkles,
  Smartphone,
  Building2
} from 'lucide-react';
import { WaterGridCanvas, BubblesCanvas } from './CanvasBackgrounds';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8080` : 'http://localhost:8080');

export function InviteVerificationView({ inviteToken, showMessage, darkMode, toggleDarkMode }) {
  const [formData, setFormData] = useState({ gender: 'Male', mobileNo: '', alternateNo: '' });
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
    const cleanMobile = formData.mobileNo.trim();
    if (!cleanMobile || cleanMobile.replace(/\D/g, '').length < 10) {
      return showMessage('error', 'Please enter a valid mobile number (e.g. +91 9876543210).');
    }
    if (!docs.documentAadhar || !docs.documentPhoto) {
      return showMessage('error', 'Please upload both Govt ID (Aadhar/PAN) and a recent photograph.');
    }
    if (password.length < 6) {
      return showMessage('error', 'Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken,
          ...docs,
          ...formData,
          mobileNo: cleanMobile.startsWith('+') ? cleanMobile : `+91 ${cleanMobile}`
        })
      });

      if (!verifyRes.ok) {
        const text = await verifyRes.text();
        throw new Error(text || 'Document verification failed.');
      }

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
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700/80 p-10 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl relative z-10 animate-fade-in-up">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.25)] border border-emerald-500/30">
            <CheckCircle2 size={44} />
          </div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">Welcome Home!</h2>
          <p className="text-slate-300 text-sm leading-relaxed font-medium">Your account setup is complete! It is now pending administrative approval. You can log in using your email and set password.</p>
          <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/30 text-sm tracking-wide">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Format apartment block string safely to avoid duplicate "Block Block X"
  const getFormattedApartment = () => {
    if (!invitationDetails) return '';
    const rawBlock = invitationDetails.block || '';
    const blockDisplay = rawBlock.toLowerCase().startsWith('block') ? rawBlock : `Block ${rawBlock}`;
    return `${invitationDetails.apartmentName || 'Apartment'}, ${blockDisplay}, Flat ${invitationDetails.flatNumber || ''}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50/70 to-blue-100 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-slate-100 p-4 sm:p-6 relative overflow-y-auto font-sans">
      <WaterGridCanvas />
      
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-sky-100 dark:border-slate-800 p-6 sm:p-10 rounded-[2.5rem] max-w-xl w-full shadow-[0_25px_70px_-15px_rgba(14,165,233,0.22)] relative z-10 my-8 transition-all duration-500">
        
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between mb-8 px-2 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-cyan-500 text-white font-black text-xs flex items-center justify-center shadow-md shadow-cyan-500/30">1</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">Invite Details</span>
          </div>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-cyan-500 to-sky-400 mx-3 rounded-full"></div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-cyan-500 text-white font-black text-xs flex items-center justify-center shadow-md shadow-cyan-500/30">2</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">Personal Info</span>
          </div>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-sky-400 to-blue-500 mx-3 rounded-full"></div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-600/30">3</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">Verification</span>
          </div>
        </div>

        {/* Header Icon & Title */}
        <div className="text-center mb-8 relative">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-cyan-400/30 rounded-3xl blur-xl animate-pulse"></div>
            <div className="relative w-full h-full bg-gradient-to-tr from-sky-500 via-cyan-500 to-blue-600 text-white rounded-3xl flex items-center justify-center shadow-[0_10px_25px_rgba(6,182,212,0.4)] ring-4 ring-cyan-100 dark:ring-slate-800">
              <Droplets size={38} className="drop-shadow-md animate-bounce-subtle" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-[11px] font-extrabold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Verified Resident Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            Register Yourself
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold max-w-sm mx-auto">
            Review your allocated apartment details & set up your secure resident account
          </p>
        </div>

        <form onSubmit={handleRegistration} className="space-y-7" autoComplete="off">
          
          {/* Section 0: Pre-filled Invitation Details */}
          {invitationDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-sky-100 dark:border-slate-800 pb-2.5">
                <h3 className="text-xs font-black text-sky-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-cyan-500" /> Pre-filled Invitation Details
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={12} /> Verified Link
                </span>
              </div>
              <div className="bg-gradient-to-br from-sky-50/80 to-cyan-50/50 dark:from-slate-950 dark:to-slate-900/90 p-5 rounded-2xl border border-sky-200/70 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                      <User size={12} className="text-cyan-600" /> Full Name
                    </label>
                    <input 
                      type="text" readOnly disabled 
                      value={invitationDetails.name || ''} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-sm cursor-not-allowed disabled:opacity-100" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                      <Mail size={12} className="text-cyan-600" /> Email Address
                    </label>
                    <input 
                      type="text" readOnly disabled 
                      value={invitationDetails.email || ''} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-sm cursor-not-allowed truncate disabled:opacity-100" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                    <Building2 size={12} className="text-cyan-600" /> Allocated Apartment / Flat
                  </label>
                  <input 
                    type="text" readOnly disabled 
                    value={getFormattedApartment()} 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-cyan-300 dark:border-slate-700 rounded-xl text-cyan-800 dark:text-cyan-300 font-extrabold text-xs sm:text-sm shadow-sm cursor-not-allowed disabled:opacity-100" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-sky-700 dark:text-cyan-400 border-b border-sky-100 dark:border-slate-800 pb-2.5 uppercase tracking-wider flex items-center gap-2">
              <User size={16} className="text-cyan-500" /> 1. Personal Information
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Gender</label>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g} type="button"
                    onClick={() => setFormData({...formData, gender: g})}
                    className={`flex-1 py-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      formData.gender === g 
                        ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/30 scale-[1.02]' 
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Mobile Number *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel" required placeholder="+91 9876543210" autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-sky-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition text-xs sm:text-sm font-semibold shadow-sm"
                    value={formData.mobileNo}
                    onChange={e => setFormData({...formData, mobileNo: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Alternate No</label>
                <div className="relative">
                  <Smartphone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel" placeholder="Optional" autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-sky-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition text-xs sm:text-sm font-semibold shadow-sm"
                    value={formData.alternateNo}
                    onChange={e => setFormData({...formData, alternateNo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Identity Verification */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-sky-700 dark:text-cyan-400 border-b border-sky-100 dark:border-slate-800 pb-2.5 uppercase tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-cyan-500" /> 2. Identity Verification
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Govt ID (Aadhar / PAN) *</label>
                <div className={`relative overflow-hidden border-2 border-dashed ${docs.documentAadhar ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40' : 'border-cyan-200 dark:border-slate-700 bg-sky-50/40 dark:bg-slate-950'} rounded-2xl p-4 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/50 transition-all duration-300 group shadow-inner min-h-[145px] flex flex-col items-center justify-center`}>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, 'documentAadhar')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    {docs.documentAadhar ? (
                      docs.documentAadhar.startsWith('data:image') ? (
                        <div className="relative flex flex-col items-center">
                          <img src={docs.documentAadhar} className="w-28 h-20 object-cover rounded-lg border border-emerald-400 mb-1.5 shadow-md" />
                          <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm"><CheckCircle2 size={12}/> Verified Document</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <FileText className="text-emerald-600 dark:text-emerald-400 mb-1" size={36} />
                          <span className="text-emerald-700 dark:text-emerald-300 text-xs font-extrabold">PDF Selected ✓</span>
                          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-semibold">Click to replace</span>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="w-11 h-11 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-all mb-2 shadow-sm border border-sky-100 dark:border-slate-700">
                          <UploadCloud size={24} />
                        </div>
                        <span className="text-slate-800 dark:text-slate-200 text-xs font-bold group-hover:text-cyan-600 dark:group-hover:text-cyan-300">Upload ID Document</span>
                        <span className="text-slate-400 dark:text-slate-400 text-[10px] mt-0.5">JPEG, PNG or PDF (Max 10MB)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Recent Photo *</label>
                <div className={`relative overflow-hidden border-2 border-dashed ${docs.documentPhoto ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40' : 'border-cyan-200 dark:border-slate-700 bg-sky-50/40 dark:bg-slate-950'} rounded-2xl p-4 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/50 transition-all duration-300 group shadow-inner min-h-[145px] flex flex-col items-center justify-center`}>
                  <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'documentPhoto')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    {docs.documentPhoto ? (
                      <div className="relative flex flex-col items-center">
                        <img src={docs.documentPhoto} className="w-16 h-16 object-cover rounded-full border-2 border-emerald-500 mb-1.5 shadow-md" />
                        <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm"><CheckCircle2 size={12}/> Photo Uploaded</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-11 h-11 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-all mb-2 shadow-sm border border-sky-100 dark:border-slate-700">
                          <Camera size={24} />
                        </div>
                        <span className="text-slate-800 dark:text-slate-200 text-xs font-bold group-hover:text-cyan-600 dark:group-hover:text-cyan-300">Upload Selfie</span>
                        <span className="text-slate-400 dark:text-slate-400 text-[10px] mt-0.5">JPEG or PNG (Max 10MB)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Password */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-sky-700 dark:text-cyan-400 border-b border-sky-100 dark:border-slate-800 pb-2.5 uppercase tracking-wider flex items-center gap-2">
              <Lock size={16} className="text-cyan-500" /> 3. Secure Your Account
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Create Password *</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password" required placeholder="At least 6 characters" minLength={6} autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-sky-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition text-xs sm:text-sm font-semibold shadow-sm"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black rounded-2xl text-sm uppercase tracking-wider transition-all duration-300 shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95 group">
            {loading ? 'Registering...' : <>Complete Registration & Submit <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CommunityAdminVerifyView({ userId, showMessage, onComplete, darkMode }) {
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
    if (!formData.mobileNo || formData.mobileNo.replace(/\D/g, '').length < 12) return showMessage('error', 'Please enter a valid mobile number with country code (e.g. +91 9876543210).');
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-y-auto text-slate-100 font-jakarta">
      <WaterGridCanvas />
      
      <div className="relative z-10 bg-slate-900 border-2 border-violet-500/40 p-6 sm:p-8 rounded-3xl max-w-lg w-full my-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-violet-600/20 border border-violet-500/40 text-violet-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-violet-300 via-purple-200 to-indigo-300 bg-clip-text text-transparent mb-1">
            Admin Verification
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm font-medium">
            Please submit your details for verification
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Section 1: Personal Info */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-extrabold text-violet-300 border-b border-slate-800 pb-1.5 uppercase tracking-wider">
              1. Personal Information
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g} type="button"
                    onClick={() => setFormData({...formData, gender: g})}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formData.gender === g
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel" required placeholder="+91 9876543210" pattern="(\+[0-9]{1,3}\s?)?[0-9]{10}"
                  className="w-full px-3.5 py-3 bg-slate-950 border border-slate-700 focus:border-violet-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all text-xs sm:text-sm font-semibold"
                  value={formData.mobileNo}
                  onChange={e => setFormData({...formData, mobileNo: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Alternate No
                </label>
                <input
                  type="tel" placeholder="Optional"
                  className="w-full px-3.5 py-3 bg-slate-950 border border-slate-700 focus:border-violet-400 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all text-xs sm:text-sm font-semibold"
                  value={formData.alternateNo}
                  onChange={e => setFormData({...formData, alternateNo: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Identity Documents */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-extrabold text-violet-300 border-b border-slate-800 pb-1.5 uppercase tracking-wider">
              2. Identity Documents
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Govt ID — Aadhar / PAN
                </label>
                <div className={`relative overflow-hidden border-2 border-dashed ${
                  docs.documentAadhar ? 'border-emerald-500/80 bg-emerald-950/40' : 'border-slate-700 bg-slate-950'
                } rounded-2xl p-4 text-center cursor-pointer hover:border-violet-400 transition-all group min-h-[140px] flex flex-col items-center justify-center`}>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange(e, 'documentAadhar')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    {docs.documentAadhar ? (
                      docs.documentAadhar.startsWith('data:image') ? (
                        <div className="relative">
                          <img src={docs.documentAadhar} className="w-28 h-20 object-cover rounded-lg border border-emerald-400/50 mb-1 mx-auto" />
                          <div className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Check size={10}/> Verified</div>
                        </div>
                      ) : (
                        <>
                          <FileText className="text-emerald-400 mb-1" size={32}/>
                          <span className="text-emerald-300 text-xs font-bold">PDF Uploaded ✓</span>
                        </>
                      )
                    ) : (
                      <>
                        <UploadCloud className="text-violet-400 group-hover:scale-110 mb-2 transition-transform" size={32}/>
                        <span className="text-slate-100 text-xs font-bold group-hover:text-violet-300">Upload ID Document</span>
                        <span className="text-slate-400 text-[10px] mt-0.5">JPEG, PNG or PDF (Max 10MB)</span>
                      </>
                    )}
                    {docs.documentAadhar && <span className="text-[10px] text-emerald-400/80 mt-1 font-medium">Click to replace</span>}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Recent Photograph
                </label>
                <div className={`relative overflow-hidden border-2 border-dashed ${
                  docs.documentPhoto ? 'border-emerald-500/80 bg-emerald-950/40' : 'border-slate-700 bg-slate-950'
                } rounded-2xl p-4 text-center cursor-pointer hover:border-violet-400 transition-all group min-h-[140px] flex flex-col items-center justify-center`}>
                  <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'documentPhoto')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    {docs.documentPhoto ? (
                      <div className="relative">
                        <img src={docs.documentPhoto} className="w-16 h-16 object-cover rounded-full border-2 border-emerald-400/60 mb-1 mx-auto" />
                        <div className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Check size={10}/> Verified</div>
                      </div>
                    ) : (
                      <>
                        <Camera className="text-violet-400 group-hover:scale-110 mb-2 transition-transform" size={32}/>
                        <span className="text-slate-100 text-xs font-bold group-hover:text-violet-300">Upload Selfie / Photo</span>
                        <span className="text-slate-400 text-[10px] mt-0.5">JPEG or PNG (Max 10MB)</span>
                      </>
                    )}
                    {docs.documentPhoto && <span className="text-[10px] text-emerald-400/80 mt-1 font-medium">Click to replace</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border border-violet-500/30 rounded-xl p-3.5 bg-violet-950/40 text-xs text-violet-200 leading-relaxed font-medium">
            <strong className="text-violet-300 font-bold">Account Safety:</strong> Document verification ensures platform integrity. Your details are encrypted and shared only with Super Admins for account vetting.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-lg shadow-violet-900/40 hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Submitting...' : <>Submit for Review <ChevronRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

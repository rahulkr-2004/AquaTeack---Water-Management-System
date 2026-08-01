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
  Check 
} from 'lucide-react';
import { WaterGridCanvas, BubblesCanvas } from './CanvasBackgrounds';

const API_BASE_URL = 'http://localhost:8080';

export function InviteVerificationView({ inviteToken, showMessage, darkMode, toggleDarkMode }) {
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
    if (!formData.mobileNo || formData.mobileNo.replace(/\D/g, '').length < 12) {
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
                  type="tel" required placeholder="9876543210" pattern="(\+[0-9]{1,3}\s?)?[0-9]{10}"
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
                <input type="tel" required placeholder="9876543210" pattern="(\+[0-9]{1,3}\s?)?[0-9]{10}"
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

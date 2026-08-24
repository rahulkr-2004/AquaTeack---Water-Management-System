import React, { useState, useEffect, useRef } from 'react';
import LogoSVG from './LogoSVG';
import {
  User, Mail, AtSign, Lock, Eye, EyeOff, Building2, Phone,
  ShieldCheck, UploadCloud, Camera, FileText, Check, ChevronRight,
  ChevronLeft, CheckCircle2, AlertCircle, Loader2, UserCheck
} from 'lucide-react';

const API_BASE_URL = typeof window !== 'undefined' ? `http://${window.location.hostname}:8080` : 'http://localhost:8080';

const STEPS = [
  { id: 1, label: 'Account',   icon: User },
  { id: 2, label: 'Location',  icon: Building2 },
  { id: 3, label: 'Documents', icon: ShieldCheck },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-7 select-none">
      {STEPS.map((step, idx) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done   ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                active ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/40 scale-110' :
                         'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
              }`}>
                {done ? <Check size={16} strokeWidth={3} /> : <Icon size={15} />}
              </div>
              <span className={`text-[10px] font-bold tracking-wide uppercase ${
                active ? 'text-cyan-600 dark:text-cyan-400' :
                done   ? 'text-emerald-600 dark:text-emerald-400' :
                         'text-slate-400'
              }`}>{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 mx-1 mb-4 rounded-full transition-all duration-500 ${
                currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function InputField({ icon: Icon, type = 'text', placeholder, value, onChange, required, children, badge }) {
  return (
    <div className="relative flex items-center bg-white dark:bg-slate-950 rounded-2xl px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-400/70 focus-within:border-cyan-500 dark:focus-within:border-cyan-400 focus-within:shadow-[0_0_18px_rgba(6,182,212,0.18)] transition-all duration-200 shadow-sm group">
      {Icon && <Icon className="text-slate-400 group-hover:text-cyan-500 shrink-0 mr-3 transition-colors" size={17} />}
      <input
        type={type} required={required} placeholder={placeholder}
        value={value} onChange={onChange}
        className="w-full bg-transparent border-none text-slate-900 dark:text-slate-100 text-sm font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
      />
      {badge}
      {children}
    </div>
  );
}

function UploadZone({ label, field, value, onChange, accept }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer group min-h-[130px] flex items-center justify-center overflow-hidden
        ${value ? 'border-emerald-500/70 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-cyan-400 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20'}`}>
        <input type="file" accept={accept} onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
        <div className="flex flex-col items-center justify-center pointer-events-none p-3 text-center">
          {value ? (
            value.startsWith('data:image') ? (
              <div className="flex flex-col items-center gap-1.5">
                <img src={value} className="w-20 h-16 object-cover rounded-xl border-2 border-emerald-400/50 shadow-md" alt="preview" />
                <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full"><Check size={9}/>Uploaded</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <FileText className="text-emerald-500" size={30} />
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">PDF Uploaded ✓</span>
              </div>
            )
          ) : (
            <>
              <UploadCloud className="text-slate-400 group-hover:text-cyan-500 group-hover:scale-110 mb-2 transition-all" size={28} />
              <span className="text-slate-600 dark:text-slate-300 text-xs font-bold group-hover:text-cyan-600">Click to Upload</span>
              <span className="text-slate-400 text-[10px] mt-0.5">JPEG, PNG or PDF · Max 10MB</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegistrationWizard({ showMessage, onSwitchToLogin, darkMode }) {
  const [step, setStep] = useState(1);
  const [regDone, setRegDone] = useState(false);

  // Step 1 — Account
  const [role, setRole] = useState('ROLE_COMMUNITY_ADMIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const usernameTimer = useRef(null);

  // Step 2 — Location + Contact
  const [colonyId, setColonyId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [customBuilding, setCustomBuilding] = useState('');
  const [gender, setGender] = useState('Male');
  const [mobile, setMobile] = useState('+91 ');
  const [colonies, setColonies] = useState([]);
  const [buildings, setBuildings] = useState([]);

  // Step 3 — Documents
  const [aadhar, setAadhar] = useState(null);
  const [photo, setPhoto] = useState(null);

  const [loading, setLoading] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Load colonies on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/colonies`)
      .then(r => r.ok ? r.json() : [])
      .then(setColonies).catch(() => setColonies([]));
  }, []);

  // Load buildings when colony changes
  useEffect(() => {
    if (!colonyId) { setBuildings([]); return; }
    setBuildingId('');
    fetch(`${API_BASE_URL}/api/auth/colonies/${colonyId}/available-buildings`)
      .then(r => r.ok ? r.json() : [])
      .then(setBuildings).catch(() => setBuildings([]));
  }, [colonyId]);

  // Username availability check
  const handleUsernameChange = (val) => {
    setUsername(val); setUsernameStatus(null);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (val.length < 3) return;
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-username?username=${encodeURIComponent(val)}`);
        const data = await res.json();
        setUsernameStatus({ available: data.available === true, message: data.message });
      } catch { setUsernameStatus(null); }
    }, 500);
  };

  // File handler with resize
  const handleFile = (e, setter) => {
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
          setter(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = reader.result;
      } else { setter(reader.result); }
    };
    reader.readAsDataURL(file);
  };

  // Step 1 → 2: Register account, get userId
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (usernameStatus && !usernameStatus.available) { showMessage('error', 'Username is not available.'); return; }
    setLoading(true);
    try {
      const payload = { name, email, username: username || email.split('@')[0], password, role, gender, mobileNo: mobile };
      if (role === 'ROLE_COMMUNITY_ADMIN') {
        if (colonyId) payload.colonyId = parseInt(colonyId);
        if (buildingId && buildingId !== 'CUSTOM') payload.buildingId = parseInt(buildingId);
        if (buildingId === 'CUSTOM' && customBuilding) payload.customBuildingName = customBuilding;
      }
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const uid = data?.userId || data?.user?.id || username || email;
        setRegisteredUserId(uid);
        setRegisteredEmail(email);
        if (role === 'ROLE_COMMUNITY_ADMIN') {
          setStep(3); // skip to doc upload
          showMessage('success', 'Account created! Now upload your documents.');
        } else {
          setRegDone(true);
          showMessage('success', 'Super Admin registered! Please sign in.');
        }
      } else {
        let err = await res.text();
        try { const p = JSON.parse(err); err = p.message || Object.values(p).join(', '); } catch {}
        showMessage('error', err || 'Registration failed.');
      }
    } catch { showMessage('error', 'Could not connect to server.'); }
    finally { setLoading(false); }
  };

  // Step 3: Submit docs
  const handleDocsSubmit = async (e) => {
    e.preventDefault();
    if (!aadhar || !photo) { showMessage('error', 'Please upload both Aadhar/PAN and your photograph.'); return; }
    if (!mobile || mobile.replace(/\D/g, '').length < 10) { showMessage('error', 'Enter a valid mobile number.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-admin-docs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: String(registeredUserId),
          email: registeredEmail || email,
          documentAadhar: aadhar,
          documentPhoto: photo,
          gender, mobileNo: mobile
        })
      });
      if (res.ok) {
        setRegDone(true);
        showMessage('success', 'Documents submitted! Awaiting Super Admin approval.');
      } else {
        const txt = await res.text();
        showMessage('error', txt || 'Submission failed.');
      }
    } catch { showMessage('error', 'Network error during document upload.'); }
    finally { setLoading(false); }
  };


  // Success screen
  if (regDone) return (
    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
        <CheckCircle2 size={38} className="text-emerald-500" />
      </div>
      <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">You're All Set!</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
        {role === 'ROLE_COMMUNITY_ADMIN'
          ? 'Your documents have been submitted. A Super Admin will review and approve your account. You\'ll be notified by email.'
          : 'Your Super Admin account is ready. Please sign in to access the dashboard.'}
      </p>
      <button onClick={onSwitchToLogin}
        className="mt-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/25 hover:scale-[1.02] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2">
        <UserCheck size={17} /> Go to Sign In
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-cyan-500/70 shadow-[0_0_18px_rgba(56,189,248,0.3)] mx-auto mb-3 flex items-center justify-center bg-white dark:bg-slate-950 p-1">
          <LogoSVG className="w-full h-full" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Create Account</h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Register your society or apartment profile</p>
      </div>

      {/* Step Indicator */}
      {role === 'ROLE_COMMUNITY_ADMIN' && <StepIndicator currentStep={step} />}

      {/* ── STEP 1: Account + Location (combined for Super Admin) ── */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4">
          {/* Role Toggle */}
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex gap-1">
            {[['ROLE_COMMUNITY_ADMIN', 'Community Admin'], ['ROLE_ADMIN', 'Super Admin']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setRole(val)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${role === val ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>

          <InputField icon={User} placeholder="Full Name" required value={name} onChange={e => setName(e.target.value)} />
          <InputField icon={Mail} type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} />

          {/* Username */}
          <InputField icon={AtSign} placeholder="Username (e.g. rahul2004)" required value={username}
            onChange={e => handleUsernameChange(e.target.value)}
            badge={usernameStatus && (
              <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${usernameStatus.available ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}
                title={usernameStatus.message}>
                {usernameStatus.available ? '✓ Available' : usernameStatus.message?.toLowerCase().includes('taken') ? 'Taken' : 'Invalid'}
              </span>
            )}
          />

          {/* Password */}
          <InputField icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Password (min 6 chars)" required value={password}
            onChange={e => setPassword(e.target.value)}>
            <button type="button" onClick={() => setShowPwd(p => !p)}
              className="ml-2 text-slate-400 hover:text-cyan-500 transition cursor-pointer shrink-0">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </InputField>

          {/* Colony + Block only for Community Admin on step 1 */}
          {role === 'ROLE_COMMUNITY_ADMIN' && (
            <>
              <div className="relative flex items-center bg-white dark:bg-slate-950 rounded-2xl px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-400/70 focus-within:border-cyan-500 transition-all shadow-sm">
                <Building2 className="text-slate-400 shrink-0 mr-3" size={17} />
                <select required value={colonyId} onChange={e => setColonyId(e.target.value)}
                  className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none cursor-pointer">
                  <option value="">— Select Colony / Apartment —</option>
                  {colonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {colonyId && (
                <div className="relative flex items-center bg-white dark:bg-slate-950 rounded-2xl px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-400/70 focus-within:border-cyan-500 transition-all shadow-sm">
                  <Building2 className="text-slate-400 shrink-0 mr-3" size={17} />
                  <select required value={buildingId} onChange={e => setBuildingId(e.target.value)}
                    className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none cursor-pointer">
                    <option value="">— Select Block —</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    <option value="CUSTOM">+ Propose New Block…</option>
                  </select>
                </div>
              )}
              {buildingId === 'CUSTOM' && (
                <InputField icon={Building2} placeholder="New Block Name" required value={customBuilding}
                  onChange={e => setCustomBuilding(e.target.value)} />
              )}
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-1">
            {loading ? <><Loader2 size={16} className="animate-spin"/>Processing…</> : <>{role === 'ROLE_COMMUNITY_ADMIN' ? 'Next: Upload Documents' : 'Create Account'} <ChevronRight size={16}/></>}
          </button>

          <button type="button" onClick={onSwitchToLogin}
            className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer">
            Already have an account? <span className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline">Sign in</span>
          </button>
        </form>
      )}

      {/* ── STEP 3: Document Upload ── */}
      {step === 3 && (
        <form onSubmit={handleDocsSubmit} className="space-y-4">
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 p-3.5 text-xs text-violet-700 dark:text-violet-300 font-medium leading-relaxed">
            <strong className="font-black">Identity Verification Required</strong><br/>
            Upload your Aadhar/PAN and a recent photo. A Super Admin will review before granting access.
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
            <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {['Male', 'Female', 'Other'].map(g => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${gender === g ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <InputField icon={Phone} type="tel" placeholder="+91 9876543210" required value={mobile}
            onChange={e => setMobile(e.target.value)} />

          {/* Upload zones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UploadZone label="Aadhar / PAN" field="documentAadhar" value={aadhar}
              onChange={e => handleFile(e, setAadhar)} accept="image/*,.pdf" />
            <UploadZone label="Photograph" field="documentPhoto" value={photo}
              onChange={e => handleFile(e, setPhoto)} accept="image/*" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-bold hover:border-cyan-400 hover:text-cyan-600 transition-all cursor-pointer">
              <ChevronLeft size={16}/> Back
            </button>
            <button type="submit" disabled={loading || !aadhar || !photo}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-violet-500/25 hover:scale-[1.01] active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              {loading ? <><Loader2 size={15} className="animate-spin"/>Submitting…</> : <>Submit for Review <ChevronRight size={15}/></>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

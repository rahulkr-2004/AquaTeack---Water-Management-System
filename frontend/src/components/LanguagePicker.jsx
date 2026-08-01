import React, { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Search, X, Check } from 'lucide-react';

// Comprehensive Indian & Global Languages List
export const ALL_LANGUAGES = [
  // Top Pinned Languages
  { code: 'en', name: 'English', nativeName: 'English', category: 'top', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', category: 'top', flag: '🇮🇳' },

  // Indian Regional & Local Languages
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', category: 'indian', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', category: 'indian', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', category: 'indian', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', category: 'indian', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', category: 'indian', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', category: 'indian', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: '<ctrl42>కನ್ನಡ', category: 'indian', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', category: 'indian', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', category: 'indian', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', category: 'indian', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', category: 'indian', flag: '🇮🇳' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', category: 'indian', flag: '🇮🇳' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', category: 'indian', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', category: 'indian', flag: '🇳🇵' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', category: 'indian', flag: '🇮🇳' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', category: 'indian', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', category: 'indian', flag: '🇮🇳' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', category: 'indian', flag: '🇮🇳' },

  // Global Languages
  { code: 'es', name: 'Spanish', nativeName: 'Español', category: 'global', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', category: 'global', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', category: 'global', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', category: 'global', flag: '🇦🇪' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', category: 'global', flag: '🇨🇳' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', category: 'global', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', category: 'global', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', category: 'global', flag: '🇯🇵' }
];

export default function LanguagePicker({ currentLang, onSelectLanguage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const activeLangObj = ALL_LANGUAGES.find(l => l.code === currentLang) || ALL_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLanguages = ALL_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const topLangs = filteredLanguages.filter(l => l.category === 'top');
  const indianLangs = filteredLanguages.filter(l => l.category === 'indian');
  const globalLangs = filteredLanguages.filter(l => l.category === 'global');

  return (
    <div className="relative inline-block text-left notranslate" translate="no" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 hover:border-sky-400 dark:hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition shadow-sm cursor-pointer notranslate"
        translate="no"
      >
        <Globe size={15} className="text-blue-500 dark:text-blue-400" />
        <span>{activeLangObj.flag} {activeLangObj.name} ({activeLangObj.nativeName})</span>
        <ChevronDown size={14} className={`text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 notranslate" translate="no">
          {/* Search Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 sticky top-0 z-10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search language (Hindi, Marathi, Telugu)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-3 divide-y divide-slate-200/60 dark:divide-slate-800/40">
            {/* Top Pinned Languages */}
            {topLangs.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Featured Languages</p>
                <div className="space-y-0.5 mt-1">
                  {topLangs.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left cursor-pointer ${
                        currentLang === l.code
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-sm">{l.flag}</span>
                        <span className="font-semibold">{l.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">({l.nativeName})</span>
                      </span>
                      {currentLang === l.code && <Check size={14} className="text-blue-500 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Indian Local Languages */}
            {indianLangs.length > 0 && (
              <div className="pt-2">
                <p className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Indian Local Languages</p>
                <div className="space-y-0.5 mt-1">
                  {indianLangs.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left cursor-pointer ${
                        currentLang === l.code
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-sm">{l.flag}</span>
                        <span className="font-semibold">{l.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">({l.nativeName})</span>
                      </span>
                      {currentLang === l.code && <Check size={14} className="text-emerald-500 dark:text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Global Languages */}
            {globalLangs.length > 0 && (
              <div className="pt-2">
                <p className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Global Languages</p>
                <div className="space-y-0.5 mt-1">
                  {globalLangs.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left cursor-pointer ${
                        currentLang === l.code
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-sm">{l.flag}</span>
                        <span className="font-semibold">{l.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">({l.nativeName})</span>
                      </span>
                      {currentLang === l.code && <Check size={14} className="text-purple-500 dark:text-purple-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

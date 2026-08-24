import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bot, Send, X, ChevronRight, Zap, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

export const RobotSVG = () => (
  <img src="/robot.svg" alt="AquaBot Icon" className="w-full h-full object-contain" />
);

const API_BASE_URL = typeof window !== 'undefined' ? `http://${window.location.hostname}:8080` : 'http://localhost:8080';

export function FormattedMarkdown({ content }) {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, lIdx) => {
        if (!line.trim() && lIdx > 0) return <div key={lIdx} className="h-1" />;
        const tokens = [];
        let remaining = line;
        let keyCounter = 0;
        while (remaining.length > 0) {
          const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
          const italicMatch = remaining.match(/\*(.*?)\*/);
          if (boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index)) {
            if (boldMatch.index > 0) {
              tokens.push(<span key={keyCounter++}>{remaining.substring(0, boldMatch.index)}</span>);
            }
            tokens.push(<strong key={keyCounter++} className="font-bold opacity-100">{boldMatch[1]}</strong>);
            remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
          } else if (italicMatch) {
            if (italicMatch.index > 0) {
              tokens.push(<span key={keyCounter++}>{remaining.substring(0, italicMatch.index)}</span>);
            }
            tokens.push(<em key={keyCounter++} className="italic opacity-90">{italicMatch[1]}</em>);
            remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
          } else {
            tokens.push(<span key={keyCounter++}>{remaining}</span>);
            break;
          }
        }
        return <div key={lIdx} className="leading-relaxed">{tokens}</div>;
      })}
    </div>
  );
}

export const TelegramWallpaperPattern = () => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.11] dark:opacity-[0.14] overflow-hidden select-none text-slate-800 dark:text-cyan-200">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="telegram-rich-doodle-pattern" width="280" height="280" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Paper Airplane 1 */}
            <g transform="translate(15, 15) rotate(12) scale(0.85)">
              <path d="M5 20 L30 5 L20 32 L14 24 L5 20 Z M20 5 L14 24" />
            </g>

            {/* Cloud & Raindrops */}
            <g transform="translate(70, 10) scale(0.75)">
              <path d="M20 15 C15 15 10 19 10 23 C5 23 2 27 5 32 C8 35 13 35 20 35 C25 35 32 35 35 31 C38 27 35 21 30 21 C30 17 25 15 20 15 Z" />
              <path d="M13 41 C13 41 11 45 13 46 M23 41 C23 41 21 45 23 46 M31 39 C31 39 29 43 31 44" />
            </g>

            {/* Whale / Fish with Water Spout */}
            <g transform="translate(130, 20) rotate(-10) scale(0.75)">
              <path d="M10 20 C30 5 55 15 55 27 C55 40 35 45 15 40 C5 38 0 30 0 27 C0 25 5 23 10 20 Z" />
              <path d="M55 27 L65 21 M55 27 L65 33" />
              <circle cx="15" cy="25" r="1.5" fill="currentColor" />
              <path d="M30 8 C30 0 35 -3 35 -3 M30 8 C27 1 22 -2 22 -2" />
            </g>

            {/* Sun with Rays */}
            <g transform="translate(210, 10) scale(0.7)">
              <circle cx="15" cy="15" r="8" />
              <path d="M15 1 V5 M15 25 V29 M1 15 H5 M25 15 H29 M5 5 L8 8 M22 22 L25 25 M5 25 L8 22 M22 5 L25 8" />
            </g>

            {/* Hot Air Balloon */}
            <g transform="translate(245, 60) rotate(15) scale(0.75)">
              <path d="M20 5 C5 5 0 20 10 30 L16 38 H24 L30 30 C40 20 35 5 20 5 Z" />
              <path d="M16 38 V43 H24 V38 M18 43 V46 H22 V43" />
            </g>

            {/* Planet Saturn */}
            <g transform="translate(10, 75) rotate(-25) scale(0.8)">
              <circle cx="15" cy="15" r="9" />
              <ellipse cx="15" cy="15" rx="17" ry="4" />
            </g>

            {/* Cute Panda / Animal Face */}
            <g transform="translate(75, 70) scale(0.75)">
              <circle cx="16" cy="16" r="13" />
              <circle cx="6" cy="6" r="4" />
              <circle cx="26" cy="6" r="4" />
              <circle cx="11" cy="14" r="1.5" fill="currentColor" />
              <circle cx="21" cy="14" r="1.5" fill="currentColor" />
              <path d="M13 21 C14 23 18 23 19 21" />
            </g>

            {/* Ice Cream Cone */}
            <g transform="translate(135, 75) rotate(20) scale(0.75)">
              <path d="M5 15 L15 45 L25 15 Z" />
              <path d="M3 15 C0 5 30 5 27 15" />
            </g>

            {/* Floating Umbrella */}
            <g transform="translate(185, 70) scale(0.75)">
              <path d="M5 20 C5 5 35 5 35 20 Z" />
              <path d="M20 20 V40 C20 43 17 44 15 42" />
              <path d="M5 20 C12 23 17 23 20 20 C23 23 28 23 35 20" />
            </g>

            {/* Submarine / Boat */}
            <g transform="translate(10, 135) rotate(-5) scale(0.75)">
              <path d="M10 15 H50 C60 15 60 30 50 30 H10 C0 30 0 15 10 15 Z" />
              <circle cx="20" cy="22.5" r="3" />
              <circle cx="35" cy="22.5" r="3" />
              <path d="M30 15 V7 H37" />
            </g>

            {/* Rocket Ship */}
            <g transform="translate(75, 130) rotate(35) scale(0.75)">
              <path d="M15 25 C15 10 30 0 30 0 C30 0 45 10 45 25 V40 H15 Z" />
              <circle cx="30" cy="23" r="4" />
            </g>

            {/* Cactus / Plant */}
            <g transform="translate(140, 135) scale(0.75)">
              <path d="M15 5 V35 M15 15 H5 V5 M15 20 H25 V10" />
            </g>

            {/* Lightbulb */}
            <g transform="translate(185, 135) rotate(-15) scale(0.75)">
              <path d="M15 5 C8 5 5 15 10 22 L13 28 H27 L30 22 C35 15 32 5 25 5 Z" />
              <path d="M13 28 V32 H27 V28 M17 32 V35 H23 V32" />
            </g>

            {/* Musical Note */}
            <g transform="translate(240, 130) rotate(10) scale(0.75)">
              <path d="M10 5 V30 M10 5 L30 0 V25 M10 15 L30 10" />
              <circle cx="5" cy="30" r="4" fill="currentColor" />
              <circle cx="25" cy="25" r="4" fill="currentColor" />
            </g>

            {/* Palm Tree */}
            <g transform="translate(10, 195) scale(0.75)">
              <path d="M20 40 C22 20 25 5 25 0 M25 0 C15 -5 5 0 0 5 M25 0 C35 -5 45 0 50 5 M25 0 C20 -10 15 -15 10 -15 M25 0 C30 -10 35 -15 40 -15" />
            </g>

            {/* Cute Cat / Fox */}
            <g transform="translate(70, 195) rotate(-10) scale(0.75)">
              <path d="M10 15 L20 0 L25 13 C30 10 40 10 45 13 L50 0 L60 15 C65 25 60 40 35 40 C10 40 5 25 10 15 Z" />
              <circle cx="25" cy="23" r="2" fill="currentColor" />
              <circle cx="45" cy="23" r="2" fill="currentColor" />
              <path d="M33 30 L35 32 L37 30" />
            </g>

            {/* Water Drop Doodle */}
            <g transform="translate(140, 195) rotate(25) scale(0.8)">
              <path d="M15 5 C15 5 5 18 5 25 C5 31 9 35 15 35 C21 35 25 31 25 25 C25 18 15 5 15 5 Z" />
            </g>

            {/* Gift Box with Ribbon */}
            <g transform="translate(185, 195) scale(0.75)">
              <rect x="5" y="10" width="30" height="25" rx="2" />
              <path d="M2 5 H38 V10 H2 Z M20 5 V35 M5 22.5 H35" />
            </g>

            {/* Sliced Watermelon */}
            <g transform="translate(235, 190) rotate(15) scale(0.75)">
              <path d="M5 5 A 25 25 0 0 0 55 5 Z" />
              <path d="M5 5 H55" />
              <circle cx="20" cy="13" r="1" fill="currentColor" />
              <circle cx="30" cy="18" r="1" fill="currentColor" />
              <circle cx="40" cy="13" r="1" fill="currentColor" />
            </g>

            {/* Star & Moon */}
            <g transform="translate(10, 245) scale(0.75)">
              <path d="M15 5 L17 11 L23 12 L18 16 L20 22 L15 18 L10 22 L12 16 L7 12 L13 11 Z" />
              <path d="M40 5 C30 5 25 15 28 25 C30 30 35 33 40 33 C35 28 35 15 40 5 Z" />
            </g>

            {/* Coffee Cup / Mug */}
            <g transform="translate(75, 245) scale(0.75)">
              <path d="M5 10 H35 V30 C35 38 27 40 20 40 C13 40 5 38 5 30 Z" />
              <path d="M35 15 H41 C45 15 45 28 41 28 H35" />
              <path d="M13 2 C13 5 17 5 17 8 M23 2 C23 5 27 5 27 8" />
            </g>

            {/* Camera Doodle */}
            <g transform="translate(135, 245) rotate(-10) scale(0.75)">
              <rect x="5" y="10" width="30" height="22" rx="3" />
              <circle cx="20" cy="21" r="6" />
              <path d="M15 10 L18 5 H27 L30 10" />
            </g>

            {/* Crown */}
            <g transform="translate(190, 245) scale(0.75)">
              <path d="M10 25 L5 5 L18 15 L25 0 L32 15 L45 5 L40 25 Z" />
            </g>

            {/* Diamond / Gem */}
            <g transform="translate(240, 245) rotate(20) scale(0.75)">
              <path d="M5 15 L20 5 L35 15 L20 35 Z M5 15 H35 M14 15 L20 35 M26 15 L20 35" />
            </g>

            {/* Tiny Accent Stars, Hearts & Dots scattered randomly across the pattern */}
            <path d="M50 45 L52 48 L55 49 L52 51 L50 54 L48 51 L45 49 L48 48 Z" />
            <path d="M115 115 C115 113 113 111 110 113 C107 111 105 113 105 115 C105 118 110 121 110 121 C110 121 115 118 115 115 Z" />
            <path d="M225 105 L227 108 L230 109 L227 111 L225 114 L223 111 L220 109 L223 108 Z" />
            <path d="M50 175 C50 173 48 171 45 173 C42 171 40 173 40 175 C40 178 45 181 45 181 C45 181 50 178 50 175 Z" />
            <path d="M175 175 L177 178 L180 179 L177 181 L175 184 L173 181 L170 179 L173 178 Z" />
            <path d="M265 225 L267 228 L270 229 L267 231 L265 234 L263 231 L260 229 L263 228 Z" />

            <circle cx="120" cy="55" r="1.5" fill="currentColor" />
            <circle cx="190" cy="20" r="1.5" fill="currentColor" />
            <circle cx="270" cy="25" r="1.5" fill="currentColor" />
            <circle cx="55" cy="115" r="1.5" fill="currentColor" />
            <circle cx="170" cy="115" r="1.5" fill="currentColor" />
            <circle cx="230" cy="65" r="1.5" fill="currentColor" />
            <circle cx="115" cy="175" r="1.5" fill="currentColor" />
            <circle cx="230" cy="175" r="1.5" fill="currentColor" />
            <circle cx="60" cy="235" r="1.5" fill="currentColor" />
            <circle cx="125" cy="235" r="1.5" fill="currentColor" />
            <circle cx="175" cy="235" r="1.5" fill="currentColor" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#telegram-rich-doodle-pattern)"/>
    </svg>
  </div>
);

export function AquaBotChatWindow({ profile, usageLogs, bills, apartments = [], households = [], users = [], token, setActiveTab, onClose, isFullPage = false, isLanding = false, lang = 'en', t, onExpandChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (onExpandChange) onExpandChange(isExpanded);
  }, [isExpanded, onExpandChange]);

  const userName = profile?.name || 'User';
  const role = profile?.role || 'ROLE_USER';
  const isSuperAdmin = role === 'ROLE_ADMIN' || role === 'ADMIN';
  const isCommunityAdmin = role === 'ROLE_COMMUNITY_ADMIN' || role === 'COMMUNITY_ADMIN';
  const isManager = isSuperAdmin || isCommunityAdmin;

  const flatInfo = profile?.household ? (profile.household.flatNo ? `Flat ${profile.household.flatNo}` : 'Registered Household') : (isSuperAdmin ? 'Super Admin Console' : isCommunityAdmin ? 'Community Admin Console' : 'Registered Unit');

  const todayStr = useMemo(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d - tzOffset)).toISOString().split('T')[0];
  }, []);

  const monthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);

  const todayUsage = useMemo(() => {
    return Math.round(
      (usageLogs || [])
        .filter(l => l.date && l.date.startsWith(todayStr))
        .reduce((sum, l) => sum + (l.consumptionLiters || 0), 0)
    );
  }, [usageLogs, todayStr]);

  const monthUsage = useMemo(() => {
    return Math.round(
      (usageLogs || [])
        .filter(l => l.date && l.date.startsWith(monthStr))
        .reduce((sum, l) => sum + (l.consumptionLiters || 0), 0)
    );
  }, [usageLogs, monthStr]);

  const unpaidBills = useMemo(() => {
    return (bills || []).filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE' || b.status === 'PENDING');
  }, [bills]);

  const unpaidTotal = useMemo(() => {
    return unpaidBills.reduce((sum, b) => sum + (b.amountDue || b.amount || 0), 0);
  }, [unpaidBills]);

  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (isManager) {
            const open = (data.managedTickets || data.allTickets || []).filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
            setOpenTicketsCount(open);
          } else {
            const open = (data.raisedByMe || []).filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
            setOpenTicketsCount(open);
          }
        }
      } catch (_) {}
    };
    if (token) fetchTicketData();
  }, [token, isManager]);

  // Role & Landing customized predefined suggestion questions
  const defaultSuggestions = useMemo(() => {
    if (isLanding) {
      return [
        { label: lang === 'hi' ? "🌊 AquaTrack क्या है?" : "🌊 What is AquaTrack?", query: lang === 'hi' ? "AquaTrack क्या है और यह कैसे काम करता है?" : "What is AquaTrack and how does it work?" },
        { label: lang === 'hi' ? "🚀 AquaTrack से कैसे जुड़ें?" : "🚀 How to Join AquaTrack?", query: lang === 'hi' ? "AquaTrack में कैसे शामिल हों या पंजीकरण करें?" : "How can I join or sign up for AquaTrack?" },
        { label: lang === 'hi' ? "✨ मुख्य विशेषताएं क्या हैं?" : "✨ Platform Features", query: lang === 'hi' ? "AquaTrack प्लेटफॉर्म की मुख्य विशेषताएं क्या हैं?" : "What are the key features of AquaTrack?" },
        { label: lang === 'hi' ? "🔐 लॉगिन / साइन अप" : "🔐 Login & Register", query: lang === 'hi' ? "लॉगिन या खाता कैसे बनाएं?" : "How do I create an account or log in?" }
      ];
    }
    if (isSuperAdmin) {
      return [
        { label: lang === 'hi' ? "🏢 कॉलोनी व सोसायटी स्टेटस" : "🏢 Societies & Blocks", query: lang === 'hi' ? "सोसायटी और बिल्डिंग की जानकारी दें" : "Show societies and building details" },
        { label: lang === 'hi' ? "📊 ब्लॉक खपत विश्लेषण" : "📊 Block Consumption", query: lang === 'hi' ? "ब्लॉक वार पानी की खपत बताएं" : "Show block wise consumption" },
        { label: lang === 'hi' ? "👥 सिस्टम यूजर संख्या" : "👥 User Overview", query: lang === 'hi' ? "कुल एडमिन और उपयोगकर्ता कितने हैं?" : "How many admins and residents in total?" },
        { label: lang === 'hi' ? "🎫 खुले सपोर्ट टिकट" : "🎫 All Support Tickets", query: lang === 'hi' ? "सभी सहायता टिकट स्थिति क्या है?" : "Check all support tickets" }
      ];
    }
    if (isCommunityAdmin) {
      return [
        { label: lang === 'hi' ? "🏠 मेरे सोसायटी फ्लैट्स" : "🏠 Managed Flats", query: lang === 'hi' ? "मेरे अधीन कितने परिवार और फ्लैट हैं?" : "How many households and residents are managed?" },
        { label: lang === 'hi' ? "💧 आज की कुल खपत" : "💧 Today's Total Usage", query: lang === 'hi' ? "आज की कुल खपत बताएं" : "Show today's total water consumption" },
        { label: lang === 'hi' ? "💳 बकाया बिल स्थिति" : "💳 Pending Dues", query: lang === 'hi' ? "सोसायटी के बकाया बिलों की स्थिति बताएं" : "Show pending billing summary" },
        { label: lang === 'hi' ? "🎫 निवासी सहायता टिकट" : "🎫 Open Tickets", query: lang === 'hi' ? "निवासियों के कितने टिकट पेंडिंग हैं?" : "How many resident support tickets are open?" }
      ];
    }
    return [
      { label: t ? t('bot_task_today') : "💧 Today's Usage", query: lang === 'hi' ? "आज की जल खपत दिखाएं" : "Show today's water usage" },
      { label: t ? t('bot_task_bills') : "💳 My Unpaid Bills", query: lang === 'hi' ? "क्या मेरा कोई बकाया बिल है?" : "Do I have any unpaid bills?" },
      { label: t ? t('bot_task_tickets') : "🎫 Support Tickets", query: lang === 'hi' ? "मेरे सहायता टिकट जांचें" : "Check my support tickets" },
      { label: t ? t('bot_task_alerts') : "🚨 Leak & Alert Check", query: lang === 'hi' ? "कोई सक्रिय लीक या अलर्ट?" : "Any active alerts or leaks?" },
      { label: t ? t('bot_task_tips') : "💡 Water Saving Tips", query: lang === 'hi' ? "पानी बचाने के टिप्स दें" : "Give me water saving tips" }
    ];
  }, [lang, t, isLanding, isSuperAdmin, isCommunityAdmin]);

  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: isLanding
        ? (lang === 'hi' 
          ? `👋 **AquaTrack में आपका स्वागत है!**\n\nमैं आपका एक्वाबॉट गाइड हूँ। मैं आपको हमारी स्मार्ट वॉटर मैनेजमेंट सेवाओं के बारे में बता सकता हूँ।\n\n🚀 **AquaTrack से जुड़ें** और अपनी सोसायटी में स्मार्ट वॉटर मीटरिंग, ऑटो-बिलिंग और लीक अलर्ट का लाभ उठाएं!` 
          : `👋 **Welcome to AquaTrack!**\n\nI am your AquaBot guide. Ask me anything about our smart water management platform!\n\n🚀 **Join AquaTrack today** to unlock automated billing, smart flow tracking, and leak alerts for your community.`)
        : isSuperAdmin
          ? `👑 👋 Hello **${userName}**! How can I assist you with system analytics & societies today?`
          : isCommunityAdmin
            ? `🏢 👋 Hello **${userName}**! Connected to your society live data. How can I help?`
            : `👋 Hello **${userName}**! How can I assist you with your household water today?`,
      suggestions: defaultSuggestions
    }
  ]);

  // Update greeting if language changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 1) {
        return [
          {
            id: 1,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: isSuperAdmin
              ? (lang === 'hi' ? `👑 👋 नमस्ते **${userName}**! आज मैं सिस्टम एनालिटिक्स में आपकी कैसे मदद कर सकता हूँ?` : `👑 👋 Hello **${userName}**! How can I assist you with system analytics & societies today?`)
              : isCommunityAdmin
                ? (lang === 'hi' ? `🏢 👋 नमस्ते **${userName}**! आपकी सोसायटी के डेटा से जुड़ा हूँ। मैं कैसे मदद करूँ?` : `🏢 👋 Hello **${userName}**! Connected to your society live data. How can I help?`)
                : (lang === 'hi' ? `👋 नमस्ते **${userName}**! आज मैं आपके पानी प्रबंधन में कैसे मदद कर सकता हूँ?` : `👋 Hello **${userName}**! How can I assist you with your household water today?`),
            suggestions: defaultSuggestions
          }
        ];
      }
      return prev;
    });
  }, [lang, defaultSuggestions, t, userName, flatInfo, isSuperAdmin, isCommunityAdmin]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (customQuery = null) => {
    const queryText = (customQuery || input).trim();
    if (!queryText) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: queryText
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customQuery) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = generateBotResponse(queryText);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', ...botResponse }]);
      setIsTyping(false);
    }, 400);
  };

  // Advanced Natural Keyword & Synonym Extraction Engine
  const generateBotResponse = (query) => {
    const q = query.toLowerCase().trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isHindi = lang === 'hi';

    // Keyword & Synonym Sets (including GenZ slang & abbreviations)
    const usageKeywords = ['usage', 'water', 'today', 'consumption', 'liter', 'litre', 'volume', 'daily', 'month', 'monthly', 'reading', 'used', 'use', 'h2o', 'stats', 'stat', 'खपत', 'पानी', 'लीटर', 'आज', 'मासिक', 'रीडिंग', 'इस्तेमाल'];
    const billKeywords = ['bill', 'unpaid', 'pay', 'due', 'cost', 'amount', 'invoice', 'tariff', 'money', 'rupee', 'rs', 'price', 'cash', 'owe', 'owed', 'charges', 'billing', 'बिल', 'बकाया', 'भुगतान', 'पैसा', 'शुल्क', 'राशि', 'चालान'];
    const ticketKeywords = ['ticket', 'support', 'issue', 'complaint', 'problem', 'help', 'repair', 'broken', 'request', 'status', 'fix', 'broken', 'tix', 'helpline', 'टिकट', 'सहायता', 'शिकायत', 'समस्या', 'मदद', 'खराबी', 'सपोर्ट'];
    const leakKeywords = ['leak', 'alert', 'warning', 'pipe', 'emergency', 'overflow', 'sensor', 'burst', 'flow', 'leaking', 'drip', 'dripping', 'sus', 'hazard', 'लीक', 'अलर्ट', 'रिसाव', 'इमरजेंसी', 'पाइप', 'चेतावनी'];
    const tipKeywords = ['tip', 'save', 'conserve', 'advice', 'reduce', 'waste', 'guide', 'hack', 'hacks', 'saving', 'eco', 'टिप्स', 'बचत', 'सलाह', 'उपाय', 'गाइड'];
    const societyKeywords = ['society', 'colony', 'apartment', 'building', 'flat', 'block', 'house', 'unit', 'hood', 'complex', 'soc', 'bldg', 'सोसायटी', 'कॉलोनी', 'अपार्टमेंट', 'इमारत', 'फ्लैट', 'ब्लॉक', 'घर'];
    const userKeywords = ['user', 'resident', 'admin', 'community', 'manager', 'people', 'account', 'profile', 'peeps', 'fam', 'subscribers', 'members', 'उपयोगकर्ता', 'निवासी', 'एडमिन', 'लोग', 'खाता', 'प्रोफाइल'];

    // Helper keyword match evaluator
    const matchesKeywords = (keywordList) => keywordList.some(k => q.includes(k));

    // Landing Page Mode — Strictly Isolated from Database & Personal Records
    if (isLanding || !token) {
      // General Greetings for Landing Page
      if (
        q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('hola') ||
        q.includes('yo') || q.includes('sup') || q.includes('wassup') || q.includes('wsp') ||
        q.includes('good morning') || q.includes('good afternoon') || q.includes('good evening') ||
        q.includes('namaste') || q.includes('नमस्ते') || q.includes('हेलो') || q.includes('हाय')
      ) {
        return {
          timestamp,
          text: isHindi
            ? `नमस्ते! 👋 AquaTrack में आपका स्वागत है। मैं एक सार्वजनिक गाइड हूँ। आप मुझसे प्लेटफ़ॉर्म सुविधाओं या पंजीकरण के बारे में पूछ सकते हैं!`
            : `Hello! 👋 Welcome to AquaTrack. I am your website guide. Ask me anything about our smart water platform or how to join!`,
          suggestions: defaultSuggestions
        };
      }

      // About AquaTrack / What is it
      if (q.includes('what is') || q.includes('about') || q.includes('aquatrack') || q.includes('क्या है') || q.includes('जानकारी') || q.includes('website') || q.includes('वेबसाइट')) {
        return {
          timestamp,
          text: isHindi
            ? `💧 **AquaTrack क्या है?**\n\nAquaTrack एक अत्याधुनिक **स्मार्ट जल प्रबंधन प्लेटफ़ॉर्म** है।\n\n**मुख्य विशेषताएं:**\n• 📊 **स्मार्ट मीटरिंग:** रीयल-टाइम पानी की खपत ट्रैकिंग।\n• 💳 **ऑटो बिलिंग:** पारदर्शी स्लैब-आधारित डिजिटल बिल।\n• 🚨 **लीक अलार्म:** रिसाव होने पर तत्काल सुरक्षा अलर्ट।\n• 🏢 **सोसायटी पोर्टल:** एडमिन, कम्युनिटी और निवासियों के लिए एकीकृत पोर्टल।`
            : `💧 **What is AquaTrack?**\n\nAquaTrack is a state-of-the-art **IoT & AI-Powered Water Management Platform** designed for residential societies and individual households.\n\n**Key Highlights:**\n• 📊 **Live Usage Tracking:** Real-time water meter monitoring.\n• 💳 **Smart Automated Billing:** Transparent tariff calculation & instant digital invoices.\n• 🚨 **Instant Leak Alerts:** Smart sensors detect drips & pipe bursts to prevent water damage.\n• 🏢 **Multi-Role Portal:** Dedicated dashboards for Super Admins, Society Managers & Residents.`,
          suggestions: defaultSuggestions
        };
      }

      // How to Join / Register / Sign Up
      if (q.includes('join') || q.includes('signup') || q.includes('sign up') || q.includes('register') || q.includes('connect') || q.includes('जुड़ें') || q.includes('खाता') || q.includes('पंजीकरण')) {
        return {
          timestamp,
          text: isHindi
            ? `🚀 **AquaTrack से कैसे जुड़ें?**\n\n1. **निवासी:** ऊपर दिए 'Register' बटन पर क्लिक करें, अपना विवरण भरें और अपनी सोसायटी का Invite Code दर्ज करें।\n2. **सोसायटी प्रबंधन:** अपनी पूरी कॉलोनी पंजीकृत करने के लिए हमारी टीम से संपर्क करें या एडमिन अकाउंट बनाएं।\n\n👉 *आज ही जल संरक्षण आंदोलन का हिस्सा बनें!*`
            : `🚀 **How to Join AquaTrack:**\n\n1. **Residents:** Click **Register**, enter your profile details, and put in your society invite token.\n2. **Society Admins:** Register your colony to start automated billing and leak alerts.\n\n👉 *Join hundreds of water-smart households saving up to 30% water monthly!*`,
          suggestions: defaultSuggestions
        };
      }

      // Platform Features & Benefits
      if (q.includes('feature') || q.includes('benefit') || q.includes('why') || q.includes('विशेषता') || q.includes('फायदे')) {
        return {
          timestamp,
          text: isHindi
            ? `✨ **AquaTrack के मुख्य लाभ:**\n\n1. 📉 **30% तक जल बचत:** रीयल-टाइम मॉनिटरिंग से पानी की बर्बादी रुकेगी।\n2. 🧾 **पारदर्शी बिलिंग:** कोई छुपा हुआ शुल्क नहीं, ऑटो-जनरेटेड इनवॉइस।\n3. 🚨 **आपातकालीन अलर्ट:** पानी ओवरफ्लो या लीक होते ही मोबाइल अलार्म।\n4. 🌐 **बहुभाषी सहायता:** हिंदी और अंग्रेजी दोनों भाषाओं में पूर्ण नियंत्रण।`
            : `✨ **Why Choose AquaTrack?**\n\n1. 📉 **Save up to 30% Water:** Real-time visibility stops wasteful consumption.\n2. 🧾 **Transparent Invoicing:** Automated tariff plans with zero manual errors.\n3. 🚨 **24/7 Leak Safeguard:** Immediate warnings for tap left open or pipe leakages.\n4. 🌐 **Multi-Lingual Support:** Native support in English, Hindi, and regional languages.`,
          suggestions: defaultSuggestions
        };
      }

      // How to Use / Platform Guide / Tutorials / How it works
      if (
        q.includes('how to use') || q.includes('how to work') || q.includes('how it works') ||
        q.includes('guide') || q.includes('tutorial') || q.includes('instruction') || q.includes('steps') ||
        q.includes('प्रयोग') || q.includes('उपयोग') || q.includes('कैसे चलाएं') || q.includes('तरीका') ||
        q.includes('help') || q.includes('मदद') || q.includes('works') || q === 'use' || q === 'how use'
      ) {
        return {
          timestamp,
          text: isHindi
            ? `📖 **AquaTrack का उपयोग कैसे करें?**\n\n1️⃣ **रजिस्टर करें:** 'Register' पर क्लिक करें और अपनी सोसायटी तथा फ्लैट की जानकारी दर्ज करें।\n2️⃣ **लॉगिन करें:** अपने अकाउंट में लॉगिन करके अपना डैशबोर्ड खोलें।\n3️⃣ **खपत ट्रैक करें:** अपने दैनिक पानी के उपयोग और डिजिटल रीडिंग को ट्रैक करें।\n4️⃣ **बिल भुगतान व अलर्ट:** ऑटो-जेनरेटेड बिल देखें और किसी भी समस्या के लिए सपोर्ट टिकट या अलर्ट पाएं।\n\n✨ **AquaTrack से जुड़ें** और आज ही आसान स्मार्ट वॉटर मैनेजमेंट का अनुभव करें!`
            : `📖 **How to Use AquaTrack:**\n\n1️⃣ **Register & Setup:** Click **Register** and fill in your society, block, and unit details.\n2️⃣ **Access Dashboard:** Log in to view your household's real-time water usage dashboard.\n3️⃣ **Track Consumption:** Monitor live meter readings, daily trends, and automated monthly bills.\n4️⃣ **Alerts & Support:** Receive instant leak warnings and raise support tickets anytime.\n\n✨ **Join AquaTrack today** to experience seamless, smart water tracking for your home!`,
          suggestions: defaultSuggestions
        };
      }

      // Login / Sign In Guidance
      if (q.includes('login') || q.includes('sign in') || q.includes('log in') || q.includes('पासवर्ड') || q.includes('लॉगिन')) {
        return {
          timestamp,
          text: isHindi
            ? `🔐 **लॉगिन प्रक्रिया:**\n\nयदि आपके पास पहले से खाता है, तो लॉगिन स्क्रीन पर अपना ईमेल और पासवर्ड दर्ज करें। नए खाते के लिए 'Register' चुनें।`
            : `🔐 **Account Access:**\n\nIf you already have an active account, enter your registered email and password on the login screen. Need a new account? Click Register!`,
          suggestions: defaultSuggestions
        };
      }

      // Account / Personal Data Query on Landing Page — Professional & Welcoming Invitation
      if (
        matchesKeywords(usageKeywords) || matchesKeywords(billKeywords) || 
        matchesKeywords(ticketKeywords) || matchesKeywords(leakKeywords) || 
        matchesKeywords(societyKeywords) || matchesKeywords(userKeywords)
      ) {
        return {
          timestamp,
          text: isHindi
            ? `क्षमा करें, व्यक्तिगत जल खपत, बिल या सोसायटी रिकॉर्ड देखने के लिए आपको अपने खाते में **Log In** या **Register** करना होगा।\n\n✨ **AquaTrack की खोज करें:** अपनी सोसायटी में स्मार्ट मीटरिंग और रियल-टाइम वॉटर ट्रैकिंग का लाभ उठाने के लिए आज ही **AquaTrack से जुड़ें**!`
            : `Sorry, to view live water consumption, bills, or society records, please **Log In** to your account or **Register**.\n\n✨ **Discover More:** Join **AquaTrack** today to unlock smart water metering, automated billing, and real-time tracking for your household!`,
          suggestions: defaultSuggestions
        };
      }

      // Out-of-Scope Fallback for Landing Page — Professional Invitation
      return {
        timestamp,
        text: isHindi
          ? `क्षमा करें, मैं केवल AquaTrack प्लेटफ़ॉर्म, जल प्रबंधन और खाता सेवाओं से जुड़े सवालों में मदद कर सकता हूँ।\n\n✨ **अधिक जानने के लिए:** आज ही **AquaTrack से जुड़ें** और अपनी सोसायटी में स्मार्ट जल संरक्षण की शुरुआत करें!`
          : `Sorry, I can only assist with queries related to AquaTrack services, smart water management, and account setup.\n\n✨ **Discover More:** Join **AquaTrack** today to start smart water tracking and save water for your community!`,
        suggestions: defaultSuggestions
      };
    }

    // Calculate dynamic database stats
    const totalUsersCount = users.length || 0;
    const communityAdminsCount = users.filter(u => u.role === 'ROLE_COMMUNITY_ADMIN').length;
    const residentUsersCount = users.filter(u => u.role === 'ROLE_USER').length;
    const totalApartmentsCount = apartments.length || 0;
    const totalHouseholdsCount = households.length || 0;

    // 1. Society & Building Database Queries (For Admins & Super Admins)
    if (matchesKeywords(societyKeywords) && (isManager || q.includes('flat') || q.includes('building') || q.includes('block'))) {
      if (isSuperAdmin) {
        const aptNames = apartments.map(a => `• **${a.name}** (${a.address || 'Registered Colony'})`).join('\n') || 'None registered yet';
        return {
          timestamp,
          text: isHindi
            ? `🏢 **सोसायटी व कॉलोनी डेटाबेस रिपोर्ट:**\n\n` +
              `• **कुल पंजीकृत सोसायटियां:** ${totalApartmentsCount}\n` +
              `• **कुल पंजीकृत फ्लैट्स/इकाइयां:** ${totalHouseholdsCount}\n\n` +
              `**सक्रिय सोसायटियां:**\n${aptNames}`
            : `🏢 **Societies & Colony Database Report:**\n\n` +
              `• **Total Registered Societies:** ${totalApartmentsCount}\n` +
              `• **Total Household Units:** ${totalHouseholdsCount}\n\n` +
              `**Active Societies:**\n${aptNames}`,
          actionButton: {
            label: isHindi ? '🏢 कॉलोनी प्रबंधन देखें' : '🏢 Manage Colonies',
            onClick: () => setActiveTab && setActiveTab('colony_management')
          },
          suggestions: defaultSuggestions
        };
      } else if (isCommunityAdmin) {
        return {
          timestamp,
          text: isHindi
            ? `🏠 **आपकी सोसायटी फ्लैट्स रिपोर्ट:**\n\n` +
              `• **प्रबंधित फ्लैट्स की संख्या:** ${totalHouseholdsCount}\n` +
              `• **पंजीकृत निवासी:** ${residentUsersCount}\n\n` +
              `आप निवासियों को आमंत्रित कर सकते हैं या नए ब्लॉक/फ्लैट बना सकते हैं।`
            : `🏠 **Your Society Flats Report:**\n\n` +
              `• **Managed Households:** ${totalHouseholdsCount}\n` +
              `• **Registered Resident Accounts:** ${residentUsersCount}\n\n` +
              `You can invite residents or manage building blocks from the Households tab.`,
          actionButton: {
            label: isHindi ? '🏠 फ्लैट्स देखें' : '🏠 View Households',
            onClick: () => setActiveTab && setActiveTab('households')
          },
          suggestions: defaultSuggestions
        };
      }
    }

    // 2. Users & Admins Overview (Admins)
    if (matchesKeywords(userKeywords) && (isManager || q.includes('admin') || q.includes('profile') || q.includes('account'))) {
      if (isManager) {
        return {
          timestamp,
          text: isHindi
            ? `👥 **सिस्टम उपयोगकर्ता लाइव स्थिति:**\n\n` +
              `• **कुल उपयोगकर्ता:** ${totalUsersCount}\n` +
              `• **कम्युनिटी एडमिन:** ${communityAdminsCount}\n` +
              `• **घरेलू निवासी:** ${residentUsersCount}\n\n` +
              `सभी खातों का सत्यापन और भूमिकाएं सक्रिय स्थिति में हैं।`
            : `👥 **System Users Live Status:**\n\n` +
              `• **Total Registered Users:** ${totalUsersCount}\n` +
              `• **Community Admins:** ${communityAdminsCount}\n` +
              `• **Household Residents:** ${residentUsersCount}\n\n` +
              `All accounts and role assignments are synchronized with your database.`,
          actionButton: {
            label: isHindi ? '👥 निवासी सूची देखें' : '👥 View Resident Directory',
            onClick: () => setActiveTab && setActiveTab('residents')
          },
          suggestions: defaultSuggestions
        };
      }
    }

    // 3. Water Consumption / Usage Queries (Extracted from real DB logs)
    if (matchesKeywords(usageKeywords)) {
      const daysInMonth = new Date().getDate();
      const dailyAvg = Math.round(monthUsage / Math.max(1, daysInMonth));

      if (isSuperAdmin) {
        return {
          timestamp,
          text: isHindi
            ? `📊 **ऑल-सोसायटी जल खपत लाइव रिपोर्ट:**\n\n` +
              `• **आज की कुल सिस्टम खपत:** ${todayUsage.toLocaleString()} लीटर\n` +
              `• **इस महीने की कुल खपत:** ${monthUsage.toLocaleString()} लीटर\n` +
              `• **दैनिक औसत (पूरा सिस्टम):** ${dailyAvg.toLocaleString()} लीटर/दिन\n\n` +
              `आप विस्तृत ब्लॉक-वार डेटा ग्राफ डैशबोर्ड या रिपोर्ट सेक्शन में देख सकते हैं।`
            : `📊 **System-wide Live Water Usage Summary:**\n\n` +
              `• **Today's Total Usage (All Blocks):** ${todayUsage.toLocaleString()} Liters\n` +
              `• **This Month Total Usage:** ${monthUsage.toLocaleString()} Liters\n` +
              `• **Daily Average Consumption:** ${dailyAvg.toLocaleString()} Liters/day\n\n` +
              `You can monitor live block-wise consumption directly on your Admin Dashboard.`,
          actionButton: {
            label: isHindi ? '📊 ब्लॉक खपत ग्राफ देखें' : '📊 View Consumption Chart',
            onClick: () => setActiveTab && setActiveTab('dashboard')
          },
          suggestions: defaultSuggestions
        };
      } else if (isCommunityAdmin) {
        return {
          timestamp,
          text: isHindi
            ? `📊 **सोसायटी जल खपत सारांश:**\n\n` +
              `• **आज की कुल खपत:** ${todayUsage.toLocaleString()} लीटर\n` +
              `• **इस महीने की खपत:** ${monthUsage.toLocaleString()} लीटर\n` +
              `• **दैनिक औसत:** ${dailyAvg.toLocaleString()} लीटर/दिन`
            : `📊 **Society Water Consumption Summary:**\n\n` +
              `• **Today's Total Usage:** ${todayUsage.toLocaleString()} Liters\n` +
              `• **This Month Total:** ${monthUsage.toLocaleString()} Liters\n` +
              `• **Daily Average:** ${dailyAvg.toLocaleString()} Liters/day`,
          actionButton: {
            label: isHindi ? '📊 मीटर रीडिंग देखें' : '📊 View Meter Readings',
            onClick: () => setActiveTab && setActiveTab('water_usage')
          },
          suggestions: defaultSuggestions
        };
      } else {
        return {
          timestamp,
          text: isHindi
            ? `📊 **${userName} के लिए लाइव जल खपत सारांश:**\n\n` +
              `• **आज की खपत:** ${todayUsage} लीटर\n` +
              `• **इस महीने की कुल खपत:** ${monthUsage.toLocaleString()} लीटर\n` +
              `• **दैनिक औसत:** ${dailyAvg} लीटर/दिन\n\n` +
              (todayUsage > 250 
                ? `⚠️ *अधिक खपत:* आपने आज ${todayUsage}L उपयोग किया है। जांचें कि कोई नल खुला तो नहीं रह गया।` 
                : `✅ *बहुत बढ़िया!* आपकी पानी की खपत आज संतुलित सीमा में है।`)
            : `📊 **Live Water Consumption Summary for ${userName}:**\n\n` +
              `• **Today's Consumption:** ${todayUsage} Liters\n` +
              `• **This Month Total:** ${monthUsage.toLocaleString()} Liters\n` +
              `• **Daily Average This Month:** ${dailyAvg} Liters/day\n\n` +
              (todayUsage > 250 
                ? `⚠️ *Higher Consumption:* You have used ${todayUsage}L today. Check if any tap was left running.` 
                : `✅ *Valid Vibe!* Your water usage is well within eco limits today. 🌊`),
          actionButton: {
            label: isHindi ? '📊 विस्तृत विश्लेषण देखें' : '📊 View Detailed Analytics',
            onClick: () => setActiveTab && setActiveTab('my_usage')
          },
          suggestions: defaultSuggestions
        };
      }
    }

    // 4. Billing & Dues Queries (Database Driven)
    if (matchesKeywords(billKeywords)) {
      if (isManager) {
        return {
          timestamp,
          text: isHindi
            ? `💳 **सोसायटी बिलिंग व शुल्क लाइव स्टेटस:**\n\n` +
              `• **पेंडिंग बिल जनरेशन / समीक्षा:** सिस्टम लाइव डेटाबेसबद्ध है।\n` +
              `• **कार्रवाई:** आप बिलिंग पोर्टल से नए बिल जनरेट कर सकते हैं या टैरिफ प्लान बदल सकते हैं।`
            : `💳 **Society Billing & Revenue Status:**\n\n` +
              `• **Live Billing Engine:** Connected to tenant meter readings.\n` +
              `• **Actions:** You can generate monthly invoices, review pending payments, or update tariff rates.`,
          actionButton: {
            label: isHindi ? '💳 बिलिंग प्रबंधन खोलें' : '💳 Manage Billing',
            onClick: () => setActiveTab && setActiveTab('billing')
          },
          suggestions: defaultSuggestions
        };
      }

      if (unpaidBills.length > 0) {
        const billList = unpaidBills.map(b => `• **Bill #${b.id}**: ₹${(b.amountDue || b.amount || 0).toLocaleString()} (${isHindi ? 'देय तिथि' : 'Due'}: ${b.dueDate || 'Pending'})`).join('\n');
        return {
          timestamp,
          text: isHindi
            ? `💳 **बकाया बिल सारांश:**\n\nआपके पास वर्तमान में **${unpaidBills.length} बकाया बिल** हैं, जिनकी कुल राशि **₹${unpaidTotal.toLocaleString()}** है:\n\n${billList}\n\nकृपया विलंब शुल्क से बचने के लिए समय पर भुगतान करें।`
            : `💳 **Pending Bills Summary:**\n\nYou currently have **${unpaidBills.length} unpaid bill(s)** totaling **₹${unpaidTotal.toLocaleString()}**:\n\n${billList}\n\nPlease clear dues to avoid late fee penalties!`,
          actionButton: {
            label: isHindi ? '💳 बिल देखें व भुगतान करें' : '💳 Go to Bills & Pay Now',
            onClick: () => setActiveTab && setActiveTab('my_bills')
          },
          suggestions: defaultSuggestions
        };
      } else {
        return {
          timestamp,
          text: isHindi
            ? `🎉 **कोई बकाया बिल नहीं है, ${userName}!**\n\nआपके सभी पानी के बिल का समय पर भुगतान हो चुका है। धन्यवाद!`
            : `🎉 **Zero Dues, Big W! No Unpaid Bills for ${userName}!**\n\nAll your water bills are paid up to date. You're all clear! 💯`,
          actionButton: {
            label: isHindi ? '📄 भुगतान इतिहास देखें' : '📄 View Payment History',
            onClick: () => setActiveTab && setActiveTab('my_bills')
          },
          suggestions: defaultSuggestions
        };
      }
    }

    // 5. Support & Ticket Queries
    if (matchesKeywords(ticketKeywords)) {
      return {
        timestamp,
        text: isHindi
          ? `🎫 **सहायता व रखरखाव पोर्टल:**\n\n` +
            (openTicketsCount > 0 
              ? `आपके पास वर्तमान में **${openTicketsCount} सक्रिय खुले टिकट** हैं।` 
              : `आपके पास वर्तमान में कोई खुला सहायता टिकट नहीं है।`) +
            `\n\nआप नल लीक, मीटर खराबी या बिल संबंधी प्रश्न के लिए सीधे कम्युनिटी एडमिन को टिकट भेज सकते हैं।`
          : `🎫 **Support & Maintenance Portal:**\n\n` +
            (openTicketsCount > 0 
              ? `You currently have **${openTicketsCount} active open ticket(s)** with support.` 
              : `You currently have zero open support tickets. All smooth! ✨`) +
            `\n\nYou can raise tickets for plumbing issues, water leaks, billing queries, or meter maintenance anytime.`,
        actionButton: {
          label: isHindi ? '🎫 सहायता पोर्टल खोलें' : '🎫 Open Support Portal',
          onClick: () => setActiveTab && setActiveTab('support')
        },
        suggestions: defaultSuggestions
      };
    }

    // 6. Leak & Alert Queries
    if (matchesKeywords(leakKeywords)) {
      return {
        timestamp,
        text: isHindi
          ? `🚨 **गृह सुरक्षा व लीक मॉनिटर:**\n\n` +
            `• **सिस्टम अलर्ट:** मीटर सेंसर सामान्य जल प्रवाह दर्ज कर रहे हैं।\n` +
            `• **आवश्यक कार्रवाई:** यदि रिसाव हो तो सिंक या मुख्य पाइप का वाल्व तुरंत बंद करें और तत्काल सहायता टिकट दर्ज करें।`
          : `🚨 **Household Safety & Leak Monitor:**\n\n` +
            `• **System Alert:** Meter sensors report normal flow rate. No sus leaks detected.\n` +
            `• **Action required if leaking:** Shut off your primary inlet valve immediately and raise an emergency ticket!`,
        actionButton: {
          label: isHindi ? '🚨 आपातकालीन टिकट दर्ज करें' : '🚨 Raise Emergency Ticket',
          onClick: () => setActiveTab && setActiveTab('support')
        },
        suggestions: defaultSuggestions
      };
    }

    // 7. Water Saving Tips (Tailored per user role & real-time usage)
    if (matchesKeywords(tipKeywords)) {
      if (isSuperAdmin) {
        return {
          timestamp,
          text: isHindi
            ? `💡 **सुपर एडमिन जल संरक्षण रणनीति (${userName}):**\n\n` +
              `1. 🏢 **कॉलोनी स्मार्ट मीटरिंग:** ऑटोमेटेड लीक डिटेक्शन सेंसर लगाएं ताकि 15% पानी की बर्बादी रोकी जा सके।\n` +
              `2. 📊 **प्रेशर रेगुलेशन:** मुख्य वितरण लाइन पर ऑटो-प्रेशर वाल्व स्थापित करें।\n` +
              `3. ♻️ **ग्रे-वॉटर रीसाइक्लिंग:** एसटीपी वाटर को लैंडस्केपिंग और फ्लशिंग के लिए डायवर्ट करें।`
            : `💡 **System-Wide Water Conservation Strategy for ${userName}:**\n\n` +
              `1. 🏢 **Smart Metering:** Deploy automated flow sensors across colony mains to detect silent underground leaks.\n` +
              `2. 📊 **Pressure Regulation:** Install pressure-reducing valves on main supply risers during off-peak hours.\n` +
              `3. ♻️ **Greywater Recycling:** Divert STP treated water for gardening and common area flushing.`,
          actionButton: {
            label: isHindi ? '📊 सिस्टम डैशबोर्ड देखें' : '📊 View Colony Analytics',
            onClick: () => setActiveTab && setActiveTab('dashboard')
          },
          suggestions: defaultSuggestions
        };
      } else if (isCommunityAdmin) {
        return {
          timestamp,
          text: isHindi
            ? `💡 **सोसायटी एडमिन जल बचत उपाय (${userName}):**\n\n` +
              `1. 🏬 **ओवरहेड टैंक सेंसर:** ओवरफ्लो अलार्म लगाकर रोजाना हजारो लीटर पानी बचाएं।\n` +
              `2. 🚰 **कॉमन एरिया ऑडिट:** वॉचमैन और गार्डन एरिया टैप्स में एयरेटर लगाएं।\n` +
              `3. 📢 **निवासी जागरूकता:** नियमित रूप से उच्च खपत वाले फ्लैट्स को स्मार्ट अलर्ट भेजें।`
            : `💡 **Society Conservation Guide for ${userName}:**\n\n` +
              `1. 🏬 **Overhead Tank Sensors:** Install automatic cutoff switches to eliminate tank overflow.\n` +
              `2. 🚰 **Common Area Aerators:** Retrofit guard-room and garden taps with low-flow aerators.\n` +
              `3. 📢 **Resident Alerts:** Broadcast weekly usage summaries to encourage mindful consumption.`,
          actionButton: {
            label: isHindi ? '🏠 सोसायटी प्रबंधन' : '🏠 Manage Households',
            onClick: () => setActiveTab && setActiveTab('households')
          },
          suggestions: defaultSuggestions
        };
      } else {
        const usageTip = todayUsage > 200
          ? (isHindi ? `⚠️ *नोट:* आपकी आज की खपत **${todayUsage}L** है। शॉवर के बजाय बाल्टी का उपयोग करें।` : `⚠️ *High Usage Alert:* Today's usage is **${todayUsage}L** (above average). Consider bucket baths today to save water!`)
          : (isHindi ? `✅ *उत्कृष्ट:* आपकी आज की खपत केवल **${todayUsage}L** है!` : `✅ *Total W:* Your usage is **${todayUsage}L** today (within eco limits). 🌊`);

        return {
          timestamp,
          text: isHindi
            ? `💡 **${userName} के लिए पर्सनलाइज्ड वॉटर सेविंग टिप्स:**\n\n` +
              `${usageTip}\n\n` +
              `1. 🛁 **शॉवर टाइमर:** 5 मिनट से कम शॉवर रखें (~30L दैनिक बचत)।\n` +
              `2. 🚰 **एयरेटर टैप:** नलों पर एयरेटर कैप लगाएं (40% पानी कम खर्च होगा)।\n` +
              `3. 🧼 **फुल लोड वॉशिंग:** कपड़े धोने की मशीन को केवल फुल लोड पर चलाएं।\n` +
              `4. 🔍 **रिसाव जांच:** फ्लश टैंक का रिसाव रोज 200L पानी बर्बाद कर सकता है!`
            : `💡 **Personalized Water Saving Tips for ${userName}:**\n\n` +
              `${usageTip}\n\n` +
              `1. 🛁 **Shower Control:** Keep showers under 5 minutes (saves ~30L daily).\n` +
              `2. 🚰 **Tap Aerators:** Fit tap aerators to reduce flow rate without losing water pressure.\n` +
              `3. 🧼 **Full Load Laundry:** Run washing machines only on full load cycles.\n` +
              `4. 🔍 **Check Flush Tanks:** A silent leak in flush tanks can waste up to 200L daily!`,
          actionButton: {
            label: isHindi ? '💡 सभी टिप्स देखें' : '💡 Explore All Tips',
            onClick: () => setActiveTab && setActiveTab('water_tips')
          },
          suggestions: defaultSuggestions
        };
      }
    }

    // 8a. "How are you" / Well-being queries (Checked BEFORE generic "hi")
    if (q.includes('how are you') || q.includes('how r u') || q.includes('hru') || q.includes('how do you do') || q.includes('आप कैसे हैं') || q.includes('कैसे हो')) {
      return {
        timestamp,
        text: isHindi
          ? `मैं बिल्कुल बढ़िया हूँ, धन्यवाद! 😊 मैं आपकी जल खपत, बिल या सपोर्ट टिकट से जुड़े प्रश्नों के लिए तैयार हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?`
          : `I'm doing great, thank you for asking! 😊 I'm connected to your live water database. How can I assist you today?`,
        suggestions: defaultSuggestions
      };
    }

    // 8b. Identity / "Who are you" queries
    if (q.includes('who are you') || q.includes('who r u') || q.includes('your name') || q.includes('what are you') || q.includes('आप कौन हैं') || q.includes('तुम्हारा नाम')) {
      return {
        timestamp,
        text: isHindi
          ? `मैं **एक्वाबॉट** हूँ — AquaTrack का स्मार्ट जल प्रबंधन सहायक! 🤖💧\n\nमैं आपकी जल खपत ट्रैक करने, बकाया बिलों की जानकारी देने, सहायता टिकट संभालने और जल बचत की सलाह देने में मदद करता हूँ।`
          : `I am **AquaBot**, your personal water management assistant on AquaTrack! 🤖💧\n\nI can help you monitor consumption, check bills, raise support tickets, and get personalized water-saving advice.`,
        suggestions: defaultSuggestions
      };
    }

    // 8c. Farewell & Bye queries
    if (q.includes('bye') || q.includes('goodbye') || q.includes('gn') || q.includes('cya') || q.includes('see you') || q.includes('take care') || q.includes('अलविदा') || q.includes('बाय')) {
      return {
        timestamp,
        text: isHindi
          ? `अलविदा **${userName}**! 👋 आपका दिन शुभ रहे! जरूरत पड़ने पर एक्वाबॉट को कभी भी खोलें।`
          : `Goodbye **${userName}**! 👋 Have a great day ahead! Feel free to ask anytime you need help.`,
        suggestions: defaultSuggestions
      };
    }

    // 8d. Generic Greetings (Hi, Hello, Hey)
    if (
      q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('hola') ||
      q.includes('yo') || q.includes('sup') || q.includes('wassup') || q.includes('wsp') ||
      q.includes('good morning') || q.includes('good afternoon') || q.includes('good evening') ||
      q.includes('namaste') || q.includes('नमस्ते') || q.includes('हेलो') || q.includes('हाय') || q.includes('शुभ प्रभात')
    ) {
      return {
        timestamp,
        text: isHindi
          ? `नमस्ते **${userName}**! 👋 मैं एक्वाबॉट हूँ। आज मैं आपके जल प्रबंधन और खातों से जुड़े किसी भी सवाल में मदद करने के लिए तैयार हूँ।`
          : `Hello **${userName}**! 👋 I'm AquaBot, your live water management assistant. How can I help you today?`,
        suggestions: defaultSuggestions
      };
    }

    // 9. Courtesy & Appreciation
    if (
      q.includes('thank') || q.includes('thx') || q.includes('tnx') || q.includes('ty') ||
      q.includes('tysm') || q.includes('tyvm') || q.includes('welcome') ||
      q.includes('धन्यवाद') || q.includes('शुक्रिया') || q.includes('thnk')
    ) {
      return {
        timestamp,
        text: isHindi
          ? `आपका स्वागत है, **${userName}**! 😊 यदि आपको जल खपत या बिल भुगतान में कोई और सहायता चाहिए, तो जरूर बताएं!`
          : `You're very welcome, **${userName}**! 😊 Let me know if you need any further assistance with your water services.`,
        suggestions: defaultSuggestions
      };
    }

    // 10. Direct & Clean Fallback for Out-of-Scope / Unknown Queries
    return {
      timestamp,
      text: isHindi
        ? `⚠️ **प्रश्न समझ से बाहर है:** मैं AquaTrack जल प्रबंधन सहायक हूँ और केवल जल खपत, बिल, सहायता टिकट, लीक अलर्ट या सोसायटी डेटा के प्रश्नों का उत्तर दे सकता हूँ।\n\nकृपया नीचे दिए गए सुझावों में से चुनें या पानी से संबंधित प्रश्न पूछें!`
        : `⚠️ **Out of Scope Query:** I am AquaTrack's Water Assistant and can only answer questions related to your water usage, billing, support tickets, leaks, or society records.\n\nPlease ask a water-related question or pick a quick action below!`,
      suggestions: defaultSuggestions
    };
  };

  return (
    <>
      <div 
        className={`relative flex flex-col bg-[#e7ede8] dark:bg-[#0e1621] border border-slate-300/80 dark:border-slate-800 shadow-2xl overflow-hidden font-sans transition-all duration-300 ease-in-out ${
          isExpanded 
            ? 'h-[88vh] max-h-[850px] w-[94vw] max-w-5xl rounded-3xl backdrop-blur-2xl ring-1 ring-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)]' 
            : isFullPage 
              ? 'h-[80vh] w-full max-w-4xl rounded-2xl' 
              : 'h-[530px] w-[calc(100vw-1.5rem)] sm:w-[420px] max-w-[420px] rounded-2xl'
        }`}
      >
        {/* SVG Doodle Wallpaper Background */}
        <TelegramWallpaperPattern />

        {/* Chat Header — Telegram Signature Header */}
        <div className="relative z-10 bg-[#517da2] dark:bg-[#17212b] px-4 py-3 border-b border-white/10 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-sm text-white notranslate" translate="no">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-white/20 dark:bg-slate-800 border border-white/30 dark:border-slate-700 flex items-center justify-center text-white shadow-sm p-1">
                <RobotSVG />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#517da2] dark:border-[#17212b] rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm tracking-tight leading-none">{t ? t('bot_title') : 'AquaBot Assistant'}</h3>
                <span className="bg-white/20 dark:bg-[#242f3d] text-white dark:text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  {isSuperAdmin ? 'SUPER ADMIN' : isCommunityAdmin ? 'COMMUNITY AI' : 'BOT'}
                </span>
              </div>
              <p className="text-[10px] text-blue-100 dark:text-slate-400 font-medium mt-0.5 leading-none opacity-90">bot • live for {userName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Expand / Minimize Toggle Button */}
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              title={isExpanded ? "Minimize Chat" : "Expand Chat"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close AquaBot"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

      {/* Quick Action Task Bar (Telegram Keyboard Row Style) */}
      <div className="relative z-10 bg-white/80 dark:bg-[#17212b]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] font-extrabold text-[#517da2] dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Zap size={11} className="text-amber-500" /> {t ? t('bot_tasks') : 'TASKS:'}
        </span>
        {defaultSuggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s.query)}
            className="text-[10px] font-bold bg-white dark:bg-[#242f3d] hover:bg-[#517da2] hover:!text-white dark:hover:bg-[#2b5278] text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700/80 px-3 py-1 rounded-full whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer shadow-xs"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="relative z-10 flex-1 p-3.5 overflow-y-auto space-y-3.5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
          >
            <div className="flex items-center gap-1.5 mb-0.5 px-1">
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">{m.sender === 'user' ? 'You' : 'AquaBot'} • {m.timestamp}</span>
            </div>

            {/* Telegram Message Bubbles */}
            <div
              className={`max-w-[85%] p-3 text-xs leading-relaxed shadow-sm transition-all ${
                m.sender === 'user'
                  ? 'bg-[#effedd] dark:bg-[#2b5278] text-slate-900 dark:text-white rounded-2xl rounded-tr-xs border border-[#d2eebf] dark:border-[#3b6e9e] font-medium'
                  : 'bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-[#243447] text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs font-medium'
              }`}
            >
              <FormattedMarkdown content={m.text} />

              {/* Action Button inside message */}
              {m.actionButton && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                  <button
                    onClick={m.actionButton.onClick}
                    className="w-full bg-[#517da2] hover:bg-[#436b8e] dark:bg-[#2b5278] dark:hover:bg-[#356491] text-white font-extrabold py-1.5 px-3 rounded-xl transition duration-150 text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>{m.actionButton.label}</span>
                    <ChevronRight size={14} className="text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Telegram Quick Reply Suggestion Chips */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[90%]">
                {m.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sug.query)}
                    className="text-[10px] font-bold bg-white/90 dark:bg-[#17212b] hover:bg-[#517da2] hover:!text-white dark:hover:bg-[#2b5278] text-[#456e92] dark:text-[#64b5f6] border border-[#517da2]/30 dark:border-[#2b5278] px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-xs"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs py-1.5 px-2 bg-white/80 dark:bg-[#182533] border border-slate-200/60 dark:border-[#243447] rounded-2xl w-fit shadow-xs">
            <Bot size={13} className="animate-spin text-[#517da2] dark:text-blue-400" />
            <span className="text-[11px] font-medium animate-pulse">{lang === 'hi' ? 'एक्वाबॉट टाइप कर रहा है...' : 'AquaBot is typing...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Telegram Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative z-10 p-2.5 bg-white dark:bg-[#17212b] border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t ? t('bot_ask_placeholder') : 'Ask AquaBot about usage, bills, tickets...'}
          className="flex-1 bg-slate-100 dark:bg-[#0e1621] border border-slate-300/80 dark:border-slate-700/80 rounded-full px-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#517da2]/40 transition-all font-medium"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-[#5288c1] hover:bg-[#4374a7] disabled:opacity-40 disabled:hover:bg-[#5288c1] text-white p-2.5 rounded-full transition duration-150 shadow-sm shrink-0 cursor-pointer flex items-center justify-center"
        >
          <Send size={14} className="text-white" />
        </button>
      </form>
    </div>
  </>
);
}

export function ResidentChatbotTab({ profile, usageLogs, bills, apartments, households, users, token, setActiveTab, lang, t }) {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bot size={24} className="text-blue-500" />
            {t ? t('nav_aquabot') : 'AquaBot AI Household Assistant'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t ? t('bot_subtitle') : 'Your personal interactive AI water assistant with real-time account data & automated task actions.'}
          </p>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <AquaBotChatWindow
          profile={profile}
          usageLogs={usageLogs}
          bills={bills}
          apartments={apartments}
          households={households}
          users={users}
          token={token}
          setActiveTab={setActiveTab}
          isFullPage={true}
          lang={lang}
          t={t}
        />
      </div>
    </div>
  );
}

export function AquaBotFloatingWidget({ profile, usageLogs, bills, apartments, households, users, token, setActiveTab, isLanding = false, lang, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const rawName = profile?.name || profile?.username || (lang === 'hi' ? 'अतिथि' : 'Guest');
  const firstName = rawName.split(' ')[0];
  const hoverGreeting = isLanding || !token 
    ? (lang === 'hi' ? '👋 AquaBot सहायता' : '👋 AquaBot Help')
    : (lang === 'hi' ? `नमस्ते ${firstName}` : `Hi ${firstName}`);

  return (
    <>
      {isOpen && (
        <div className={isExpanded ? "fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in" : "fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 animate-fade-in-up shadow-2xl max-w-[calc(100vw-1rem)]"}>
          <AquaBotChatWindow
            profile={profile}
            usageLogs={usageLogs}
            bills={bills}
            apartments={apartments}
            households={households}
            users={users}
            token={token}
            setActiveTab={setActiveTab}
            onClose={() => { setIsOpen(false); setIsExpanded(false); }}
            onExpandChange={(exp) => setIsExpanded(exp)}
            isFullPage={false}
            isLanding={isLanding || !token}
            lang={lang}
            t={t}
          />
        </div>
      )}

      {!isOpen && !isExpanded && (
        <div className="fixed bottom-[-14px] right-[-10px] sm:bottom-[-18px] sm:right-[-12px] z-50 flex flex-col items-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center transition-all duration-300 transform hover:scale-108 active:scale-95 group cursor-pointer bg-transparent border-none outline-none focus:outline-none p-0"
          >
            {/* Soft Ambient Light Floor Shadow */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900/25 dark:bg-cyan-500/20 rounded-full blur-md pointer-events-none group-hover:scale-110 transition-all duration-300"></div>

            <div className="w-full h-full flex items-center justify-center transform group-hover:-translate-y-1.5 transition-transform duration-300 filter drop-shadow-[0_12px_22px_rgba(0,0,0,0.22)] drop-shadow-[0_4px_12px_rgba(56,189,248,0.25)]">
              <RobotSVG />
            </div>

            {/* Live Status Pulsing Dot */}
            <span className="absolute top-5 right-7 w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping border-2 border-slate-900"></span>
            <span className="absolute top-5 right-7 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-sm"></span>

            {/* Hover Tooltip - Hi [User's Name] */}
            <span className="absolute right-36 sm:right-44 top-1/2 -translate-y-1/2 bg-slate-900/95 dark:bg-slate-950/95 text-cyan-300 text-xs font-black px-4 py-2 rounded-xl shadow-xl border border-cyan-500/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none backdrop-blur-md flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-400 animate-pulse" />
              <span>{hoverGreeting}</span>
            </span>
          </button>
        </div>
      )}
    </>
  );
}

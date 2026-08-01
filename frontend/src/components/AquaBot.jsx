import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bot, Send, X, ChevronRight, Zap, Sparkles } from 'lucide-react';

export const RobotSVG = () => (
  <img src="/robot.svg" alt="AquaBot Icon" className="w-full h-full object-contain" />
);

const API_BASE_URL = 'http://localhost:8080';

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

export function AquaBotChatWindow({ profile, usageLogs, bills, token, setActiveTab, onClose, isFullPage = false, lang = 'en', t }) {
  const userName = profile?.name || 'Resident';
  const flatInfo = profile?.household ? (profile.household.flatNo ? `Flat ${profile.household.flatNo}` : 'Registered Household') : 'Registered Unit';

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
          const open = (data.raisedByMe || []).filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
          setOpenTicketsCount(open);
        }
      } catch (_) {}
    };
    if (token) fetchTicketData();
  }, [token]);

  const defaultSuggestions = useMemo(() => [
    { label: t ? t('bot_task_today') : "💧 Today's Usage", query: lang === 'hi' ? "आज की जल खपत दिखाएं" : "Show today's water usage" },
    { label: t ? t('bot_task_bills') : "💳 My Unpaid Bills", query: lang === 'hi' ? "क्या मेरा कोई बकाया बिल है?" : "Do I have any unpaid bills?" },
    { label: t ? t('bot_task_tickets') : "🎫 Support Tickets", query: lang === 'hi' ? "मेरे सहायता टिकट जांचें" : "Check my support tickets" },
    { label: t ? t('bot_task_alerts') : "🚨 Leak & Alert Check", query: lang === 'hi' ? "कोई सक्रिय लीक या अलर्ट?" : "Any active alerts or leaks?" },
    { label: t ? t('bot_task_tips') : "💡 Water Saving Tips", query: lang === 'hi' ? "पानी बचाने के टिप्स दें" : "Give me water saving tips" }
  ], [lang, t]);

  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: t ? t('bot_greet', { name: userName, flat: flatInfo }) : `👋 Hello **${userName}**! Welcome to AquaBot, your personal household water assistant.\n\nI am connected to your live account (*${flatInfo}*). How can I help you today?`,
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
            text: t ? t('bot_greet', { name: userName, flat: flatInfo }) : `👋 Hello **${userName}**! Welcome to AquaBot, your personal household water assistant.`,
            suggestions: defaultSuggestions
          }
        ];
      }
      return prev;
    });
  }, [lang, defaultSuggestions, t, userName, flatInfo]);

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
    }, 450);
  };

  const generateBotResponse = (query) => {
    const q = query.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isHindi = lang === 'hi';

    // 1. Water Usage queries
    if (q.includes('usage') || q.includes('water') || q.includes('today') || q.includes('consumption') || q.includes('liter') || q.includes('litre') || q.includes('खपत') || q.includes('पानी') || q.includes('आज')) {
      const daysInMonth = new Date().getDate();
      const dailyAvg = Math.round(monthUsage / Math.max(1, daysInMonth));
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
              : `✅ *Good job!* Your water usage is in healthy limits today.`),
        actionButton: {
          label: isHindi ? '📊 विस्तृत विश्लेषण देखें' : '📊 View Detailed Analytics',
          onClick: () => setActiveTab && setActiveTab('my_usage')
        },
        suggestions: [
          { label: isHindi ? "💳 बकाया बिल" : "💳 Check Bills", query: isHindi ? "क्या मेरा कोई बकाया बिल है?" : "Do I have any unpaid bills?" },
          { label: isHindi ? "💡 जल टिप्स" : "💡 Water Tips", query: isHindi ? "पानी बचाने के टिप्स दें" : "Give me water saving tips" },
          { label: isHindi ? "🎫 सपोर्ट टिकट" : "🎫 Support Ticket", query: isHindi ? "मेरे सहायता टिकट जांचें" : "Check my support tickets" }
        ]
      };
    }

    // 2. Billing & Dues queries
    if (q.includes('bill') || q.includes('unpaid') || q.includes('pay') || q.includes('due') || q.includes('cost') || q.includes('amount') || q.includes('invoice') || q.includes('बिल') || q.includes('बकाया') || q.includes('भुगतान')) {
      if (unpaidBills.length > 0) {
        const billList = unpaidBills.map(b => `• **Bill #${b.id}**: ₹${(b.amountDue || b.amount || 0).toLocaleString()} (${isHindi ? 'देय तिथि' : 'Due'}: ${b.dueDate || 'Pending'})`).join('\n');
        return {
          timestamp,
          text: isHindi
            ? `💳 **बकाया बिल सारांश:**\n\nआपके पास वर्तमान में **${unpaidBills.length} बकाया बिल** हैं, जिनकी कुल राशि **₹${unpaidTotal.toLocaleString()}** है:\n\n${billList}\n\nकृपया विलंब शुल्क से बचने के लिए समय पर भुगतान करें।`
            : `💳 **Pending Bills Summary:**\n\nYou currently have **${unpaidBills.length} unpaid bill(s)** totaling **₹${unpaidTotal.toLocaleString()}**:\n\n${billList}\n\nPlease settle your dues to avoid late fees.`,
          actionButton: {
            label: isHindi ? '💳 बिल देखें व भुगतान करें' : '💳 Go to Bills & Pay Now',
            onClick: () => setActiveTab && setActiveTab('my_bills')
          },
          suggestions: [
            { label: isHindi ? "💧 आज की खपत" : "💧 Today's Usage", query: isHindi ? "आज की जल खपत दिखाएं" : "Show today's water usage" },
            { label: isHindi ? "🎫 सहायता टिकट्स" : "🎫 Support Tickets", query: isHindi ? "मेरे सहायता टिकट जांचें" : "Check my support tickets" }
          ]
        };
      } else {
        return {
          timestamp,
          text: isHindi
            ? `🎉 **कोई बकाया बिल नहीं है, ${userName}!**\n\nआपके सभी पानी के बिल का समय पर भुगतान हो चुका है। धन्यवाद!`
            : `🎉 **No Pending Dues, ${userName}!**\n\nAll your water bills are paid up to date. Thank you for your timely payments!`,
          actionButton: {
            label: isHindi ? '📄 भुगतान इतिहास देखें' : '📄 View Payment History',
            onClick: () => setActiveTab && setActiveTab('my_bills')
          },
          suggestions: [
            { label: isHindi ? "💧 आज की खपत" : "💧 Today's Usage", query: isHindi ? "आज की जल खपत दिखाएं" : "Show today's water usage" },
            { label: isHindi ? "💡 जल टिप्स" : "💡 Water Tips", query: isHindi ? "पानी बचाने के टिप्स दें" : "Give me water saving tips" }
          ]
        };
      }
    }

    // 3. Support & Ticket queries
    if (q.includes('ticket') || q.includes('support') || q.includes('issue') || q.includes('complaint') || q.includes('problem') || q.includes('help') || q.includes('repair') || q.includes('टिकट') || q.includes('सहायता') || q.includes('शिकायत') || q.includes('समस्या')) {
      return {
        timestamp,
        text: isHindi
          ? `🎫 **सहायता व रखरखाव पोर्टल:**\n\n` +
            (openTicketsCount > 0 
              ? `आपके पास वर्तमान में **${openTicketsCount} सक्रिय खुला टिकट** है।` 
              : `आपके पास वर्तमान में कोई खुला सहायता टिकट नहीं है।`) +
            `\n\nआप नल लीक, मीटर खराबी या बिल संबंधी प्रश्न के लिए सीधे कम्युनिटी एडमिन को टिकट भेज सकते हैं।`
          : `🎫 **Support & Maintenance Portal:**\n\n` +
            (openTicketsCount > 0 
              ? `You currently have **${openTicketsCount} active open ticket(s)** with support.` 
              : `You currently have no open support tickets.`) +
            `\n\nYou can raise tickets for plumbing issues, water leaks, billing queries, or meter maintenance directly to your Community Admin.`,
        actionButton: {
          label: isHindi ? '🎫 सहायता पोर्टल खोलें व टिकट दर्ज करें' : '🎫 Open Support Portal & Raise Ticket',
          onClick: () => setActiveTab && setActiveTab('support')
        },
        suggestions: [
          { label: isHindi ? "🚨 अलर्ट जांचें" : "🚨 Check Alerts", query: isHindi ? "कोई सक्रिय लीक या अलर्ट?" : "Any active alerts or leaks?" },
          { label: isHindi ? "💧 आज की खपत" : "💧 Today's Usage", query: isHindi ? "आज की जल खपत दिखाएं" : "Show today's water usage" }
        ]
      };
    }

    // 4. Alert & Leak queries
    if (q.includes('leak') || q.includes('alert') || q.includes('warning') || q.includes('pipe') || q.includes('emergency') || q.includes('overflow') || q.includes('लीक') || q.includes('अलर्ट') || q.includes('रिसाव')) {
      return {
        timestamp,
        text: isHindi
          ? `🚨 **गृह सुरक्षा व लीक मॉनिटर:**\n\n` +
            `• **सिस्टम अलर्ट:** मीटर सेंसर सामान्य जल प्रवाह दर्ज कर रहे हैं।\n` +
            `• **आवश्यक कार्रवाई:** यदि रिसाव हो तो सिंक या मुख्य पाइप का वाल्व तुरंत बंद करें और तत्काल सहायता टिकट दर्ज करें।`
          : `🚨 **Household Safety & Leak Monitor:**\n\n` +
            `• **System Alert:** Meter sensors report normal flow.\n` +
            `• **Action required if leaking:** Turn off your primary inlet valve under the sink or main riser and raise an urgent support ticket.`,
        actionButton: {
          label: isHindi ? '🚨 आपातकालीन टिकट दर्ज करें' : '🚨 Raise Emergency Ticket',
          onClick: () => setActiveTab && setActiveTab('support')
        },
        suggestions: [
          { label: isHindi ? "🎫 सहायता टिकट्स" : "🎫 Support Tickets", query: isHindi ? "मेरे सहायता टिकट जांचें" : "Check my support tickets" },
          { label: isHindi ? "💧 आज की खपत" : "💧 Today's Usage", query: isHindi ? "आज की जल खपत दिखाएं" : "Show today's water usage" }
        ]
      };
    }

    // 5. Water Saving Tips
    if (q.includes('tip') || q.includes('save') || q.includes('conserve') || q.includes('advice') || q.includes('reduce') || q.includes('टिप्स') || q.includes('बचत') || q.includes('सलाह')) {
      return {
        timestamp,
        text: isHindi
          ? `💡 **${userName} के लिए स्मार्ट जल बचत टिप्स:**\n\n` +
            `1. 🛁 **शॉवर टाइमर:** स्नान का समय 5 मिनट से कम रखें (~30 लीटर दैनिक बचत)।\n` +
            `2. 🚰 **नल अनुशासन:** ब्रश करते समय नल बंद रखें (12L प्रति मिनट बचत)।\n` +
            `3. 🧼 **कपड़े धोने की मशीन:** मशीन को हमेशा पूरी क्षमता से चलाएं।\n` +
            `4. 🔍 **रिसाव जांच:** फ्लश टैंक का एक छोटा सा रिसाव प्रतिदिन 200 लीटर पानी बर्बाद कर सकता है!`
          : `💡 **Personalized Water Saving Tips for ${userName}:**\n\n` +
            `1. 🛁 **Shower Timer:** Keep showers under 5 minutes to save ~30 Liters daily.\n` +
            `2. 🚰 **Tap Discipline:** Turn off the faucet while brushing teeth to save 12L per minute.\n` +
            `3. 🧼 **Full Load Laundry:** Run washing machines only with full loads.\n` +
            `4. 🔍 **Check Leaks:** A slow leak in toilet tanks can waste 200 Liters per day!`,
        actionButton: {
          label: isHindi ? '💡 सभी टिप्स और गाइड देखें' : '💡 Explore All Tips & Guides',
          onClick: () => setActiveTab && setActiveTab('water_tips')
        },
        suggestions: [
          { label: isHindi ? "💧 आज की खपत" : "💧 Today's Usage", query: isHindi ? "आज की जल खपत दिखाएं" : "Show today's water usage" },
          { label: isHindi ? "💳 बकाया बिल" : "💳 Check Bills", query: isHindi ? "क्या मेरा कोई बकाया बिल है?" : "Do I have any unpaid bills?" }
        ]
      };
    }

    // 6. Greetings & Intro
    if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('who') || q.includes('start') || q.includes('नमस्ते') || q.includes('हेलो') || q.includes('हाय')) {
      return {
        timestamp,
        text: isHindi ? `नमस्ते ${userName}! 👋 मैं एक्वाबॉट हूँ। आज मैं आपके पानी प्रबंधन में कैसे मदद कर सकता हूँ?` : `Hello ${userName}! 👋 I'm AquaBot. How can I help you manage your household water today?`,
        suggestions: defaultSuggestions
      };
    }

    // 7. Default Fallback
    return {
      timestamp,
      text: isHindi
        ? `मैं आपकी जल सेवाओं में सहायता के लिए यहाँ हूँ, ${userName}! कृपया नीचे दिए गए त्वरित कार्यों में से एक चुनें या अपनी खपत, बिल, सहायता टिकट या जल संरक्षण के बारे में पूछें।`
        : `I'm here to assist you with your water services, ${userName}. Please select one of the quick actions below or ask me about your usage, bills, support tickets, or conservation tips!`,
      suggestions: defaultSuggestions
    };
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden ${isFullPage ? 'h-[80vh] w-full max-w-4xl' : 'h-[530px] w-[360px] sm:w-[420px]'}`}>
      {/* Chat Header — Fixed Vivid Gradient with Pure White High-Contrast Text */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 px-4 py-3.5 border-b border-blue-800/40 flex items-center justify-between shrink-0 shadow-md !text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center !text-white shadow-md p-1">
              <RobotSVG />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-indigo-900 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold !text-white text-sm tracking-tight">{t ? t('bot_title') : 'AquaBot Assistant'}</h3>
              <span className="bg-white/20 border border-white/30 !text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">AI ASSISTANT</span>
            </div>
            <p className="text-[10px] !text-blue-100 font-medium mt-0.5">Live for {userName} ({flatInfo})</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="!text-white/80 hover:!text-white p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer"
              title="Close AquaBot"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Task Bar at top */}
      <div className="bg-slate-100/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Zap size={11} className="text-amber-500" /> {t ? t('bot_tasks') : 'TASKS:'}
        </span>
        {defaultSuggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s.query)}
            className="text-[10px] font-bold bg-white dark:bg-slate-900 hover:bg-blue-600 hover:!text-white text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 px-2.5 py-1 rounded-full whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer shadow-sm"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono font-semibold">{m.sender === 'user' ? 'You' : 'AquaBot'} • {m.timestamp}</span>
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-md ${
                m.sender === 'user'
                  ? 'bg-blue-600 !text-white rounded-tr-none shadow-blue-600/20 font-medium'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none font-medium shadow-sm'
              }`}
            >
              <FormattedMarkdown content={m.text} />

              {/* High Contrast Action Button inside message */}
              {m.actionButton && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={m.actionButton.onClick}
                    className="w-full bg-blue-600 hover:bg-blue-500 !text-white font-extrabold py-2 px-3 rounded-xl transition duration-150 text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    <span>{m.actionButton.label}</span>
                    <ChevronRight size={14} className="!text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Suggestions Chips below bot reply */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                {m.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sug.query)}
                    className="text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-600 hover:!text-white text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs py-2 px-1">
            <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              <Bot size={14} className="animate-spin text-blue-500" />
            </div>
            <span className="text-[11px] font-semibold animate-pulse">{lang === 'hi' ? 'एक्वाबॉट उत्तर लिख रहा है...' : 'AquaBot is typing...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t ? t('bot_ask_placeholder') : 'Ask AquaBot about usage, bills, tickets...'}
          className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-medium"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 !text-white p-2.5 rounded-xl transition duration-150 shadow-md shadow-blue-600/30 shrink-0 cursor-pointer"
        >
          <Send size={15} className="!text-white" />
        </button>
      </form>
    </div>
  );
}

export function ResidentChatbotTab({ profile, usageLogs, bills, token, setActiveTab, lang, t }) {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bot size={24} className="text-blue-500" />
            {t ? t('nav_aquabot') : 'AquaBot Household Assistant'}
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

export function AquaBotFloatingWidget({ profile, usageLogs, bills, token, setActiveTab, lang, t }) {
  const [isOpen, setIsOpen] = useState(false);

  const rawName = profile?.name || profile?.username || (lang === 'hi' ? 'उपयोगकर्ता' : 'User');
  const firstName = rawName.split(' ')[0];
  const hoverGreeting = lang === 'hi' ? `नमस्ते ${firstName}` : `Hi ${firstName}`;

  return (
    <div className="fixed bottom-[-14px] right-[-10px] sm:bottom-[-18px] sm:right-[-12px] z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 mr-3 animate-fade-in-up shadow-2xl">
          <AquaBotChatWindow
            profile={profile}
            usageLogs={usageLogs}
            bills={bills}
            token={token}
            setActiveTab={setActiveTab}
            onClose={() => setIsOpen(false)}
            isFullPage={false}
            lang={lang}
            t={t}
          />
        </div>
      )}

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
  );
}

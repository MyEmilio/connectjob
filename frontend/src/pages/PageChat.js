import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Avatar, Btn } from "../components/shared";
import api from "../services/api";
import { getSocket } from "../services/socket";

const LANGS = [
  { code:"ro", speech:"ro-RO", flag:"\u{1F1F7}\u{1F1F4}", name:"Română" },
  { code:"en", speech:"en-GB", flag:"\u{1F1EC}\u{1F1E7}", name:"English" },
  { code:"es", speech:"es-ES", flag:"\u{1F1EA}\u{1F1F8}", name:"Español" },
  { code:"fr", speech:"fr-FR", flag:"\u{1F1EB}\u{1F1F7}", name:"Français" },
  { code:"de", speech:"de-DE", flag:"\u{1F1E9}\u{1F1EA}", name:"Deutsch" },
  { code:"it", speech:"it-IT", flag:"\u{1F1EE}\u{1F1F9}", name:"Italiano" },
  { code:"pt", speech:"pt-PT", flag:"\u{1F1F5}\u{1F1F9}", name:"Português" },
  { code:"nl", speech:"nl-NL", flag:"\u{1F1F3}\u{1F1F1}", name:"Nederlands" },
  { code:"ru", speech:"ru-RU", flag:"\u{1F1F7}\u{1F1FA}", name:"Русский" },
  { code:"ar", speech:"ar-SA", flag:"\u{1F1F8}\u{1F1E6}", name:"العربية" },
  { code:"ca", speech:"ca-ES", flag:"\u{1F3F4}", name:"Català" },
];

export default function PageChat({ gs, update, navigate }) {
  const { t, i18n } = useTranslation("t");
  const [convs, setConvs]       = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim]   = useState("");
  const [recTime, setRecTime]   = useState(0);
  const [myLang, setMyLang]     = useState(() => {
    const uiLang = i18n.language?.split("-")[0] || "ro";
    return LANGS.find(l => l.code === uiLang)?.code || "ro";
  });
  const [modal, setModal]       = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [moderationAlert, setModerationAlert] = useState(null);
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const bottomRef = useRef(null);

  const [isDemo, setIsDemo] = useState(false);
  const active = convs.find(c => c.id === activeId);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const myLangObj = LANGS.find(l => l.code === myLang) || LANGS[0];

  const DEMO_CONVS = [
    { id:"demo1", user1_id:"me", user2_id:"other1", user2_name:"SC CleanPro SRL", user2_initials:"CP", job_title:t("demo_job_pool","Limpieza piscina"), last_msg:t("demo_msg_available","¿Estás disponible mañana?"), unread:2 },
    { id:"demo2", user1_id:"me", user2_id:"other2", user2_name:"Maria Constantin", user2_initials:"MC", job_title:t("demo_job_dogs","Paseo perros"), last_msg:t("demo_msg_dogs","Los perros son dos labradores"), unread:0 },
    { id:"demo3", user1_id:"me", user2_id:"other3", user2_name:"Andrei Electricul", user2_initials:"AE", job_title:t("demo_job_electric","Reparaciones eléctricas"), last_msg:t("demo_msg_monday","Puedo empezar el lunes."), unread:1 },
  ];
  const DEMO_MESSAGES = {
    demo1: [
      { id:1, sender_id:"other1", sender_initials:"CP", text:t("demo_chat1_1","¡Buenos días! He visto que has aplicado para limpieza de piscina."), created_at:new Date().toISOString() },
      { id:2, sender_id:"me", sender_initials:"AI", text:t("demo_chat1_2","¡Sí! Estoy interesado. Tengo 3 años de experiencia."), created_at:new Date().toISOString() },
      { id:3, sender_id:"other1", sender_initials:"CP", text:t("demo_chat1_3","¡Excelente! ¿Qué horario prefieres?"), created_at:new Date().toISOString() },
      { id:4, sender_id:"me", sender_initials:"AI", text:t("demo_chat1_4","Prefiero por la mañana, 8-12."), created_at:new Date().toISOString() },
      { id:5, sender_id:"other1", sender_initials:"CP", text:t("demo_chat1_5","¿Estás disponible mañana?"), created_at:new Date().toISOString() },
    ],
    demo2: [
      { id:1, sender_id:"other2", sender_initials:"MC", text:t("demo_chat2_1","¡Hola! ¿Tienes experiencia con perros grandes?"), created_at:new Date().toISOString() },
      { id:2, sender_id:"me", sender_initials:"AI", text:t("demo_chat2_2","¡Sí, crecí con perros grandes!"), created_at:new Date().toISOString() },
      { id:3, sender_id:"other2", sender_initials:"MC", text:t("demo_chat2_3","Mis perros son dos labradores."), created_at:new Date().toISOString() },
    ],
    demo3: [
      { id:1, sender_id:"me", sender_initials:"AI", text:t("demo_chat3_1","¡Buenos días! ¿Tienes autorización ANRE?"), created_at:new Date().toISOString() },
      { id:2, sender_id:"other3", sender_initials:"AE", text:t("demo_chat3_2","Sí, 5 años de experiencia. Tengo autorización."), created_at:new Date().toISOString() },
      { id:3, sender_id:"other3", sender_initials:"AE", text:t("demo_chat3_3","Puedo empezar el lunes, tengo todas las herramientas."), created_at:new Date().toISOString() },
    ],
  };

  // Load conversations
  useEffect(() => {
    api.get("/messages/conversations").then(r => {
      if (r.data?.length > 0) { setConvs(r.data); setActiveId(r.data[0].id); setIsDemo(false); }
      else { setConvs(DEMO_CONVS); setActiveId("demo1"); setMessages(DEMO_MESSAGES["demo1"]); setIsDemo(true); }
    }).catch(() => { setConvs(DEMO_CONVS); setActiveId("demo1"); setMessages(DEMO_MESSAGES["demo1"]); setIsDemo(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeId) return;
    if (isDemo) { setMessages(DEMO_MESSAGES[activeId] || []); setConvs(p => p.map(c => c.id === activeId ? { ...c, unread: 0 } : c)); return; }
    api.get(`/messages/conversations/${activeId}`).then(r => setMessages(r.data)).catch(() => {});
    setConvs(p => p.map(c => c.id === activeId ? { ...c, unread: 0 } : c));
    const socket = getSocket();
    if (socket) socket.emit("join_conversation", activeId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Auto-translate messages from others when language changes
  useEffect(() => {
    if (!messages.length) return;
    const othersMessages = messages.filter(m => {
      const isMe = isDemo ? m.sender_id === "me" : String(m.sender_id) === String(gs.user?.id);
      return !isMe && !translations[`${m.id}_${myLang}`];
    });
    if (!othersMessages.length) return;

    setTranslating(true);
    api.post("/translate/batch", {
      messages: othersMessages.map(m => ({ id: m.id, text: m.text })),
      target_lang: myLang,
    }).then(r => {
      const newTr = { ...translations };
      r.data.forEach(tr => {
        if (!tr.same_language) newTr[`${tr.id}_${myLang}`] = { text: tr.translated, from: tr.source_lang };
      });
      setTranslations(newTr);
    }).catch(() => {}).finally(() => setTranslating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, myLang]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onMsg = (msg) => {
      if (String(msg.conversation_id) === String(activeId)) setMessages(p => [...p, msg]);
      setConvs(p => p.map(c => String(c.id) === String(msg.conversation_id) ? { ...c, last_msg: msg.text, last_time: msg.created_at } : c));
    };
    const onTyping = ({ conversation_id, is_typing }) => {
      if (String(conversation_id) === String(activeId)) setTyping(is_typing);
    };
    socket.on("new_message", onMsg);
    socket.on("typing", onTyping);
    const onBlocked = ({ reason }) => {
      setModerationAlert(reason);
      setTimeout(() => setModerationAlert(null), 6000);
    };
    socket.on("message_blocked", onBlocked);
    return () => { socket.off("new_message", onMsg); socket.off("typing", onTyping); socket.off("message_blocked", onBlocked); };
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => {
    if (isListening) { setRecTime(0); timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000); }
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isListening]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.lang = myLangObj.speech; r.interimResults = true; r.continuous = true;
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
        else int += e.results[i][0].transcript;
      }
      if (fin) setInput(p => (p + " " + fin).trim());
      setInterim(int.trim());
    };
    r.onend = () => { setIsListening(false); setInterim(""); };
    recRef.current = r; r.start();
  };
  const stopVoice = () => { recRef.current?.stop(); setIsListening(false); setInterim(""); };

  const send = () => {
    const base = input.trim(), extra = interim.trim();
    const txt = base && extra && !base.endsWith(extra) ? `${base} ${extra}`.trim() : (base || extra);
    if (!txt || !activeId) return;
    if (isListening) stopVoice();
    setInput(""); setInterim("");

    if (isDemo) {
      const myMsg = { id: Date.now(), sender_id: "me", sender_initials: gs.user?.initials || "EU", text: txt, created_at: new Date().toISOString() };
      setMessages(p => [...p, myMsg]);
      setConvs(p => p.map(c => c.id === activeId ? { ...c, last_msg: txt } : c));
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
      const rep = [t("demo_reply_1","¡Gracias! Vuelvo pronto."), t("demo_reply_2","¡Perfecto, hablamos mañana!"), t("demo_reply_3","Entendido, te llamo."), t("demo_reply_4","¡Excelente!")][Math.floor(Math.random() * 4)];
        const repMsg = { id: Date.now() + 1, sender_id: "other", sender_initials: "??", text: rep, created_at: new Date().toISOString() };
        setMessages(p => [...p, repMsg]);
      }, 1000 + Math.random() * 800);
      return;
    }

    const socket = getSocket();
    if (socket) socket.emit("send_message", { conversation_id: activeId, text: txt });
    else api.post(`/messages/conversations/${activeId}/send`, { text: txt }).then(r => setMessages(p => [...p, r.data])).catch((err) => {
      if (err.response?.data?.moderation) {
        setModerationAlert(err.response.data.error);
        setTimeout(() => setModerationAlert(null), 6000);
      }
    });
  };

  return (
    <div data-testid="page-chat" style={{ display: "flex", gap: 0, height: expanded ? "calc(100vh - 130px)" : 52, minHeight: expanded ? 400 : 52, borderRadius: 18, overflow: "hidden", border: `1.5px solid ${T.border}`, animation: "fadeIn 0.3s ease", transition: "height 0.3s ease" }}>

      {/* Modals */}
      {modal === "whatsapp" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.white, borderRadius: 20, padding: "28px 24px", maxWidth: 400, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
              <h3 style={{ fontFamily: "Outfit,sans-serif", fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px" }}>{t("chat_whatsapp_title")}</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {[{ icon: "📞", label: t("chat_voice_call"), href: "https://wa.me/" }, { icon: "📹", label: t("chat_video_call_btn"), href: "https://wa.me/" }, { icon: "💬", label: t("chat_message_btn"), href: "https://wa.me/" }].map(opt => (
                <a key={opt.label} href={opt.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Btn color="#25d366" style={{ width: "100%", justifyContent: "center" }}>{opt.icon} {opt.label}</Btn></a>
              ))}
            </div>
            <Btn variant="outline" onClick={() => setModal(null)} style={{ width: "100%", justifyContent: "center" }}>✕ Închide</Btn>
          </div>
        </div>
      )}

      {modal === "video" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.white, borderRadius: 20, padding: "28px 24px", maxWidth: 420, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📹</div>
              <h3 style={{ fontFamily: "Outfit,sans-serif", fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px" }}>{t("chat_video_title")}</h3>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[{ icon: "🎥", label: "Google Meet", color: "#1a73e8", href: "https://meet.google.com/new" }, { icon: "📹", label: "Zoom", color: "#2d8cff", href: "https://zoom.us/start/videomeeting" }, { icon: "💼", label: "Teams", color: "#6264a7", href: "https://teams.microsoft.com" }].map(p => (
                <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: 1 }}><Btn color={p.color} style={{ width: "100%", justifyContent: "center", flexDirection: "column", height: 72, gap: 4 }} size="sm"><span style={{ fontSize: 22 }}>{p.icon}</span>{p.label}</Btn></a>
              ))}
            </div>
            <Btn variant="outline" onClick={() => setModal(null)} style={{ width: "100%", justifyContent: "center" }}>✕ Închide</Btn>
          </div>
        </div>
      )}

      {modal === "report" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.white, borderRadius: 20, padding: "28px 24px", maxWidth: 440, width: "100%", animation: "slideUpModal 0.3s ease" }}>
            {reportStatus ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>{t("chat_report_sent_title")}</h3>
                <p style={{ fontSize: 13, color: T.text2, marginBottom: 20 }}>{reportStatus}</p>
                <Btn onClick={() => setModal(null)} color={T.green} style={{ width: "100%", justifyContent: "center" }}>Închide</Btn>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
                  <h3 style={{ fontFamily: "Outfit,sans-serif", fontSize: 18, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>{t("chat_report_modal_title")}</h3>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", marginBottom: 8 }}>Motiv</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[{ k: "limbaj_ofensiv", l: t("chat_report_offensive") }, { k: "rasism", l: t("chat_report_racism") }, { k: "hartuire", l: t("chat_report_harassment") }, { k: "spam", l: t("chat_report_spam") }, { k: "frauda", l: t("chat_report_fraud") }, { k: "altele", l: t("chat_report_other") }].map(r => (
                      <div key={r.k} onClick={() => setReportReason(r.k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, cursor: "pointer", border: reportReason === r.k ? `2px solid ${T.red}` : `1.5px solid ${T.border}`, background: reportReason === r.k ? "#fef2f2" : "#fafaf9" }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: reportReason === r.k ? "none" : `2px solid ${T.border}`, background: reportReason === r.k ? T.red : "transparent", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: reportReason === r.k ? T.red : T.text2, fontWeight: reportReason === r.k ? 700 : 400 }}>{r.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder={t("chat_report_details_ph")} rows={2} style={{ width: "100%", borderRadius: 9, border: `1.5px solid ${T.border}`, padding: "8px 12px", fontSize: 13, resize: "none", outline: "none", marginBottom: 14, boxSizing: "border-box", fontFamily: "DM Sans,sans-serif" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={async () => {
                    if (!reportReason) return;
                    const otherId = active ? (String(active.user1_id) === String(gs.user?.id) ? active.user2_id : active.user1_id) : null;
                    if (!otherId) return;
                    try { const res = await api.post("/reports", { reported_user_id: otherId, reason: reportReason, details: reportDetails }); setReportStatus(res.data.message || t("chat_report_sent_msg")); } catch (e) { setReportStatus(e.response?.data?.error || "Raport trimis."); }
                  }} disabled={!reportReason} color={T.red} style={{ flex: 1, justifyContent: "center" }}>⚠️ Trimite raport</Btn>
                  <Btn variant="ghost" onClick={() => setModal(null)} style={{ flex: 1, justifyContent: "center" }}>Anulează</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Conversation sidebar */}
      <div className="jc-chat-sidebar" style={{ width: 270, background: T.dark, display: expanded ? "flex" : "none", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 12px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ color: "#f1f5f9", fontFamily: "Outfit,sans-serif", fontSize: 15, fontWeight: 700, margin: 0 }}>{t("chat_messages_title")}</h3>
            <span style={{ background: T.green, color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{convs.reduce((a, c) => a + c.unread, 0)} {t("chat_new_count")}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
          {convs.map(conv => {
            const otherName = String(conv.user1_id) === String(gs.user?.id) ? conv.user2_name : conv.user1_name;
            const otherInitials = String(conv.user1_id) === String(gs.user?.id) ? conv.user2_initials : conv.user1_initials;
            return (
              <div key={conv.id} onClick={() => setActiveId(conv.id)} data-testid={`chat-conv-${conv.id}`}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px", borderRadius: 10, cursor: "pointer", marginBottom: 2, background: conv.id === activeId ? "#1e293b" : "transparent", transition: "background 0.12s" }}
                onMouseEnter={e => { if (conv.id !== activeId) e.currentTarget.style.background = "#172035"; }}
                onMouseLeave={e => { if (conv.id !== activeId) e.currentTarget.style.background = "transparent"; }}
              >
                <Avatar initials={otherInitials || "??"} color={T.green} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 12 }}>{otherName || "?"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{conv.last_msg}</div>
                </div>
                {conv.unread > 0 && <div style={{ background: T.green, color: "#fff", borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{conv.unread}</div>}
              </div>
            );
          })}
        </div>
        {/* Language selector */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>🌐 {t("chat_lang_label")}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setMyLang(l.code)} data-testid={`chat-lang-${l.code}`}
                style={{ padding: "5px 4px", borderRadius: 7, border: "none", cursor: "pointer", background: myLang === l.code ? T.green : "#1e293b", color: myLang === l.code ? "#fff" : "#64748b", fontSize: 14, transition: "all 0.15s", minWidth: 30 }} title={l.name}>
                {l.flag}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: T.green, fontWeight: 600 }}>
            {myLangObj.flag} {myLangObj.name} {translating && `— ${t("loading")}...`}
          </div>
        </div>
      </div>

      {/* Chat main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minWidth: 0 }}>
        {/* Header with minimize/expand */}
        <div style={{ padding: "8px 16px", background: T.white, borderBottom: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          {active ? (
            <>
              <Avatar initials={active ? (String(active.user1_id) === String(gs.user?.id) ? active.user2_initials : active.user1_initials) : "??"} color={T.green} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text, fontFamily: "Outfit,sans-serif" }}>{active ? (String(active.user1_id) === String(gs.user?.id) ? active.user2_name : active.user1_name) : "?"}</div>
                <div style={{ fontSize: 11, color: T.text3 }}>📋 {active?.job_title || t("chat_conversation")}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button data-testid="chat-whatsapp-btn" onClick={() => setModal("whatsapp")} style={{ width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 18, background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center" }}>💬</button>
                <button data-testid="chat-video-btn" onClick={() => setModal("video")} style={{ width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 18, background: `linear-gradient(135deg,${T.blue},${T.blueDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>📹</button>
                <button data-testid="chat-report-btn" onClick={() => { setReportReason(""); setReportDetails(""); setReportStatus(""); setModal("report"); }} style={{ width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 16, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center" }}>⚠️</button>
                <button data-testid="chat-resize-btn" onClick={() => setExpanded(!expanded)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 14, background: "#f5f5f4", display: "flex", alignItems: "center", justifyContent: "center" }} title={expanded ? "Minimizează" : "Maximizează"}>
                  {expanded ? "⊖" : "⊕"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>💬 {t("chat_messages_title")}</span>
              <button data-testid="chat-resize-btn-empty" onClick={() => setExpanded(!expanded)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, cursor: "pointer", fontSize: 14, background: "#f5f5f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {expanded ? "⊖" : "⊕"}
              </button>
            </div>
          )}
        </div>

        {expanded && !active && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.text3 }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{t("chat_no_active")}</div>
            <div style={{ fontSize: 13 }}>{t("chat_apply_to_start")}</div>
          </div>
        )}

        {expanded && active && (<>
          {isDemo && (
            <div style={{ margin: "6px 12px 0", background: "#fef3c7", borderRadius: 8, padding: "5px 12px", display: "flex", alignItems: "center", gap: 8, border: "1px solid #fde68a", fontSize: 11, color: "#92400e" }}>
              <span>⚡</span>
              <span><strong>{t("chat_demo_mode")}</strong> — {t("chat_demo_desc")}</span>
            </div>
          )}

          <div style={{ margin: "6px 12px 0", background: `linear-gradient(135deg,${T.green}08,${T.blue}08)`, borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.green}22` }}>
            <span style={{ fontSize: 14 }}>🌐</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.green }}>{t("chat_auto_translate_active")}</span>
            <span style={{ fontSize: 10, color: T.text3 }}>— {t("chat_translating_to")} {myLangObj.name}</span>
            {translating && <span style={{ fontSize: 10, color: T.amber, marginLeft: "auto", fontWeight: 700 }}>{t("loading")}...</span>}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 6px", display: "flex", flexDirection: "column", gap: 5 }}>
            {messages.map((msg) => {
              const isMe = isDemo ? msg.sender_id === "me" : String(msg.sender_id) === String(gs.user?.id);
              const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" }) : "";
              const tr = !isMe ? translations[`${msg.id}_${myLang}`] : null;

              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 6, animation: "fadeIn 0.2s ease" }}>
                  {!isMe && <Avatar initials={msg.sender_initials || "??"} color={T.green} size={24} />}
                  <div style={{ maxWidth: "65%" }}>
                    <div style={{ background: isMe ? `linear-gradient(135deg,${T.green},${T.greenDark})` : T.white, color: isMe ? "#fff" : T.text, borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "8px 12px", fontSize: 13, lineHeight: 1.5, boxShadow: isMe ? `0 2px 8px ${T.green}33` : "0 1px 4px rgba(0,0,0,0.06)", border: isMe ? "none" : `1.5px solid ${T.border}` }}>
                      {tr ? tr.text : msg.text}
                    </div>
                    {/* Translation badge */}
                    {tr && (
                      <div style={{ fontSize: 9, marginTop: 2, color: T.blue, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, paddingLeft: 4 }}>
                        🌐 {t("chat_translated_from","Traducido de")} {LANGS.find(l => l.code === tr.from)?.flag || ""} {LANGS.find(l => l.code === tr.from)?.name || tr.from}
                        <button onClick={() => { const newTr = { ...translations }; delete newTr[`${msg.id}_${myLang}`]; setTranslations(newTr); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: T.text3, padding: "0 2px" }} title={t("chat_see_original","Ver original")}>
                          👁
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: 10, marginTop: 2, textAlign: isMe ? "right" : "left", color: T.text3, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>
                      {timeStr}{isMe && <span style={{ color: T.green }}> ✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <Avatar initials={active ? (String(active.user1_id) === String(gs.user?.id) ? active.user2_initials : active.user1_initials) : "??"} color={T.green} size={24} />
                <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.text3, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: "8px 12px 12px", background: T.white, borderTop: `1.5px solid ${T.border}` }}>
            {/* Moderation alert */}
            {moderationAlert && (
              <div data-testid="moderation-alert" style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8, animation: "fadeIn 0.2s ease" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🛡️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 2 }}>{t("chat_msg_blocked")}</div>
                  <div style={{ fontSize: 10, color: "#b91c1c", lineHeight: 1.4 }}>{moderationAlert}</div>
                </div>
                <button onClick={() => setModerationAlert(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#b91c1c", padding: 2 }}>✕</button>
              </div>
            )}
            {interim && <div style={{ marginBottom: 7, padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 12, color: "#166534", fontStyle: "italic" }}>🎙️ "{interim}"</div>}
            {isListening && (
              <div style={{ marginBottom: 8, background: T.dark2, borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.dark3}` }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#ef4444,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, animation: "micGlow 1.5s ease-in-out infinite" }}>🎙️</div>
                <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                  {Array.from({ length: 20 }).map((_, i) => <div key={i} style={{ width: 3, borderRadius: 999, background: "#fff", height: `${10 + Math.sin(i * 0.9) * 6}px`, animation: `wave ${0.7 + (i % 4) * 0.15}s ease-in-out ${i * 0.04}s infinite alternate` }} />)}
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#ef4444", fontWeight: 700 }}>⏺ {fmt(recTime)}</div>
                <button onClick={stopVoice} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>■</button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              <div style={{ flex: 1, background: "#f5f5f4", borderRadius: 12, border: isListening ? `1.5px solid #ef4444` : `1.5px solid ${T.border}`, padding: "8px 12px" }}>
                <textarea data-testid="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={isListening ? t("chat_speaking") : t("chat_placeholder")} rows={1} style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "DM Sans,sans-serif", color: T.text, resize: "none", lineHeight: 1.5, maxHeight: 72 }} />
              </div>
              <button data-testid="chat-voice-btn" onClick={isListening ? stopVoice : startVoice} style={{ width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", background: isListening ? "linear-gradient(135deg,#ef4444,#dc2626)" : `linear-gradient(135deg,${T.dark},${T.dark3})`, boxShadow: isListening ? "0 0 0 3px rgba(239,68,68,0.3)" : "none" }}>{isListening ? "⏹" : "🎤"}</button>
              <button data-testid="chat-send-btn" onClick={send} disabled={!input.trim() && !interim.trim()} style={{ width: 38, height: 38, borderRadius: 10, border: "none", cursor: (input.trim() || interim.trim()) ? "pointer" : "not-allowed", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", background: (input.trim() || interim.trim()) ? `linear-gradient(135deg,${T.green},${T.greenDark})` : "#e7e5e4", boxShadow: (input.trim() || interim.trim()) ? `0 4px 12px ${T.green}44` : "none" }}>➤</button>
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

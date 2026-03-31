import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const T = {
  green:"#059669", dark:"#0f172a", blue:"#3b82f6",
  text:"#1c1917", text2:"#57534e", text3:"#a8a29e",
  border:"#e7e5e4", bg:"#fafaf9", white:"#ffffff",
};

function Avatar({ name, size=36 }) {
  const initials = name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) || "?";
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:T.green, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useTranslation("t");
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState("");
  const [typing, setTyping]               = useState(false);
  const [onlineUsers, setOnlineUsers]     = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);
  const socket         = getSocket();

  // Incarca conversatii
  useEffect(() => {
    api.get("/messages/conversations").then(r => setConversations(r.data)).catch(()=>{});
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    socket.on("new_message", (msg) => {
      if (msg.conversation_id === activeConv?.id) {
        setMessages(prev => [...prev, msg]);
      }
      // Actualizeaza lista conversatii
      setConversations(prev => prev.map(c =>
        c.id === msg.conversation_id ? {...c, last_msg: msg.text, unread: c.id === activeConv?.id ? 0 : (c.unread||0)+1} : c
      ));
    });
    socket.on("typing", ({ conversation_id, user_id, is_typing }) => {
      if (conversation_id === activeConv?.id && user_id !== user?.id) setTyping(is_typing);
    });
    socket.on("online_users", (ids) => setOnlineUsers(ids));
    return () => {
      socket.off("new_message");
      socket.off("typing");
      socket.off("online_users");
    };
  }, [socket, activeConv, user]);

  // Incarca mesaje la schimbarea conversatiei
  useEffect(() => {
    if (!activeConv) return;
    api.get(`/messages/conversations/${activeConv.id}`).then(r => setMessages(r.data)).catch(()=>{});
    socket?.emit("join_conversation", activeConv.id);
    setTyping(false);
  }, [activeConv, socket]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, typing]);

  const sendMessage = () => {
    if (!text.trim() || !activeConv || !socket) return;
    socket.emit("send_message", { conversation_id: activeConv.id, text });
    setText("");
  };

  const handleTyping = (val) => {
    setText(val);
    if (!socket || !activeConv) return;
    socket.emit("typing", { conversation_id: activeConv.id, is_typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing", { conversation_id: activeConv.id, is_typing: false });
    }, 1500);
  };

  const otherName = (conv) => {
    if (!conv || !user) return "";
    return conv.user1_id === user.id ? conv.user2_name : conv.user1_name;
  };

  const isOnline = (conv) => {
    if (!conv || !user) return false;
    const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
    return onlineUsers.includes(otherId);
  };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 58px)" }}>
      {/* Lista conversatii */}
      <div style={{ width:300, background:"#fff", borderRight:`1px solid ${T.border}`, overflowY:"auto" }}>
        <div style={{ padding:"16px 16px 10px", borderBottom:`1px solid ${T.border}`, fontWeight:800, fontSize:16, color:T.dark }}>
          {t("chat_title","Mesaje")}
        </div>
        {conversations.length === 0 && (
          <div style={{ padding:24, color:T.text3, fontSize:13, textAlign:"center" }}>
            {t("chat_no_convs","Nicio conversatie.\nAplica la un job pentru a incepe!").split("\n").map((l,i)=><span key={i}>{l}{i===0&&<br/>}</span>)}
          </div>
        )}
        {conversations.map(conv => (
          <div key={conv.id} onClick={() => setActiveConv(conv)} style={{
            display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
            cursor:"pointer", borderBottom:`1px solid ${T.border}`,
            background: activeConv?.id === conv.id ? `${T.green}08` : "transparent",
            borderLeft: activeConv?.id === conv.id ? `3px solid ${T.green}` : "3px solid transparent",
          }}>
            <div style={{ position:"relative" }}>
              <Avatar name={otherName(conv)} size={42}/>
              {isOnline(conv) && <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, borderRadius:"50%", background:"#22c55e", border:"2px solid #fff" }}/>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{otherName(conv)}</div>
              <div style={{ fontSize:11, color:T.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{conv.last_msg || t("chat_start_conv","Incepe o conversatie...")}</div>
              {conv.job_title && <div style={{ fontSize:10, color:T.green, fontWeight:600 }}>💼 {conv.job_title}</div>}
            </div>
            {conv.unread > 0 && (
              <div style={{ background:T.green, color:"#fff", borderRadius:"50%", minWidth:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>
                {conv.unread}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chat */}
      {!activeConv ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:T.text3, flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:48 }}>💬</div>
          <div style={{ fontSize:16, fontWeight:600 }}>{t("chat_select","Selectează o conversație")}</div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          {/* Header */}
          <div style={{ padding:"12px 20px", background:"#fff", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12 }}>
            <Avatar name={otherName(activeConv)} size={36}/>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:T.dark }}>{otherName(activeConv)}</div>
              <div style={{ fontSize:11, color: isOnline(activeConv) ? "#22c55e" : T.text3 }}>
                {isOnline(activeConv) ? t("chat_online","● Online acum") : t("chat_offline","○ Offline")}
              </div>
            </div>
            {activeConv.job_title && (
              <div style={{ marginLeft:"auto", fontSize:11, background:`${T.green}12`, color:T.green, borderRadius:6, padding:"4px 10px", fontWeight:600 }}>
                💼 {activeConv.job_title}
              </div>
            )}
          </div>

          {/* Mesaje */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:12 }}>
            {messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} style={{ display:"flex", justifyContent: isMe ? "flex-end" : "flex-start", gap:8 }}>
                  {!isMe && <Avatar name={msg.sender_name} size={28}/>}
                  <div style={{
                    maxWidth:"70%", padding:"10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isMe ? T.green : "#fff",
                    color: isMe ? "#fff" : T.text,
                    fontSize:13, lineHeight:1.5,
                    boxShadow: isMe ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
                    border: isMe ? "none" : `1px solid ${T.border}`,
                  }}>
                    {msg.text}
                    <div style={{ fontSize:10, marginTop:4, opacity:0.7, textAlign:"right" }}>
                      {new Date(msg.created_at).toLocaleTimeString("ro", { hour:"2-digit", minute:"2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:16, padding:"10px 14px", fontSize:13, color:T.text3 }}>
                  {t("chat_typing","scrie...")}
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:"12px 16px", background:"#fff", borderTop:`1px solid ${T.border}`, display:"flex", gap:10 }}>
            <input
              value={text}
              onChange={e => handleTyping(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={t("chat_placeholder","Scrie un mesaj...")}
              style={{ flex:1, padding:"10px 14px", borderRadius:20, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none" }}
            />
            <button onClick={sendMessage} disabled={!text.trim()} style={{
              padding:"10px 18px", borderRadius:20, border:"none", cursor:"pointer",
              background: text.trim() ? T.green : "#e5e7eb", color: text.trim() ? "#fff" : "#9ca3af",
              fontWeight:700, fontSize:14, transition:"all 0.15s",
            }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

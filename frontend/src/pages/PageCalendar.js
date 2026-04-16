import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Btn } from "../components/shared";

const SCHEDULE_TYPE_DEFS = [
  { key:"maintenance", icon:"🏠", color:"#3b82f6" },
  { key:"garden",      icon:"🌿", color:"#10b981" },
  { key:"dogwalk",     icon:"🐕", color:"#f59e0b" },
  { key:"cleaning",    icon:"🧹", color:"#8b5cf6" },
  { key:"repair",      icon:"🔧", color:"#ef4444" },
  { key:"other",       icon:"⭐", color:"#6b7280" },
];

export default function PageCalendar({ gs, update }) {
  const { t } = useTranslation("t");
  const SCHEDULE_TYPES = SCHEDULE_TYPE_DEFS.map(d => ({
    ...d,
    label: t(`sched_${d.key}`, { defaultValue: d.key }),
  }));
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const [curMonth, setCurMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const emptyForm = { title:"", type:"maintenance", date:todayStr, time:"09:00", location:"", client:"", notes:"", recurring:"none", reminderMin:30 };
  const [form, setForm] = useState(emptyForm);
  const events = gs.schedule || [];

  useEffect(() => {
    try { localStorage.setItem("jc_schedule", JSON.stringify(events)); } catch(e){}
  }, [events]);

  useEffect(() => {
    if(typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const timers = [];
    const now = Date.now();
    events.forEach(ev => {
      if(!ev.date || !ev.time) return;
      const evTs = new Date(`${ev.date}T${ev.time}`).getTime();
      const alertTs = evTs - (ev.reminderMin || 30) * 60000;
      const diff = alertTs - now;
      if(diff > 0 && diff < 86400000 * 7) {
        const timer = setTimeout(() => {
          if(typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`⏰ ${ev.title}`, {
              body: `${ev.time}${ev.client ? " · " + ev.client : ""}${ev.location ? " · " + ev.location : ""}`,
              icon: "/logo192.png"
            });
          }
        }, diff);
        timers.push(timer);
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [events]);

  const year = curMonth.getFullYear();
  const month = curMonth.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDayRaw = new Date(year, month, 1).getDay();
  const startOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  const cells = [];
  for(let i=0; i<startOffset; i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);
  while(cells.length % 7 !== 0) cells.push(null);

  const toDateStr = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const isRecurringOnDay = (ev, dateStr) => {
    if(ev.date > dateStr) return false;
    if(ev.recurring === "weekly") {
      return new Date(ev.date+"T12:00").getDay() === new Date(dateStr+"T12:00").getDay();
    }
    if(ev.recurring === "monthly") {
      return ev.date.slice(8) === dateStr.slice(8);
    }
    return false;
  };

  const eventsForDate = (dateStr) =>
    events.filter(ev => ev.date === dateStr || (ev.recurring !== "none" && isRecurringOnDay(ev, dateStr)));

  const selectedEvents = eventsForDate(selectedDate);

  const typeObj = (key) => SCHEDULE_TYPES.find(s => s.key === key) || SCHEDULE_TYPES[5];

  const openAdd = () => {
    setForm({ ...emptyForm, date: selectedDate });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setForm({ ...ev });
    setEditId(ev.id);
    setShowForm(true);
  };

  const saveEvent = () => {
    if(!form.title.trim() || !form.date) return;
    if(editId) {
      update({ schedule: events.map(e => e.id === editId ? { ...form, id: editId } : e) });
    } else {
      update({ schedule: [...events, { ...form, id: Date.now() }] });
    }
    setShowForm(false);
  };

  const deleteEvent = (id) => update({ schedule: events.filter(e => e.id !== id) });

  const MONTH_NAMES = t("cal_months",{returnObjects:true,defaultValue:["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"]});
  const DAY_SHORT   = t("cal_days_short",{returnObjects:true,defaultValue:["Lu","Ma","Mi","Jo","Vi","Sâ","Du"]});

  const upcomingCount = events.filter(ev => ev.date >= todayStr).length;

  const inputSt = { width:"100%", height:40, borderRadius:9, border:`1.5px solid ${T.border}`, padding:"0 12px", fontSize:13, color:T.text, outline:"none", boxSizing:"border-box", background:"#fff" };
  const labelSt = { fontSize:11, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:4 };

  return (
    <div data-testid="page-calendar" style={{maxWidth:680, margin:"0 auto", animation:"fadeIn 0.3s ease"}}>

      <Card style={{padding:"16px 18px 14px", marginBottom:12}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12}}>
          <button data-testid="cal-prev-month" onClick={()=>setCurMonth(new Date(year,month-1,1))} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:T.text2,display:"flex",alignItems:"center",justifyContent:"center"}}>◀</button>
          <div>
            <div style={{fontFamily:"Outfit,sans-serif",fontSize:17,fontWeight:800,color:T.text,textAlign:"center"}}>{MONTH_NAMES[month]} {year}</div>
            {upcomingCount>0 && <div style={{fontSize:11,color:T.green,fontWeight:700,textAlign:"center"}}>📅 {upcomingCount} {t("cal_upcoming_count","programări viitoare")}</div>}
          </div>
          <button data-testid="cal-next-month" onClick={()=>setCurMonth(new Date(year,month+1,1))} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:T.text2,display:"flex",alignItems:"center",justifyContent:"center"}}>▶</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
          {DAY_SHORT.map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.text3,padding:"3px 0"}}>{d}</div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {cells.map((d,i) => {
            if(!d) return <div key={i} style={{minHeight:44}}/>;
            const dateStr = toDateStr(d);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayEvs = eventsForDate(dateStr);
            return (
              <div key={i} onClick={()=>setSelectedDate(dateStr)} data-testid={`cal-day-${d}`} style={{
                borderRadius:9, padding:"5px 2px 4px", cursor:"pointer", minHeight:44, textAlign:"center",
                background: isSelected ? T.green : isToday ? "#f0fdf4" : "#fafaf9",
                border: isToday && !isSelected ? `2px solid ${T.green}` : `1.5px solid transparent`,
                transition:"all 0.15s",
              }}>
                <div style={{fontSize:12,fontWeight:isToday||isSelected?800:500,color:isSelected?"#fff":isToday?T.green:T.text,marginBottom:3}}>{d}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center"}}>
                  {dayEvs.slice(0,4).map((ev,j)=>(
                    <div key={j} style={{width:5,height:5,borderRadius:"50%",background:isSelected?"rgba(255,255,255,0.8)":typeObj(ev.type).color}}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10,padding:"0 2px"}}>
        {SCHEDULE_TYPES.map(tp=>(
          <div key={tp.key} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.text2}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:tp.color}}/>
            <span>{tp.icon} {tp.label}</span>
          </div>
        ))}
      </div>

      <Card style={{padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:14,fontWeight:700,color:T.text}}>
            {new Date(selectedDate+"T12:00").toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}
            {selectedDate === todayStr && <span style={{marginLeft:8,fontSize:11,padding:"2px 8px",borderRadius:20,background:T.green,color:"#fff",fontWeight:700}}>{t("home_today")}</span>}
          </div>
          <Btn data-testid="cal-add-event-btn" onClick={openAdd} color={T.green} size="sm">+ {t("cal_add","Adaugă")}</Btn>
        </div>

        {selectedEvents.length === 0 ? (
          <div style={{textAlign:"center",padding:"28px 0",color:T.text3}}>
            <div style={{fontSize:36,marginBottom:8}}>📭</div>
            <div style={{fontSize:13}}>{t("cal_no_events","Nicio programare în această zi")}</div>
            <div style={{fontSize:12,marginTop:4,color:T.text3}}>{t("cal_no_events_hint","Apasă + Adaugă pentru a programa o lucrare")}</div>
          </div>
        ) : selectedEvents.sort((a,b)=>a.time>b.time?1:-1).map(ev => {
          const tp = typeObj(ev.type);
          return (
            <div key={ev.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px",borderRadius:10,background:"#fafaf9",border:`1px solid ${T.border}`,marginBottom:8}}>
              <div style={{width:42,height:42,borderRadius:11,background:tp.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{tp.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:T.text,fontSize:14,marginBottom:2}}>{ev.title}</div>
                <div style={{fontSize:12,color:T.text2}}>
                  {ev.time && <span>🕐 {ev.time}</span>}
                  {ev.client && <span> · 👤 {ev.client}</span>}
                  {ev.location && <span> · 📍 {ev.location}</span>}
                </div>
                {ev.notes && <div style={{fontSize:11,color:T.text3,marginTop:3,fontStyle:"italic"}}>{ev.notes}</div>}
                <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:tp.color+"18",color:tp.color,fontWeight:700}}>{tp.icon} {tp.label}</span>
                  {ev.recurring!=="none" && <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#fef3c7",color:"#92400e",fontWeight:700}}>🔁 {ev.recurring==="weekly"?t("cal_weekly","Săptămânal"):t("cal_monthly","Lunar")}</span>}
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#ede9fe",color:"#5b21b6",fontWeight:700}}>⏰ -{ev.reminderMin}min</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <button onClick={()=>openEdit(ev)} data-testid={`cal-edit-${ev.id}`} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:`1px solid ${T.border}`,cursor:"pointer",background:"#fff",color:T.text2}}>✏️</button>
                <button onClick={()=>deleteEvent(ev.id)} data-testid={`cal-delete-${ev.id}`} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #fecaca",cursor:"pointer",background:"#fef2f2",color:"#dc2626"}}>🗑️</button>
              </div>
            </div>
          );
        })}
      </Card>

      {events.filter(ev=>ev.date>=todayStr&&ev.date>selectedDate).sort((a,b)=>a.date>b.date?1:a.time>b.time?1:-1).slice(0,5).length > 0 && (
        <Card style={{padding:"16px 18px",marginTop:12}}>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:14,fontWeight:700,color:T.text,marginBottom:10}}>📆 {t("cal_coming_soon","Urmează în curând")}</div>
          {events.filter(ev=>ev.date>=todayStr&&ev.date>selectedDate).sort((a,b)=>a.date>b.date?1:a.time>b.time?1:-1).slice(0,5).map(ev=>{
            const tp=typeObj(ev.type);
            const evDate=new Date(ev.date+"T12:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
            return (
              <div key={ev.id} onClick={()=>setSelectedDate(ev.date)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",borderRadius:9,cursor:"pointer",marginBottom:6,background:"#fafaf9",border:`1px solid ${T.border}`}}>
                <div style={{width:32,height:32,borderRadius:8,background:tp.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{tp.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</div>
                  <div style={{fontSize:11,color:T.text2}}>{evDate} {ev.time && `· ${ev.time}`} {ev.client && `· ${ev.client}`}</div>
                </div>
                <div style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:tp.color+"18",color:tp.color,fontWeight:700,flexShrink:0}}>{evDate}</div>
              </div>
            );
          })}
        </Card>
      )}

      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowForm(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"22px 18px 32px",width:"100%",maxWidth:500,maxHeight:"88vh",overflowY:"auto",animation:"slideUp 0.3s ease"}}>
            <div style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:800,color:T.text,marginBottom:14,textAlign:"center"}}>
              {editId ? `✏️ ${t("cal_edit_title","Editează programare")}` : `➕ ${t("cal_add_title","Programare nouă")}`}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
              {SCHEDULE_TYPES.map(tp=>(
                <div key={tp.key} onClick={()=>setForm(f=>({...f,type:tp.key}))} data-testid={`cal-type-${tp.key}`} style={{
                  padding:"9px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  background:form.type===tp.key?tp.color+"18":"#fafaf9",
                  border:form.type===tp.key?`2px solid ${tp.color}`:`1.5px solid ${T.border}`,
                  transition:"all 0.15s"
                }}>
                  <div style={{fontSize:22}}>{tp.icon}</div>
                  <div style={{fontSize:10,fontWeight:700,color:form.type===tp.key?tp.color:T.text2,marginTop:2}}>{tp.label}</div>
                </div>
              ))}
            </div>

            {[
              {label:t("cal_f_title","Titlu / Descriere *"), key:"title", ph:t("cal_f_title_ph","ex: Tuns gazon la Vila Ionescu")},
              {label:t("cal_f_client","Client / Proprietar"), key:"client", ph:t("cal_f_client_ph","ex: Familia Popescu")},
              {label:t("cal_f_location","Adresă / Locație"), key:"location", ph:t("cal_f_location_ph","ex: Str. Rozelor 12, Cluj")},
              {label:t("cal_f_notes","Note"), key:"notes", ph:t("cal_f_notes_ph","Detalii suplimentare...")},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <label style={labelSt}>{f.label}</label>
                <input data-testid={`cal-form-${f.key}`} value={form[f.key]||""} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))} placeholder={f.ph} style={inputSt}/>
              </div>
            ))}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={labelSt}>Data *</label>
                <input data-testid="cal-form-date" type="date" value={form.date} onChange={e=>setForm(v=>({...v,date:e.target.value}))} style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>Ora</label>
                <input data-testid="cal-form-time" type="time" value={form.time} onChange={e=>setForm(v=>({...v,time:e.target.value}))} style={inputSt}/>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              <div>
                <label style={labelSt}>{t("cal_recurring","Recurență")}</label>
                <select data-testid="cal-form-recurring" value={form.recurring} onChange={e=>setForm(v=>({...v,recurring:e.target.value}))} style={{...inputSt}}>
                  <option value="none">{t("cal_once","O singură dată")}</option>
                  <option value="weekly">{t("cal_weekly","Săptămânal")} 🔁</option>
                  <option value="monthly">{t("cal_monthly","Lunar")} 🔁</option>
                </select>
              </div>
              <div>
                <label style={labelSt}>{t("cal_reminder","Alertă înainte")}</label>
                <select data-testid="cal-form-reminder" value={form.reminderMin} onChange={e=>setForm(v=>({...v,reminderMin:parseInt(e.target.value)}))} style={{...inputSt}}>
                  <option value={15}>15 {t("cal_min","minute")}</option>
                  <option value={30}>30 {t("cal_min","minute")}</option>
                  <option value={60}>1 {t("cal_hour","oră")}</option>
                  <option value={120}>2 {t("cal_hours","ore")}</option>
                  <option value={1440}>1 {t("cal_day_before","zi înainte")}</option>
                </select>
              </div>
            </div>

            <Btn data-testid="cal-save-event-btn" onClick={saveEvent} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg" disabled={!form.title?.trim()||!form.date}>
              {editId ? `💾 ${t("cal_save","Salvează modificările")}` : `✅ ${t("cal_add_event","Adaugă programare")}`}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

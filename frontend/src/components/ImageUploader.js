import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const T = {
  green:"#059669", border:"#e7e5e4", text:"#1c1917",
  text2:"#57534e", text3:"#a8a29e", red:"#ef4444", bg:"#fafaf9",
};

// Comprima o imagine la maxWidth si calitate data, returneaza base64
function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", quality);
        // Daca inca e prea mare, comprima mai mult
        if (base64.length > 500000) {
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        } else {
          resolve(base64);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Avatar uploader — poza de profil rotunda ─────────────────
export function AvatarUploader({ current, onSave, size = 80 }) {
  const { t } = useTranslation("t");
  const [preview, setPreview] = useState(current || "");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setLoading(true);
    try {
      const base64 = await compressImage(file, 400, 0.88);
      setPreview(base64);
      onSave(base64);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      {/* Avatar */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width:size, height:size, borderRadius:"50%",
          background: preview ? "transparent" : `${T.green}22`,
          border:`2.5px solid ${preview ? T.green : T.border}`,
          overflow:"hidden", cursor:"pointer", position:"relative",
          transition:"all 0.2s",
        }}
      >
        {preview
          ? <img src={preview} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.4, color:T.text3 }}>👤</div>
        }
        {/* Overlay hover */}
        <div style={{
          position:"absolute", inset:0, background:"rgba(0,0,0,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center",
          opacity:0, transition:"opacity 0.2s", borderRadius:"50%",
          fontSize:size*0.25, color:"#fff",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
        >
          {loading ? "⏳" : "📷"}
        </div>
      </div>

      {/* Badge edit */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          position:"absolute", bottom:2, right:2,
          width:size*0.3, height:size*0.3, borderRadius:"50%",
          background:T.green, border:"2px solid #fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:size*0.14, cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.2)",
        }}
      >📷</div>

      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile}/>
    </div>
  );
}

// ── Gallery uploader — max N imagini pentru job ───────────────
export function GalleryUploader({ images = [], onChange, maxImages = 5 }) {
  const { t } = useTranslation("t");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const addFiles = async (files) => {
    const remaining = maxImages - images.length;
    if (remaining <= 0) return;
    setLoading(true);
    try {
      const selected = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, remaining);
      const compressed = await Promise.all(selected.map(f => compressImage(f, 1200, 0.82)));
      onChange([...images, ...compressed]);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div>
      {/* Imagini existente */}
      {images.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position:"relative", width:80, height:80, borderRadius:10, overflow:"hidden", border:`1.5px solid ${T.border}` }}>
              <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              <button
                type="button"
                onClick={() => removeImage(i)}
                style={{
                  position:"absolute", top:3, right:3,
                  width:20, height:20, borderRadius:"50%",
                  background:"rgba(0,0,0,0.65)", border:"none", color:"#fff",
                  fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1,
                }}
              >✕</button>
              {i === 0 && (
                <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(5,150,105,0.85)", fontSize:9, color:"#fff", fontWeight:700, textAlign:"center", padding:"2px 0" }}>
                  {t("upload_cover","Copertă")}
                </div>
              )}
            </div>
          ))}

          {/* Slot adauga */}
          {images.length < maxImages && (
            <div
              onClick={() => inputRef.current?.click()}
              style={{
                width:80, height:80, borderRadius:10,
                border:`2px dashed ${T.border}`, background:T.bg,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                cursor:"pointer", fontSize:22, color:T.text3, gap:2, transition:"all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.color = T.green; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text3; }}
            >
              {loading ? "⏳" : "+"}
              <span style={{ fontSize:8, fontWeight:600 }}>{t("upload_add","Adaugă")}</span>
            </div>
          )}
        </div>
      )}

      {/* Drop zone daca nu sunt imagini */}
      {images.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          style={{
            border:`2px dashed ${dragOver ? T.green : T.border}`,
            borderRadius:12, padding:"24px 16px",
            textAlign:"center", cursor:"pointer", background: dragOver ? `${T.green}08` : T.bg,
            transition:"all 0.2s",
          }}
        >
          <div style={{ fontSize:32, marginBottom:6 }}>{loading ? "⏳" : "🖼️"}</div>
          <div style={{ fontSize:13, fontWeight:600, color:T.text2, marginBottom:2 }}>
            {loading ? t("upload_processing","Se procesează...") : t("upload_click_or_drag","Click sau trage poze aici")}
          </div>
          <div style={{ fontSize:11, color:T.text3 }}>
            {t("upload_max","Max")} {maxImages} {t("upload_photos","poze")} · JPG, PNG · {t("upload_auto_compress","compresie automată")}
          </div>
        </div>
      )}

      <input
        ref={inputRef} type="file" accept="image/*" multiple
        style={{ display:"none" }}
        onChange={e => addFiles(e.target.files)}
      />
    </div>
  );
}

// ── Chat image sender ─────────────────────────────────────────
export function ChatImagePicker({ onImage }) {
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const base64 = await compressImage(file, 800, 0.85);
    onImage(base64);
    e.target.value = "";
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Trimite o poză"
        style={{
          width:36, height:36, borderRadius:9, border:"none",
          background:"transparent", cursor:"pointer", fontSize:20,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#64748b", transition:"color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = T.green}
        onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
      >🖼️</button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile}/>
    </>
  );
}

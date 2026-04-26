import { useState } from 'react';

// Design tokens
const T = {
  dark: "#0f172a",
  dark2: "#1e293b",
  dark3: "#334155",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  text2: "#cbd5e1",
  text3: "#94a3b8",
  green: "#059669",
  greenLight: "#34d399",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f59e0b",
};

const CATEGORIES = [
  { key: "construcción", label: "Construcción & Reformas", icon: "🏗️", color: "#f59e0b" },
  { key: "limpieza", label: "Limpieza", icon: "🧹", color: "#10b981" },
  { key: "cuidado", label: "Cuidado de Personas", icon: "👶", color: "#ec4899" },
  { key: "mascotas", label: "Mascotas", icon: "🐕", color: "#8b5cf6" },
  { key: "jardinería", label: "Jardines & Exterior", icon: "🌳", color: "#22c55e" },
  { key: "transporte", label: "Transporte & Entregas", icon: "🚚", color: "#ef4444" },
  { key: "it", label: "IT & Digital", icon: "💻", color: "#3b82f6" },
  { key: "educación", label: "Educación & Cursos", icon: "📚", color: "#f97316" },
  { key: "gastronomía", label: "Gastronomía", icon: "🍳", color: "#eab308" },
  { key: "belleza", label: "Belleza & Bienestar", icon: "💅", color: "#d946ef" },
  { key: "reparaciones", label: "Reparaciones & Servicio", icon: "🔧", color: "#64748b" },
  { key: "eventos", label: "Eventos & Entretenimiento", icon: "🎉", color: "#06b6d4" },
];

export default function AdvancedSearch({ filters, onFilterChange, onClose }) {
  const [localFilters, setLocalFilters] = useState({
    category: filters?.category || '',
    type: filters?.type || '',
    salaryMin: filters?.salaryMin || '',
    salaryMax: filters?.salaryMax || '',
    distance: filters?.distance || 50,
    urgent: filters?.urgent || false,
    verified: filters?.verified || false,
    sortBy: filters?.sortBy || 'newest',
  });

  const handleChange = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      category: '',
      type: '',
      salaryMin: '',
      salaryMax: '',
      distance: 50,
      urgent: false,
      verified: false,
      sortBy: 'newest',
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFiltersCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === 'distance') return value !== 50;
    if (key === 'sortBy') return value !== 'newest';
    return value && value !== '';
  }).length;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: T.dark, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 600,
          maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>
              🔍 Căutare avansată
            </h2>
            {activeFiltersCount > 0 && (
              <span style={{ fontSize: 12, color: T.green }}>{activeFiltersCount} filtre active</span>
            )}
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: 24, color: T.text3, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Category */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 10 }}>
              Categorie
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
              <button
                onClick={() => handleChange('category', '')}
                style={{
                  padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: !localFilters.category ? T.green : T.dark3,
                  border: 'none', color: '#fff', cursor: 'pointer',
                }}
              >
                Toate
              </button>
              {CATEGORIES.slice(0, 8).map(cat => (
                <button
                  key={cat.key}
                  onClick={() => handleChange('category', cat.key)}
                  style={{
                    padding: '10px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: localFilters.category === cat.key ? `${cat.color}33` : T.dark3,
                    border: localFilters.category === cat.key ? `2px solid ${cat.color}` : '2px solid transparent',
                    color: localFilters.category === cat.key ? cat.color : T.text2,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <span>{cat.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Job Type */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 10 }}>
              Tip program
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: '', label: 'Oricare' },
                { value: 'part-time', label: 'Part-time' },
                { value: 'full-time', label: 'Full-time' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChange('type', opt.value)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: localFilters.type === opt.value ? T.blue : T.dark3,
                    border: 'none', color: '#fff', cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Salary Range */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 10 }}>
              Salariu (EUR)
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="number"
                placeholder="Min"
                value={localFilters.salaryMin}
                onChange={e => handleChange('salaryMin', e.target.value)}
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 14,
                  background: T.dark3, border: `1px solid ${T.border}`, color: T.text,
                  outline: 'none',
                }}
              />
              <span style={{ color: T.text3 }}>—</span>
              <input
                type="number"
                placeholder="Max"
                value={localFilters.salaryMax}
                onChange={e => handleChange('salaryMax', e.target.value)}
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 14,
                  background: T.dark3, border: `1px solid ${T.border}`, color: T.text,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Distance */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 10 }}>
              Distanță maximă: <span style={{ color: T.green }}>{localFilters.distance} km</span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={localFilters.distance}
              onChange={e => handleChange('distance', parseInt(e.target.value))}
              style={{
                width: '100%', accentColor: T.green, height: 6,
                background: T.dark3, borderRadius: 3,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text3, marginTop: 4 }}>
              <span>5 km</span>
              <span>50 km</span>
              <span>100 km</span>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 10 }}>
              Opțiuni suplimentare
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: T.dark3, borderRadius: 10, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={localFilters.urgent}
                  onChange={e => handleChange('urgent', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: T.orange }}
                />
                <span style={{ fontSize: 14, color: T.text }}>🔥 Doar joburi urgente</span>
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: T.dark3, borderRadius: 10, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={localFilters.verified}
                  onChange={e => handleChange('verified', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: T.green }}
                />
                <span style={{ fontSize: 14, color: T.text }}>✓ Doar angajatori verificați</span>
              </label>
            </div>
          </div>

          {/* Sort By */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 10 }}>
              Sortează după
            </label>
            <select
              value={localFilters.sortBy}
              onChange={e => handleChange('sortBy', e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
                background: T.dark3, border: `1px solid ${T.border}`, color: T.text,
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="newest">Cele mai noi</option>
              <option value="salary_high">Salariu (descrescător)</option>
              <option value="salary_low">Salariu (crescător)</option>
              <option value="distance">Distanță</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 12,
        }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.text2, cursor: 'pointer',
            }}
          >
            Resetează
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 2, padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: `linear-gradient(135deg, ${T.green}, #047857)`,
              border: 'none', color: '#fff', cursor: 'pointer',
              boxShadow: `0 4px 16px ${T.green}44`,
            }}
          >
            Aplică filtrele
          </button>
        </div>
      </div>
    </div>
  );
}

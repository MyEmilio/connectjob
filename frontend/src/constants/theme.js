// ── Design tokens ─────────────────────────────────────────────
export const T = {
  green:  "#059669", greenDark:"#047857", greenLight:"#34d399",
  amber:  "#f59e0b", amberDark:"#d97706",
  blue:   "#3b82f6", blueDark:"#1d4ed8",
  purple: "#8b5cf6", pink:"#ec4899",
  red:    "#ef4444", orange:"#ea580c",
  dark:   "#0f172a", dark2:"#1e293b", dark3:"#334155",
  text:   "#1c1917", text2:"#57534e", text3:"#a8a29e",
  border: "#e7e5e4", bg:"#fafaf9", white:"#ffffff",
};

// ── Categorii OLX-style ───────────────────────────────────────
export const CATEGORIES = [
  { key:"constructii",  icon:"\u{1F3D7}\uFE0F",  label:"Constructii & Renovari",    color:"#ea580c", sub:["Zidarie","Zugravit","Instalatii","Tamplarie","Electricitate","Sanitare","Gresie"] },
  { key:"curatenie",    icon:"\u{1F9F9}",  label:"Curatenie",                 color:"#059669", sub:["Casnic","Birouri","Piscine","Geamuri","Post-constructie","Mochete"] },
  { key:"ingrijire",    icon:"\u{1F931}",  label:"Ingrijire Persoane",        color:"#ec4899", sub:["Baby-sitting","Varstnici","Persoane cu dizabilitati","Au pair"] },
  { key:"animale",      icon:"\u{1F43E}",  label:"Animale de companie",       color:"#7c3aed", sub:["Plimbare","Ingrijire","Dresaj","Pet-sitting","Veterinar"] },
  { key:"gradina",      icon:"\u{1F33F}",  label:"Gradini & Exterior",        color:"#16a34a", sub:["Tuns gazon","Plantat","Irigatii","Taiat arbori","Design gradina"] },
  { key:"transport",    icon:"\u{1F697}",  label:"Transport & Livrari",       color:"#3b82f6", sub:["Livrari colete","Taxi","Sofer personal","Mutari","Curierat"] },
  { key:"it",           icon:"\u{1F4BB}",  label:"IT & Digital",              color:"#6366f1", sub:["Web & App","Reparatii PC","Retele","SEO","Social Media","Design"] },
  { key:"educatie",     icon:"\u{1F4DA}",  label:"Educatie & Cursuri",        color:"#f59e0b", sub:["Meditatii","Limbi straine","Muzica","Sport & Fitness","Arte"] },
  { key:"gastronomie",  icon:"\u{1F468}\u200D\u{1F373}", label:"Gastronomie",               color:"#ef4444", sub:["Bucatar","Ospatar","Catering","Barman","Patiserie"] },
  { key:"frumusete",    icon:"\u{1F485}",  label:"Frumusete & Wellness",      color:"#db2777", sub:["Coafor","Estetica","Manichiura","Masaj","Make-up"] },
  { key:"reparatii",    icon:"\u{1F527}",  label:"Reparatii & Service",       color:"#92400e", sub:["Auto","Electrocasnice","Mobilier","Calculatoare","Ceasuri"] },
  { key:"evenimente",   icon:"\u{1F389}",  label:"Evenimente & Divertisment", color:"#0891b2", sub:["Fotograf","Videograf","Muzician","Animator","Organizator"] },
];

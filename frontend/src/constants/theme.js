// ConnectJob — Design tokens (colors only, NO text)
export const T = {
  green:"#059669", greenDark:"#047857", greenLight:"#34d399",
  blue:"#3b82f6", blueDark:"#2563eb",
  amber:"#f59e0b", amberDark:"#d97706",
  purple:"#7c3aed",
  red:"#ef4444",
  dark:"#1c1917", dark2:"#292524",
  text:"#1c1917", text2:"#57534e", text3:"#a8a29e",
  border:"#e7e5e4", bg:"#fafaf9", white:"#fff",
};

// Categories — keys only, labels come from i18n
export const CATEGORIES = [
  { key:"constructii",  icon:"\u{1F3D7}\uFE0F", color:"#ea580c", subKeys:["sub_masonry","sub_painting","sub_plumbing","sub_carpentry","sub_electrical","sub_sanitary","sub_tiling"] },
  { key:"curatenie",    icon:"\u{1F9F9}",        color:"#059669", subKeys:["sub_domestic","sub_offices","sub_pools","sub_windows","sub_post_construction","sub_carpets"] },
  { key:"ingrijire",    icon:"\u{1F931}",         color:"#ec4899", subKeys:["sub_babysitting","sub_elderly","sub_disabled","sub_au_pair"] },
  { key:"animale",      icon:"\u{1F43E}",         color:"#7c3aed", subKeys:["sub_walking","sub_care","sub_training","sub_pet_sitting","sub_vet"] },
  { key:"gradina",      icon:"\u{1F33F}",         color:"#16a34a", subKeys:["sub_lawn","sub_planting","sub_irrigation","sub_tree_cutting","sub_garden_design"] },
  { key:"transport",    icon:"\u{1F697}",         color:"#3b82f6", subKeys:["sub_delivery","sub_taxi","sub_driver","sub_moving","sub_courier"] },
  { key:"it",           icon:"\u{1F4BB}",         color:"#6366f1", subKeys:["sub_web_app","sub_pc_repair","sub_networks","sub_seo","sub_social_media","sub_design"] },
  { key:"educatie",     icon:"\u{1F4DA}",         color:"#f59e0b", subKeys:["sub_tutoring","sub_languages","sub_music","sub_sports","sub_arts"] },
  { key:"gastronomie",  icon:"\u{1F468}\u200D\u{1F373}", color:"#ef4444", subKeys:["sub_chef","sub_waiter","sub_catering","sub_bartender","sub_pastry"] },
  { key:"frumusete",    icon:"\u{1F485}",         color:"#db2777", subKeys:["sub_hairdresser","sub_aesthetics","sub_manicure","sub_massage","sub_makeup"] },
  { key:"reparatii",    icon:"\u{1F527}",         color:"#92400e", subKeys:["sub_auto","sub_appliances","sub_furniture","sub_computers","sub_watches"] },
  { key:"evenimente",   icon:"\u{1F389}",         color:"#0891b2", subKeys:["sub_photographer","sub_videographer","sub_musician","sub_animator","sub_organizer"] },
];

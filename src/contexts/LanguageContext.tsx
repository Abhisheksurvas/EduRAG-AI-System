import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LanguageOption {
  id: string;
  label: string;
  native: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'English', label: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'Hindi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { id: 'Marathi', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { id: 'Tamil', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { id: 'Telugu', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { id: 'Gujarati', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { id: 'Bengali', label: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { id: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { id: 'Malayalam', label: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { id: 'Urdu', label: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { id: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { id: 'Odia', label: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { id: 'Spanish', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { id: 'French', label: 'French', native: 'Français', flag: '🇫🇷' },
  { id: 'German', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { id: 'auto', label: 'Auto Detect (Defaults to English)', native: 'Auto', flag: '🌐' },
];

export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.aiAssistant': 'AI Study Assistant (RAG)',
    'nav.notes': 'Notes Generator',
    'nav.quiz': 'Quiz Center',
    'nav.notifications': 'Notifications',
    'nav.profile': 'Student Profile',
    'nav.signOut': 'Sign Out',
    'nav.searchPlaceholder': 'Search courses, notes, quizzes...',
    'nav.searchShortcut': 'Ctrl+K',
    'nav.mongoConnected': 'MongoDB Atlas',
    'nav.mongoConfig': 'Mongo Config',
    'nav.allNotifications': 'Notifications',
    'nav.readAll': 'Read all',
    'nav.clearAll': 'Clear All',
    'nav.viewAllNotifications': 'View all in Notifications page →',
    'nav.noNotifications': 'No notifications',
    'nav.allCaughtUp': "You're all caught up!",
    'nav.language': 'Language',
    'nav.selectLanguage': 'Select Language',
    'nav.customLanguage': 'Other Language',
    'nav.customPlaceholder': 'Type language (e.g. Sanskrit, Japanese)...',
    'nav.apply': 'Apply',
    // Page titles & subtitles
    'title.dashboard': 'Student Dashboard',
    'subtitle.dashboard': 'Overview of uploaded materials, generated notes, and RAG chats.',
    'title.aiAssistant': 'AI Study Assistant',
    'subtitle.aiAssistant': 'Multilingual RAG exam answers for 4, 6 & 8 marks strictly based on uploaded materials.',
    'title.notes': 'Notes Generator',
    'subtitle.notes': 'Synthesize flashcards, takeaways, and revision guides from your materials.',
    'title.quiz': 'Quiz Center',
    'subtitle.quiz': 'Generate and take dynamic MCQs verified against your study documents.',
    'title.notifications': 'Notifications',
    'subtitle.notifications': 'Live system alerts, document readiness, and quiz completion updates.',
    'title.profile': 'Student Profile',
    'subtitle.profile': 'Manage your academic details, branch specialization, and study goals.',
    // AI Assistant
    'assistant.examAnswerMode': 'University Exam Mode',
    'assistant.marks': 'Marks',
    'assistant.marks4': '4 Marks (Concise)',
    'assistant.marks6': '6 Marks (Detailed)',
    'assistant.marks8': '8 Marks (Comprehensive)',
    'assistant.studyMaterialSource': 'Study Material Grounded',
    'assistant.aiKnowledge': 'AI General Knowledge',
    'assistant.verifiedCitations': 'Verified Source Citations',
    'assistant.page': 'Page',
    'assistant.regenerate': 'Regenerate',
    'assistant.copyAnswer': 'Copy Answer',
    'assistant.copied': 'Copied to clipboard!',
    'assistant.changeLanguage': 'Change Output Language',
    'assistant.askPlaceholder': 'Ask any exam question or topic in any language...',
    'assistant.send': 'Send',
    'assistant.newChat': 'New Chat',
    'assistant.chatHistory': 'Chat History',
    'assistant.attachedDocument': 'Attached Study Document',
    'assistant.attachDocument': 'Attach Document',
    'assistant.bothAnswers': 'Dual Verified Comparison',
  },
  Hindi: {
    // Navigation
    'nav.dashboard': 'डैशबोर्ड',
    'nav.aiAssistant': 'एआई अध्ययन सहायक (RAG)',
    'nav.notes': 'नोट्स जनरेटर',
    'nav.quiz': 'क्विज़ केंद्र',
    'nav.notifications': 'सूचनाएं',
    'nav.profile': 'विद्यार्थी प्रोफ़ाइल',
    'nav.signOut': 'साइन आउट',
    'nav.searchPlaceholder': 'कोर्स, नोट्स, क्विज़ खोजें...',
    'nav.searchShortcut': 'Ctrl+K',
    'nav.mongoConnected': 'मोंगोडीबी एटलस',
    'nav.mongoConfig': 'मोंगो सेटिंग्स',
    'nav.allNotifications': 'सूचनाएं',
    'nav.readAll': 'सभी पढ़ें',
    'nav.clearAll': 'सभी हटाएं',
    'nav.viewAllNotifications': 'सूचना पृष्ठ पर सभी देखें →',
    'nav.noNotifications': 'कोई नई सूचना नहीं',
    'nav.allCaughtUp': 'आप पूरी तरह अपडेट हैं!',
    'nav.language': 'भाषा',
    'nav.selectLanguage': 'भाषा चुनें',
    'nav.customLanguage': 'अन्य भाषा',
    'nav.customPlaceholder': 'भाषा लिखें (जैसे संस्कृत, जापानी)...',
    'nav.apply': 'लागू करें',
    // Page titles & subtitles
    'title.dashboard': 'विद्यार्थी डैशबोर्ड',
    'subtitle.dashboard': 'अपलोड की गई अध्ययन सामग्री, तैयार नोट्स और RAG चैट का अवलोकन।',
    'title.aiAssistant': 'एआई अध्ययन सहायक',
    'subtitle.aiAssistant': 'अध्ययन सामग्री पर आधारित 4, 6 और 8 अंकों के विश्वविद्यालय परीक्षा उत्तर बहुभाषी रूप में।',
    'title.notes': 'नोट्स जनरेटर',
    'subtitle.notes': 'अपनी अध्ययन सामग्री से फ्लैशकार्ड और रिवीजन गाइड तैयार करें।',
    'title.quiz': 'क्विज़ केंद्र',
    'subtitle.quiz': 'सत्यापित अध्ययन दस्तावेजों से बहुविकल्पीय प्रश्न (MCQ) बनाएं और हल करें।',
    'title.notifications': 'सूचनाएं',
    'subtitle.notifications': 'दस्तावेज़ तत्परता और क्विज़ पूर्णता अलर्ट।',
    'title.profile': 'विद्यार्थी प्रोफ़ाइल',
    'subtitle.profile': 'अपनी शैक्षणिक जानकारी और अध्ययन लक्ष्य प्रबंधित करें।',
    // AI Assistant
    'assistant.examAnswerMode': 'विश्वविद्यालय परीक्षा मोड',
    'assistant.marks': 'अंक',
    'assistant.marks4': '4 अंक (संक्षिप्त)',
    'assistant.marks6': '6 अंक (विस्तृत)',
    'assistant.marks8': '8 अंक (व्यापक)',
    'assistant.studyMaterialSource': 'अध्ययन सामग्री पर आधारित',
    'assistant.aiKnowledge': 'एआई सामान्य ज्ञान',
    'assistant.verifiedCitations': 'सत्यापित स्रोत संदर्भ',
    'assistant.page': 'पृष्ठ',
    'assistant.regenerate': 'पुनः उत्पन्न करें',
    'assistant.copyAnswer': 'उत्तर कॉपी करें',
    'assistant.copied': 'क्लिपबोर्ड पर कॉपी किया गया!',
    'assistant.changeLanguage': 'आउटपुट भाषा बदलें',
    'assistant.askPlaceholder': 'किसी भी भाषा में परीक्षा प्रश्न या विषय पूछें...',
    'assistant.send': 'भेजें',
    'assistant.newChat': 'नई चैट',
    'assistant.chatHistory': 'चैट इतिहास',
    'assistant.attachedDocument': 'संलग्न अध्ययन दस्तावेज़',
    'assistant.attachDocument': 'दस्तावेज़ जोड़ें',
    'assistant.bothAnswers': 'दोहरी सत्यापित तुलना',
  },
  Marathi: {
    // Navigation
    'nav.dashboard': 'डॅशबोर्ड',
    'nav.aiAssistant': 'एआय अभ्यास सहाय्यक (RAG)',
    'nav.notes': 'नोट्स जनरेटर',
    'nav.quiz': 'क्विझ केंद्र',
    'nav.notifications': 'सूचना',
    'nav.profile': 'विद्यार्थी प्रोफाइल',
    'nav.signOut': 'साइन आउट करा',
    'nav.searchPlaceholder': 'अभ्यासक्रम, नोट्स, क्विझ शोधा...',
    'nav.searchShortcut': 'Ctrl+K',
    'nav.mongoConnected': 'मोंगोडीबी अ‍ॅटलस',
    'nav.mongoConfig': 'मोंगो कॉन्फिगरेशन',
    'nav.allNotifications': 'सूचना',
    'nav.readAll': 'सर्व वाचा',
    'nav.clearAll': 'सर्व हटवा',
    'nav.viewAllNotifications': 'सूचना पृष्ठावर सर्व पहा →',
    'nav.noNotifications': 'कोणतीही सूचना नाही',
    'nav.allCaughtUp': 'सर्व अद्ययावत आहे!',
    'nav.language': 'भाषा',
    'nav.selectLanguage': 'भाषा निवडा',
    'nav.customLanguage': 'इतर भाषा',
    'nav.customPlaceholder': 'भाषा टाईप करा (उदा. संस्कृत, जपानी)...',
    'nav.apply': 'लागू करा',
    // Page titles & subtitles
    'title.dashboard': 'विद्यार्थी डॅशबोर्ड',
    'subtitle.dashboard': 'अपलोड केलेले साहित्य, तयार केलेल्या नोट्स आणि RAG चॅटचे विहंगावलोकन.',
    'title.aiAssistant': 'एआय अभ्यास सहाय्यक',
    'subtitle.aiAssistant': 'अभ्यास साहित्यावर आधारित 4, 6 आणि 8 गुणांसाठी विद्यापीठ परीक्षा उत्तरे बहुभाषिक स्वरूपात.',
    'title.notes': 'नोट्स जनरेटर',
    'subtitle.notes': 'तुमच्या अभ्यास साहित्यातून फ्लॅशकार्ड आणि उजळणी मार्गदर्शक तयार करा.',
    'title.quiz': 'क्विझ केंद्र',
    'subtitle.quiz': 'सत्यापित अभ्यास दस्तऐवजांवर आधारित बहुपर्यायी प्रश्न सोडवा.',
    'title.notifications': 'सूचना',
    'subtitle.notifications': 'दस्तऐवज तयारी आणि क्विझ पूर्णता सूचना.',
    'title.profile': 'विद्यार्थी प्रोफाइल',
    'subtitle.profile': 'तुमचा शैक्षणिक तपशील आणि अभ्यास उद्दिष्टे व्यवस्थापित करा.',
    // AI Assistant
    'assistant.examAnswerMode': 'विद्यापीठ परीक्षा मोड',
    'assistant.marks': 'गुण',
    'assistant.marks4': '4 गुण (संक्षिप्त)',
    'assistant.marks6': '6 गुण (सविस्तर)',
    'assistant.marks8': '8 गुण (संपूर्ण सविस्तर)',
    'assistant.studyMaterialSource': 'अभ्यास साहित्यावर आधारित',
    'assistant.aiKnowledge': 'एआय सामान्य ज्ञान',
    'assistant.verifiedCitations': 'सत्यापित संदर्भ व पृष्ठे',
    'assistant.page': 'पान',
    'assistant.regenerate': 'पुन्हा तयार करा',
    'assistant.copyAnswer': 'उत्तर कॉपी करा',
    'assistant.copied': 'क्लिपबोर्डवर कॉपी झाले!',
    'assistant.changeLanguage': 'उत्तराची भाषा बदला',
    'assistant.askPlaceholder': 'कोणत्याही भाषेत परीक्षेचा प्रश्न किंवा विषय विचारा...',
    'assistant.send': 'पाठवा',
    'assistant.newChat': 'नवीन संभाषण',
    'assistant.chatHistory': 'संभाषण इतिहास',
    'assistant.attachedDocument': 'जोडलेले अभ्यास दस्तऐवज',
    'assistant.attachDocument': 'दस्तऐवज जोडा',
    'assistant.bothAnswers': 'दुहेरी तुलना',
  },
  Tamil: {
    'nav.dashboard': 'டாஷ்போர்டு',
    'nav.aiAssistant': 'AI படிப்பு உதவியாளர்',
    'nav.notes': 'குறிப்புகள் ஜெனரேட்டர்',
    'nav.quiz': 'வினாடி வினா மையம்',
    'nav.notifications': 'அறிவிப்புகள்',
    'nav.profile': 'மாணவர் விவரம்',
    'nav.signOut': 'வெளியேறு',
    'nav.searchPlaceholder': 'பாடங்கள், குறிப்புகள், வினாடி வினா தேடவும்...',
    'nav.language': 'மொழி',
    'nav.selectLanguage': 'மொழியைத் தேர்ந்தெடுக்கவும்',
    'title.dashboard': 'மாணவர் டாஷ்போர்டு',
    'title.aiAssistant': 'AI படிப்பு உதவியாளர்',
    'assistant.marks': 'மதிப்பெண்கள்',
    'assistant.regenerate': 'மீண்டும் உருவாக்கு',
    'assistant.copyAnswer': 'பதிலை நகலெடு',
    'assistant.askPlaceholder': 'எந்த மொழியிலும் தேர்வு கேள்வியைக் கேளுங்கள்...',
    'assistant.send': 'அனுப்பு',
  },
  Telugu: {
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.aiAssistant': 'AI స్టడీ అసిస్టెంట్',
    'nav.notes': 'నోట్స్ జెనరేటర్',
    'nav.quiz': 'క్విజ్ కేంద్రం',
    'nav.notifications': 'నోటిఫికేషన్‌లు',
    'nav.profile': 'స్టూడెంట్ ప్రొఫైల్',
    'nav.signOut': 'సైన్ అవుట్',
    'nav.searchPlaceholder': 'కోర్సులు, నోట్స్, క్విజ్‌లు శోధించండి...',
    'nav.language': 'భాష',
    'nav.selectLanguage': 'భాషను ఎంచుకోండి',
    'title.dashboard': 'స్టూడెంట్ డాష్‌బోర్డ్',
    'title.aiAssistant': 'AI స్టడీ అసిస్టెంట్',
    'assistant.marks': 'మార్కులు',
    'assistant.regenerate': 'మళ్లీ రూపొందించు',
    'assistant.copyAnswer': 'సమాధానం కాపీ చేయండి',
    'assistant.askPlaceholder': 'ఏ భాషలోనైనా పరీక్ష ప్రశ్నను అడగండి...',
    'assistant.send': 'పంపు',
  },
  Gujarati: {
    'nav.dashboard': 'ડેશબોર્ડ',
    'nav.aiAssistant': 'AI અભ્યાસ સહાયક',
    'nav.notes': 'નોટ્સ જનરેટર',
    'nav.quiz': 'ક્વિઝ કેન્દ્ર',
    'nav.notifications': 'સૂચનાઓ',
    'nav.profile': 'વિદ્યાર્થી પ્રોફાઇલ',
    'nav.signOut': 'સાઇન આઉટ',
    'nav.searchPlaceholder': 'અભ્યાસક્રમો, નોટ્સ, ક્વિઝ શોધો...',
    'nav.language': 'ભાષા',
    'nav.selectLanguage': 'ભાષા પસંદ કરો',
    'title.dashboard': 'વિદ્યાર્થી ડેશબોર્ડ',
    'title.aiAssistant': 'AI અભ્યાસ સહાયક',
    'assistant.marks': 'ગુણ',
    'assistant.regenerate': 'ફરીથી બનાવો',
    'assistant.copyAnswer': 'જવાબ કોપી કરો',
    'assistant.askPlaceholder': 'કોઈપણ ભાષામાં પરીક્ષા પ્રશ્ન પૂછો...',
    'assistant.send': 'મોકલો',
  },
  Bengali: {
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.aiAssistant': 'AI স্টাডি অ্যাসিস্ট্যান্ট',
    'nav.notes': 'নোটস জেনারেটর',
    'nav.quiz': 'কুইজ সেন্টার',
    'nav.notifications': 'বিজ্ঞপ্তি',
    'nav.profile': 'শিক্ষার্থী প্রোফাইল',
    'nav.signOut': 'সাইন আউট',
    'nav.searchPlaceholder': 'কোর্স, নোট, কুইজ অনুসন্ধান করুন...',
    'nav.language': 'ভাষা',
    'nav.selectLanguage': 'ভাষা নির্বাচন করুন',
    'title.dashboard': 'শিক্ষার্থী ড্যাশবোর্ড',
    'title.aiAssistant': 'AI স্টাডি অ্যাসিস্ট্যান্ট',
    'assistant.marks': 'নম্বর',
    'assistant.regenerate': 'পুনরায় তৈরি করুন',
    'assistant.copyAnswer': 'উত্তর কপি করুন',
    'assistant.askPlaceholder': 'যেকোনো ভাষায় পরীক্ষার প্রশ্ন জিজ্ঞাসা করুন...',
    'assistant.send': 'পাঠান',
  },
  Spanish: {
    'nav.dashboard': 'Panel Principal',
    'nav.aiAssistant': 'Asistente de Estudio IA',
    'nav.notes': 'Generador de Notas',
    'nav.quiz': 'Centro de Cuestionarios',
    'nav.notifications': 'Notificaciones',
    'nav.profile': 'Perfil del Estudiante',
    'nav.signOut': 'Cerrar Sesión',
    'nav.searchPlaceholder': 'Buscar cursos, notas, cuestionarios...',
    'nav.language': 'Idioma',
    'nav.selectLanguage': 'Seleccionar Idioma',
    'title.dashboard': 'Panel del Estudiante',
    'title.aiAssistant': 'Asistente de Estudio IA',
    'assistant.marks': 'Puntos / Marcas',
    'assistant.regenerate': 'Regenerar',
    'assistant.copyAnswer': 'Copiar Respuesta',
    'assistant.askPlaceholder': 'Haga cualquier pregunta de examen en cualquier idioma...',
    'assistant.send': 'Enviar',
  },
  French: {
    'nav.dashboard': 'Tableau de Bord',
    'nav.aiAssistant': "Assistant d'Étude IA",
    'nav.notes': 'Générateur de Notes',
    'nav.quiz': 'Centre de Quiz',
    'nav.notifications': 'Notifications',
    'nav.profile': "Profil de l'Étudiant",
    'nav.signOut': 'Se Déconnecter',
    'nav.searchPlaceholder': 'Rechercher des cours, notes, quiz...',
    'nav.language': 'Langue',
    'nav.selectLanguage': 'Choisir la Langue',
    'title.dashboard': "Tableau de Bord de l'Étudiant",
    'title.aiAssistant': "Assistant d'Étude IA",
    'assistant.marks': 'Points / Barème',
    'assistant.regenerate': 'Régénérer',
    'assistant.copyAnswer': 'Copier la Réponse',
    'assistant.askPlaceholder': "Posez votre question d'examen dans n'importe quelle langue...",
    'assistant.send': 'Envoyer',
  },
  German: {
    'nav.dashboard': 'Dashboard',
    'nav.aiAssistant': 'KI-Studienassistent',
    'nav.notes': 'Notizen-Generator',
    'nav.quiz': 'Quiz-Zentrum',
    'nav.notifications': 'Benachrichtigungen',
    'nav.profile': 'Studentenprofil',
    'nav.signOut': 'Abmelden',
    'nav.searchPlaceholder': 'Kurse, Notizen, Quizze suchen...',
    'nav.language': 'Sprache',
    'nav.selectLanguage': 'Sprache auswählen',
    'title.dashboard': 'Studenten-Dashboard',
    'title.aiAssistant': 'KI-Studienassistent',
    'assistant.marks': 'Punkte',
    'assistant.regenerate': 'Neu generieren',
    'assistant.copyAnswer': 'Antwort kopieren',
    'assistant.askPlaceholder': 'Prüfungsfrage in beliebiger Sprache stellen...',
    'assistant.send': 'Senden',
  },
};

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  currentOption: LanguageOption;
  supportedLanguages: LanguageOption[];
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'edurag_selected_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== 'auto') return saved;
    } catch {
      // ignore
    }
    return 'English';
  });

  const setSelectedLanguage = (lang: string) => {
    setSelectedLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  // Find known language option or construct custom option
  const currentOption =
    SUPPORTED_LANGUAGES.find((l) => l.id.toLowerCase() === selectedLanguage.toLowerCase()) || {
      id: selectedLanguage,
      label: selectedLanguage,
      native: selectedLanguage,
      flag: '🌐',
    };

  // Translation helper
  const t = (key: string, fallback?: string): string => {
    // Check if current language has translation
    let targetLang = selectedLanguage;
    if (targetLang === 'auto') {
      // For UI labels in auto-detect mode, default to English
      targetLang = 'English';
    }

    const dict = UI_TRANSLATIONS[targetLang] || UI_TRANSLATIONS['English'];
    if (dict && dict[key]) {
      return dict[key];
    }

    // Fallback to English dictionary
    const enDict = UI_TRANSLATIONS['English'];
    if (enDict && enDict[key]) {
      return enDict[key];
    }

    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        selectedLanguage,
        setSelectedLanguage,
        currentOption,
        supportedLanguages: SUPPORTED_LANGUAGES,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

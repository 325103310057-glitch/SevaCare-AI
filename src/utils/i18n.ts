import { LanguageOption } from "../types";

export interface VoiceCommandSample {
  intent: string;
  label: string;
  examplePhrases: string[];
  description: string;
}

export interface LanguagePack {
  code: string;
  speechCode: string;
  name: string;
  nativeName: string;
  flag: string;
  sampleGreeting: string;
  auth: {
    welcomeTitle: string;
    selectLanguagePrompt: string;
    continueBtn: string;
    chooseRoleTitle: string;
    patientLogin: string;
    caretakerLogin: string;
    patientLoginTitle: string;
    caretakerLoginTitle: string;
    enterMobile: string;
    mobilePlaceholder: string;
    sendOtp: string;
    otpTitle: string;
    otpSentMessage: string;
    enterOtpDigits: string;
    verifyOtp: string;
    didntReceiveOtp: string;
    resendOtp: string;
    resendIn: string;
    newUserQuestion: string;
    registerBtn: string;
    backBtn: string;
    changeLanguage: string;
    quickDemoNumbers: string;
    spokenLangIntro: string;
    spokenOtpSent: string;
    spokenLoginSuccess: (name: string, role: string) => string;
    invalidPhone: string;
    invalidOtp: string;
    accountSuspended: string;
    completeProfileTitle: string;
    fullName: string;
    selectRole: string;
    submitRegister: string;
    adminGateway: string;
  };
  ui: {
    todayMedicines: string;
    nextDose: string;
    completed: string;
    pending: string;
    missed: string;
    takeMedicineNow: string;
    iHaveTaken: string;
    willTakeLater: string;
    emergencySos: string;
    talkToAi: string;
    listening: string;
    speaking: string;
    processing: string;
    askNextMedicine: string;
    askWhatMedicine: string;
    feelingUnwell: string;
    needHelp: string;
    caretakerMessages: string;
    voiceGuide: string;
    language: string;
    patientTitle: string;
    timeForMedicine: string;
    reminderHeader: string;
    tenMinTimer: string;
    confirmTakenVoice: string;
    emergencyTriggered: string;
  };
  commands: {
    medicineTakenExamples: string[];
    medicineNotTakenExamples: string[];
    askNextMedicineExamples: string[];
    askWhatMedicineExamples: string[];
    reportUnwellExamples: string[];
    requestHelpExamples: string[];
    sendMessageExamples: string[];
  };
  responses: {
    medicineTakenConfirm: string;
    medicineNotTakenLater: string;
    nextMedicineIs: (medName: string, time: string) => string;
    whatMedicineIs: (medName: string, dosage: string, instructions: string) => string;
    noUpcomingMedicines: string;
    emergencyAlertSent: string;
    unwellAlertSent: string;
    messageSentToCaretaker: string;
    defaultListeningPrompt: string;
  };
}

export const MULTILINGUAL_PACKS: Record<string, LanguagePack> = {
  English: {
    code: "en",
    speechCode: "en-US",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    sampleGreeting: "Good morning! Time for your medicine.",
    auth: {
      welcomeTitle: "Welcome to Elder Care",
      selectLanguagePrompt: "Please select your preferred language.",
      continueBtn: "CONTINUE",
      chooseRoleTitle: "Please choose how you want to log in:",
      patientLogin: "👴 Patient Login",
      caretakerLogin: "👨‍👩‍👧 Caretaker Login",
      patientLoginTitle: "Patient Login",
      caretakerLoginTitle: "Caretaker Login",
      enterMobile: "Enter Your Mobile Number",
      mobilePlaceholder: "+91 98451 22345",
      sendOtp: "SEND OTP",
      otpTitle: "OTP VERIFICATION",
      otpSentMessage: "We sent a verification code to:",
      enterOtpDigits: "Enter 6-digit OTP:",
      verifyOtp: "VERIFY OTP",
      didntReceiveOtp: "Didn't receive the OTP?",
      resendOtp: "RESEND OTP",
      resendIn: "Resend in",
      newUserQuestion: "New User?",
      registerBtn: "Register",
      backBtn: "Back",
      changeLanguage: "Change Language",
      quickDemoNumbers: "Quick Demo Numbers (1-Tap Auto-fill)",
      spokenLangIntro: "Welcome to Elder Care. English has been selected. Please press continue.",
      spokenOtpSent: "We have sent a verification code to your mobile number. Please verify.",
      spokenLoginSuccess: (name, role) => `Welcome back ${name}. Opening your ${role === "PATIENT" ? "Patient Voice" : "Caretaker"} portal now.`,
      invalidPhone: "Please enter a valid 10-digit mobile phone number.",
      invalidOtp: "Invalid OTP code. Please check the code and try again.",
      accountSuspended: "This account has been suspended by system administrator.",
      completeProfileTitle: "Complete New User Registration",
      fullName: "Full Name",
      selectRole: "Account Type",
      submitRegister: "CREATE ACCOUNT & LOG IN",
      adminGateway: "🔒 System Administrator Gateway",
    },
    ui: {
      todayMedicines: "Today's Medicine Schedule",
      nextDose: "Next Scheduled Dose",
      completed: "Completed",
      pending: "Pending",
      missed: "Missed / Action Required",
      takeMedicineNow: "Take Medicine Now",
      iHaveTaken: "I Have Taken My Medicine",
      willTakeLater: "I Will Take in 10 Mins",
      emergencySos: "Emergency Help (SOS)",
      talkToAi: "Tap to Speak to AI Assistant",
      listening: "Listening to your voice...",
      speaking: "AI Assistant Speaking...",
      processing: "Understanding your response...",
      askNextMedicine: "When is my next medicine?",
      askWhatMedicine: "What medicine should I take?",
      feelingUnwell: "I am feeling dizzy / unwell",
      needHelp: "I need immediate help",
      caretakerMessages: "Messages from Caretaker",
      voiceGuide: "Supported Voice Commands Guide",
      language: "Language",
      patientTitle: "Elderly Care Assistant",
      timeForMedicine: "It is time to take your medicine. Please take it and let me know.",
      reminderHeader: "AI Voice Medicine Reminder",
      tenMinTimer: "10-Min Follow-up Window",
      confirmTakenVoice: "Speak: 'I have taken it' or tap below",
      emergencyTriggered: "Emergency alert dispatched to your caregiver and family.",
    },
    commands: {
      medicineTakenExamples: [
        "I have taken my medicine",
        "I took it already",
        "Yes I swallowed the pill",
        "Done taking my dose",
        "Medicine is finished",
      ],
      medicineNotTakenExamples: [
        "I haven't taken it yet",
        "I will take it in 10 minutes",
        "Getting water now",
        "Taking it later",
      ],
      askNextMedicineExamples: [
        "When is my next medicine?",
        "What time is my next dose?",
        "Next medicine timing please",
      ],
      askWhatMedicineExamples: [
        "What medicine should I take?",
        "Which tablet do I need right now?",
        "Tell me my current medicine details",
      ],
      reportUnwellExamples: [
        "I am feeling dizzy",
        "I have stomach pain",
        "I feel weak and nauseous",
        "My head is hurting badly",
      ],
      requestHelpExamples: [
        "I need help urgently",
        "I fell down please call someone",
        "Emergency, call my son",
        "Please send doctor or caretaker",
      ],
      sendMessageExamples: [
        "Tell Rahul to bring fresh fruits",
        "Tell my caretaker I am resting now",
        "Send a message to my family",
      ],
    },
    responses: {
      medicineTakenConfirm: "Great job! I have recorded that you took your medicine and notified your caretaker.",
      medicineNotTakenLater: "Understood. Please take your medicine with a glass of water soon. I will check back with you in 10 minutes.",
      nextMedicineIs: (med, time) => `Your next scheduled medicine is ${med} at ${time}.`,
      whatMedicineIs: (med, dose, inst) => `Right now you need to take ${med}, ${dose}. ${inst ? `Instructions: ${inst}.` : "Please take it with a glass of fresh water."}`,
      noUpcomingMedicines: "You have no more medicines scheduled for today. You have completed all doses!",
      emergencyAlertSent: "Emergency alert triggered! I have immediately notified your family and emergency contacts. Please sit down and stay calm.",
      unwellAlertSent: "I have recorded that you are feeling unwell and sent a priority notification to your caregiver so they can assist you.",
      messageSentToCaretaker: "Your message has been translated and sent to your caretaker.",
      defaultListeningPrompt: "I am listening. You can tell me if you took your medicine, ask when your next dose is, or ask for help.",
    },
  },

  Telugu: {
    code: "te",
    speechCode: "te-IN",
    name: "Telugu",
    nativeName: "తెలుగు",
    flag: "🇮🇳",
    sampleGreeting: "నమస్కారం! మీ మందులు వేసుకునే సమయం అయింది.",
    auth: {
      welcomeTitle: "ఎల్డర్ కేర్‌కు స్వాగతం",
      selectLanguagePrompt: "దయచేసి మీ ప్రాధాన్య భాషను ఎంచుకోండి.",
      continueBtn: "కొనసాగించండి",
      chooseRoleTitle: "మీరు ఎలా లాగిన్ అవ్వాలనుకుంటున్నారో ఎంచుకోండి:",
      patientLogin: "👴 పేషెంట్ లాగిన్",
      caretakerLogin: "👨‍👩‍👧 సంరక్షకుని లాగిన్",
      patientLoginTitle: "పేషెంట్ లాగిన్",
      caretakerLoginTitle: "సంరక్షకుని (కేర్‌టేక‌ర్) లాగిన్",
      enterMobile: "మీ మొబైల్ నంబర్ నమోదు చేయండి",
      mobilePlaceholder: "+91 98451 22345",
      sendOtp: "OTP పంపండి",
      otpTitle: "OTP ధృవీకరణ",
      otpSentMessage: "మేము ధృవీకరణ కోడ్‌ను దీనికి పంపాము:",
      enterOtpDigits: "6-అంకెల OTP నమోదు చేయండి:",
      verifyOtp: "OTP ధృవీకరించండి",
      didntReceiveOtp: "OTP రాలేదా?",
      resendOtp: "మళ్ళీ OTP పంపండి",
      resendIn: "మళ్ళీ పంపడానికి సమయం",
      newUserQuestion: "కొత్త వాడుకరిరా?",
      registerBtn: "నమోదు చేసుకోండి (రిజిస్టర్)",
      backBtn: "వెనుకకు",
      changeLanguage: "భాష మార్చండి",
      quickDemoNumbers: "డెమో నంబర్లు (1-ట్యాప్ ఆటో-ఫిల్)",
      spokenLangIntro: "నమస్కారం! ఎల్డర్ కేర్ కు స్వాగతం. తెలుగు భాష ఎంపిక చేయబడింది. దయచేసి కొనసాగించడానికి బటన్ నొక్కండి.",
      spokenOtpSent: "మీ మొబైల్ నంబర్‌కు ధృవీకరణ కోడ్ పంపబడింది. దయచేసి కోడ్‌ని ధృవీకరించండి.",
      spokenLoginSuccess: (name, role) => `స్వాగతం ${name} గారు. మీ ${role === "PATIENT" ? "పేషెంట్ వాయిస్" : "కేర్‌టేక‌ర్"} పోర్టల్ తెరుస్తున్నాము.`,
      invalidPhone: "దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి.",
      invalidOtp: "చెల్లని OTP కోడ్. దయచేసి సరిచూసి మళ్ళీ ప్రయత్నించండి.",
      accountSuspended: "ఈ ఖాతా నిలిపివేయబడింది.",
      completeProfileTitle: "కొత్త ఖాతా నమోదు వివరాలు",
      fullName: "పూర్తి పేరు",
      selectRole: "ఖాతా రకం",
      submitRegister: "ఖాతా సృష్టించి లాగిన్ అవ్వండి",
      adminGateway: "🔒 సిస్టమ్ అడ్మినిస్ట్రేటర్ గేట్‌వే",
    },
    ui: {
      todayMedicines: "నేటి మందుల షెడ్యూల్",
      nextDose: "తదుపరి మందు సమయం",
      completed: "వేసుకున్నారు",
      pending: "వేసుకోవాలి",
      missed: "తప్పిన మోతాదు / తక్షణ శ్రద్ధ",
      takeMedicineNow: "ఇప్పుడే మందు వేసుకోండి",
      iHaveTaken: "నేను మందు వేసుకున్నాను",
      willTakeLater: "10 నిమిషాల్లో వేసుకుంటాను",
      emergencySos: "అత్యవసర సహాయం (SOS)",
      talkToAi: "AI సహాయకుడితో మాట్లాడండి",
      listening: "మీ మాట వింటున్నాను...",
      speaking: "AI మాట్లాడుతోంది...",
      processing: "మీ మాటలను అర్థం చేసుకుంటున్నాను...",
      askNextMedicine: "తదుపరి మందు ఎప్పుడు?",
      askWhatMedicine: "నేను ఏ మందు వేసుకోవాలి?",
      feelingUnwell: "నాకు కళ్ళు తిరుగుతున్నాయి / బాగాలేదు",
      needHelp: "నాకు అత్యవసర సహాయం కావాలి",
      caretakerMessages: "సంరక్షకుడి నుండి సందేశాలు",
      voiceGuide: "వాయిస్ కమాండ్ల మార్గదర్శి",
      language: "భాష",
      patientTitle: "వృద్ధుల సంరక్షణ సహాయకుడు",
      timeForMedicine: "మీ మందులు వేసుకునే సమయం అయింది. దయచేసి మందులు వేసుకుని నాకు చెప్పండి.",
      reminderHeader: "AI వాయిస్ మందుల రిమైండర్",
      tenMinTimer: "10 నిమిషాల సమయం",
      confirmTakenVoice: "'మందు వేసుకున్నాను' అని చెప్పండి లేదా బటన్ నొక్కండి",
      emergencyTriggered: "మీ కుటుంబానికి మరియు కేర్‌టేకర్‌కు అత్యవసర హెచ్చరిక పంపబడింది.",
    },
    commands: {
      medicineTakenExamples: [
        "నేను మందులు వేసుకున్నాను",
        "మందు వేసుకున్నాను",
        "వేసుకున్నాను అయిపోయింది",
        "టాబ్లెట్ మింగాను",
        "అవును మందులు తీసుకున్నాను",
      ],
      medicineNotTakenExamples: [
        "ఇంకా వేసుకోలేదు",
        "10 నిమిషాల్లో వేసుకుంటాను",
        "నీళ్ళు తెచ్చుకుంటున్నాను",
        "తర్వాత వేసుకుంటాను",
      ],
      askNextMedicineExamples: [
        "తదుపరి మందు ఎప్పుడు?",
        "తర్వాత మందు సమయం ఎంత?",
        "నా తర్వాతి మందు ఎప్పుడు వేసుకోవాలి?",
      ],
      askWhatMedicineExamples: [
        "నేను ఏ మందు వేసుకోవాలి?",
        "ఇప్పుడు ఏ టాబ్లెట్ వేసుకోవాలి?",
        "ప్రస్తుత మందు వివరాలు చెప్పండి",
      ],
      reportUnwellExamples: [
        "నాకు కళ్ళు తిరుగుతున్నాయి",
        "కడుపులో నొప్పిగా ఉంది",
        "చాలా నీరసంగా ఉంది",
        "తల విపరీతంగా నొప్పిగా ఉంది",
      ],
      requestHelpExamples: [
        "నాకు వెంటనే సహాయం కావాలి",
        "నేను కింద పడిపోయాను ఎవరినైనా పిలవండి",
        "రాహుల్‌కి ఫోన్ చేయండి",
        "అత్యవసర సహాయం కావాలి",
      ],
      sendMessageExamples: [
        "రాహుల్‌కి తాజా పండ్లు తీసుకురమ్మని చెప్పండి",
        "నేను పడుకుంటున్నానని కేర్‌టేకర్‌కి చెప్పండి",
        "నా కుటుంబానికి సందేశం పంపండి",
      ],
    },
    responses: {
      medicineTakenConfirm: "చాలా మంచిది! మీరు మందులు వేసుకున్నట్లు నేను నమోదు చేసాను మరియు మీ కుటుంబానికి తెలియజేశాను.",
      medicineNotTakenLater: "అర్థమైంది. దయచేసి త్వరగా ఒక గ్లాసు నీటితో మందు వేసుకోండి. నేను 10 నిమిషాల్లో మళ్ళీ గుర్తుచేస్తాను.",
      nextMedicineIs: (med, time) => `మీ తదుపరి మందు ${med}, ${time} గంటలకు వేసుకోవాలి.`,
      whatMedicineIs: (med, dose, inst) => `ఇప్పుడు మీరు ${med} (${dose}) వేసుకోవాలి. ${inst ? `సూచన: ${inst}.` : "దయచేసి మంచి నీటితో వేసుకోండి."}`,
      noUpcomingMedicines: "ఈ రోజుకు మీ మందులన్నీ పూర్తయ్యాయి. ఇక ఏ మందులు లేవు!",
      emergencyAlertSent: "అత్యవసర హెచ్చరిక పంపబడింది! నేను మీ కుటుంబ సభ్యులకు వెంటనే సమాచారం అందించాను. దయచేసి ప్రశాంతంగా కూర్చోండి.",
      unwellAlertSent: "మీకు ఆరోగ్యం బాగాలేదని నేను నమోదు చేసుకున్నాను మరియు మీ సంరక్షకుడికి వెంటనే అత్యవసర సమాచారం పంపాను.",
      messageSentToCaretaker: "మీ సందేశం మీ కేర్‌టేకర్‌కి విజయవంతంగా పంపబడింది.",
      defaultListeningPrompt: "నేను వింటున్నాను. మీరు మందు వేసుకున్నారని చెప్పవచ్చు, తదుపరి మందు ఎప్పుడో అడగవచ్చు లేదా సహాయం కోరవచ్చు.",
    },
  },

  Hindi: {
    code: "hi",
    speechCode: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    flag: "🇮🇳",
    sampleGreeting: "नमस्ते! आपकी दवाई का समय हो गया है।",
    auth: {
      welcomeTitle: "एल्डर केयर में आपका स्वागत है",
      selectLanguagePrompt: "कृपया अपनी पसंदीदा भाषा चुनें।",
      continueBtn: "आगे बढ़ें",
      chooseRoleTitle: "कृपया चुनें कि आप कैसे लॉग इन करना चाहते हैं:",
      patientLogin: "👴 मरीज़ लॉगिन (Patient)",
      caretakerLogin: "👨‍👩‍👧 केयरटेकर लॉगिन (Caretaker)",
      patientLoginTitle: "मरीज़ लॉगिन",
      caretakerLoginTitle: "केयरटेकर लॉगिन",
      enterMobile: "अपना मोबाइल नंबर दर्ज करें",
      mobilePlaceholder: "+91 98451 22345",
      sendOtp: "OTP भेजें",
      otpTitle: "OTP सत्यापन",
      otpSentMessage: "हमने एक सत्यापन कोड भेजा है:",
      enterOtpDigits: "6-अंकों का OTP दर्ज करें:",
      verifyOtp: "OTP सत्यापित करें",
      didntReceiveOtp: "OTP नहीं मिला?",
      resendOtp: "फिर से OTP भेजें",
      resendIn: "पुनः भेजने का समय",
      newUserQuestion: "नए उपयोगकर्ता हैं?",
      registerBtn: "पंजीकरण करें (Register)",
      backBtn: "पीछे जाएं",
      changeLanguage: "भाषा बदलें",
      quickDemoNumbers: "त्वरित डेमो नंबर (1-टैप ऑटो-फिल)",
      spokenLangIntro: "नमस्ते! एल्डर केयर में आपका स्वागत है। हिन्दी भाषा चुनी गई है। कृपया आगे बढ़ने के लिए बटन दबाएं।",
      spokenOtpSent: "आपके मोबाइल नंबर पर सत्यापन कोड भेज दिया गया है। कृपया सत्यापित करें।",
      spokenLoginSuccess: (name, role) => `स्वागत है ${name} जी। आपका ${role === "PATIENT" ? "मरीज़ वॉइस" : "केयरटेकर"} पोर्टल खोला जा रहा है।`,
      invalidPhone: "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।",
      invalidOtp: "अमान्य OTP कोड। कृपया जाँच कर पुनः प्रयास करें।",
      accountSuspended: "यह खाता निलंबित कर दिया गया है।",
      completeProfileTitle: "नया खाता पंजीकरण पूरा करें",
      fullName: "पूरा नाम",
      selectRole: "खाता प्रकार",
      submitRegister: "खाता बनाएं और लॉगिन करें",
      adminGateway: "🔒 सिस्टम एडमिनिस्ट्रेटर गेटवे",
    },
    ui: {
      todayMedicines: "आज की दवाइयों का समय",
      nextDose: "अगली खुराक का समय",
      completed: "ले ली गई",
      pending: "लेनी बाकी है",
      missed: "छूट गई / ध्यान दें",
      takeMedicineNow: "अभी दवाई लें",
      iHaveTaken: "मैंने दवाई ले ली है",
      willTakeLater: "10 मिनट में लूँगा",
      emergencySos: "आपातकालीन सहायता (SOS)",
      talkToAi: "AI सहायक से बात करने के लिए दबाएं",
      listening: "आपकी आवाज सुन रहा हूँ...",
      speaking: "AI बोल रहा है...",
      processing: "आपकी बात समझ रहा हूँ...",
      askNextMedicine: "मेरी अगली दवाई कब है?",
      askWhatMedicine: "मुझे कौन सी दवाई लेनी है?",
      feelingUnwell: "मुझे चक्कर आ रहा है / तबीयत खराब है",
      needHelp: "मुझे तुरंत मदद चाहिए",
      caretakerMessages: "केयरटेकर के संदेश",
      voiceGuide: "आवाज आदेश मार्गदर्शिका",
      language: "भाषा",
      patientTitle: "बुजुर्ग देखभाल सहायक",
      timeForMedicine: "आपकी दवाई का समय हो गया है। कृपया दवाई लें और मुझे बताएं।",
      reminderHeader: "AI आवाज दवा रिमाइंडर",
      tenMinTimer: "10 मिनट का समय",
      confirmTakenVoice: "'दवाई ले ली' बोलें या नीचे बटन दबाएं",
      emergencyTriggered: "आपके परिवार और केयरटेकर को आपातकालीन अलर्ट भेज दिया गया है।",
    },
    commands: {
      medicineTakenExamples: [
        "मैंने दवाई ले ली है",
        "दवाई खा ली मैंने",
        "गोली ले ली है",
        "हाँ ले ली दवाई",
        "सब दवाइयाँ पूरी हो गईं",
      ],
      medicineNotTakenExamples: [
        "अभी नहीं ली है",
        "10 मिनट बाद लूँगा",
        "पानी ला रहा हूँ",
        "थोड़ी देर में लूँगा",
      ],
      askNextMedicineExamples: [
        "मेरी अगली दवाई कब है?",
        "अगली खुराक का समय क्या है?",
        "अगली दवाई कितने बजे लेनी है?",
      ],
      askWhatMedicineExamples: [
        "मुझे कौन सी दवाई लेनी है?",
        "अभी कौन सी गोली खानी है?",
        "दवाई का नाम और खुराक बताएं",
      ],
      reportUnwellExamples: [
        "मुझे चक्कर आ रहा है",
        "पेट में बहुत दर्द है",
        "बहुत कमजोरी लग रही है",
        "सिर में तेज दर्द है",
      ],
      requestHelpExamples: [
        "मुझे तुरंत मदद चाहिए",
        "मैं गिर गया हूँ किसी को बुलाओ",
        "राहुल को फोन करो",
        "इमरजेंसी है मदद भेजो",
      ],
      sendMessageExamples: [
        "राहुल से कहो कि फल ले आए",
        "केयरटेकर को बताओ कि मैं आराम कर रहा हूँ",
        "परिवार को संदेश भेजो",
      ],
    },
    responses: {
      medicineTakenConfirm: "बहुत बढ़िया! मैंने दर्ज कर लिया है कि आपने दवाई ले ली है और आपके परिवार को सूचित कर दिया है।",
      medicineNotTakenLater: "समझ गया। कृपया जल्दी ही एक गिलास पानी के साथ दवाई ले लें। मैं 10 मिनट में आपको फिर याद दिलाऊंगा।",
      nextMedicineIs: (med, time) => `आपकी अगली दवाई ${med} समय ${time} पर निर्धारित है।`,
      whatMedicineIs: (med, dose, inst) => `अभी आपको ${med} (${dose}) लेनी है। ${inst ? `निर्देश: ${inst}.` : "कृपया इसे ताजे पानी के साथ लें।"}`,
      noUpcomingMedicines: "आज के लिए आपकी सभी दवाइयाँ पूरी हो चुकी हैं। अब कोई और दवाई बाकी नहीं है!",
      emergencyAlertSent: "आपातकालीन अलर्ट भेज दिया गया है! मैंने आपके परिवार और केयरटेकर को तुरंत सूचित कर दिया है। कृपया बैठ जाएं और शांत रहें।",
      unwellAlertSent: "मैंने दर्ज कर लिया है कि आपकी तबीयत ठीक नहीं है और केयरटेकर को तुरंत अलर्ट भेज दिया है।",
      messageSentToCaretaker: "आपका संदेश आपके केयरटेकर को भेज दिया गया है।",
      defaultListeningPrompt: "मैं सुन रहा हूँ। आप बता सकते हैं कि दवाई ले ली है, अगली दवाई के बारे में पूछ सकते हैं या मदद मांग सकते हैं।",
    },
  },

  Tamil: {
    code: "ta",
    speechCode: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    flag: "🇮🇳",
    sampleGreeting: "வணக்கம்! உங்கள் மருந்து சாப்பிடும் நேரம் இது.",
    auth: {
      welcomeTitle: "எல்டர் கேருக்கு நல்வரவு",
      selectLanguagePrompt: "தயவுசெய்து உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்.",
      continueBtn: "தொடரவும்",
      chooseRoleTitle: "நீங்கள் எவ்வாறு உள்நுழைய விரும்புகிறீர்கள் என்பதைத் தேர்ந்தெடுக்கவும்:",
      patientLogin: "👴 நோயாளி உள்நுழைவு",
      caretakerLogin: "👨‍👩‍👧 பராமரிப்பாளர் உள்நுழைவு",
      patientLoginTitle: "நோயாளி உள்நுழைவு",
      caretakerLoginTitle: "பராமரிப்பாளர் உள்நுழைவு",
      enterMobile: "உங்கள் மொபைல் எண்ணை உள்ளிடவும்",
      mobilePlaceholder: "+91 98451 22345",
      sendOtp: "OTP அனுப்பவும்",
      otpTitle: "OTP சரிபார்ப்பு",
      otpSentMessage: "சரிபார்ப்புக் குறியீட்டை அனுப்பியுள்ளோம்:",
      enterOtpDigits: "6-இலக்க OTP ஐ உள்ளிடவும்:",
      verifyOtp: "OTP சரிபார்க்கவும்",
      didntReceiveOtp: "OTP வரவில்லையா?",
      resendOtp: "மீண்டும் OTP அனுப்பவும்",
      resendIn: "மீண்டும் அனுப்ப நேரம்",
      newUserQuestion: "புதிய பயனரா?",
      registerBtn: "பதிவு செய்யவும் (Register)",
      backBtn: "பின்செல்லவும்",
      changeLanguage: "மொழியை மாற்றவும்",
      quickDemoNumbers: "டெமோ எண்கள் (1-தட்டல் ஆட்டோ-ஃபில்)",
      spokenLangIntro: "வணக்கம்! எல்டர் கேருக்கு நல்வரவு. தமிழ் மொழி தேர்ந்தெடுக்கப்பட்டது. தொடர தொடரவும் பொத்தானை அழுத்தவும்.",
      spokenOtpSent: "உங்கள் மொபைல் எண்ணிற்கு சரிபார்ப்புக் குறியீடு அனுப்பப்பட்டுள்ளது.",
      spokenLoginSuccess: (name, role) => `வணக்கம் ${name}. உங்கள் ${role === "PATIENT" ? "நோயாளி குரல்" : "பராமரிப்பாளர்"} பக்கம் திறக்கப்படுகிறது.`,
      invalidPhone: "தயவுசெய்து 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.",
      invalidOtp: "தவறான OTP குறியீடு. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
      accountSuspended: "இந்தக் கணக்கு இடைநிறுத்தப்பட்டுள்ளது.",
      completeProfileTitle: "புதிய கணக்கு பதிவு",
      fullName: "முழு பெயர்",
      selectRole: "கணக்கு வகை",
      submitRegister: "கணக்கை உருவாக்கி உள்நுழைக",
      adminGateway: "🔒 சிஸ்டம் அட்மினிஸ்ட்ரேட்டர் நுழைவு",
    },
    ui: {
      todayMedicines: "இன்றைய மருந்து அட்டவணை",
      nextDose: "அடுத்த மருந்து நேரம்",
      completed: "சாப்பிட்டாச்சு",
      pending: "சாப்பிட வேண்டும்",
      missed: "தவறியது / கவனம் தேவை",
      takeMedicineNow: "இப்போது மருந்து சாப்பிடுங்கள்",
      iHaveTaken: "நான் மருந்து சாப்பிட்டுவிட்டேன்",
      willTakeLater: "10 நிமிடத்தில் சாப்பிடுவேன்",
      emergencySos: "அவசர உதவி (SOS)",
      talkToAi: "AI உதவியாளரிடம் பேச அழுத்தவும்",
      listening: "உங்கள் குரலைக் கேட்கிறேன்...",
      speaking: "AI பேசுகிறது...",
      processing: "புரிந்துகொள்கிறேன்...",
      askNextMedicine: "அடுத்த மருந்து எப்போது?",
      askWhatMedicine: "நான் என்ன மருந்து சாப்பிட வேண்டும்?",
      feelingUnwell: "தலை சுற்றுகிறது / உடம்பு சரியில்லை",
      needHelp: "எனக்கு உடனடியாக உதவி தேவை",
      caretakerMessages: "பாதுகாவலரிடமிருந்து செய்திகள்",
      voiceGuide: "குரல் கட்டளை வழிகாட்டி",
      language: "மொழி",
      patientTitle: "முதியோர் பராமரிப்பு உதவியாளர்",
      timeForMedicine: "மருந்து சாப்பிடும் நேரம் வந்துவிட்டது. தயவுசெய்து சாப்பிட்டு எனக்கு சொல்லுங்கள்.",
      reminderHeader: "AI குரல் மருந்து நினைவூட்டல்",
      tenMinTimer: "10 நிமிட அவகாசம்",
      confirmTakenVoice: "'மருந்து சாப்பிட்டேன்' என கூறுங்கள்",
      emergencyTriggered: "குடும்பத்தினருக்கு அவசர எச்சரிக்கை அனுப்பப்பட்டது.",
    },
    commands: {
      medicineTakenExamples: [
        "நான் மருந்து சாப்பிட்டுவிட்டேன்",
        "மருந்து சாப்பிட்டாச்சு",
        "மாத்திரை போட்டுட்டேன்",
        "முடிந்தது",
      ],
      medicineNotTakenExamples: [
        "இன்னும் சாப்பிடவில்லை",
        "10 நிமிடத்தில் சாப்பிடுகிறேன்",
        "தண்ணீர் எடுக்கிறேன்",
      ],
      askNextMedicineExamples: [
        "அடுத்த மருந்து எப்போது?",
        "அடுத்த மாத்திரை நேரம் என்ன?",
      ],
      askWhatMedicineExamples: [
        "நான் என்ன மருந்து சாப்பிட வேண்டும்?",
        "இப்போது எந்த மாத்திரை சாப்பிட வேண்டும்?",
      ],
      reportUnwellExamples: [
        "எனக்கு தலை சுற்றுகிறது",
        "வயிற்று வலி அதிகமாக உள்ளது",
        "மிகவும் பலவீனமாக உணர்கிறேன்",
      ],
      requestHelpExamples: [
        "எனக்கு உடனடியாக உதவி வேண்டும்",
        "கீழே விழுந்துவிட்டேன் யாரையாவது அழையுங்கள்",
      ],
      sendMessageExamples: [
        "ராகுலுக்கு தகவல் சொல்லுங்கள்",
        "நான் ஓய்வெடுக்கிறேன் என்று சொல்லுங்கள்",
      ],
    },
    responses: {
      medicineTakenConfirm: "மிகவும் நல்லது! நீங்கள் மருந்து சாப்பிட்டதை பதிவு செய்து உங்கள் குடும்பத்தினருக்கு தெரிவித்துள்ளேன்.",
      medicineNotTakenLater: "புரிந்தது. தயவுசெய்து தண்ணீருடன் சீக்கிரம் சாப்பிடுங்கள். 10 நிமிடத்தில் மீண்டும் நினைவூட்டுவேன்.",
      nextMedicineIs: (med, time) => `உங்கள் அடுத்த மருந்து ${med}, நேரம் ${time}.`,
      whatMedicineIs: (med, dose, inst) => `இப்போது நீங்கள் ${med} (${dose}) சாப்பிட வேண்டும். ${inst ? `குறிப்பு: ${inst}.` : "தண்ணீருடன் உட்கொள்ளவும்."}`,
      noUpcomingMedicines: "இன்றைய அனைத்து மருந்துகளும் முடிந்துவிட்டன!",
      emergencyAlertSent: "அவசர எச்சரிக்கை அனுப்பப்பட்டது! உங்கள் குடும்பத்தினருக்கு தகவல் தெரிவிக்கப்பட்டுள்ளது.",
      unwellAlertSent: "உடம்பு சரியில்லை என்பதை பதிவு செய்து பராமரிப்பாளருக்கு அவசர எச்சரிக்கை அனுப்பியுள்ளேன்.",
      messageSentToCaretaker: "உங்கள் செய்தி பராமரிப்பாளருக்கு அனுப்பப்பட்டது.",
      defaultListeningPrompt: "நான் கேட்கிறேன். மருந்து சாப்பிட்டதை கூறலாம், அடுத்த மருந்து பற்றி கேட்கலாம் அல்லது உதவி கேட்கலாம்.",
    },
  },

  Spanish: {
    code: "es",
    speechCode: "es-ES",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    sampleGreeting: "¡Buenos días! Es hora de tomar su medicina.",
    auth: {
      welcomeTitle: "Bienvenido a Elder Care",
      selectLanguagePrompt: "Por favor seleccione su idioma preferido.",
      continueBtn: "CONTINUAR",
      chooseRoleTitle: "Por favor elija cómo desea iniciar sesión:",
      patientLogin: "👴 Ingreso Paciente",
      caretakerLogin: "👨‍👩‍👧 Ingreso Cuidador",
      patientLoginTitle: "Ingreso Paciente",
      caretakerLoginTitle: "Ingreso Cuidador",
      enterMobile: "Ingrese su Número Móvil",
      mobilePlaceholder: "+91 98451 22345",
      sendOtp: "ENVIAR OTP",
      otpTitle: "VERIFICACIÓN OTP",
      otpSentMessage: "Enviamos un código de verificación a:",
      enterOtpDigits: "Ingrese el código OTP de 6 dígitos:",
      verifyOtp: "VERIFICAR OTP",
      didntReceiveOtp: "¿No recibió el código OTP?",
      resendOtp: "REENVIAR OTP",
      resendIn: "Reenviar en",
      newUserQuestion: "¿Usuario Nuevo?",
      registerBtn: "Registrarse",
      backBtn: "Volver",
      changeLanguage: "Cambiar Idioma",
      quickDemoNumbers: "Números Demo Rápidos (Auto-completar)",
      spokenLangIntro: "Bienvenido a Elder Care. Idioma español seleccionado. Por favor presione continuar.",
      spokenOtpSent: "Hemos enviado un código de verificación a su teléfono móvil.",
      spokenLoginSuccess: (name, role) => `Bienvenido de nuevo ${name}. Abriendo su portal de ${role === "PATIENT" ? "Voz para Paciente" : "Cuidador"}.`,
      invalidPhone: "Por favor ingrese un número móvil válido.",
      invalidOtp: "Código OTP inválido. Por favor verifique e intente nuevamente.",
      accountSuspended: "Esta cuenta ha sido suspendida por el administrador.",
      completeProfileTitle: "Completar Registro de Usuario",
      fullName: "Nombre Completo",
      selectRole: "Tipo de Cuenta",
      submitRegister: "CREAR CUENTA E INICIAR",
      adminGateway: "🔒 Acceso para Administrador",
    },
    ui: {
      todayMedicines: "Horario de Medicamentos de Hoy",
      nextDose: "Próxima Dosis Programada",
      completed: "Completado",
      pending: "Pendiente",
      missed: "Perdido / Acción Requerida",
      takeMedicineNow: "Tomar Medicina Ahora",
      iHaveTaken: "Ya Tomé Mi Medicina",
      willTakeLater: "Tomaré en 10 Minutos",
      emergencySos: "Ayuda de Emergencia (SOS)",
      talkToAi: "Toca para Hablar con el Asistente AI",
      listening: "Escuchando su voz...",
      speaking: "El Asistente AI está hablando...",
      processing: "Procesando su respuesta...",
      askNextMedicine: "¿Cuándo es mi próxima medicina?",
      askWhatMedicine: "¿Qué medicina debo tomar?",
      feelingUnwell: "Me siento mareado / enfermo",
      needHelp: "Necesito ayuda urgente",
      caretakerMessages: "Mensajes del Cuidador",
      voiceGuide: "Guía de Comandos de Voz",
      language: "Idioma",
      patientTitle: "Asistente de Cuidado para Ancianos",
      timeForMedicine: "Es hora de tomar su medicina. Por favor tómela y avíseme.",
      reminderHeader: "Recordatorio de Voz con IA",
      tenMinTimer: "Ventana de 10 minutos",
      confirmTakenVoice: "Diga 'Ya tomé mi medicina' o toque abajo",
      emergencyTriggered: "Alerta de emergencia enviada a su cuidador y familia.",
    },
    commands: {
      medicineTakenExamples: [
        "Ya tomé mi medicina",
        "Ya me tomé las pastillas",
        "Listo, ya la tomé",
        "Medicina completada",
      ],
      medicineNotTakenExamples: [
        "Aún no la tomo",
        "La tomaré en 10 minutos",
        "Voy por agua",
      ],
      askNextMedicineExamples: [
        "¿Cuándo es mi próxima medicina?",
        "¿A qué hora me toca la siguiente dosis?",
      ],
      askWhatMedicineExamples: [
        "¿Qué medicina debo tomar ahora?",
        "¿Cuáles pastillas me tocan?",
      ],
      reportUnwellExamples: [
        "Me siento mareado",
        "Tengo mucho dolor",
        "Me siento muy débil",
      ],
      requestHelpExamples: [
        "Necesito ayuda urgente",
        "Me caí, por favor llamen a alguien",
      ],
      sendMessageExamples: [
        "Dile a mi cuidador que estoy descansando",
        "Envía un mensaje a mi familia",
      ],
    },
    responses: {
      medicineTakenConfirm: "¡Excelente! He registrado que tomó su medicina y se lo notifiqué a su cuidador.",
      medicineNotTakenLater: "Entendido. Por favor tómela con agua pronto. Le recordaré nuevamente en 10 minutos.",
      nextMedicineIs: (med, time) => `Su próxima medicina programada es ${med} a las ${time}.`,
      whatMedicineIs: (med, dose, inst) => `Ahora debe tomar ${med}, ${dose}. ${inst ? `Instrucciones: ${inst}.` : "Tómela con agua fresca."}`,
      noUpcomingMedicines: "¡No tiene más medicinas programadas para hoy! Ha completado todas las dosis.",
      emergencyAlertSent: "¡Alerta de emergencia enviada! He notificado de inmediato a su familia y cuidador.",
      unwellAlertSent: "He registrado que no se siente bien y envié una notificación urgente a su cuidador.",
      messageSentToCaretaker: "Su mensaje ha sido enviado a su cuidador.",
      defaultListeningPrompt: "Le escucho. Puede decirme si tomó su medicina, preguntar la próxima dosis o pedir ayuda.",
    },
  },
};

export function getLanguagePack(languageName: string): LanguagePack {
  return MULTILINGUAL_PACKS[languageName] || MULTILINGUAL_PACKS["English"];
}

/**
 * Static public-page dictionaries (English / Hindi) — no API key, no runtime
 * dependency. Covers the landing page and the citizen tracker, the two
 * narrative public surfaces. Server-sourced values (registry numbers, status
 * pills, SLA status text) stay as-is.
 */

export type Lang = "en" | "hi";

/* ── Landing ──────────────────────────────────────────────────────────────── */

const landingEn = {
  nav: {
    capabilities: "Capabilities",
    statutoryClock: "Statutory clock",
    how: "How it works",
    faq: "FAQ",
    access: "Access",
    tracker: "Tracker",
    transparency: "Transparency",
    signIn: "Sign in",
    homeAria: "AICTE Sentinel home",
  },
  hero: {
    badge: "Statutory grievance monitoring · AICTE",
    line1: "Every grievance.",
    line2: "Accountable.",
    sub: "Sentinel is the single source of truth for grievance redressal across AICTE bureaus — statutory SLA clocks that never slip silently, inter-bureau overlap coordination, and AI-assisted triage in one command centre.",
    ctaCommand: "Open the command centre",
    ctaTrack: "Track a grievance",
    note: "Demonstration environment seeded with sample data · No real grievances are processed",
  },
  stats: [
    { value: 8, suffix: "", label: "Statutory categories", sub: "Each with its own SLA timeline" },
    { value: 4, suffix: "", label: "Bureaus coordinated", sub: "RB · PGRC · AB · SDC under one registry" },
    { value: 5, suffix: "", label: "Regional offices", sub: "Region-scoped case visibility" },
    { value: 7, suffix: " days", label: "Fastest SLA clock", sub: "Ragging & safety violations" },
  ],
  cap: {
    h2a: "Everything the statute expects.",
    h2b: "Nothing it doesn't.",
    tiles: [
      {
        eyebrow: "AI-assisted triage",
        title: "Classification before the coffee cools",
        body: "Paste a representation; Sentinel suggests category, bureau, priority and confidence — grounded in the statutory SLA table, always reviewable by an officer.",
      },
      {
        eyebrow: "SLA radar",
        title: "Breach, forecast before it happens",
        body: "Every case carries a live countdown against its statutory category. Breach-risk radar surfaces what will slip tomorrow, today.",
      },
      {
        eyebrow: "Overlap detection",
        title: "Two bureaus, one complaint — coordinated",
        body: "Cross-bureau collision alerts merge concurrent inquiries into a single coordinated investigation with one master file.",
      },
      {
        eyebrow: "Immutable timeline",
        title: "Every action leaves a trace",
        body: "Remarks, status changes, hearings and escalations append to a case ledger that no one can quietly rewrite — audit-ready by construction.",
      },
      {
        eyebrow: "Role-based access",
        title: "Right eyes on the right file",
        body: "Six role archetypes — from bureau officers to the Competent Authority — with region and bureau scoping enforced on every query.",
      },
      {
        eyebrow: "Public tracker",
        title: "Citizens follow progress, no account needed",
        body: "Anyone holding an acknowledgement registry number sees live status, bureau, hearings and the full timeline — at /track.",
      },
    ],
    illustrative: "illustrative",
    watchlist: "Breach-risk watchlist",
    watchlistSub: "Ranked by days-to-breach",
    rows: ["Notice issued to institution", "Hearing scheduled · Regional Office", "Disposed with directions"],
    underProcess: "Under process · hearing scheduled",
  },
  sla: {
    eyebrow: "The statutory clock",
    h2: "Timelines aren't suggestions. Sentinel treats them that way.",
    sub: "Each grievance category carries a statutory disposal window. Sentinel counts every one of them down, warns officers at the threshold, forecasts breaches across the portfolio, and keeps hearings aligned with the calendar.",
    days: "days",
    cats: [
      "Ragging & Safety",
      "Withholding Certificates",
      "Capitation Fee",
      "Faculty Non-Payment",
      "Infrastructure & Labs",
      "Unapproved Courses",
      "Admission Irregularities",
      "Other Grievances",
    ],
  },
  how: {
    eyebrow: "How it works",
    h2: "From complaint to closure, on the record.",
    sub: "Every grievance follows the same statutory path — registered, clocked, disposed and published. Nothing happens off the record, and anyone can verify that.",
    link: "See the published numbers",
    stepLabel: "Step",
    steps: [
      {
        title: "File & register",
        body: "A complaint lands in the registry with a unique registry number. A statutory clock starts immediately — the deadline for disposal is fixed by category, not by convenience.",
      },
      {
        title: "Statutory processing",
        body: "The responsible bureau works the case with every action logged in an immutable timeline. A live SLA ring shows exactly how much of the legal window remains.",
      },
      {
        title: "Disposal & public disclosure",
        body: "Redressal is recorded with its full journey published on the public tracker. Citizens can watch for changes or print the final status report for their records.",
      },
    ],
  },
  faq: {
    h2: "Questions, answered.",
    items: [
      {
        q: "Who can track a grievance?",
        a: "Anyone holding the registry number printed on the acknowledgement slip. No account, no personal data — the status page is fully public.",
      },
      {
        q: "What happens when the statutory deadline is breached?",
        a: "The case is flagged and escalated to the competent authority. Breach and approaching-deadline states are visible on every case card and in the published transparency numbers.",
      },
      {
        q: "Is complainant information public?",
        a: "No. Public disclosure covers category, institution, bureau, timeline events and status only. Names, contacts, internal desk notes and evidence documents never leave the registry.",
      },
      {
        q: "How are duplicate complaints about the same institution handled?",
        a: "The overlap detector flags parallel open inquiries across bureaus and requires a lead bureau to be assigned before duplicate action is taken.",
      },
      {
        q: "Which grievance categories does the Council accept?",
        a: "Capitation fee & overcharging, faculty non-payment, infrastructure deficiencies, document withholding, approval irregularities and more — each with its own statutory timeline.",
      },
      {
        q: "Is this an official AICTE product?",
        a: "No — this is a Smart India Hackathon demonstration seeded with synthetic data, built to show how a statutory grievance desk could work in the open.",
      },
    ],
  },
  access: {
    h2: "Ready when you are.",
    cards: [
      {
        title: "Officers & administrators",
        body: "Sign in with your AICTE email. Demo accounts are one click away on the sign-in page — no password hunting.",
        cta: "Open sign in",
      },
      {
        title: "Citizens & complainants",
        body: "Have a registry number from your acknowledgement slip? Follow your grievance's live status publicly — no sign-in, ever.",
        cta: "Track a grievance",
      },
    ],
  },
  footer: {
    tracker: "Public tracker",
    transparency: "Transparency",
    signIn: "Sign in",
    disclaimer: "Smart India Hackathon demonstration · Not an official AICTE product",
  },
};

const landingHi: typeof landingEn = {
  nav: {
    capabilities: "क्षमताएँ",
    statutoryClock: "सांविधिक समय-सीमा",
    how: "प्रक्रिया",
    faq: "प्रश्न",
    access: "पहुँच",
    tracker: "ट्रैकर",
    transparency: "पारदर्शिता",
    signIn: "साइन इन",
    homeAria: "AICTE Sentinel मुखपृष्ठ",
  },
  hero: {
    badge: "सांविधिक शिकायत निगरानी · AICTE",
    line1: "हर शिकायत.",
    line2: "जवाबदेह.",
    sub: "सेंटिनल AICTE के सभी ब्यूरो के लिए शिकायत निवारण का एकमात्र सत्य स्रोत है — सांविधिक SLA घड़ियाँ जो चुपचाप नहीं फिसलतीं, अंतर-ब्यूरो ओवरलैप समन्वय, और AI-सहायता प्राप्त ट्रायज — सब एक ही कमांड सेंटर में।",
    ctaCommand: "कमांड सेंटर खोलें",
    ctaTrack: "शिकायत ट्रैक करें",
    note: "नमूना डेटा वाला प्रदर्शन वातावरण · कोई वास्तविक शिकायत संसाधित नहीं होती",
  },
  stats: [
    { value: 8, suffix: "", label: "सांविधिक श्रेणियाँ", sub: "प्रत्येक की अपनी SLA समय-सीमा" },
    { value: 4, suffix: "", label: "समन्वित ब्यूरो", sub: "RB · PGRC · AB · SDC एक पंजिका के अंतर्गत" },
    { value: 5, suffix: "", label: "क्षेत्रीय कार्यालय", sub: "क्षेत्र-विशिष्ट केस दृश्यता" },
    { value: 7, suffix: " दिन", label: "सबसे तेज़ SLA", sub: "रैगिंग व सुरक्षा उल्लंघन" },
  ],
  cap: {
    h2a: "स्टैच्यूट जो माँगता है — वही सब।",
    h2b: "उसके अलावा कुछ नहीं।",
    tiles: [
      {
        eyebrow: "AI-सहायत ट्रायज",
        title: "कॉफ़ी ठंडी होने से पहले वर्गीकरण",
        body: "अभ्यावेदन चिपकाएँ; Sentinel श्रेणी, ब्यूरो, प्राथमिकता और विश्वास स्तर सुझाता है — सांविधिक SLA तालिका पर आधारित, हमेशा अधिकारी द्वारा समीक्षा योग्य।",
      },
      {
        eyebrow: "SLA रडार",
        title: "उल्लंघन होने से पहले पूर्वानुमान",
        body: "हर केस अपनी सांविधिक श्रेणी के विरुद्ध लाइव काउंटडाउन रखता है। ब्रीच-रिस्क रडार वह दिखाता है जो कल फिसलेगा, आज।",
      },
      {
        eyebrow: "ओवरलैप पहचान",
        title: "दो ब्यूरो, एक शिकायत — समन्वित",
        body: "अंतर-ब्यूरो टकराव अलर्ट समानांतर जाँचों को एक समन्वित जाँच में मिलाते हैं — एक मास्टर फ़ाइल के साथ।",
      },
      {
        eyebrow: "अपरिवर्तनीय टाइमलाइन",
        title: "हर कार्रवाई निशान छोड़ती है",
        body: "टिप्पणियाँ, स्थिति परिवर्तन, सुनवाई और अधिरोहण एक केस लेजर में जुड़ते हैं जिसे कोई चुपचाप दोबारा नहीं लिख सकता — ऑडिट-तैयार।",
      },
      {
        eyebrow: "भूमिका-आधारित पहुँच",
        title: "सही फ़ाइल पर सही नज़र",
        body: "ब्यूरो अधिकारियों से सक्षम प्राधिकारी तक छह भूमिकाएँ — हर क्वेरी पर क्षेत्र और ब्यूरो स्कोपिंग लागू।",
      },
      {
        eyebrow: "जनता ट्रैकर",
        title: "नागरिक प्रगति देखें, खाता ज़रूरी नहीं",
        body: "पावती पंजिका संख्या रखने वाला कोई भी व्यक्ति लाइव स्थिति, ब्यूरो, सुनवाई और पूरी टाइमलाइन देख सकता है — /track पर।",
      },
    ],
    illustrative: "उदाहरणस्वरूप",
    watchlist: "ब्रीच-रिस्क वॉचलिस्ट",
    watchlistSub: "ब्रीच तक शेष दिनों के अनुसार",
    rows: ["संस्था को नोटिस जारी", "सुनवाई निर्धारित · क्षेत्रीय कार्यालय", "निर्देशों के साथ निपटान"],
    underProcess: "प्रक्रिया में · सुनवाई निर्धारित",
  },
  sla: {
    eyebrow: "सांविधिक घड़ी",
    h2: "समय-सीमाएँ सुझाव नहीं हैं। Sentinel इन्हें वैसा ही मानता है।",
    sub: "प्रत्येक शिकायत श्रेणी की अपनी सांविधिक निपटान अवधि है। Sentinel हर एक की उलटी गिनती करता है, सीमा पर अधिकारियों को चेतावनी देता है, पोर्टफोलियो भर में ब्रीच का पूर्वानुमान रखता है, और सुनवाइयों को कैलेंडर से संरेखित रखता है।",
    days: "दिन",
    cats: [
      "रैगिंग व सुरक्षा",
      "प्रमाणपत्र रोकना",
      "कैपिटेशन शुल्क",
      "संकाय वेतन अदायगी",
      "इंफ्रास्ट्रक्चर व लैब",
      "अनुमोदित-विहीन कोर्स",
      "प्रवेश अनियमितताएँ",
      "अन्य शिकायतें",
    ],
  },
  how: {
    eyebrow: "यह कैसे काम करता है",
    h2: "शिकायत से निपटान तक, रिकॉर्ड पर।",
    sub: "हर शिकायत उसी सांविधिक मार्ग पर चलती है — पंजीकृत, समयबद्ध, निपटान और प्रकाशित। रिकॉर्ड से बाहर कुछ नहीं होता, और यह कोई भी जाँच सकता है।",
    link: "प्रकाशित आँकड़े देखें",
    stepLabel: "चरण",
    steps: [
      {
        title: "फ़ाइल और पंजीकरण",
        body: "शिकायत एक अद्वितीय पंजिका संख्या के साथ पंजिका में दर्ज होती है। सांविधिक घड़ी तुरंत शुरू — निपटान की समय-सीमा श्रेणी से तय होती है, सुविधा से नहीं।",
      },
      {
        title: "सांविधिक प्रक्रिया",
        body: "उत्तरदायी ब्यूरो केस पर काम करता है और हर कार्रवाई एक अपरिवर्तनीय टाइमलाइन में दर्ज होती है। लाइव SLA रिंग दिखाती है कि कानूनी अवधि में कितना समय बचा है।",
      },
      {
        title: "निपटान और सार्वजनिक प्रकटीकरण",
        body: "निवारण दर्ज होता है और पूरी यात्रा जनता ट्रैकर पर प्रकाशित होती है। नागरिक बदलावों पर नज़र रख सकते हैं या अंतिम स्थिति रिपोर्ट प्रिंट कर सकते हैं।",
      },
    ],
  },
  faq: {
    h2: "सवाल, जवाब के साथ।",
    items: [
      {
        q: "शिकायत कौन ट्रैक कर सकता है?",
        a: "पावती पर छपी पंजिका संख्या रखने वाला कोई भी। न कोई खाता, न व्यक्तिगत डेटा — स्थिति पृष्ठ पूरी तरह सार्वजनिक है।",
      },
      {
        q: "सांविधिक समय-सीमा बीत जाने पर क्या होता है?",
        a: "केस चिह्नित होकर सक्षम प्राधिकारी को अधिरोहित किया जाता है। ब्रीच और देयता-निकट अवस्थाएँ हर केस कार्ड और प्रकाशित पारदर्शिता आँकड़ों में दिखती हैं।",
      },
      {
        q: "क्या शिकायतकर्ता की जानकारी सार्वजनिक है?",
        a: "नहीं। सार्वजनिक प्रकटीकरण में श्रेणी, संस्था, ब्यूरो, टाइमलाइन घटनाएँ और स्थिति ही शामिल है। नाम, संपर्क, आंतरिक डेस्क नोट और साक्ष्य दस्तावेज़ कभी पंजिका से बाहर नहीं जाते।",
      },
      {
        q: "एक ही संस्था पर डुप्लिकेट शिकायतें कैसे संभलती हैं?",
        a: "ओवरलैप डिटेक्टर ब्यूरो-दर-ब्यूरो समानांतर खुली जाँचें चिह्नित करता है और डुप्लिकेट कार्रवाई से पहले एक लीड ब्यूरो नियुक्त करना अनिवार्य करता है।",
      },
      {
        q: "परिषद कौन-सी श्रेणियाँ स्वीकार करती है?",
        a: "कैपिटेशन शुल्क व अधिवसूली, संकाय वेतन अदायगी, इंफ्रास्ट्रक्चर कमियाँ, दस्तावेज़ रोकना, अनुमोदन अनियमितताएँ और अन्य — प्रत्येक की अपनी सांविधिक समय-सीमा।",
      },
      {
        q: "क्या यह आधिकारिक AICTE उत्पाद है?",
        a: "नहीं — यह Smart India Hackathon का नमूना डेटा वाला प्रदर्शन है, जो दिखाता है कि सांविधिक शिकायत डेस्क खुले तौर पर कैसे काम कर सकती है।",
      },
    ],
  },
  access: {
    h2: "आप जब तैयार हों।",
    cards: [
      {
        title: "अधिकारी व प्रशासक",
        body: "अपने AICTE ईमेल से साइन इन करें। साइन-इन पृष्ठ पर डेमो खाते एक क्लिक दूर हैं — पासवर्ड खोजने की ज़रूरत नहीं।",
        cta: "साइन इन खोलें",
      },
      {
        title: "नागरिक व शिकायतकर्ता",
        body: "पावती पर पंजिका संख्या है? अपनी शिकायत की लाइव स्थिति सार्वजनिक रूप से देखें — कभी साइन-इन नहीं।",
        cta: "शिकायत ट्रैक करें",
      },
    ],
  },
  footer: {
    tracker: "जनता ट्रैकर",
    transparency: "पारदर्शिता",
    signIn: "साइन इन",
    disclaimer: "Smart India Hackathon प्रदर्शन · आधिकारिक AICTE उत्पाद नहीं",
  },
};

export const landing = { en: landingEn, hi: landingHi };
export type LandingDict = typeof landingEn;

/* ── Track ────────────────────────────────────────────────────────────────── */

const trackEn = {
  header: { officerSignIn: "Officer sign-in", goi: "Government of India" },
  hero: {
    eyebrow: "Public disclosure · No sign-in required",
    title: "Where is my grievance?",
    sub: "Track any grievance you filed with AICTE using the registry number on your acknowledgement slip. No account or personal data is needed.",
  },
  lookup: {
    label: "Registry number",
    button: "Track status",
    checking: "Checking…",
    shortError: "Enter the full registry number exactly as printed on your acknowledgement slip.",
    demoLabel: "Demo registry numbers",
    demoNotes: ["Capitation fee grievance — SLA breached", "Document withholding — coordination in progress"],
  },
  statusAsOn: "Status as on",
  result: {
    statutoryWindow: "Statutory window",
    institution: "Institution",
    responsibleWing: "Responsible wing",
    hearing: "Hearing:",
    hearingNone: "not yet scheduled",
    latestFrom: "Latest update from the Council:",
    printReport: "Print report",
    printTitle: "Print or save this status report as PDF",
  },
  journey: {
    heading: "Journey of your grievance",
    labels: {
      RECEIVED: "Grievance registered",
      STATUS_CHANGED: "Status updated",
      DISPOSED: "Grievance redressed (disposed)",
      ESCALATED: "Escalated to competent authority",
      HEARING_SCHEDULED: "Hearing scheduled",
    } as Record<string, string>,
    note: "Coordination notes, officer attributions and evidence documents are internal records and are not part of public disclosure.",
  },
  watch: {
    heading: "Keep watching this grievance",
    bodyPlain:
      "Leave your email and the Council's disclosure desk will notify you when the status of this grievance changes.",
    countSingle: "citizen is tracking it",
    countPlural: "citizens are tracking them",
    watchSub: "Leave your email and the Council's disclosure desk will notify you when the status changes.",
    button: "Notify me",
    successNote: (email: string) => `You will be notified at ${email}`,
    privacy:
      "Only the registry number and your email are stored. Unsubscribe by replying to any notification. This demo deployment does not send live email.",
  },
  footer: {
    note: "AICTE public grievance disclosure · Demonstration deployment seeded with synthetic data.",
  },
  errors: {
    lookupFail: "Lookup failed. Please try again.",
    subscribeFail: "Could not subscribe right now. Please try again later.",
  },
};

const trackHi: typeof trackEn = {
  header: { officerSignIn: "अधिकारी साइन-इन", goi: "भारत सरकार" },
  hero: {
    eyebrow: "सार्वजनिक प्रकटीकरण · साइन-इन आवश्यक नहीं",
    title: "मेरी शिकायत कहाँ तक पहुँची?",
    sub: "पावती पर्ची पर छपी पंजिका संख्या से AICTE में दर्ज अपनी किसी भी शिकायत की स्थिति देखें। न कोई खाता, न व्यक्तिगत डेटा चाहिए।",
  },
  lookup: {
    label: "पंजिका संख्या",
    button: "स्थिति देखें",
    checking: "जाँच हो रही है…",
    shortError: "पावती पर्ची पर छपी पूरी पंजिका संख्या ठीक वैसे ही दर्ज करें।",
    demoLabel: "डेमो पंजिका संख्याएँ",
    demoNotes: ["कैपिटेशन शुल्क शिकायत — SLA उल्लंघित", "दस्तावेज़ रोकना — समन्वय प्रक्रिया में"],
  },
  statusAsOn: "इस समय की स्थिति:",
  result: {
    statutoryWindow: "सांविधिक अवधि",
    institution: "संस्था",
    responsibleWing: "उत्तरदायी विंग",
    hearing: "सुनवाई:",
    hearingNone: "अभी निर्धारित नहीं",
    latestFrom: "परिषद का नवीनतम अद्यतन:",
    printReport: "रिपोर्ट प्रिंट करें",
    printTitle: "इस स्थिति रिपोर्ट को प्रिंट करें या PDF के रूप में सहेजें",
  },
  journey: {
    heading: "आपकी शिकायत की यात्रा",
    labels: {
      RECEIVED: "शिकायत दर्ज",
      STATUS_CHANGED: "स्थिति अद्यतन",
      DISPOSED: "शिकायत निवारित (निपटान)",
      ESCALATED: "सक्षम प्राधिकारी को अधिरोहित",
      HEARING_SCHEDULED: "सुनवाई निर्धारित",
    } as Record<string, string>,
    note: "समन्वय नोट्स, अधिकारी विवरण और साक्ष्य दस्तावेज़ आंतरिक रिकॉर्ड हैं और सार्वजनिक प्रकटीकरण का हिस्सा नहीं।",
  },
  watch: {
    heading: "इस शिकायत पर नज़र रखें",
    bodyPlain:
      "अपना ईमेल छोड़ें — इस शिकायत की स्थिति बदलने पर परिषद की प्रकटीकरण डेस्क आपको सूचित करेगी।",
    countSingle: "नागरिक इस पर नज़र रख रहा है",
    countPlural: "नागरिक नज़र रख रहे हैं",
    watchSub: "अपना ईमेल छोड़ें — स्थिति बदलने पर आपको सूचित किया जाएगा।",
    button: "मुझे सूचित करें",
    successNote: (email: string) => `आपको ${email} पर सूचित किया जाएगा`,
    privacy:
      "केवल पंजिका संख्या और आपका ईमेल संग्रहित होता है। किसी भी सूचना का उत्तर देकर सदस्यता हटाएँ। यह डेमो लाइव ईमेल नहीं भेजता।",
  },
  footer: {
    note: "AICTE सार्वजनिक शिकायत प्रकटीकरण · सिंथेटिक डेटा वाला प्रदर्शन डिप्लॉयमेंट।",
  },
  errors: {
    lookupFail: "लुकअप विफल। कृपया पुनः प्रयास करें।",
    subscribeFail: "अभी सदस्यता नहीं ले सकते। कृपया पुनः प्रयास करें।",
  },
};

export const track = { en: trackEn, hi: trackHi };
export type TrackDict = typeof trackEn;

/**
 * Static public-page dictionaries (English / Hindi / Tamil / Telugu / Bengali)
 * — no API key, no runtime dependency. Covers the narrative public surfaces:
 * landing, citizen tracker and transparency. Server-sourced values (registry
 * numbers, status pills, SLA status text) stay as-is.
 *
 * Regional dictionaries are intentionally partial: `resolveDict` deep-merges
 * them over the full English dictionary so any untranslated key falls back
 * safely instead of rendering `undefined`. English and Hindi strings are kept
 * byte-identical to their originals.
 */

export type Lang = "en" | "hi" | "ta" | "te" | "bn";

/** All citizen-selectable content languages, in toggle order. */
export const LANGS: readonly Lang[] = ["en", "hi", "ta", "te", "bn"];

/** Intl locale used for dates rendered inside a translated surface. */
export const LOCALE_BY_LANG: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
};

/** A dictionary may supply any subset of keys; functions and arrays are
 * resolved element-wise / treated as complete values. */
export type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly (infer U)[]
    ? DeepPartial<U>[]
    : T extends Date
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Deep-merge a (possibly partial) dictionary over its English base. Missing
 * keys, missing array elements and missing array-element keys all fall back to
 * the English value. Exported for the dictionary test-suite and for any future
 * language added without having to translate every long-tail string at once.
 */
export function resolveDict<T>(base: T, override?: DeepPartial<NoInfer<T>>): T {
  if (override === undefined || override === null) return base;
  if (typeof override === "function") return override as T;

  if (Array.isArray(base)) {
    const incoming = Array.isArray(override) ? override : [];
    return base.map((item, i) =>
      resolveDict(item, incoming[i] as DeepPartial<typeof item>)
    ) as T;
  }

  if (isRecord(base) && isRecord(override)) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(override)) {
      const fallback = (base as Record<string, unknown>)[key];
      out[key] =
        value === undefined
          ? fallback
          : resolveDict(fallback, value as DeepPartial<unknown>);
    }
    return out as T;
  }

  return override as T;
}

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

/* ── Regional landing dictionaries (partial; English fills the gaps) ──────── */

const landingTa: DeepPartial<LandingDict> = {
  nav: {
    capabilities: "திறன்கள்",
    statutoryClock: "சட்டப்பூர்வ காலக்கெடு",
    how: "எப்படி செயல்படுகிறது",
    faq: "கேள்விகள்",
    access: "அணுகல்",
    tracker: "டிரேக்கர்",
    transparency: "வெளிப்படைத்தன்மை",
    signIn: "உள்நுழைய",
    homeAria: "AICTE Sentinel முகப்பு",
  },
  hero: {
    badge: "சட்டப்பூர்வ புகார் கண்காணிப்பு · AICTE",
    line1: "ஒவ்வொரு புகாரும்.",
    line2: "பொறுப்புடன்.",
    sub: "Sentinel என்பது AICTE-யின் அனைத்து பணியகங்களுக்கும் புகார் தீர்க்கும் ஒரே நம்பகமான ஆதாரம் — சட்டப்பூர்வ SLA கடிகாரங்கள் வழுக்கிவிடாமல், பணியகங்களிடையே ஒருங்கிணைப்பு, AI உதவியுடன் முன்வகைப்படுத்தல் — அனைத்தும் ஒரே கட்டளை மையத்தில்.",
    ctaCommand: "கட்டளை மையத்தைத் திறக்க",
    ctaTrack: "புகாரை நிகழ்நிலை காண்க",
    note: "மாதிரி தரவுகளுடன் கூடிய செயற்கூர்வ சூழல் · உண்மையான புகார்கள் செயலாக்கப்படவில்லை",
  },
  stats: [
    { label: "சட்டப்பூர்வ வகைகள்" },
    { label: "ஒருங்கிணைக்கப்பட்ட பணியகங்கள்" },
    { label: "மண்டல அலுவலகங்கள்" },
    { label: "வேகமான SLA கடிகாரம்" },
  ],
  cap: {
    h2a: "சட்டம் எதிர்பார்ப்பதெல்லாம்.",
    h2b: "அதற்கு மேல் ஒன்றுமில்லை.",
    tiles: [
      { eyebrow: "AI உதவி வகைப்படுத்தல்", title: "காபி குளிர்வதற்கு முன் வகைப்படுத்தல்" },
      { eyebrow: "SLA ரேடார்", title: "மீறலை முன்கூட்டியே காணல்" },
      { eyebrow: "ஒவர்லேப் கண்டறிதல்", title: "இரு பணியகங்கள், ஒரு புகார் — ஒருங்கிணைப்பு" },
      { eyebrow: "மாற்ற இயலாத காலவரிசை", title: "ஒவ்வொரு நடவடிக்கையும் சுவடு விடும்" },
      { eyebrow: "பங்கு அடிப்படை அணுகல்", title: "சரியான கோப்பில் சரியான பார்வை" },
      { eyebrow: "பொது டிரேக்கர்", title: "குடிமக்கள் முன்னேற்றம் காணலாம் — கணக்கு தேவையில்லை" },
    ],
    illustrative: "உதாரணத்திற்கு",
    watchlist: "மீறல்-ஆபத்து பட்டியல்",
    watchlistSub: "மீறலுக்கு எஞ்சிய நாட்களின்படி",
    underProcess: "நடவடிக்கையில் · விசாரணை நியமிக்கப்பட்டது",
  },
  sla: {
    eyebrow: "சட்டப்பூர்வ கடிகாரம்",
    h2: "காலக்கெடு பரிந்துரை அல்ல — Sentinel அதை அப்படியே கருதுகிறது.",
    sub: "ஒவ்வொரு புகார் வகைக்கும் சட்டப்பூர்வ தீர்வு காலம் உண்டு. Sentinel ஒவ்வொன்றையும் குறைந்து கொண்டிருக்கும் நாட்களைக் கணக்கிடுகிறது, தொழிலாளர்களை எச்சரிக்கிறது, போர்ட்ஃபோலியோ முழுவதும் மீறலை முன்கணிக்கிறது.",
    days: "நாட்கள்",
    cats: [
      "ராகிங் & பாதுகாப்பு",
      "சான்றிதழ் தடுத்தல்",
      "காப்பிடேஷன் கட்டணம்",
      "பேராசிரியர் ஊதியம்",
      "உள்கட்டமைப்பு & ஆய்வகம்",
      "அனுமதியற்ற படிப்புகள்",
      "சேர்க்கை முறைகேடுகள்",
      "பிற புகார்கள்",
    ],
  },
  how: {
    eyebrow: "எப்படி செயல்படுகிறது",
    h2: "புகார் முதல் தீர்வு வரை — பதிவில்.",
    sub: "ஒவ்வொரு புகாரும் ஒரே சட்டப்பூர்வ பாதையைப் பின்பற்றும் — பதிவு, காலக்கணக்கு, தீர்வு, வெளியீடு. பதிவுக்கு வெளியே எதுவும் நடக்காது; யாரும் சரிபார்க்க முடியும்.",
    link: "வெளியிடப்பட்ட எண்ணிக்கைகளைக் காண்க",
    stepLabel: "படி",
  },
  faq: { h2: "கேள்விகள், பதிலுடன்." },
  access: {
    h2: "நீங்கள் தயாரானபோது.",
    cards: [
      {
        title: "அதிகாரிகள் மற்றும் நிர்வாகிகள்",
        body: "உங்கள் AICTE மின்னஞ்சலுடன் உள்நுழையுங்கள். டெமோ கணக்குகள் உள்நுழைவு பக்கத்தில் ஒரு க্লிக்கில் உள்ளன.",
        cta: "உள்நுழைவைத் திறக்க",
      },
      {
        title: "குடிமக்கள் மற்றும் புகாராளர்கள்",
        body: "ரசீதில் பதிவு எண் உள்ளதா? உங்கள் புகாரின் நிலையை பொதுவாக, எப்போதும் உள்நுழைவின்றி காண்க.",
        cta: "புகாரைக் காண்க",
      },
    ],
  },
  footer: {
    tracker: "பொது டிரேக்கர்",
    transparency: "வெளிப்படைத்தன்மை",
    signIn: "உள்நுழைய",
    disclaimer: "Smart India Hackathon மாதிரி · AICTE அதிகாரப்பூர்வ தயாரிப்பு அல்ல",
  },
};

const landingTe: DeepPartial<LandingDict> = {
  nav: {
    capabilities: "సామర్థ్యాలు",
    statutoryClock: "చట్టపరమైన గడువు",
    how: "ఎలా పనిచేస్తుంది",
    faq: "ప్రశ్నలు",
    access: "ప్రవేశం",
    tracker: "ట్రాకర్",
    transparency: "పారదర్శకత",
    signIn: "సైన్-ఇన్",
    homeAria: "AICTE Sentinel హోమ్",
  },
  hero: {
    badge: "చట్టపరమైన ఫిర్యాదు పర్యవేక్షణ · AICTE",
    line1: "ప్రతి ఫిర్యాదూ.",
    line2: "జవాబుదారీగా.",
    sub: "Sentinel అనేది AICTE అన్ని విభాగాలకూ ఫిర్యాదు పరిష్కారానికి ఒకే విశ్వసనీయ వనరు — చట్టపరమైన SLA గడియారాలు మెల్లగా జారిపోకుండా, విభాగాల మధ్య సమన్వయం, AI సహిత వర్గీకరణ — అన్నీ ఒకే కమాండ్ సెంటర్ లో.",
    ctaCommand: "కమాండ్ సెంటర్ తెరవండి",
    ctaTrack: "ఫిర్యాదు ట్రాక్ చేయండి",
    note: "నమూనా డేటాతో కూడిన ప్రదర్శన · నిజమైన ఫిర్యాదులు ప్రాసెస్ చేయబడవు",
  },
  stats: [
    { label: "చట్టపరమైన వర్గాలు" },
    { label: "సమన్వయ విభాగాలు" },
    { label: "ప్రాంతీయ కార్యాలయాలు" },
    { label: "వేగవంతమైన SLA గడువు" },
  ],
  cap: {
    h2a: "చట్టం కోరేది అంతా.",
    h2b: "దానికి మించి ఏమీ లేదు.",
    tiles: [
      { eyebrow: "AI సహిత వర్గీకరణ", title: "కాఫీ చల్లబడే ముందే వర్గీకరణ" },
      { eyebrow: "SLA రాడార్", title: "ఉల్లంఘనను ముందుగానే ఊహించడం" },
      { eyebrow: "ఓవర్లాప్ గుర్తింపు", title: "రెండు విభాగాలు, ఒక ఫిర్యాదు — సమన్వయం" },
      { eyebrow: "మార్చలేని కాలరేఖ", title: "ప్రతి చర్యకూ ఒక గుర్తు" },
      { eyebrow: "పాత్ర ఆధారిత ప్రవేశం", title: "సరైన ఫైల్ కు సరైన దృష్టి" },
      { eyebrow: "పబ్లిక్ ట్రాకర్", title: "పౌరులు పురోగతి చూడొచ్చు — ఖాతా అవసరం లేదు" },
    ],
    illustrative: "ఉదాహరణకు",
    watchlist: "ఉల్లంఘన-రిస్క్ జాబితా",
    watchlistSub: "మిగిలిన రోజుల వారీగా",
    underProcess: "ప్రక్రియలో · విచారణ నిర్ణయించబడింది",
  },
  sla: {
    eyebrow: "చట్టపరమైన గడియారం",
    h2: "గడువులు సూచనలు కాదు — Sentinel వాటిని అలాగే పరిగణిస్తుంది.",
    sub: "ప్రతి ఫిర్యాదు వర్గానికి చట్టపరమైన పరిష్కార గడువుంది. Sentinel ప్రతీదానికీ వెనుకగణన చేస్తుంది, గడువు దగ్గర అధికారులను హెచ్చరిస్తుంది, పోర్ట్ ఫోలియో అంతటా ఉల్లంఘనను ముందుగానే చూపిస్తుంది.",
    days: "రోజులు",
    cats: [
      "ర్యాగింగ్ & భద్రత",
      "ధృవపత్రాలు నిలిపివేత",
      "క్యాపిటేషన్ ఫీజు",
      "అధ్యాపకుల చెల్లింపులు",
      "మౌలిక సదుపాయాలు & ల్యాబ్ లు",
      "అనుమతి లేని కోర్సులు",
      "ప్రవేశ అక్రమాలు",
      "ఇతర ఫిర్యాదులు",
    ],
  },
  how: {
    eyebrow: "ఎలా పనిచేస్తుంది",
    h2: "ఫిర్యాదు నుంచి పరిష్కారం వరకు — రికార్డ్ మీద.",
    sub: "ప్రతి ఫిర్యాదూ అదే చట్టపరమైన మార్గంలో వెళుతుంది — నమోదు, గడువు, పరిష్కారం, ప్రచురణ. రికార్డ్ వెలుపల ఏమీ జరగదు; ఎవరైనా ధృవీకరించొచ్చు.",
    link: "ప్రచురించిన గణాంకాలు చూడండి",
    stepLabel: "దశ",
  },
  faq: { h2: "ప్రశ్నలు, సమాధానాలతో." },
  access: {
    h2: "మీరు సిద్ధంగా ఉన్నప్పుడు.",
    cards: [
      {
        title: "అధికారులు & నిర్వాహకులు",
        body: "మీ AICTE ఈమెయిల్ తో సైన్-ఇన్ చేయండి. డెమో ఖాతాలు సైన్-ఇన్ పేజీలో ఒక క్లిక్ దూరంలో ఉన్నాయి.",
        cta: "సైన్-ఇన్ తెరవండి",
      },
      {
        title: "పౌరులు & ఫిర్యాదుదారులు",
        body: "రసీదుపై రిజిస్ట్రీ నంబర్ ఉందా? ఎప్పుడూ సైన్-ఇన్ లేకుండానే మీ ఫిర్యాదు లైవ్ స్థితి చూడండి.",
        cta: "ఫిర్యాదు ట్రాక్ చేయండి",
      },
    ],
  },
  footer: {
    tracker: "పబ్లిక్ ట్రాకర్",
    transparency: "పారదర్శకత",
    signIn: "సైన్-ఇన్",
    disclaimer: "Smart India Hackathon ప్రదర్శన · అధికారిక AICTE ఉత్పత్తి కాదు",
  },
};

const landingBn: DeepPartial<LandingDict> = {
  nav: {
    capabilities: "সক্ষমতা",
    statutoryClock: "বৈধানিক সময়সীমা",
    how: "কীভাবে কাজ করে",
    faq: "প্রশ্নোত্তর",
    access: "প্রবেশ",
    tracker: "ট্র্যাকার",
    transparency: "স্বচ্ছতা",
    signIn: "সাইন-ইন",
    homeAria: "AICTE Sentinel হোমপেজ",
  },
  hero: {
    badge: "বৈধানিক অভিযোগ পর্যবেক্ষণ · AICTE",
    line1: "প্রতিটি অভিযোগ।",
    line2: "জবাবদিহিমূলক।",
    sub: "Sentinel হলো AICTE-র সকল বিভাগের অভিযোগ সমাধানের একমাত্র বিশ্বস্ত উৎস — বৈধানিক SLA ঘড়ি চুপিচুপি পিছলে যাবে না, বিভাগগুলোর মধ্যে সমন্বয়, এবং AI-সহায়িত শ্রেণীবিভাগ — সবই একটি কমান্ড সেন্টারে।",
    ctaCommand: "কমান্ড সেন্টার খুলুন",
    ctaTrack: "অভিযোগ ট্র্যাক করুন",
    note: "নমুনা ডেটা দিয়ে ডেমো পরিবেশ · কোনো বাস্তব অভিযোগ প্রক্রিয়া করা হয় না",
  },
  stats: [
    { label: "বৈধানিক বিভাগ" },
    { label: "সমন্বয়কৃত ব্যুরো" },
    { label: "আঞ্চলিক কার্যালয়" },
    { label: "দ্রুততম SLA সময়সীমা" },
  ],
  cap: {
    h2a: "আইন যা চায়, সবই।",
    h2b: "তার বাইরে কিছু নয়।",
    tiles: [
      { eyebrow: "AI-সহায়িত শ্রেণীবিভাগ", title: "কফি ঠান্ডা হওয়ার আগেই শ্রেণীবিভাগ" },
      { eyebrow: "SLA রাডার", title: "লঙ্ঘন আগে থেকেই দেখা" },
      { eyebrow: "ওভারল্যাপ শনাক্তকরণ", title: "দুই ব্যুরো, এক অভিযোগ — সমন্বয়" },
      { eyebrow: "অপরিবর্তনীয় সময়রেখা", title: "প্রতিটি পদক্ষেপের ছাপ পড়ে" },
      { eyebrow: "ভূমিকা-ভিত্তিক প্রবেশ", title: "সঠিক ফাইলে সঠিক দৃষ্টি" },
      { eyebrow: "পাবলিক ট্র্যাকার", title: "নাগরিকেরা অগ্রগতি দেখতে পারেন — কোনো অ্যাকাউন্ট নেই" },
    ],
    illustrative: "উদাহরণস্বরূপ",
    watchlist: "লঙ্ঘন-ঝুঁকি তালিকা",
    watchlistSub: "লঙ্ঘনের আগে বাকি দিন অনুযায়ী",
    underProcess: "প্রক্রিয়াধীন · শুনানি নির্ধারিত",
  },
  sla: {
    eyebrow: "বৈধানিক ঘড়ি",
    h2: "সময়সীমা পরামর্শ নয় — Sentinel সেটিকে তেমনই গণ্য করে।",
    sub: "প্রতিটি অভিযোগ বিভাগের নিজস্ব বৈধানিক সমাধান সময় আছে। Sentinel প্রতিটির কাউন্টডাউন রাখে, কর্মকর্তাদের সতর্ক করে, পোর্টফোলিও জুড়ে লঙ্ঘনের পূর্বাভাস দেয়।",
    days: "দিন",
    cats: [
      "র্যাগিং ও নিরাপত্তা",
      "সনদ আটকানো",
      "ক্যাপিটেশন ফি",
      "অধ্যাপক বেতন",
      "অবকাঠামো ও ল্যাব",
      "অননুমোদিত কোর্স",
      "ভর্তি অনিয়ম",
      "অন্যান্য অভিযোগ",
    ],
  },
  how: {
    eyebrow: "কীভাবে কাজ করে",
    h2: "অভিযোগ থেকে সমাধান — রেকর্ডের উপর।",
    sub: "প্রতিটি অভিযোগ একই বৈধানিক পথে চলে — নিবন্ধন, সময়নির্ধারণ, সমাধান, প্রকাশ। রেকর্ডের বাইরে কিছু হয় না, যা যেকেউ যাচাই করতে পারেন।",
    link: "প্রকাশিত সংখ্যা দেখুন",
    stepLabel: "ধাপ",
  },
  faq: { h2: "প্রশ্ন, উত্তরসহ।" },
  access: {
    h2: "আপনি প্রস্তুত হলে।",
    cards: [
      {
        title: "কর্মকর্তা ও প্রশাসক",
        body: "আপনার AICTE ইমেইল দিয়ে সাইন-ইন করুন। ডেমো অ্যাকাউন্ট সাইন-ইন পেজেই এক ক্লিকে আছে।",
        cta: "সাইন-ইন খুলুন",
      },
      {
        title: "নাগরিক ও অভিযোগকারী",
        body: "রসিদে রেজিস্ট্রি নম্বর আছে? কখনো সাইন-ইন না করেই নিজের অভিযোগের লাইভ অবস্থা দেখুন।",
        cta: "অভিযোগ ট্র্যাক করুন",
      },
    ],
  },
  footer: {
    tracker: "পাবলিক ট্র্যাকার",
    transparency: "স্বচ্ছতা",
    signIn: "সাইন-ইন",
    disclaimer: "Smart India Hackathon ডেমো · অফিসিয়াল AICTE পণ্য নয়",
  },
};

export const landing = {
  en: landingEn,
  hi: landingHi,
  ta: resolveDict(landingEn, landingTa),
  te: resolveDict(landingEn, landingTe),
  bn: resolveDict(landingEn, landingBn),
};
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
  feedback: {
    heading: "How well was your grievance redressed?",
    sub: "Your feedback goes straight into the Council's published quality-of-redressal statistics. Rating the redressal takes a minute — no sign-in, no personal data.",
    rateLabel: "Tap a star to rate the redressal (1 = poor, 5 = excellent)",
    commentLabel: "Anything to add? (optional)",
    commentPlaceholder: "What went well, or what could the Council improve…",
    submit: "Share feedback",
    submitting: "Recording…",
    update: "Update feedback",
    recordedLabel: "Your feedback is recorded",
    recordedNote: (date: string) => `Last recorded ${date}. You can revise it below.`,
    thankYou: "Thank you — your rating is now part of this grievance's public record.",
    notDisposed:
      "Feedback opens once the grievance is disposed (redressal completed). You will be able to rate it then.",
    privacy: "Only the rating and this note are stored against the registry number — no name, no email, no profile.",
  },
  footer: {
    note: "AICTE public grievance disclosure · Demonstration deployment seeded with synthetic data.",
  },
  errors: {
    lookupFail: "Lookup failed. Please try again.",
    subscribeFail: "Could not subscribe right now. Please try again later.",
    feedbackFail: "Could not record the feedback right now. Please try again later.",
  },
  /** In-app watcher digest — see the "My updates" panel on /track. */
  digest: {
    heading: "My updates",
    sub: "Enter the email you used to follow a grievance. Status changes recorded in this demo appear here — no live email is sent.",
    emailLabel: "Email address",
    button: "Show my updates",
    checking: "Checking…",
    empty: "No updates yet for this email. Once a tracked grievance changes, its update will appear here.",
    found: (count: number) =>
      `${count} update${count === 1 ? "" : "s"} for this email`,
    privacy:
      "Only updates for the email you enter are shown. Other citizens' emails are never displayed. Lookups are rate-limited.",
    error: "Could not load updates right now. Please try again later.",
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
  feedback: {
    heading: "आपकी शिकायत कितनी अच्छी तरह निपटाई गई?",
    sub: "आपकी प्रतिक्रिया सीधे परिषद के प्रकाशित निपटान-गुणवत्ता आंकड़ों में जुड़ती है। एक मिनट में रेटिंग दें — न साइन-इन, न व्यक्तिगत डेटा।",
    rateLabel: "निपटान की रेटिंग देने के लिए तारा चुनें (1 = खराब, 5 = उत्कृष्ट)",
    commentLabel: "और कुछ बताना चाहेंगे? (वैकल्पिक)",
    commentPlaceholder: "क्या अच्छा लगा, या परिषद क्या सुधार कर सकती है…",
    submit: "प्रतिक्रिया भेजें",
    submitting: "दर्ज हो रहा है…",
    update: "प्रतिक्रिया अद्यतन करें",
    recordedLabel: "आपकी प्रतिक्रिया दर्ज हो गई है",
    recordedNote: (date: string) => `अंतिम रूप से ${date} को दर्ज। नीचे से आप इसे बदल सकते हैं।`,
    thankYou: "धन्यवाद — आपकी रेटिंग अब इस शिकायत के सार्वजनिक रिकॉर्ड का हिस्सा है।",
    notDisposed:
      "प्रतिक्रिया तब खुलेगी जब शिकायत निपटाई (निस्तारित) जा चुकी होगी। तब आप इसे रेट कर सकेंगे।",
    privacy: "पंजिका संख्या के साथ केवल रेटिंग और यह टिप्पणी संग्रहित होती है — नाम, ईमेल या प्रोफ़ाइल नहीं।",
  },
  footer: {
    note: "AICTE सार्वजनिक शिकायत प्रकटीकरण · सिंथेटिक डेटा वाला प्रदर्शन डिप्लॉयमेंट।",
  },
  errors: {
    lookupFail: "लुकअप विफल। कृपया पुनः प्रयास करें।",
    subscribeFail: "अभी सदस्यता नहीं ले सकते। कृपया पुनः प्रयास करें।",
    feedbackFail: "प्रतिक्रिया अभी दर्ज नहीं हो सकी। कृपया पुनः प्रयास करें।",
  },
  digest: {
    heading: "मेरे अपडेट",
    sub: "वह ईमेल दर्ज करें जिससे आपने शिकायत की थी। इस डेमो में दर्ज स्थिति परिवर्तन यहाँ दिखेंगे — कोई लाइव ईमेल नहीं भेजा जाता।",
    emailLabel: "ईमेल पता",
    button: "मेरे अपडेट देखें",
    checking: "जाँच हो रही है…",
    empty: "इस ईमेल के लिए अभी कोई अपडेट नहीं है। जब ट्रैक की गई शिकायत की स्थिति बदलेगी, अपडेट यहाँ दिखेगा।",
    found: (count: number) => `इस ईमेल के लिए ${count} अपडेट`,
    privacy:
      "केवल आपके द्वारा दर्ज किए गए ईमेल के अपडेट दिखाए जाते हैं। दूसरे नागरिकों के ईमेल कभी नहीं दिखते। लुकअप दर-सीमित है।",
    error: "अपडेट अभी लोड नहीं हो सके। कृपया बाद में प्रयास करें।",
  },
};

/* ── Regional track dictionaries (partial; English fills the gaps) ────────── */

const trackTa: DeepPartial<TrackDict> = {
  header: { officerSignIn: "அதிகாரி உள்நுழைவு", goi: "இந்திய அரசு" },
  hero: {
    eyebrow: "பொது தகவல் · உள்நுழைவு தேவையில்லை",
    title: "என் புகார் எங்கே உள்ளது?",
    sub: "உங்கள் அறிவிப்பில் உள்ள பதிவு எண்ணைக் கொண்டு AICTE-யில் பதிவு செய்த எந்தப் புகாரையும் நிகழ்நிலையில் காண்க. கணக்கோ தனிப்பட்ட தகவலோ தேவையில்லை.",
  },
  lookup: {
    label: "பதிவு எண்",
    button: "நிலையைக் காண்க",
    checking: "சோதிக்கிறது…",
    shortError: "அறிவிப்பில் அச்சிடப்பட்டுள்ள முழு பதிவு எண்ணையும் சரியாக உள்ளிடவும்.",
    demoLabel: "மாதிரி பதிவு எண்கள்",
    demoNotes: [
      "காப்பிடேஷன் கட்டண புகார் — SLA மீறப்பட்டது",
      "ஆவணங்கள் தடுத்தல் — ஒருங்கிணைப்பு நடந்து வருகிறது",
    ],
  },
  statusAsOn: "நிலை (இதுவரை):",
  result: {
    statutoryWindow: "சட்டப்பூர்வ காலம்",
    institution: "நிறுவனம்",
    responsibleWing: "பொறுப்பான பிரிவு",
    hearing: "விசாரணை:",
    hearingNone: "இதுவரை நியமிக்கப்படவில்லை",
    latestFrom: "கவுன்சிலின் சமீபத்திய புதுப்பிப்பு:",
    printReport: "அறிக்கையை அச்சிடுக",
    printTitle: "இந்த நிலை அறிக்கையை PDF ஆக அச்சிட்டு சேமிக்க",
  },
  journey: {
    heading: "உங்கள் புகாரின் பயணம்",
    labels: {
      RECEIVED: "புகார் பதிவு செய்யப்பட்டது",
      STATUS_CHANGED: "நிலை புதுப்பிக்கப்பட்டது",
      DISPOSED: "புகார் தீர்க்கப்பட்டது",
      ESCALATED: "தகுதியான அதிகாரிக்கு அனுப்பப்பட்டது",
      HEARING_SCHEDULED: "விசாரணை நியமிக்கப்பட்டது",
    },
  },
  watch: {
    heading: "இந்தப் புகாரைத் தொடர்ந்து காண்க",
    bodyPlain: "உங்கள் மின்னஞ்சலை விட்டால், நிலை மாறும்போது கவுன்சில் தகவல் மேஜை உங்களுக்கு அறிவிக்கும்.",
    countSingle: "குடிமகன் இதைப் பின்தொடர்கிறார்",
    countPlural: "குடிமக்கள் இதைப் பின்தொடர்கின்றனர்",
    watchSub: "உங்கள் மின்னஞ்சலை விட்டால் நிலை மாறும்போது அறிவிப்பு கிடைக்கும்.",
    button: "எனக்கு அறிவிக்க",
    successNote: (email: string) => `${email} முகவரிக்கு அறிவிப்பு கிடைக்கும்`,
    privacy: "பதிவு எண்ணும் உங்கள் மின்னஞ்சலும் மட்டுமே சேமிக்கப்படும். இந்த மாதிரி சூழல் நேரடி மின்னஞ்சல் அனுப்புவதில்லை.",
  },
  feedback: {
    heading: "உங்கள் புகார் எவ்வளவு நன்றாகத் தீர்க்கப்பட்டது?",
    sub: "உங்கள் கருத்து கவுன்சிலின் வெளியிடப்பட்ட தீர்க்கும்-தர புள்ளிவிவரங்களில் நேரடியாகச் சேரும். ஒரு நிமிடத்தில் மதிப்பிடுங்கள் — உள்நுழைவோ தனிப்பட்ட தகவலோ இல்லை.",
    rateLabel: "தீர்க்கும் தரத்தை மதிப்பிட நட்சத்திரத்தைத் தேர்ந்தெடுக்கவும் (1 = மோசம், 5 = சிறந்தது)",
    commentLabel: "மேலும் ஏதும் கூற விரும்புகிறீர்களா? (விரும்பினால்)",
    commentPlaceholder: "எது நன்றாக இருந்தது, அல்லது கவுன்சில் என்ன மேம்படுத்த முடியும்…",
    submit: "கருத்தைப் பகிர",
    submitting: "பதிவு செய்யப்படுகிறது…",
    update: "கருத்தைப் புதுப்பிக்க",
    recordedLabel: "உங்கள் கருத்து பதிவு செய்யப்பட்டது",
    recordedNote: (date: string) => `${date} அன்று இறுதியாகப் பதிவு. கீழே மாற்றலாம்.`,
    thankYou: "நன்றி — உங்கள் மதிப்பீடு இப்போது இந்தப் புகாரின் பொது பதிவில் உள்ளது.",
    notDisposed: "புகார் தீர்க்கப்பட்ட பிறகு கருத்து திறக்கும். அப்போது மதிப்பிடலாம்.",
    privacy: "பதிவு எண்ணுடன் மதிப்பீடும் இந்தக் குறிப்பும் மட்டுமே சேமிக்கப்படும் — பெயரோ மின்னஞ்சலோ இல்லை.",
  },
  footer: {
    note: "AICTE பொது புகார் தகவல் · செயற்கூர்வ தரவுகளுடன் கூடிய மாதிரி.",
  },
  errors: {
    lookupFail: "தேடல் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.",
    subscribeFail: "இப்போது சேவை பெற முடியவில்லை. பிறகு முயற்சிக்கவும்.",
    feedbackFail: "கருத்தைப் பதிவு செய்ய முடியவில்லை. பிறகு முயற்சிக்கவும்.",
  },
  digest: {
    heading: "எனது புதுப்பிப்புகள்",
    sub: "புகாரைப் பின்தொடரப் பயன்படுத்திய மின்னஞ்சலை உள்ளிடவும். இந்த மாதிரியில் பதிவான நிலை மாற்றங்கள் இங்கே தோன்றும் — நேரடி மின்னஞ்சல் அனுப்பப்படுவதில்லை.",
    emailLabel: "மின்னஞ்சல் முகவரி",
    button: "எனது புதுப்பிப்புகளைக் காண்க",
    checking: "சோதிக்கிறது…",
    empty: "இந்த முகவரிக்கு இதுவரை புதுப்பிப்புகள் இல்லை. பின்தொடரும் புகாரில் மாற்றம் ஏற்பட்டால் இங்கே தோன்றும்.",
    found: (count: number) => `இந்த முகவரிக்கு ${count} புதுப்பிப்பு(கள்)`,
    privacy: "நீங்கள் உள்ளிட்ட முகவரிக்கான புதுப்பிப்புகள் மட்டுமே காட்டப்படும். மற்றவர்களின் முகவரிகள் ஒருபோதும் காட்டப்படவில்லை. தேடல்கள் வேக வரம்பிற்கு உட்பட்டவை.",
    error: "புதுப்பிப்புகளை ஏற்ற முடியவில்லை. பிறகு முயற்சிக்கவும்.",
  },
};

const trackTe: DeepPartial<TrackDict> = {
  header: { officerSignIn: "అధికారి సైన్-ఇన్", goi: "భారత ప్రభుత్వం" },
  hero: {
    eyebrow: "పబ్లిక్ వెల్లడి · సైన్-ఇన్ అవసరం లేదు",
    title: "నా ఫిర్యాదు ఎక్కడ ఉంది?",
    sub: "మీ రసీదుపై ఉన్న రిజిస్ట్రీ నంబర్ తో AICTE కి దాఖలు చేసిన ఏ ఫిర్యాదైనా లైవ్ గా చూడండి. ఖాతా లేదా వ్యక్తిగత సమాచారం అవసరం లేదు.",
  },
  lookup: {
    label: "రిజిస్ట్రీ నంబర్",
    button: "స్థితి చూడండి",
    checking: "తనిఖీ చేస్తోంది…",
    shortError: "మీ రసీదుపై ముద్రించిన పూర్తి రిజిస్ట్రీ నంబర్ ను అలాగే నమోదు చేయండి.",
    demoLabel: "డెమో రిజిస్ట్రీ నంబర్లు",
    demoNotes: [
      "క్యాపిటేషన్ ఫీజు ఫిర్యాదు — SLA ఉల్లంఘన",
      "పత్రాలు నిలిపివేత — సమన్వయం జరుగుతోంది",
    ],
  },
  statusAsOn: "ఇప్పటి స్థితి:",
  result: {
    statutoryWindow: "చట్టపరమైన గడువు",
    institution: "సంస్థ",
    responsibleWing: "బాధ్యత విభాగం",
    hearing: "విచారణ:",
    hearingNone: "ఇంకా నిర్ణయించలేదు",
    latestFrom: "కౌన్సిల్ యొక్క తాజా తాజాకరణ:",
    printReport: "రిపోర్ట్ ప్రింట్ చేయండి",
    printTitle: "ఈ స్థితి రిపోర్ట్ ను PDF గా భద్రపరచండి",
  },
  journey: {
    heading: "మీ ఫిర్యాదు ప్రయాణం",
    labels: {
      RECEIVED: "ఫిర్యాదు నమోదైంది",
      STATUS_CHANGED: "స్థితి తాజాకరించబడింది",
      DISPOSED: "ఫిర్యాదు పరిష్కరించబడింది",
      ESCALATED: "సమర్థ అధికారికి పంపబడింది",
      HEARING_SCHEDULED: "విచారణ నిర్ణయించబడింది",
    },
  },
  watch: {
    heading: "ఈ ఫిర్యాదును గమనించండి",
    bodyPlain: "మీ ఈమెయిల్ ఇస్తే, స్థితి మారినప్పుడు కౌన్సిల్ వెల్లడి డెస్క్ మీకు తెలియజేస్తుంది.",
    countSingle: "వ్యక్తి దీన్ని గమనిస్తున్నారు",
    countPlural: "వ్యక్తులు దీన్ని గమనిస్తున్నారు",
    watchSub: "మీ ఈమెయిల్ ఇస్తే స్థితి మారినప్పుడు సమాచారం లభిస్తుంది.",
    button: "నాకు తెలియజేయండి",
    successNote: (email: string) => `${email} కు సమాచారం లభిస్తుంది`,
    privacy: "రిజిస్ట్రీ నంబర్, మీ ఈమెయిల్ మాత్రమే భద్రపరచబడతాయి. ఈ డెమో లైవ్ ఈమెయిల్ పంపదు.",
  },
  feedback: {
    heading: "మీ ఫిర్యాదు ఎంత బాగా పరిష్కరించబడింది?",
    sub: "మీ అభిప్రాయం కౌన్సిల్ ప్రచురించే పరిష్కార-నాణ్యత గణాంకాల్లోకి నేరుగా చేరుతుంది. ఒక నిమిషంలో రేట్ చేయండి — సైన్-ఇన్ లేదా వ్యక్తిగత సమాచారం అవసరం లేదు.",
    rateLabel: "పరిష్కారాన్ని రేట్ చేయడానికి స్టార్ ఎంచుకోండి (1 = చెడు, 5 = అత్యుత్తమం)",
    commentLabel: "ఇంకేం చెప్పాలనుకుంటున్నారా? (ఐచ్ఛికం)",
    commentPlaceholder: "ఏది బాగుంది, లేదా కౌన్సిల్ ఏది మెరుగుపరచాలి…",
    submit: "అభిప్రాయం పంచండి",
    submitting: "నమోదు చేస్తోంది…",
    update: "అభిప్రాయం తాజాకరించండి",
    recordedLabel: "మీ అభిప్రాయం నమోదైంది",
    recordedNote: (date: string) => `చివరిగా ${date} న నమోదు. కింద మార్చుకోవచ్చు.`,
    thankYou: "ధన్యవాదాలు — మీ రేటింగ్ ఇప్పుడు ఈ ఫిర్యాదు పబ్లిక్ రికార్డులో భాగం.",
    notDisposed: "ఫిర్యాదు పరిష్కరించిన తర్వాత అభిప్రాయం తెరుచుకుంటుంది. అప్పుడు రేట్ చేయవచ్చు.",
    privacy: "రిజిస్ట్రీ నంబర్ తో రేటింగ్, ఈ గమనిక మాత్రమే భద్రపరచబడతాయి — పేరు, ఈమెయిల్ లేదా ప్రొఫైల్ కాదు.",
  },
  footer: {
    note: "AICTE పబ్లిక్ ఫిర్యాదు వెల్లడి · సింథటిక్ డేటాతో కూడిన డెమో.",
  },
  errors: {
    lookupFail: "వెతకడం విఫలమైంది. మళ్లీ ప్రయత్నించండి.",
    subscribeFail: "ఇప్పుడు సభ్యత్వం తీసుకోలేము. మళ్లీ ప్రయత్నించండి.",
    feedbackFail: "అభిప్రాయం నమోదు కాలేదు. మళ్లీ ప్రయత్నించండి.",
  },
  digest: {
    heading: "నా తాజా సమాచారం",
    sub: "ఫిర్యాదును గమనించడానికి ఉపయోగించిన ఈమెయిల్ నమోదు చేయండి. ఈ డెమోలో నమోదైన స్థితి మార్పులు ఇక్కడ కనిపిస్తాయి — లైవ్ ఈమెయిల్ పంపబడదు.",
    emailLabel: "ఈమెయిల్ చిరునామా",
    button: "నా తాజా సమాచారం చూడండి",
    checking: "తనిఖీ చేస్తోంది…",
    empty: "ఈ చిరునామాకు ఇంకా తాజా సమాచారం లేదు. గమనిస్తున్న ఫిర్యాదులో మార్పు వచ్చినప్పుడు ఇక్కడ కనిపిస్తుంది.",
    found: (count: number) => `ఈ చిరునామాకు ${count} తాజా సమాచారం`,
    privacy: "మీరు నమోదు చేసిన చిరునామాకు సంబంధించిన సమాచారం మాత్రమే చూపబడుతుంది. ఇతరుల ఈమెయిల్ ఎప్పుడూ చూపబడదు. వెతకడం రేట్-పరిమితం చేయబడింది.",
    error: "తాజా సమాచారం లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.",
  },
};

const trackBn: DeepPartial<TrackDict> = {
  header: { officerSignIn: "কর্মকর্তা সাইন-ইন", goi: "ভারত সরকার" },
  hero: {
    eyebrow: "জনপ্রকাশ · সাইন-ইন প্রয়োজন নেই",
    title: "আমার অভিযোগ কোথায়?",
    sub: "আপনার রসিদে ছাপা রেজিস্ট্রি নম্বর ব্যবহার করে AICTE-তে দায়ের করা যেকোনো অভিযোগের লাইভ অবস্থা দেখুন। কোনো অ্যাকাউন্ট বা ব্যক্তিগত তথ্য লাগবে না।",
  },
  lookup: {
    label: "রেজিস্ট্রি নম্বর",
    button: "অবস্থা দেখুন",
    checking: "যাচাই করা হচ্ছে…",
    shortError: "আপনার রসিদে ছাপা পুরো রেজিস্ট্রি নম্বরটি ঠিক যেমন আছে তেমনি লিখুন।",
    demoLabel: "ডেমো রেজিস্ট্রি নম্বর",
    demoNotes: [
      "ক্যাপিটেশন ফি অভিযোগ — SLA লঙ্ঘন",
      "নথি আটকানো — সমন্বয় চলছে",
    ],
  },
  statusAsOn: "অবস্থা (এ পর্যন্ত):",
  result: {
    statutoryWindow: "বৈধানিক সময়সীমা",
    institution: "প্রতিষ্ঠান",
    responsibleWing: "দায়িত্বপ্রাপ্ত বিভাগ",
    hearing: "শুনানি:",
    hearingNone: "এখনো নির্ধারিত হয়নি",
    latestFrom: "কাউন্সিলের সর্বশেষ হালনাগাদ:",
    printReport: "রিপোর্ট প্রিন্ট করুন",
    printTitle: "এই অবস্থা রিপোর্টটি PDF হিসেবে প্রিন্ট বা সংরক্ষণ করুন",
  },
  journey: {
    heading: "আপনার অভিযোগের যাত্রা",
    labels: {
      RECEIVED: "অভিযোগ নিবন্ধিত",
      STATUS_CHANGED: "অবস্থা হালনাগাদ",
      DISPOSED: "অভিযোগের সমাধান হয়েছে",
      ESCALATED: "সক্ষম কর্তৃপক্ষের কাছে পাঠানো হয়েছে",
      HEARING_SCHEDULED: "শুনানি নির্ধারিত",
    },
  },
  watch: {
    heading: "এই অভিযোগটি দেখতে থাকুন",
    bodyPlain: "আপনার ইমেইল দিলে অভিযোগের অবস্থা বদলালে কাউন্সিলের প্রকাশনা ডেস্ক আপনাকে জানাবে।",
    countSingle: "জন এই অভিযোগটি দেখছেন",
    countPlural: "জন এই অভিযোগটি দেখছেন",
    watchSub: "আপনার ইমেইল দিলে অবস্থা বদলালে সংবাদ পাবেন।",
    button: "আমাকে জানান",
    successNote: (email: string) => `${email} ঠিকানায় সংবাদ পাবেন`,
    privacy: "শুধু রেজিস্ট্রি নম্বর ও আপনার ইমেইল সংরক্ষিত হয়। এই ডেমো লাইভ ইমেইল পাঠায় না।",
  },
  feedback: {
    heading: "আপনার অভিযোগ কত ভালোভাবে সমাধান হয়েছে?",
    sub: "আপনার মতামত সরাসরি কাউন্সিলের প্রকাশিত সমাধান-মান পরিসংখ্যানে যোগ হয়। এক মিনিটে রেট দিন — কোনো সাইন-ইন বা ব্যক্তিগত তথ্য নেই।",
    rateLabel: "সমাধানের মান দিতে তারকা বেছে নিন (1 = খারাপ, 5 = চমৎকার)",
    commentLabel: "আর কিছু বলতে চান? (ঐচ্ছিক)",
    commentPlaceholder: "কী ভালো লাগল, বা কাউন্সিল কী উন্নত করতে পারে…",
    submit: "মতামত শেয়ার করুন",
    submitting: "নথিভুক্ত হচ্ছে…",
    update: "মতামত হালনাগাদ করুন",
    recordedLabel: "আপনার মতামত নথিভুক্ত হয়েছে",
    recordedNote: (date: string) => `সর্বশেষ ${date} তারিখে নথিভুক্ত। নিচে বদলাতে পারেন।`,
    thankYou: "ধন্যবাদ — আপনার রেটিং এখন এই অভিযোগের পাবলিক রেকর্ডের অংশ।",
    notDisposed: "অভিযোগের সমাধান হলে মতামত খুলবে। তখন রেট দিতে পারবেন।",
    privacy: "রেজিস্ট্রি নম্বরের সাথে শুধু রেটিং ও এই মন্তব্য সংরক্ষিত হয় — নাম, ইমেইল বা প্রোফাইল নয়।",
  },
  footer: {
    note: "AICTE পাবলিক অভিযোগ প্রকাশ · সিনথেটিক ডেটা দিয়ে ডেমো প্রয়োগ।",
  },
  errors: {
    lookupFail: "অনুসন্ধান ব্যর্থ। আবার চেষ্টা করুন।",
    subscribeFail: "এখন সদস্যতা নেওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।",
    feedbackFail: "মতামত নথিভুক্ত করা যায়নি। পরে আবার চেষ্টা করুন।",
  },
  digest: {
    heading: "আমার হালনাগাদ",
    sub: "যে ইমেইল দিয়ে অভিযোগ দেখেছিলেন সেটি লিখুন। এই ডেমোতে নথিভুক্ত অবস্থা পরিবর্তন এখানে দেখা যাবে — কোনো লাইভ ইমেইল পাঠানো হয় না।",
    emailLabel: "ইমেইল ঠিকানা",
    button: "আমার হালনাগাদ দেখুন",
    checking: "যাচাই করা হচ্ছে…",
    empty: "এই ঠিকানার জন্য এখনো কোনো হালনাগাদ নেই। দেখা অভিযোগের অবস্থা বদলালে এখানে দেখা যাবে।",
    found: (count: number) => `এই ঠিকানার জন্য ${count} টি হালনাগাদ`,
    privacy: "আপনি যে ঠিকানা লিখেছেন শুধু তার হালনাগাদ দেখানো হয়। অন্য নাগরিকের ইমেইল কখনো দেখানো হয় না। অনুসন্ধান হার-সীমিত।",
    error: "হালনাগাদ লোড করা যায়নি। পরে আবার চেষ্টা করুন।",
  },
};

export const track = {
  en: trackEn,
  hi: trackHi,
  ta: resolveDict(trackEn, trackTa),
  te: resolveDict(trackEn, trackTe),
  bn: resolveDict(trackEn, trackBn),
};
export type TrackDict = typeof trackEn;

/* ── Public transparency page ────────────────────────────────────────────── */

const transparencyEn = {
  header: {
    goi: "Government of India",
    trackCta: "Track a grievance",
  },
  hero: {
    eyebrow: "Statutory disclosure · Updated live",
    title: "The numbers behind every grievance.",
    sub: "How much grievance traffic AICTE receives, how fast the Council disposes cases, and where the pressure sits — published openly, no sign-in required.",
  },
  kpis: {
    received: { label: "Grievances received", sub: "since the registry opened" },
    disposed: { label: "Disposed", sub: "redressal completed" },
    disposalRate: { label: "Disposal rate", sub: "of all registered cases" },
    avgResolution: { label: "Avg resolution", sub: "received → disposed" },
    inProcess: { label: "In process", sub: "open across bureaus" },
    breached: { label: "SLA breached", sub: "past statutory deadline" },
  },
  monthly: {
    heading: "Grievances received vs disposed · last 6 months",
    received: "Received",
    disposed: "Disposed",
  },
  categories: { heading: "Disposal by grievance category" },
  regions: {
    heading: "Volume by regional office",
    disposedOf: (disposed: number, received: number) => `${disposed}/${received} disposed`,
    regionSuffix: " region",
    escalatedNote: (escalated: number, transferred: number) =>
      `${escalated} escalated to the competent authority · ${transferred} transferred between bureaus for coordinated handling.`,
  },
  quality: {
    heading: "Quality of redressal — citizens' verdict",
    sub: "After a grievance is disposed, its complainant can rate the redressal from the public tracker. These ratings come straight from that feedback loop.",
    avgLabel: "Average rating",
    satisfactionLabel: "Rated 4+ of 5",
    countLabel: "Ratings received",
    distributionLabel: "Rating distribution",
    empty:
      "No citizen ratings have been recorded yet. Ratings appear here as disposed grievances receive feedback through the tracker.",
  },
  cta: {
    title: "Filed a grievance with the Council?",
    sub: "Follow its journey through the statutory process with the registry number on your acknowledgement slip.",
    button: "Track your grievance",
  },
  footer: {
    note: "AICTE public grievance disclosure · Demonstration deployment seeded with synthetic data.",
  },
};

const transparencyHi: typeof transparencyEn = {
  header: {
    goi: "भारत सरकार",
    trackCta: "शिकायत ट्रैक करें",
  },
  hero: {
    eyebrow: "वैधानिक प्रकटीकरण · लाइव अद्यतन",
    title: "हर शिकायत के पीछे के आंकड़े।",
    sub: "AICTE को कितनी शिकायतें मिलती हैं, परिषद उन्हें कितनी तेज़ी से निपटाती है, और दबाव कहाँ है — पूरी तरह खुला, बिना साइन-इन।",
  },
  kpis: {
    received: { label: "प्राप्त शिकायतें", sub: "पंजिका खुलने से अब तक" },
    disposed: { label: "निस्तारित", sub: "निपटान पूर्ण" },
    disposalRate: { label: "निस्तारण दर", sub: "सभी दर्ज मामलों में" },
    avgResolution: { label: "औसत अवधि", sub: "प्राप्ति → निस्तारण" },
    inProcess: { label: "प्रक्रिया में", sub: "विभिन्न प्रकोष्ठों में खुले" },
    breached: { label: "SLA उल्लंघित", sub: "वैधानिक समय-सीमा के बाद" },
  },
  monthly: {
    heading: "प्राप्त बनाम निस्तारित शिकायतें · पिछले 6 महीने",
    received: "प्राप्त",
    disposed: "निस्तारित",
  },
  categories: { heading: "शिकायत श्रेणी अनुसार निस्तारण" },
  regions: {
    heading: "क्षेत्रीय कार्यालय अनुसार मात्रा",
    disposedOf: (disposed: number, received: number) => `${received} में ${disposed} निस्तारित`,
    regionSuffix: " क्षेत्र",
    escalatedNote: (escalated: number, transferred: number) =>
      `${escalated} सक्षम प्राधिकारी को अधिरोहित · ${transferred} समन्वित निपटान हेतु प्रकोष्ठों के बीच स्थानांतरित।`,
  },
  quality: {
    heading: "निपटान की गुणवत्ता — नागरिकों का निर्णय",
    sub: "शिकायत निस्तारित होने के बाद शिकायतकर्ता सार्वजनिक ट्रैकर से निपटान को रेट कर सकता है। ये रेटिंग सीधे उसी प्रतिक्रिया चक्र से आती हैं।",
    avgLabel: "औसत रेटिंग",
    satisfactionLabel: "5 में 4+ रेट",
    countLabel: "प्राप्त रेटिंग",
    distributionLabel: "रेटिंग वितरण",
    empty:
      "अभी कोई नागरिक रेटिंग दर्ज नहीं हुई है। ट्रैकर के जरिए निस्तारित शिकायतों पर प्रतिक्रिया मिलने पर रेटिंग यहाँ दिखेंगी।",
  },
  cta: {
    title: "परिषद में शिकायत दर्ज कराई है?",
    sub: "पावती पर्ची पर छपी पंजिका संख्या से वैधानिक प्रक्रिया में इसकी यात्रा देखें।",
    button: "अपनी शिकायत ट्रैक करें",
  },
  footer: {
    note: "AICTE सार्वजनिक शिकायत प्रकटीकरण · सिंथेटिक डेटा वाला प्रदर्शन डिप्लॉयमेंट।",
  },
};

/* ── Regional transparency dictionaries (partial; English fills gaps) ─────── */

type TransparencyDict = typeof transparencyEn;

const transparencyTa: DeepPartial<TransparencyDict> = {
  header: { goi: "இந்திய அரசு", trackCta: "புகாரை நிகழ்நிலை காண்க" },
  hero: {
    eyebrow: "சட்டப்பூர்வ வெளிப்படைத்தன்மை · நேரடி புதுப்பிப்பு",
    title: "ஒவ்வொரு புகாருக்கும் பின்னுள்ள எண்கள்.",
    sub: "AICTE-க்கு எவ்வளவு புகார்கள் வருகின்றன, கவுன்சில் அவற்றை எவ்வளவு விரைவாகத் தீர்க்கிறது, சுமை எங்கே உள்ளது — அனைத்தும் திறந்த வெளியில், உள்நுழைவு இன்றி.",
  },
  kpis: {
    received: { label: "பெறப்பட்ட புகார்கள்", sub: "பதிவு தொடங்கியதிலிருந்து" },
    disposed: { label: "தீர்க்கப்பட்டவை", sub: "தீர்வு நிறைவடைந்தது" },
    disposalRate: { label: "தீர்வு விகிதம்", sub: "மொத்த பதிவுகளில்" },
    avgResolution: { label: "சராசரி தீர்வு நேரம்", sub: "பெற்றது → தீர்த்தது" },
    inProcess: { label: "நடவடிக்கையில்", sub: "பணியகங்களில் திறந்தவை" },
    breached: { label: "SLA மீறல்", sub: "சட்டப்பூர்வ காலத்தைக் கடந்தவை" },
  },
  monthly: {
    heading: "பெறப்பட்டது எதிர் தீர்க்கப்பட்டது · கடந்த 6 மாதங்கள்",
    received: "பெறப்பட்டது",
    disposed: "தீர்க்கப்பட்டது",
  },
  categories: { heading: "புகார் வகைவாரியாகத் தீர்வு" },
  regions: {
    heading: "மண்டல அலுவலகம் வாரியான அளவு",
    disposedOf: (disposed: number, received: number) =>
      `${received} இல் ${disposed} தீர்க்கப்பட்டது`,
    regionSuffix: " மண்டலம்",
    escalatedNote: (escalated: number, transferred: number) =>
      `${escalated} தகுதியான அதிகாரிக்கு அனுப்பப்பட்டது · ${transferred} ஒருங்கிணைந்த நடவடிக்கைக்காக பணியகங்களுக்கு இடையே மாற்றப்பட்டது.`,
  },
  quality: {
    heading: "தீர்க்கும் தரம் — குடிமக்களின் தீர்ப்பு",
    sub: "புகார் தீர்க்கப்பட்ட பிறகு, புகாராளர் பொது டிரேக்கரில் தீர்வுக்கு மதிப்பிடலாம். இந்த மதிப்பீடுகள் நேரடியாக அதே கருத்து சுழற்சியிலிருந்து வருகின்றன.",
    avgLabel: "சராசரி மதிப்பீடு",
    satisfactionLabel: "5 இல் 4+ மதிப்பீடு",
    countLabel: "பெறப்பட்ட மதிப்பீடுகள்",
    distributionLabel: "மதிப்பீட்டு விநியோகம்",
    empty:
      "இதுவரை எந்த மதிப்பீடும் பதிவு செய்யப்படவில்லை. டிரேக்கர் மூலம் தீர்க்கப்பட்ட புகார்களுக்குக் கருத்து வந்தபோது மதிப்பீடுகள் இங்கே தோன்றும்.",
  },
  cta: {
    title: "கவுன்சிலில் புகார் தாக்கல் செய்திருப்பீர்களா?",
    sub: "ரசீதில் உள்ள பதிவு எண்ணுடன் சட்டப்பூர்வ செயல்பாட்டில் அதன் பயணத்தைப் பின்பற்றுங்கள்.",
    button: "உங்கள் புகாரைக் காண்க",
  },
  footer: {
    note: "AICTE பொது புகார் வெளிப்படைத்தன்மை · செயற்கூர்வ தரவுகளுடன் கூடிய மாதிரி.",
  },
};

const transparencyTe: DeepPartial<TransparencyDict> = {
  header: { goi: "భారత ప్రభుత్వం", trackCta: "ఫిర్యాదు ట్రాక్ చేయండి" },
  hero: {
    eyebrow: "చట్టపరమైన వెల్లడి · లైవ్ అప్ డేట్",
    title: "ప్రతి ఫిర్యాదు వెనుక ఉన్న గణాంకాలు.",
    sub: "AICTE కి ఎన్ని ఫిర్యాదులు వస్తాయి, కౌన్సిల్ వాటిని ఎంత వేగంగా పరిష్కరిస్తుంది, ఒత్తిడి ఎక్కడ ఉంది — అన్నీ బహిరంగంగా, సైన్-ఇన్ లేకుండా.",
  },
  kpis: {
    received: { label: "అందుకున్న ఫిర్యాదులు", sub: "రిజిస్ట్రీ మొదలైనప్పటి నుంచి" },
    disposed: { label: "పరిష్కరించినవి", sub: "పరిష్కారం పూర్తయ్యింది" },
    disposalRate: { label: "పరిష్కార రేటు", sub: "మొత్తం నమోదైన కేసుల్లో" },
    avgResolution: { label: "సగటు పరిష్కారం", sub: "అందుకోవడం → పరిష్కరించడం" },
    inProcess: { label: "ప్రక్రియలో", sub: "విభాగాల్లో తెరిచి ఉన్నవి" },
    breached: { label: "SLA ఉల్లంఘన", sub: "చట్టపరమైన గడువు దాటినవి" },
  },
  monthly: {
    heading: "అందుకున్నవి vs పరిష్కరించినవి · గత 6 నెలలు",
    received: "అందుకున్నవి",
    disposed: "పరిష్కరించినవి",
  },
  categories: { heading: "ఫిర్యాదు వర్గం వారీగా పరిష్కారం" },
  regions: {
    heading: "ప్రాంతీయ కార్యాలయం వారీగా పరిమాణం",
    disposedOf: (disposed: number, received: number) =>
      `${received} లో ${disposed} పరిష్కరించబడ్డాయి`,
    regionSuffix: " ప్రాంతం",
    escalatedNote: (escalated: number, transferred: number) =>
      `${escalated} సమర్థ అధికారికి ఎస్కలేట్ అయ్యాయి · ${transferred} సమన్వయ పరిష్కారం కోసం విభాగాల మధ్య బదిలీ అయ్యాయి.`,
  },
  quality: {
    heading: "పరిష్కార నాణ్యత — పౌరుల తీర్పు",
    sub: "ఫిర్యాదు పరిష్కరించిన తర్వాత ఫిర్యాదుదారుడు పబ్లిక్ ట్రాకర్ లో పరిష్కారానికి రేట్ ఇవ్వొచ్చు. ఈ రేటింగులు అదే అభిప్రాయ చక్రం నుంచి వస్తాయి.",
    avgLabel: "సగటు రేటింగ్",
    satisfactionLabel: "5 లో 4+ రేటింగ్",
    countLabel: "అందుకున్న రేటింగులు",
    distributionLabel: "రేటింగ్ పంపిణీ",
    empty:
      "ఇంకా ఎలాంటి పౌర రేటింగ్ నమోదు కాలేదు. ట్రాకర్ ద్వారా పరిష్కరించిన ఫిర్యాదులకు అభిప్రాయం వచ్చినప్పుడు రేటింగులు ఇక్కడ కనిపిస్తాయి.",
  },
  cta: {
    title: "కౌన్సిల్ లో ఫిర్యాదు దాఖలు చేశారా?",
    sub: "మీ రసీదుపై ఉన్న రిజిస్ట్రీ నంబర్ తో చట్టపరమైన ప్రక్రియలో దాని ప్రయాణం చూడండి.",
    button: "మీ ఫిర్యాదు ట్రాక్ చేయండి",
  },
  footer: {
    note: "AICTE పబ్లిక్ ఫిర్యాదు వెల్లడి · సింథటిక్ డేటాతో కూడిన డెమో.",
  },
};

const transparencyBn: DeepPartial<TransparencyDict> = {
  header: { goi: "ভারত সরকার", trackCta: "অভিযোগ ট্র্যাক করুন" },
  hero: {
    eyebrow: "বৈধানিক প্রকাশ · লাইভ হালনাগাদ",
    title: "প্রতিটি অভিযোগের পেছনের সংখ্যা।",
    sub: "AICTE কতগুলো অভিযোগ পায়, কাউন্সিল কত দ্রুত সেগুলো সমাধান করে, চাপ কোথায় — সবকিছু খোলাভাবে, কোনো সাইন-ইন ছাড়াই।",
  },
  kpis: {
    received: { label: "প্রাপ্ত অভিযোগ", sub: "রেজিস্ট্রি চালু হওয়ার পর থেকে" },
    disposed: { label: "সমাধান", sub: "সমাধান সম্পন্ন" },
    disposalRate: { label: "সমাধান হার", sub: "মোট নিবন্ধিত মামলায়" },
    avgResolution: { label: "গড় সমাধান সময়", sub: "প্রাপ্তি → সমাধান" },
    inProcess: { label: "প্রক্রিয়াধীন", sub: "ব্যুরোতে খোলা মামলা" },
    breached: { label: "SLA লঙ্ঘন", sub: "বৈধানিক সময়সীমা অতিক্রম" },
  },
  monthly: {
    heading: "প্রাপ্ত বনাম সমাধান · গত ৬ মাস",
    received: "প্রাপ্ত",
    disposed: "সমাধান",
  },
  categories: { heading: "অভিযোগ বিভাগ অনুযায়ী সমাধান" },
  regions: {
    heading: "আঞ্চলিক কার্যালয় অনুযায়ী পরিমাণ",
    disposedOf: (disposed: number, received: number) =>
      `${received} টির মধ্যে ${disposed} টি সমাধান`,
    regionSuffix: " অঞ্চল",
    escalatedNote: (escalated: number, transferred: number) =>
      `${escalated} টি সক্ষম কর্তৃপক্ষের কাছে পাঠানো হয়েছে · ${transferred} টি সমন্বিত ব্যবস্থার জন্য ব্যুরোর মধ্যে স্থানান্তরিত।`,
  },
  quality: {
    heading: "সমাধানের মান — নাগরিকের রায়",
    sub: "অভিযোগ সমাধানের পর অভিযোগকারী পাবলিক ট্র্যাকার থেকে সমাধানের রেট দিতে পারেন। এই রেটিংগুলো সরাসরি সেই মতামত চক্র থেকে আসে।",
    avgLabel: "গড় রেটিং",
    satisfactionLabel: "৫ এর মধ্যে ৪+ রেটিং",
    countLabel: "প্রাপ্ত রেটিং",
    distributionLabel: "রেটিং বণ্টন",
    empty:
      "এখনো কোনো নাগরিক রেটিং নথিভুক্ত হয়নি। ট্র্যাকারের মাধ্যমে সমাধানকৃত অভিযোগে মতামত পেলে রেটিংগুলো এখানে দেখা যাবে।",
  },
  cta: {
    title: "কাউন্সিলে অভিযোগ দায়ের করেছেন?",
    sub: "আপনার রসিদে ছাপা রেজিস্ট্রি নম্বর দিয়ে বৈধানিক প্রক্রিয়ায় এর যাত্রা দেখুন।",
    button: "আপনার অভিযোগ দেখুন",
  },
  footer: {
    note: "AICTE পাবলিক অভিযোগ প্রকাশ · সিনথেটিক ডেটা দিয়ে ডেমো প্রয়োগ।",
  },
};

export const transparency = {
  en: transparencyEn,
  hi: transparencyHi,
  ta: resolveDict(transparencyEn, transparencyTa),
  te: resolveDict(transparencyEn, transparencyTe),
  bn: resolveDict(transparencyEn, transparencyBn),
};

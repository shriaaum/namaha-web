/*
 * Local, reviewed translations for public records, keyed by MongoDB document
 * ID. These are a fallback only: translations stored on the record by the API
 * (`record.translations`, kept in sync with the English by namaha-api
 * src/translation/) always win. An entry is used only while the record's
 * English `name` still equals its `sourceName`, so renaming a Pooja in admin
 * can never show the old Pooja's translation.
 */
const pujas = {
  '69c2947b095055003ca4a43a': {
    // Applied only while the record's English name is still this (see localizePujaRecord).
    sourceName: 'Maha Navami Special: Adya Kalika Mata Kali Pujan & Kanya Bhoj',
    hi: {
      name: 'महा नवमी विशेष: आद्या कालिका माता काली पूजन एवं कन्या भोज',
      description: 'दक्षिणेश्वरी में यह पवित्र महा नवमी काली पूजा एवं कन्या भोज करने से श्रद्धालु माँ काली को प्रार्थना अर्पित कर सुरक्षा, समृद्धि, शक्ति और आध्यात्मिक कल्याण के लिए उनका दिव्य आशीर्वाद पाते हैं।',
      templeName: 'दक्षिणेश्वरी काली माता मंदिर',
      templeDescription: 'कोलकाता का दक्षिणेश्वरी काली माता मंदिर माँ काली को समर्पित सबसे पूजनीय मंदिरों में से एक है। पवित्र गंगा के तट पर स्थित यह मंदिर दिव्य माता की भक्ति से गहराई से जुड़ा है और श्रद्धालुओं के लिए अत्यंत आध्यात्मिक महत्व रखता है।\nदक्षिणेश्वरी में इस पवित्र महा नवमी काली पूजा एवं कन्या भोज द्वारा श्रद्धालु माँ काली को प्रार्थना अर्पित कर सुरक्षा, समृद्धि, शक्ति और आध्यात्मिक कल्याण का आशीर्वाद मांगते हैं।',
      aboutPuja: 'महा नवमी के शुभ अवसर पर पूजनीय दक्षिणेश्वरी काली माता मंदिर में आद्या कालिका माता काली पूजन एवं कन्या भोज में भाग लें।\nयह विशेष सेवा दिव्य माता के शक्तिशाली स्वरूप माँ काली को समर्पित है। पारंपरिक पूजा, मंत्रोच्चार, पवित्र अर्पण और कन्या भोज के माध्यम से श्रद्धालु सुरक्षा, शक्ति, समृद्धि और बाधा निवारण के लिए देवी का आशीर्वाद मांगते हैं।\n\nमहा नवमी का महत्व\n\nमहा नवमी नवरात्रि के सबसे महत्वपूर्ण दिनों में से एक है और दिव्य माता की आराधना को समर्पित है। यह नकारात्मकता पर दिव्य शक्ति की विजय का प्रतीक है तथा माँ दुर्गा और माँ काली का आशीर्वाद पाने का विशेष शुभ समय है। कन्या भोज देवी उपासना से जुड़ी महत्वपूर्ण परंपरा है, जिसमें छोटी कन्याओं को दिव्य माता का स्वरूप मानकर सम्मानित किया जाता है।',
      benefits: ['माँ काली का आशीर्वाद और सुरक्षा', 'बाधाओं और चुनौतियों पर विजय', 'शक्ति, साहस और आत्मविश्वास', 'शांति, सकारात्मकता और सामंजस्य', 'समृद्धि, प्रचुरता और सौभाग्य', 'भक्ति और आध्यात्मिक जुड़ाव', 'परिवार के कल्याण की प्रार्थना', 'नकारात्मकता से दिव्य कृपा और सुरक्षा'],
      packages: ['व्यक्तिगत पूजा', 'दो व्यक्ति', 'परिवार', 'संयुक्त परिवार'], addons: ['माता काली तंत्र रक्षा थाली', 'श्रींगार', 'गुड़हल माला']
    },
    te: {
      name: 'మహా నవమి ప్రత్యేకం: ఆద్య కాలికా మాత కాళి పూజన్ మరియు కన్యా భోజ్',
      description: 'దక్షిణేశ్వరిలో ఈ పవిత్ర మహా నవమి కాళి పూజ మరియు కన్యా భోజ్ చేయడం ద్వారా భక్తులు మా కాళికి ప్రార్థనలు అర్పించి రక్షణ, శ్రేయస్సు, శక్తి, ఆధ్యాత్మిక క్షేమం కోసం దివ్య ఆశీర్వాదాలను పొందుతారు.',
      templeName: 'దక్షిణేశ్వరి కాళి మాత దేవాలయం',
      templeDescription: 'కోల్‌కతాలోని దక్షిణేశ్వరి కాళి మాత దేవాలయం మా కాళికి అంకితమైన అత్యంత పూజనీయ దేవాలయాలలో ఒకటి. పవిత్ర గంగా ఒడ్డున ఉన్న ఈ దేవాలయం దివ్య మాత భక్తితో ముడిపడి, భక్తులకు అపార ఆధ్యాత్మిక ప్రాధాన్యం కలిగి ఉంది.\nదక్షిణేశ్వరిలో ఈ పవిత్ర మహా నవమి కాళి పూజ మరియు కన్యా భోజ్ ద్వారా భక్తులు మా కాళికి ప్రార్థనలు అర్పించి రక్షణ, శ్రేయస్సు, శక్తి, ఆధ్యాత్మిక క్షేమం కోరుకుంటారు.',
      aboutPuja: 'మహా నవమి శుభ సందర్భంలో పూజనీయ దక్షిణేశ్వరి కాళి మాత దేవాలయంలో ఆద్య కాలికా మాత కాళి పూజన్ మరియు కన్యా భోజ్‌లో పాల్గొనండి.\nఈ ప్రత్యేక సేవ దివ్య మాత యొక్క శక్తివంతమైన రూపమైన మా కాళికి అంకితం. సాంప్రదాయ పూజ, మంత్రోచ్చారణ, పవిత్ర సమర్పణలు, కన్యా భోజ్ ద్వారా భక్తులు రక్షణ, శక్తి, శ్రేయస్సు, అడ్డంకుల తొలగింపు కోసం దేవి ఆశీర్వాదాలు కోరుకుంటారు.\n\nమహా నవమి ప్రాముఖ్యత\n\nమహా నవమి నవరాత్రి ముఖ్యమైన రోజులలో ఒకటి; దివ్య మాత ఆరాధనకు అంకితం. ఇది ప్రతికూలతపై దివ్య శక్తి విజయాన్ని సూచిస్తుంది; మా దుర్గ, మా కాళి ఆశీర్వాదాలు కోరడానికి విశేష శుభ సమయం. కన్యా భోజ్ దేవి ఆరాధనలో ముఖ్యమైన సంప్రదాయం; చిన్నారులను దివ్య మాత రూపాలుగా గౌరవిస్తారు.',
      benefits: ['మా కాళి ఆశీర్వాదాలు మరియు రక్షణ', 'అడ్డంకులు, సవాళ్ల అధిగమనం', 'శక్తి, ధైర్యం, ఆత్మవిశ్వాసం', 'శాంతి, సానుకూలత, సామరస్యం', 'శ్రేయస్సు, సమృద్ధి, అదృష్టం', 'భక్తి, ఆధ్యాత్మిక అనుబంధం', 'కుటుంబ శ్రేయస్సు కోసం ప్రార్థనలు', 'ప్రతికూలత నుంచి దివ్య కృప, రక్షణ'],
      packages: ['వ్యక్తిగత పూజ', 'ఇద్దరు వ్యక్తులు', 'కుటుంబం', 'ఉమ్మడి కుటుంబం'], addons: ['మాత కాళి తంత్ర రక్షా తాళి', 'శ్రింగార్', 'మందార మాల']
    }
  }
};

export function localizePujaRecord(record, language) {
  if (language === 'en' || !record) return record;
  const entry = pujas[String(record._id || record.id)];
  const translated = entry?.[language];
  if (!translated) return record;
  if (record.name && entry.sourceName && record.name.trim() !== entry.sourceName) return record;
  return {
    ...record,
    name: translated.name,
    description: translated.description,
    templeName: translated.templeName,
    templeDescription: translated.templeDescription,
    aboutPuja: translated.aboutPuja,
    benefits: (record.benefits || []).map((item, index) => ({ ...item, title: translated.benefits[index] || item.title })),
    addOns: (record.addOns || []).map((item, index) => ({ ...item, name: translated.addons[index] || item.name })),
    packageDetails: (record.packageDetails || []).map((item, index) => ({ ...item, name: translated.packages[index] || item.name })),
  };
}

/**
 * Generic CMS translation resolver. Array translations are keyed by the item's
 * `_id` (Pooja) or, for items without one (Chadhava benefits/offerings), by
 * index — the same keys namaha-api src/translation/ writes.
 */
const mergeTranslatedArray = (items, translatedItems) => (items || []).map((item, index) => ({
  ...item,
  ...(translatedItems?.[String(item?._id || item?.id || index)] || {}),
}));

export function localizeRecord(record, language) {
  if (!record || language === 'en') return record;
  const translated = record.translations?.[language];
  if (!translated) return record;
  const { categoryName, ...fields } = translated;
  return {
    ...record,
    ...fields,
    ...(categoryName && record.category && typeof record.category === 'object'
      ? { category: { ...record.category, category: categoryName } }
      : {}),
    benefits: mergeTranslatedArray(record.benefits, translated.benefits),
    addOns: mergeTranslatedArray(record.addOns, translated.addOns),
    packageDetails: mergeTranslatedArray(record.packageDetails, translated.packageDetails),
    offerings: mergeTranslatedArray(record.offerings, translated.offerings),
  };
}

/* ----- Missing-translation reporting ----------------------------------------
 * When Hindi/Telugu is selected and a field still equals its English source,
 * the English is shown (never blank) and the gap is recorded here. The API
 * tracks the same gaps per record (GET /api/admin/translations/status) and
 * retries them; this is the client-side safety net for QA and tests.
 */
const missingTranslations = new Map();
const hasLatinWords = (value) => typeof value === 'string' && /[A-Za-z]{2,}/.test(value);

export function reportMissingTranslations(kind, english, localized, fields, language) {
  if (!english || !localized || language === 'en') return;
  const id = String(english._id || english.id || english.title || english.name || '');
  const fieldsMissing = fields.filter((field) => hasLatinWords(english[field]) && localized[field] === english[field]);
  const key = `${language}:${kind}:${id}`;
  if (!fieldsMissing.length) {
    missingTranslations.delete(key);
    return;
  }
  const previous = missingTranslations.get(key);
  missingTranslations.set(key, { language, kind, id, fields: fieldsMissing });
  if (!previous && process.env.NODE_ENV === 'development') {
    console.warn(`[i18n] Missing ${language} translation for ${kind} ${id}: ${fieldsMissing.join(', ')} (showing English)`);
  }
}

export const getMissingTranslations = () => [...missingTranslations.values()];
export const clearMissingTranslations = () => missingTranslations.clear();

/**
 * Small { hi: { english: text }, te: {...} } lookup for chosen English strings
 * of a record (title, add-on / offering names), so pages that only receive
 * English names (Billing) can show them translated and switch language live.
 */
export function buildTextTranslations(record, englishTexts, localize, languages = ['hi', 'te']) {
  const wanted = new Set((englishTexts || []).filter((text) => typeof text === 'string' && text.trim()));
  const out = {};
  if (!record || !wanted.size) return out;
  languages.forEach((language) => {
    const localized = localize(record, language) || record;
    const map = {};
    const pair = (en, tr) => {
      if (wanted.has(en) && typeof tr === 'string' && tr.trim() && tr !== en) map[en] = tr;
    };
    Object.keys(record).forEach((field) => pair(record[field], localized[field]));
    ['benefits', 'addOns', 'packageDetails', 'offerings'].forEach((arrayName) => {
      (Array.isArray(record[arrayName]) ? record[arrayName] : []).forEach((item, index) => {
        Object.keys(item || {}).forEach((field) => pair(item[field], localized[arrayName]?.[index]?.[field]));
      });
    });
    out[language] = map;
  });
  return out;
}

const DATE_LOCALES = { en: 'en-GB', hi: 'hi-IN', te: 'te-IN' };
export const getDateLocale = (language) => DATE_LOCALES[language] || DATE_LOCALES.en;

/* Reviewed translations for the hero banners currently returned by /hero-banner (keyed by _id). */
const heroBanners = {
  '6a182692eef894aefd587212': {
    hi: {
      title: 'श्री आऊम पूजा स्टोर',
      subtitle: 'सभी आध्यात्मिक सामग्री इस स्टोर में उपलब्ध है, एक बार अवश्य पधारें और सामग्री खरीदें।',
      ctaLabel: 'स्टोर',
      imageAlt: 'श्री आऊम पूजा स्टोर',
    },
    te: {
      title: 'శ్రీ ఆఉమ్ పూజా స్టోర్',
      subtitle: 'అన్ని ఆధ్యాత్మిక వస్తువులు ఈ స్టోర్‌లో లభిస్తాయి, ఒకసారి సందర్శించి వస్తువులు కొనండి.',
      ctaLabel: 'స్టోర్',
      imageAlt: 'శ్రీ ఆఉమ్ పూజా స్టోర్',
    },
  },
  '69ef5e91cf5d2088b048c15c': {
    hi: {
      title: 'श्री आऊम पवित्र चढ़ावा',
      subtitle: 'शक्तिशाली क्षेत्रों में पवित्र चढ़ावा अर्पित करें। अपने जीवन में दिव्य कृपा, सुरक्षा और समृद्धि को आमंत्रित करें।',
      ctaLabel: 'चढ़ावा अर्पित करें',
      imageAlt: 'पवित्र मंदिर क्षेत्र का चित्र',
    },
    te: {
      title: 'శ్రీ ఆఉమ్ పవిత్ర చఢావా',
      subtitle: 'శక్తివంతమైన క్షేత్రాలలో పవిత్ర చఢావా సమర్పించండి. మీ జీవితంలోకి దివ్య కృప, రక్షణ, సమృద్ధిని ఆహ్వానించండి.',
      ctaLabel: 'చఢావా సమర్పించండి',
      imageAlt: 'పవిత్ర దేవాలయ క్షేత్ర చిత్రం',
    },
  },
  '69ef5e18cf5d2088b048c153': {
    hi: {
      title: 'श्री आऊम विशेष पूजा',
      subtitle: 'दिव्य अनुष्ठानों, पवित्र पूजाओं और व्यक्तिगत संकल्पों का अनुभव करें, जो आपके जीवन में शांति, सुरक्षा और समृद्धि लाते हैं — दुनिया में कहीं से भी।',
      ctaLabel: 'पूजा बुक करें',
      imageAlt: 'पवित्र पूजा थाली, दीपम और अर्पण',
    },
    te: {
      title: 'శ్రీ ఆఉమ్ ప్రత్యేక పూజ',
      subtitle: 'మీ జీవితంలో శాంతి, రక్షణ, సమృద్ధిని తెచ్చే దివ్య ఆచారాలు, పవిత్ర పూజలు, వ్యక్తిగత సంకల్పాలను అనుభవించండి — ప్రపంచంలో ఎక్కడి నుంచైనా.',
      ctaLabel: 'పూజ బుక్ చేయండి',
      imageAlt: 'పవిత్ర పూజా పళ్ళెం, దీపం మరియు సమర్పణలు',
    },
  },
};

/** Hero banner: CMS `translations[lang]` first, then reviewed local text, then English. */
export function localizeHeroBanner(banner, language) {
  if (!banner || language === 'en') return banner;
  const local = heroBanners[String(banner._id || banner.id)]?.[language] || {};
  const cms = banner.translations?.[language] || {};
  const merged = { ...banner, ...local, ...cms };
  // The API repeats subtitle in `description`; keep them in sync when only subtitle is translated.
  if ((local.subtitle || cms.subtitle) && !cms.description) merged.description = merged.subtitle;
  reportMissingTranslations('heroBanner', banner, merged, ['title', 'description', 'ctaLabel'], language);
  return merged;
}

/**
 * Clearly identified illustrative sample reflections for the detail pages.
 * They are read-only presentation content, not verified customer feedback.
 * To update a sample, amend its name, city, rating and localized review text.
 *
 * Chadhava reviews carry a `deity` group. When a Chadhava page is opened,
 * reviews whose group matches that Chadhava (see DEITY_KEYWORDS) are shown first.
 * Reviews marked `general: true` don't name a specific Puja / Chadhava and are
 * shown next (or first, when nothing matches — e.g. a newly added Chadhava).
 */
export const REVIEWS_AND_FEEDBACK = Object.freeze({
  puja: [
    {
      id: "puja-11",
      general: true,
      name: "Deepak Sharma",
      city: "Jaipur",
      rating: 5,
      review: "Very nice puja experience. Everything was done beautifully, and I felt very happy and peaceful. Thank you so much for your service. 🙏",
    },
    {
      id: "puja-12",
      general: true,
      name: "Kavya Reddy",
      city: "Hyderabad",
      rating: 5,
      review: "I am really happy with the puja experience. Everything was well arranged, and the whole process was very nice. Thank you so much to the entire team. 🙏",
    },
    {
      id: "puja-1",
      name: "Ananya Sharma",
      city: "Hyderabad",
      rating: 5,
      review: "I felt very peaceful while praying for my family. The puja was meaningful to me, and I was happy to be part of it.",
    },
    {
      id: "puja-2",
      name: "Ravi K.",
      city: "Vijayawada",
      rating: 5,
      review: "It was nice to take part in the puja from home. I liked being able to include my family in the prayers.",
    },
    {
      id: "puja-3",
      name: "Priya Reddy",
      city: "Bengaluru",
      rating: 5,
      review: "The puja gave me time to pray and feel connected to the temple. It was a special moment for our family.",
    },
    {
      id: "puja-4",
      name: "Suresh M.",
      city: "Visakhapatnam",
      rating: 5,
      review: "I wanted to offer prayers for my family's well-being. The experience felt meaningful and brought me peace of mind.",
    },
    {
      id: "puja-5",
      name: "Meena Patel",
      city: "Ahmedabad",
      rating: 5,
      review: "I enjoyed learning about the puja and its importance. It helped me feel more connected to my faith.",
    },
    {
      id: "puja-6",
      name: "Lakshmi Narayana",
      city: "Hyderabad",
      rating: 5,
      review: "I liked the way the puja was explained. It was easy to understand, and I felt happy including my family in the prayers.",
    },
    {
      id: "puja-7",
      name: "Rahul V.",
      city: "Pune",
      rating: 5,
      review: "This was a special puja for our family. We prayed together and felt very peaceful afterward. Thank you for making it easy to participate.",
    },
    {
      id: "puja-8",
      name: "Swathi Reddy",
      city: "Warangal",
      rating: 5,
      review: "I wanted to offer prayers for my parents. It was a meaningful experience, and I felt very happy doing something special for them.",
    },
    {
      id: "puja-9",
      name: "Kiran Kumar",
      city: "Visakhapatnam",
      rating: 5,
      review: "I was glad to take part in the puja from home. It gave me a chance to spend some quiet time praying for my family's happiness.",
    },
    {
      id: "puja-10",
      name: "Pooja S.",
      city: "Chennai",
      rating: 5,
      review: "The puja was very meaningful to me. I felt calm and positive afterward and would love to participate in more temple rituals.",
    },
  ],
  chadhava: [
    {
      id: "chadhava-11",
      general: true,
      name: "Nikhil Agarwal",
      city: "Delhi",
      rating: 5,
      review: "Very nice experience. I am happy with the service and really appreciate the efforts of the team. Thank you so much. 🙏",
    },
    {
      id: "chadhava-12",
      general: true,
      name: "Shreya Mishra",
      city: "Patna",
      rating: 5,
      review: "It was a beautiful and peaceful experience. Everything was simple and easy to understand. Thank you so much for making it special. 🙏",
    },
    {
      id: "chadhava-1",
      deity: "khatuShyam",
      name: "Ramesh Sharma",
      city: "Jaipur",
      rating: 5,
      review: "Jai Shri Shyam 🙏 I have always wanted to offer my prayers to Khatu Shyam Baba. This feels like a beautiful way to seek Baba's blessings for my family.",
    },
    {
      id: "chadhava-2",
      deity: "khatuShyam",
      name: "Sunita Agarwal",
      city: "Hyderabad",
      rating: 5,
      review: "Khatu Shyam Baba has a special place in my heart. I wanted to make an offering on Sharad Purnima and pray for peace and happiness in our home. Jai Shri Shyam! 🙏",
    },
    {
      id: "chadhava-3",
      deity: "kali",
      name: "Priyanka Reddy",
      city: "Visakhapatnam",
      rating: 5,
      review: "Jai Maa Kali 🙏 Offering prayers to Maa Kali during Diwali is very meaningful to me. I pray that Maa Kali protects my family and gives us strength.",
    },
    {
      id: "chadhava-4",
      deity: "kali",
      name: "Ankit S.",
      city: "Kolkata",
      rating: 5,
      review: "I have always had deep faith in Maa Kali. This Diwali, I wanted to offer my prayers at Kalighat and seek her blessings for my parents. Jai Maa Kali!",
    },
    {
      id: "chadhava-5",
      deity: "chhath",
      name: "Neha Singh",
      city: "Patna",
      rating: 5,
      review: "Chhath Puja is very special to our family. Offering Sandhya Arghya to Surya Dev at the Ganga Ghat feels deeply meaningful. Jai Chhathi Maiya! 🙏",
    },
    {
      id: "chadhava-6",
      deity: "chhath",
      name: "Ravi Kumar",
      city: "Ranchi",
      rating: 5,
      review: "I wanted to offer Sandhya Arghya during Chhath Puja and pray for my family's good health. The evening prayers to Surya Dev hold a special place in our traditions.",
    },
    {
      id: "chadhava-7",
      deity: "chhath",
      name: "Pooja Mishra",
      city: "Lucknow",
      rating: 5,
      review: "I love that the prayers include both evening and morning Arghya. Chhathi Maiya has always been important in our family, and I wanted to be part of both offerings. 🙏",
    },
    {
      id: "chadhava-8",
      deity: "chhath",
      name: "Sandeep Verma",
      city: "Varanasi",
      rating: 5,
      review: "Offering Usha Arghya to Surya Dev is one of the most beautiful parts of Chhath Puja. I wanted to pray for my parents and children. Jai Chhathi Maiya!",
    },
    {
      id: "chadhava-9",
      deity: "devDiwali",
      name: "Meenakshi Rao",
      city: "Bengaluru",
      rating: 5,
      review: "Har Har Mahadev 🙏 Dev Diwali in Kashi has always fascinated me. I wanted to make an offering at the sacred Ganga Ghat and seek the blessings of Mahadev and Maa Ganga.",
    },
    {
      id: "chadhava-10",
      deity: "devDiwali",
      name: "Amit Tiwari",
      city: "Prayagraj",
      rating: 5,
      review: "I have always dreamed of visiting Kashi during Dev Diwali. Making an offering to honour Maa Ganga and Lord Shiva feels like a meaningful way to express my devotion. Har Har Mahadev! 🙏",
    },
  ],
});

// Read-only predefined review copy. Names, cities and ratings remain exactly
// as stored; only the visible review text follows the selected site language.
// This is deliberately local content, not a claim that the sample entries are
// verified customer reviews.
const REVIEW_TEXT_TRANSLATIONS = Object.freeze({
  hi: {
    "puja-11": "पूजा का अनुभव बहुत अच्छा रहा। सब कुछ सुंदर ढंग से हुआ और मुझे बहुत खुशी व शांति मिली। सेवा के लिए बहुत धन्यवाद। 🙏",
    "puja-12": "पूजा का अनुभव पाकर मैं बहुत खुश हूं। सब कुछ अच्छे से व्यवस्थित था और पूरी प्रक्रिया बहुत अच्छी लगी। पूरी टीम को धन्यवाद। 🙏",
    "puja-1": "परिवार के लिए प्रार्थना करते समय मुझे बहुत शांति मिली। यह पूजा मेरे लिए अर्थपूर्ण थी और इसमें शामिल होकर खुशी हुई।",
    "puja-2": "घर से पूजा में शामिल होना अच्छा लगा। प्रार्थनाओं में अपने परिवार को जोड़ पाना मुझे बहुत पसंद आया।",
    "puja-3": "पूजा ने मुझे प्रार्थना करने और मंदिर से जुड़ने का समय दिया। यह हमारे परिवार के लिए खास पल था।",
    "puja-4": "मैंने परिवार की कुशलता के लिए प्रार्थना की। यह अनुभव अर्थपूर्ण था और मन को शांति मिली।",
    "puja-5": "पूजा और उसके महत्व के बारे में जानकर अच्छा लगा। इससे मैं अपनी आस्था से और जुड़ा हुआ महसूस कर पाई।",
    "puja-6": "पूजा का तरीका अच्छे से समझाया गया था। समझना आसान था और परिवार को प्रार्थना में शामिल करके खुशी हुई।",
    "puja-7": "यह हमारे परिवार के लिए विशेष पूजा थी। हमने साथ प्रार्थना की और बाद में बहुत शांति महसूस हुई। शामिल होना आसान बनाने के लिए धन्यवाद।",
    "puja-8": "मैं अपने माता-पिता के लिए प्रार्थना करना चाहती थी। यह अर्थपूर्ण अनुभव था और उनके लिए कुछ खास करके बहुत खुशी हुई।",
    "puja-9": "घर से पूजा में शामिल होकर खुशी हुई। इससे परिवार की खुशी के लिए शांत मन से प्रार्थना करने का अवसर मिला।",
    "puja-10": "यह पूजा मेरे लिए बहुत अर्थपूर्ण थी। बाद में मन शांत और सकारात्मक लगा, और मैं आगे भी मंदिर के अनुष्ठानों में भाग लेना चाहूंगी।",
    "chadhava-11": "बहुत अच्छा अनुभव रहा। मैं सेवा से खुश हूं और टीम के प्रयासों की सराहना करता हूं। बहुत धन्यवाद। 🙏",
    "chadhava-12": "यह सुंदर और शांत अनुभव था। सब कुछ सरल और समझने में आसान था। इसे विशेष बनाने के लिए बहुत धन्यवाद। 🙏",
    "chadhava-1": "जय श्री श्याम 🙏 मैं हमेशा खाटू श्याम बाबा को प्रार्थना अर्पित करना चाहता था। परिवार के लिए बाबा का आशीर्वाद लेने का यह सुंदर माध्यम लगा।",
    "chadhava-2": "खाटू श्याम बाबा मेरे हृदय में विशेष स्थान रखते हैं। शरद पूर्णिमा पर अर्पण करके घर की शांति और खुशी के लिए प्रार्थना करना चाहती थी। जय श्री श्याम! 🙏",
    "chadhava-3": "जय मां काली 🙏 दीवाली पर मां काली को प्रार्थना अर्पित करना मेरे लिए बहुत अर्थपूर्ण है। मैं परिवार की रक्षा और शक्ति के लिए प्रार्थना करती हूं।",
    "chadhava-4": "मां काली में मेरी गहरी आस्था है। इस दीवाली कालीघाट में माता को प्रार्थना अर्पित कर माता-पिता के लिए आशीर्वाद मांगना चाहा। जय मां काली!",
    "chadhava-5": "छठ पूजा हमारे परिवार के लिए बहुत विशेष है। गंगा घाट पर सूर्य देव को संध्या अर्घ्य अर्पित करना बहुत अर्थपूर्ण लगता है। जय छठी मैया! 🙏",
    "chadhava-6": "छठ पूजा में संध्या अर्घ्य अर्पित कर परिवार के अच्छे स्वास्थ्य के लिए प्रार्थना करना चाहता था। सूर्य देव की शाम की प्रार्थनाएं हमारी परंपरा में विशेष हैं।",
    "chadhava-7": "मुझे अच्छा लगा कि प्रार्थनाओं में शाम और सुबह दोनों के अर्घ्य शामिल हैं। छठी मैया हमारे परिवार में हमेशा महत्वपूर्ण रही हैं और मैं दोनों अर्पणों का हिस्सा बनना चाहती थी। 🙏",
    "chadhava-8": "सूर्य देव को उषा अर्घ्य अर्पित करना छठ पूजा का बहुत सुंदर हिस्सा है। मैं माता-पिता और बच्चों के लिए प्रार्थना करना चाहता था। जय छठी मैया!",
    "chadhava-9": "हर हर महादेव 🙏 काशी की देव दीवाली मुझे हमेशा आकर्षित करती है। पवित्र गंगा घाट पर अर्पण कर महादेव और मां गंगा का आशीर्वाद लेना चाहा।",
    "chadhava-10": "मैंने हमेशा देव दीवाली में काशी जाने का सपना देखा है। मां गंगा और भगवान शिव को अर्पण करना भक्ति व्यक्त करने का अर्थपूर्ण माध्यम लगा। हर हर महादेव! 🙏",
  },
  te: {
    "puja-11": "పూజ అనుభవం చాలా బాగుంది. అన్నీ చక్కగా జరిగాయి, నాకు ఎంతో సంతోషం మరియు ప్రశాంతత కలిగింది. మీ సేవకు చాలా ధన్యవాదాలు. 🙏",
    "puja-12": "పూజ అనుభవంతో నేను చాలా సంతోషంగా ఉన్నాను. అన్నీ చక్కగా ఏర్పాటు చేశారు, మొత్తం ప్రక్రియ చాలా బాగుంది. మొత్తం బృందానికి ధన్యవాదాలు. 🙏",
    "puja-1": "కుటుంబం కోసం ప్రార్థిస్తున్నప్పుడు నాకు ఎంతో ప్రశాంతంగా అనిపించింది. ఈ పూజ నాకు అర్థవంతంగా అనిపించింది, ఇందులో భాగం కావడం ఆనందంగా ఉంది.",
    "puja-2": "ఇంటి నుంచే పూజలో పాల్గొనడం బాగుంది. ప్రార్థనల్లో నా కుటుంబాన్ని చేర్చగలగడం నాకు నచ్చింది.",
    "puja-3": "ఈ పూజ నాకు ప్రార్థన చేసుకోవడానికి, ఆలయంతో అనుబంధం పొందడానికి సమయం ఇచ్చింది. ఇది మా కుటుంబానికి ప్రత్యేకమైన క్షణం.",
    "puja-4": "కుటుంబ క్షేమం కోసం ప్రార్థించాలని అనుకున్నాను. ఈ అనుభవం అర్థవంతంగా అనిపించి మనసుకు ప్రశాంతత ఇచ్చింది.",
    "puja-5": "పూజ, దాని ప్రాముఖ్యత గురించి తెలుసుకోవడం ఆనందంగా ఉంది. నా విశ్వాసంతో మరింత దగ్గరగా అనిపించింది.",
    "puja-6": "పూజ విధానాన్ని చక్కగా వివరించారు. అర్థం చేసుకోవడం సులభంగా ఉండి, కుటుంబాన్ని ప్రార్థనల్లో చేర్చడం ఆనందంగా ఉంది.",
    "puja-7": "ఇది మా కుటుంబానికి ప్రత్యేకమైన పూజ. కలిసి ప్రార్థించాం, తర్వాత చాలా ప్రశాంతంగా అనిపించింది. పాల్గొనడం సులభం చేసినందుకు ధన్యవాదాలు.",
    "puja-8": "నా తల్లిదండ్రుల కోసం ప్రార్థించాలని అనుకున్నాను. ఇది అర్థవంతమైన అనుభవం, వారి కోసం ప్రత్యేకంగా చేయడం ఆనందంగా ఉంది.",
    "puja-9": "ఇంటి నుంచే పూజలో పాల్గొనడం ఆనందంగా ఉంది. కుటుంబ సంతోషం కోసం ప్రశాంతంగా ప్రార్థించే అవకాశం దొరికింది.",
    "puja-10": "ఈ పూజ నాకు ఎంతో అర్థవంతంగా అనిపించింది. తర్వాత మనసు ప్రశాంతంగా, సానుకూలంగా అనిపించింది; ఇకముందు కూడా ఆలయ ఆచారాల్లో పాల్గొనాలని ఉంది.",
    "chadhava-11": "చాలా మంచి అనుభవం. సేవతో నేను సంతోషంగా ఉన్నాను, బృందం చేసిన ప్రయత్నాలను అభినందిస్తున్నాను. చాలా ధన్యవాదాలు. 🙏",
    "chadhava-12": "ఇది అందమైన, ప్రశాంతమైన అనుభవం. అన్నీ సరళంగా, అర్థం చేసుకోవడానికి సులభంగా ఉన్నాయి. ప్రత్యేకంగా చేసినందుకు చాలా ధన్యవాదాలు. 🙏",
    "chadhava-1": "జై శ్రీ శ్యామ్ 🙏 ఖాటూ శ్యామ్ బాబాకు ప్రార్థనలు అర్పించాలని ఎప్పటినుంచో అనుకున్నాను. కుటుంబం కోసం బాబా ఆశీర్వాదాలు కోరడానికి ఇది అందమైన మార్గంగా అనిపించింది.",
    "chadhava-2": "ఖాటూ శ్యామ్ బాబాకు నా హృదయంలో ప్రత్యేక స్థానం ఉంది. శరద్ పూర్ణిమ రోజు అర్పణ చేసి ఇంటి శాంతి, సంతోషాల కోసం ప్రార్థించాలని అనుకున్నాను. జై శ్రీ శ్యామ్! 🙏",
    "chadhava-3": "జై మా కాళీ 🙏 దీపావళి సమయంలో మా కాళీకి ప్రార్థనలు అర్పించడం నాకు ఎంతో అర్థవంతం. కుటుంబ రక్షణ, శక్తి కోసం ప్రార్థిస్తున్నాను.",
    "chadhava-4": "మా కాళీపై నాకు ఎంతో విశ్వాసం ఉంది. ఈ దీపావళికి కాళీఘాట్‌లో ప్రార్థనలు అర్పించి నా తల్లిదండ్రుల కోసం ఆశీర్వాదాలు కోరాలని అనుకున్నాను. జై మా కాళీ!",
    "chadhava-5": "ఛఠ్ పూజ మా కుటుంబానికి చాలా ప్రత్యేకం. గంగా ఘాట్ వద్ద సూర్యదేవునికి సంధ్య అర్ఘ్యం అర్పించడం ఎంతో అర్థవంతంగా అనిపిస్తుంది. జై ఛఠీ మయ్యా! 🙏",
    "chadhava-6": "ఛఠ్ పూజలో సంధ్య అర్ఘ్యం అర్పించి కుటుంబ ఆరోగ్యం కోసం ప్రార్థించాలని అనుకున్నాను. సూర్యదేవునికి సాయంత్రపు ప్రార్థనలు మా సంప్రదాయంలో ప్రత్యేకమైనవి.",
    "chadhava-7": "ప్రార్థనల్లో సాయంత్రం, ఉదయం రెండింటి అర్ఘ్యాలు ఉండటం నాకు నచ్చింది. ఛఠీ మయ్యా మా కుటుంబంలో ఎప్పుడూ ముఖ్యమైనవారు; రెండు అర్పణల్లో భాగం కావాలని అనుకున్నాను. 🙏",
    "chadhava-8": "సూర్యదేవునికి ఉషా అర్ఘ్యం అర్పించడం ఛఠ్ పూజలో అత్యంత అందమైన భాగం. తల్లిదండ్రులు, పిల్లల కోసం ప్రార్థించాలని అనుకున్నాను. జై ఛఠీ మయ్యా!",
    "chadhava-9": "హర హర మహాదేవ్ 🙏 కాశీ దేవ దీపావళి నన్నెప్పుడూ ఆకర్షిస్తుంది. పవిత్ర గంగా ఘాట్ వద్ద అర్పణ చేసి మహాదేవుడు, మా గంగా ఆశీర్వాదాలు కోరాలని అనుకున్నాను.",
    "chadhava-10": "దేవ దీపావళి సమయంలో కాశీకి వెళ్లాలని ఎప్పటినుంచో కల ఉంది. మా గంగా, శివుడికి అర్పణ చేయడం నా భక్తిని వ్యక్తం చేసే అర్థవంతమైన మార్గంగా అనిపించింది. హర హర మహాదేవ్! 🙏",
  },
});

export const getLocalizedReviewText = (review, language) =>
  REVIEW_TEXT_TRANSLATIONS[language]?.[review?.id] || review?.review || "";

/** Words in a Chadhava's title / temple / description that link it to a deity group. */
export const DEITY_KEYWORDS = Object.freeze({
  khatuShyam: ["khatu", "shyam", "खाटू", "श्याम", "ఖాటు", "శ్యామ్"],
  kali: ["kali", "kalighat", "काली", "కాళి", "కాలీ"],
  chhath: ["chhath", "chhathi", "surya", "arghya", "छठ", "सूर्य", "अर्घ्य", "ఛఠ్", "సూర్య"],
  devDiwali: ["dev diwali", "dev deepawali", "kashi", "varanasi", "ganga", "mahadev", "shiva", "देव दीपावली", "देव दिवाली", "काशी", "गंगा", "महादेव", "కాశీ", "గంగ", "మహాదేవ"],
});

/**
 * Returns reviews for a service in display order:
 * 1. Chadhava reviews of the deity the Chadhava is offered to (strongest keyword match first),
 * 2. `general` reviews that don't name any Puja / Chadhava — so a newly added
 *    Puja or Chadhava with no matching reviews shows these first,
 * 3. the rest, in their original order.
 */
export const getReviews = (serviceType, matchText = "") => {
  const reviews = REVIEWS_AND_FEEDBACK[serviceType] || [];
  const text = String(matchText).toLowerCase();

  const scores = Object.fromEntries(
    Object.entries(DEITY_KEYWORDS).map(([deity, words]) => [
      deity,
      text ? words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0) : 0,
    ])
  );
  return reviews
    .map((review, index) => ({ review, index, score: scores[review.deity] || 0, general: review.general ? 1 : 0 }))
    .sort((a, b) => b.score - a.score || b.general - a.general || a.index - b.index)
    .map(({ review }) => review);
};

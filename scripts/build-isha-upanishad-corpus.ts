import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { scriptureFileSchema } from "../src/lib/rag/scripture-schema";

const sourceTitle = "Isha Upanishad";
const translator = "Swami Paramananda";
const license = "Public Domain (1919)";
const copyrightStatus = "public_domain";

const rawVerses = [
  {
    verse: 1,
    originalText: "ईशा वास्यमिदं सर्वं यत्किञ्च जगत्यां जगत् ।\nतेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम् ॥",
    transliteration: "īśā vāsyamidaṃ sarvaṃ yatkiñca jagatyāṃ jagat |\ntena tyaktena bhuñjīthā mā gṛdhaḥ kasyasviddhanam ||",
    translation: "All this—whatever exists in this changing universe—should be covered by the Lord. Protect the Self by renunciation. Lust not after any man's wealth.",
    commentary: "The opening verse establishes the omnipresence of the Divine and the principle of renunciation as the path to true enjoyment.",
    practicalNote: "Practice non-attachment and see the divine presence in all things.",
    themeTags: ["renunciation", "omnipresence", "non-attachment", "divine"],
    emotionTags: ["peace", "detachment"],
    answerUseCases: ["wealth", "attachment", "true enjoyment", "spiritual vision"]
  },
  {
    verse: 2,
    originalText: "कुर्वन्नेवेह कर्माणि जिजीविषेच्छतं समाः ।\nएवं त्वयि नान्यथेतोऽस्ति न कर्म लिप्यते नरे ॥",
    transliteration: "kurvanneveha karmāṇi jijīviṣecchataṃ samāḥ |\nevaṃ tvayi nānyatheto'sti na karma lipyate nare ||",
    translation: "If a man wishes to live a hundred years on this earth, he should live performing action. For you, who thus desire to live, there is no other way. By performing action thus, a man is not bound by it.",
    commentary: "Action performed without attachment to the results does not bind the soul.",
    practicalNote: "Perform your daily duties sincerely without obsessing over the results.",
    themeTags: ["action", "karma", "duty", "longevity"],
    emotionTags: ["diligence", "freedom"],
    answerUseCases: ["work", "career", "duty", "burnout"]
  },
  {
    verse: 3,
    originalText: "असुर्या नाम ते लोका अन्धेन तमसावृताः ।\nतांस्ते प्रेत्याभिगच्छन्ति ये के चात्महनो जनाः ॥",
    transliteration: "asuryā nāma te lokā andhena tamasāvṛtāḥ |\ntāṃste pretyābhigacchanti ye ke cātmahano janāḥ ||",
    translation: "Sunless and covered with blind darkness are the worlds. To them go after death those who are slayers of the Self.",
    commentary: "Ignoring one's spiritual nature (slaying the Self) leads to ignorance and darkness.",
    practicalNote: "Do not neglect your inner spiritual life in the pursuit of purely material goals.",
    themeTags: ["ignorance", "darkness", "self-knowledge"],
    emotionTags: ["warning", "seriousness"],
    answerUseCases: ["depression", "ignorance", "spiritual neglect"]
  },
  {
    verse: 4,
    originalText: "अनेजदेकं मनसो जवीयो नैनद्देवा आप्नुवन्पूर्वमर्षत् ।\nतद्धावतोऽन्यानत्येति तिष्ठत्तस्मिन्नपो मातरिश्वा दधाति ॥",
    transliteration: "anejadekaṃ manaso javīyo nainaddevā āpnuvanpūrvamarṣat |\ntaddhāvato'nyānatyeti tiṣṭhattasminnapo mātariśvā dadhāti ||",
    translation: "That One, though motionless, is swifter than the mind. The senses can never overtake It, for It ever goes before. Though stationary, It outstrips all runners. By It, the all-pervading air supports the activities of all beings.",
    commentary: "The Ultimate Reality transcends time, space, and sensory perception.",
    practicalNote: "Meditate on the stillness within that connects all movement.",
    themeTags: ["ultimate reality", "stillness", "brahman"],
    emotionTags: ["awe", "stillness"],
    answerUseCases: ["nature of reality", "meditation", "calmness"]
  },
  {
    verse: 5,
    originalText: "तदेजति तन्नैजति तद्दूरे तद्वन्तिके ।\nतदन्तरस्य सर्वस्य तदु सर्वस्यास्य बाह्यतः ॥",
    transliteration: "tadejati tannaijati taddūre tadvantike |\ntadantarasya sarvasya tadu sarvasyāsya bāhyataḥ ||",
    translation: "It moves and It moves not. It is far and also It is near. It is within and also It is without all this.",
    commentary: "A paradoxical description of the Infinite, which is both immanent and transcendent.",
    practicalNote: "Recognize that the Divine is both far away in the cosmos and intimately close within your heart.",
    themeTags: ["paradox", "immanence", "transcendence"],
    emotionTags: ["wonder", "connection"],
    answerUseCases: ["finding God", "closeness", "distance"]
  },
  {
    verse: 6,
    originalText: "यस्तु सर्वाणि भूतान्यात्मन्येवानुपश्यति ।\nसर्वभूतेषु चात्मानं ततो न विजुगुप्सते ॥",
    transliteration: "yastu sarvāṇi bhūtānyātmanyevānupaśyati |\nsarvabhūteṣu cātmānaṃ tato na vijugupsate ||",
    translation: "He who sees all beings in the Self and the Self in all beings, he never turns away from It (the Self).",
    commentary: "Realizing the interconnectedness of all life eliminates hatred and delusion.",
    practicalNote: "Try to see your own struggles and joys reflected in the people you meet today.",
    themeTags: ["unity", "compassion", "interconnectedness"],
    emotionTags: ["love", "acceptance"],
    answerUseCases: ["hatred", "prejudice", "unity", "compassion"]
  },
  {
    verse: 7,
    originalText: "यस्मिन्सर्वाणि भूतान्यात्मैवाभूद्विजानतः ।\nतत्र को मोहः कः शोक एकत्वमनुपश्यतः ॥",
    transliteration: "yasminsarvāṇi bhūtānyātmaivābhūdvijānataḥ |\ntatra ko mohaḥ kaḥ śoka ekatvamanupaśyataḥ ||",
    translation: "He who perceives all beings as the Self, for him how can there be delusion or grief, when he sees this oneness everywhere?",
    commentary: "Grief and delusion arise from the illusion of separation. Unity consciousness brings perfect peace.",
    practicalNote: "When feeling isolated or grieving, remind yourself of the fundamental unity of all existence.",
    themeTags: ["grief", "delusion", "oneness"],
    emotionTags: ["peace", "comfort"],
    answerUseCases: ["grief", "loss", "loneliness", "sorrow"]
  },
  {
    verse: 8,
    originalText: "स पर्यगाच्छुक्रमकायमव्रणमस्नाविरं शुद्धमपापविद्धम् ।\nकविर्मनीषी परिभूः स्वयम्भूर्याथातथ्यतोऽर्थान्व्यदधाच्छाश्वतीभ्यः समाभ्यः ॥",
    transliteration: "sa paryagācchukramakāyamavraṇamasnāviraṃ śuddhamapāpaviddham |\nkavirmanīṣī paribhūḥ svayambhūryāthātathyato'rthānvyadadhācchāśvatībhyaḥ samābhyaḥ ||",
    translation: "He (the Self) is all-encircling, resplendent, bodiless, spotless, without sinews, pure, untouched by sin, all-seeing, all-knowing, transcendent, self-existent; He has disposed all things duly for eternal years.",
    commentary: "Describes the attributes of the Supreme Being: pure, eternal, and the ultimate ordainer.",
    practicalNote: "Take refuge in the purity and eternal nature of your true self.",
    themeTags: ["purity", "supreme being", "eternal"],
    emotionTags: ["reverence", "purity"],
    answerUseCases: ["purity", "guilt", "nature of God"]
  },
  {
    verse: 9,
    originalText: "अन्धं तमः प्रविशन्ति येऽविद्यामुपासते ।\nततो भूय इव ते तमो य उ विद्यायां रताः ॥",
    transliteration: "andhaṃ tamaḥ praviśanti ye'vidyāmupāsate |\ntato bhūya iva te tamo ya u vidyāyāṃ ratāḥ ||",
    translation: "Into blind darkness enter they who worship ignorance; into greater darkness, as it were, enter they who are devoted to knowledge alone.",
    commentary: "Both absolute ignorance and mere intellectual knowledge without spiritual practice are pitfalls.",
    practicalNote: "Balance your intellectual pursuits with genuine spiritual practice and humility.",
    themeTags: ["knowledge", "ignorance", "balance"],
    emotionTags: ["caution", "humility"],
    answerUseCases: ["intellectualism", "arrogance", "ignorance"]
  },
  {
    verse: 10,
    originalText: "अन्यदेवाहुर्विद्ययाऽन्यदाहुरविद्यया ।\nइति शुश्रुम धीराणां ये नस्तद्विचचक्षिरे ॥",
    transliteration: "anyadevāhurvidyayā'nyadāhuravidyayā |\niti śuśruma dhīrāṇāṃ ye nastadvicacakṣire ||",
    translation: "Distinct, indeed, they say, is the result of knowledge; distinct, they say, is the result of ignorance. Thus have we heard from the wise who have explained it to us.",
    commentary: "The paths of lower knowledge (material sciences) and higher knowledge (spiritual wisdom) yield different results.",
    practicalNote: "Recognize the value of both practical skills and inner wisdom.",
    themeTags: ["wisdom", "paths", "learning"],
    emotionTags: ["clarity", "respect"],
    answerUseCases: ["education", "learning", "wisdom"]
  },
  {
    verse: 11,
    originalText: "विद्यां चाविद्यां च यस्तद्वेदोभयं सह ।\nअविद्यया मृत्युं तीर्त्वा विद्ययामृतमश्नुते ॥",
    transliteration: "vidyāṃ cāvidyāṃ ca yastadvedobhayaṃ saha |\navidyayā mṛtyuṃ tīrtvā vidyayāmṛtamaśnute ||",
    translation: "He who knows both knowledge and ignorance, by ignorance overcomes death and by knowledge enjoys immortality.",
    commentary: "Integration of material duties (avidya) and spiritual knowledge (vidya) is essential for crossing the ocean of mortality and attaining immortality.",
    practicalNote: "Fulfill your worldly responsibilities while maintaining a focus on ultimate spiritual liberation.",
    themeTags: ["immortality", "integration", "death"],
    emotionTags: ["hope", "triumph"],
    answerUseCases: ["death", "fear of death", "balance of life"]
  },
  {
    verse: 12,
    originalText: "अन्धं तमः प्रविशन्ति येऽसम्भूतिमुपासते ।\nततो भूय इव ते तमो य उ सम्भूत्यां रताः ॥",
    transliteration: "andhaṃ tamaḥ praviśanti ye'sambhūtimupāsate |\ntato bhūya iva te tamo ya u sambhūtyāṃ ratāḥ ||",
    translation: "Into blind darkness enter they who worship the unmanifest; into greater darkness, as it were, enter they who are devoted to the manifest.",
    commentary: "Exclusive attachment to either the unmanifested (formless) or the manifested (forms/rituals) is incomplete.",
    practicalNote: "Honor the formless Divine while also respecting its expression in the world of forms.",
    themeTags: ["manifest", "unmanifest", "worship"],
    emotionTags: ["balance", "caution"],
    answerUseCases: ["formless God", "idol worship", "rituals"]
  },
  {
    verse: 13,
    originalText: "अन्यदेवाहुः सम्भवादन्यदाहुरसम्भवात् ।\nइति शुश्रुम धीराणां ये नस्तद्विचचक्षिरे ॥",
    transliteration: "anyadevāhuḥ sambhavādanyadāhurasambhavāt |\niti śuśruma dhīrāṇāṃ ye nastadvicacakṣire ||",
    translation: "Distinct, indeed, they say, is what is produced by the manifest; distinct, they say, is what is produced by the unmanifest. Thus have we heard from the wise who have explained it to us.",
    commentary: "Each path has its specific cosmic result, as taught by the ancient seers.",
    practicalNote: "Learn from the ancient wisdom about the different fruits of various spiritual practices.",
    themeTags: ["results", "manifest", "unmanifest"],
    emotionTags: ["respect", "clarity"],
    answerUseCases: ["spiritual results", "ancient wisdom"]
  },
  {
    verse: 14,
    originalText: "सम्भूतिं च विनाशं च यस्तद्वेदोभयं सह ।\nविनाशेन मृत्युं तीर्त्वा सम्भूत्यामृतमश्नुते ॥",
    transliteration: "sambhūtiṃ ca vināśaṃ ca yastadvedobhayaṃ saha |\nvināśena mṛtyuṃ tīrtvā sambhūtyāmṛtamaśnute ||",
    translation: "He who knows both the manifest and the unmanifest (destruction), by the unmanifest overcomes death and by the manifest enjoys immortality.",
    commentary: "A holistic understanding of creation and destruction leads to ultimate liberation.",
    practicalNote: "Accept the cycles of creation and destruction in life as necessary steps to spiritual freedom.",
    themeTags: ["creation", "destruction", "liberation"],
    emotionTags: ["acceptance", "peace"],
    answerUseCases: ["change", "destruction", "liberation"]
  },
  {
    verse: 15,
    originalText: "हिरण्मयेन पात्रेण सत्यस्यापिहितं मुखम् ।\nतत्त्वं पूषन्नपावृणु सत्यधर्माय दृष्टये ॥",
    transliteration: "hiraṇmayena pātreṇa satyasyāpihitaṃ mukham |\ntattvaṃ pūṣannapāvṛṇu satyadharmāya dṛṣṭaye ||",
    translation: "The face of Truth is hidden by a golden disk. O Pushan (Effulgent Being), uncover it so that I, who am devoted to Truth, may behold it.",
    commentary: "The dazzling allure of the material world hides the ultimate spiritual Truth. A prayer for divine revelation.",
    practicalNote: "Pray for clarity to see past the glittering distractions of the material world.",
    themeTags: ["truth", "prayer", "revelation", "materialism"],
    emotionTags: ["yearning", "devotion"],
    answerUseCases: ["distraction", "materialism", "seeking truth"]
  },
  {
    verse: 16,
    originalText: "पूषन्नेकर्षे यम सूर्य प्राजापत्य व्यूह रश्मीन्समूह ।\nतेजो यत्ते रूपं कल्याणतमं तत्ते पश्यामि योऽसावसौ पुरुषः सोऽहमस्मि ॥",
    transliteration: "pūṣannekarṣe yama sūrya prājāpatya vyūha raśmīnsamūha |\ntejo yatte rūpaṃ kalyāṇatamaṃ tatte paśyāmi yo'sāvasau puruṣaḥ so'hamasmi ||",
    translation: "O Pushan, O Sun, sole traveler, controller, son of Prajapati, gather your rays, withdraw your light. I behold your most glorious form. The Purusha (Being) who dwells there, I am He.",
    commentary: "The realization of the ultimate identity between the individual soul and the Supreme Being.",
    practicalNote: "Affirm your inherent divinity and your connection to the supreme light.",
    themeTags: ["identity", "supreme being", "realization", "so'ham"],
    emotionTags: ["triumph", "ecstasy", "identification"],
    answerUseCases: ["self-realization", "identity", "divinity"]
  },
  {
    verse: 17,
    originalText: "वायुरनिलममृतमथेदं भस्मान्तं शरीरम् ।\nॐ क्रतो स्मर कृतं स्मर क्रतो स्मर कृतं स्मर ॥",
    transliteration: "vāyuranilamamṛtamathedaṃ bhasmāntaṃ śarīram |\noṃ krato smara kṛtaṃ smara krato smara kṛtaṃ smara ||",
    translation: "Let my vital breath merge into the all-pervading, immortal Prana. Let this body be burnt to ashes. O mind, remember your deeds! Remember, O mind, remember your deeds!",
    commentary: "A final prayer at the time of death, recalling one's actions and focusing the mind on the eternal.",
    practicalNote: "Live your life in such a way that at the end, you can remember your deeds with peace.",
    themeTags: ["death", "karma", "memory", "prayer"],
    emotionTags: ["solemnity", "resolve"],
    answerUseCases: ["death", "end of life", "karma", "regret"]
  },
  {
    verse: 18,
    originalText: "अग्ने नय सुपथा राये अस्मान्विश्वानि देव वयुनानि विद्वान् ।\nयुयोध्यस्मज्जुहुराणमेनो भूयिष्ठां ते नमउक्तिं विधेम ॥",
    transliteration: "agne naya supathā rāye asmānviśvāni deva vayunāni vidvān |\nyuyodhyasmajjuhurāṇameno bhūyiṣṭhāṃ te namauktiṃ vidhema ||",
    translation: "O Agni, lead us by the good path to the enjoyment of the fruit of our good deeds. You know, O God, all our actions. Destroy our deceitful sins. We offer you our countless salutations.",
    commentary: "A concluding prayer for guidance, purification from sin, and grace on the spiritual journey.",
    practicalNote: "Seek divine guidance to stay on the righteous path and overcome your inner flaws.",
    themeTags: ["guidance", "purification", "prayer", "salutation"],
    emotionTags: ["devotion", "humility", "surrender"],
    answerUseCases: ["guidance", "sin", "forgiveness", "prayer"]
  }
];

const chunks = rawVerses.map(rv => ({
  id: `isha-${rv.verse}`,
  source: sourceTitle,
  canonicalRef: String(rv.verse),
  chapter: 1, // Upanishads are often single chapter
  verse: rv.verse,
  language: "sanskrit",
  originalText: rv.originalText,
  transliteration: rv.transliteration,
  translation: rv.translation,
  commentary: rv.commentary,
  practicalNote: rv.practicalNote,
  personaTags: ["shiva", "krishna", "rama", "sita", "radha", "hanuman"],
  themeTags: rv.themeTags,
  emotionTags: rv.emotionTags,
  answerUseCases: rv.answerUseCases,
  sourcePriority: 10, // Upanishads have high priority
  translator: translator,
  license: license,
  copyrightStatus: copyrightStatus,
}));

const parsed = scriptureFileSchema.parse(chunks);
const outPath = path.resolve(process.cwd(), "data", "scriptures", "isha-upanishad.json");
fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));

console.log(`Successfully generated ${outPath} with ${parsed.length} verses.`);

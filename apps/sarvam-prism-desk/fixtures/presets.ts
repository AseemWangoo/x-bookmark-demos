import { LANGS, type Lang } from "../src/lib/types";

export type Preset = {
  id: string;
  label: string;
  variants: Record<Lang, string>;
};

/** Six fictional Indian-context messages. Hand-written in seven languages. */
export const PRESETS: Preset[] = [
  {
    id: "upi",
    label: "UPI debit ₹2,499",
    variants: {
      en: "UPI payment of ₹2,499 was debited but the order shows failed.",
      hinglish: "UPI se ₹2,499 kat gaya lekin order failed dikha raha hai.",
      hi: "UPI से ₹2,499 कट गया लेकिन ऑर्डर फेल दिख रहा है।",
      ta: "UPI-ல் ₹2,499 பிடித்தது, ஆனால் ஆர்டர் தோல்வி என்று காட்டுகிறது.",
      bn: "UPI থেকে ₹2,499 কেটেছে, কিন্তু অর্ডার ফেইল দেখাচ্ছে।",
      te: "UPI నుంచి ₹2,499 కట్ అయింది, కానీ ఆర్డర్ ఫెయిల్ చూపిస్తోంది.",
      mr: "UPI मधून ₹2,499 कटले, पण ऑर्डर फेल दिसत आहे.",
    },
  },
  {
    id: "crash",
    label: "Login crash",
    variants: {
      en: "The app crashes on login after the update and the OTP never arrives.",
      hinglish: "Update ke baad app login pe crash ho raha hai, OTP nahi aa raha.",
      hi: "अपडेट के बाद ऐप लॉगिन पर क्रैश हो रहा है और OTP नहीं आ रहा।",
      ta: "புதுப்பிப்புக்குப் பிறகு ஆப் உள்நுழைவில் செயலிழக்கிறது, OTP வரவில்லை.",
      bn: "আপডেটের পর অ্যাপ লগইনে ক্র্যাশ করছে, OTP আসছে না।",
      te: "అప్‌డేట్ తర్వాత యాప్ లాగిన్‌లో క్రాష్ అవుతోంది, OTP రావడం లేదు.",
      mr: "अपडेटनंतर ॲप लॉगिनवर क्रॅश होतोय, OTP येत नाही.",
    },
  },
  {
    id: "kyc",
    label: "KYC pending",
    variants: {
      en: "My KYC has been pending for 3 days.",
      hinglish: "Mera KYC 3 din se pending hai.",
      hi: "मेरा KYC तीन दिन से पेंडिंग है।",
      ta: "என் KYC மூன்று நாட்களாக நிலுவையில் உள்ளது.",
      bn: "আমার KYC তিন দিন ধরে পেন্ডিং।",
      te: "నా KYC మూడు రోజులుగా పెండింగ్‌లో ఉంది.",
      mr: "माझे KYC तीन दिवसांपासून पेंडिंग आहे.",
    },
  },
  {
    id: "delivery",
    label: "Late delivery",
    variants: {
      en: "My delivery is late by 5 days. Please share the status.",
      hinglish: "Delivery 5 din late hai, status bata do.",
      hi: "मेरी डिलीवरी 5 दिन लेट है, स्टेटस बता दो।",
      ta: "என் டெலிவரி 5 நாட்கள் தாமதம், நிலையைச் சொல்லுங்கள்.",
      bn: "আমার ডেলিভারি ৫ দিন দেরি, স্ট্যাটাস বলুন।",
      te: "నా డెలివరీ 5 రోజులు ఆలస్యం, స్టేటస్ చెప్పండి.",
      mr: "माझी डिलिव्हरी ५ दिवस लेट आहे, स्टेटस सांगा.",
    },
  },
  {
    id: "takeover",
    label: "Account takeover",
    variants: {
      en: "Someone else logged into my account and changed the bank details.",
      hinglish: "Kisi aur ne mere account mein login karke bank details badal di.",
      hi: "किसी और ने मेरे खाते में लॉगिन करके बैंक डिटेल बदल दी।",
      ta: "வேறு யாரோ என் கணக்கில் நுழைந்து வங்கி விவரத்தை மாற்றிவிட்டனர்.",
      bn: "অন্য কেউ আমার অ্যাকাউন্টে ঢুকে ব্যাংক ডিটেল বদলেছে।",
      te: "వేరొకరు నా ఖాతాలో లాగిన్ అయ్యి బ్యాంక్ వివరాలు మార్చారు.",
      mr: "कोणीतरी माझ्या खात्यात लॉगिन करून बँक डिटेल्स बदलल्या.",
    },
  },
  {
    id: "seats",
    label: "200 seats",
    variants: {
      en: "We need bulk pricing for 200 seats for a college.",
      hinglish: "College ke liye 200 seats ka bulk pricing chahiye.",
      hi: "कॉलेज के लिए 200 सीटों का बल्क प्राइसिंग चाहिए।",
      ta: "கல்லூரிக்கு 200 இருக்கைகளுக்கான மொத்த விலை வேண்டும்.",
      bn: "কলেজের জন্য ২০০ সিটের বাল্ক প্রাইসিং চাই।",
      te: "కాలేజీకి 200 సీట్ల బల్క్ ధర కావాలి.",
      mr: "कॉलेजसाठी 200 सीट्सची बल्क किंमत हवी आहे.",
    },
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export { LANGS };

/**
 * Reviews and feedback received from devotees.
 * Puja reviews are shown at the bottom of every Puja detail page and
 * Chadhava reviews at the bottom of every Chadhava detail page.
 * To add a review, append an entry with name, city, rating and review text.
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

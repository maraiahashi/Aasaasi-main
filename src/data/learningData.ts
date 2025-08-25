// Learning content data
export const vocabularyCategories = [
  {
    id: "business",
    name: "Business English",
    description: "Professional vocabulary for workplace communication",
    level: "B2-C1",
    words: [
      { word: "collaborate", definition: "Work jointly on an activity", somali: "wada shaqayn", example: "We need to collaborate on this project." },
      { word: "negotiate", definition: "Discuss to reach an agreement", somali: "wada hadal", example: "Let's negotiate the contract terms." },
      { word: "implement", definition: "Put a plan into effect", somali: "hirgelin", example: "We will implement the new policy next month." },
      { word: "stakeholder", definition: "Person with interest in a business", somali: "qayb qaate", example: "All stakeholders must approve the decision." }
    ]
  },
  {
    id: "academic", 
    name: "Academic English",
    description: "Vocabulary for educational and research contexts",
    level: "B2-C2",
    words: [
      { word: "hypothesis", definition: "A proposed explanation", somali: "mala-awaal", example: "The research tests this hypothesis." },
      { word: "methodology", definition: "System of methods used", somali: "hab-raac", example: "Our methodology follows best practices." },
      { word: "analyze", definition: "Examine in detail", somali: "falanqayn", example: "We need to analyze the data carefully." },
      { word: "synthesize", definition: "Combine elements", somali: "isku dhafan", example: "The paper synthesizes various theories." }
    ]
  },
  {
    id: "daily",
    name: "Daily Conversation", 
    description: "Common words for everyday interactions",
    level: "A2-B1",
    words: [
      { word: "convenient", definition: "Suitable for needs", somali: "ku habboon", example: "Is this time convenient for you?" },
      { word: "apologize", definition: "Express regret", somali: "raali gelin", example: "I apologize for being late." },
      { word: "appreciate", definition: "Recognize value", somali: "qadarin", example: "I appreciate your help." },
      { word: "recommend", definition: "Suggest as good", somali: "ku talin", example: "Can you recommend a good restaurant?" }
    ]
  }
];

export const weeklyProgressData = [
  { day: "Mon", words: 8, accuracy: 85 },
  { day: "Tue", words: 12, accuracy: 90 },
  { day: "Wed", words: 6, accuracy: 75 },
  { day: "Thu", words: 15, accuracy: 88 },
  { day: "Fri", words: 10, accuracy: 92 },
  { day: "Sat", words: 14, accuracy: 87 },
  { day: "Sun", words: 9, accuracy: 89 }
];

export const defaultAchievements = [
  { name: "Word Collector", description: "Learned 200+ words", icon: "⭐", earned: true },
  { name: "Quiz Master", description: "Completed 20+ quizzes", icon: "★", earned: true },
  { name: "Streak Keeper", description: "7-day learning streak", icon: "✓", earned: true },
  { name: "Grammar Guru", description: "Master 5 grammar topics", icon: "◆", earned: false },
  { name: "Vocabulary Expert", description: "Learn 500 words", icon: "♦", earned: false }
];

export const generalRecommendations = [
  {
    type: "Trending Words",
    items: ["sustainable", "innovation", "collaborate", "perspective"],
    reason: "Popular words this week",
    priority: "medium" as const
  },
  {
    type: "Beginner Quiz",
    items: ["Basic Vocabulary", "Simple Present Tense", "Common Phrases"],
    reason: "Perfect starting point for new learners",
    priority: "high" as const
  },
  {
    type: "Related Idioms",
    items: ["Break the ice", "Piece of cake", "Hit the books"],
    reason: "Commonly used expressions",
    priority: "low" as const
  }
];
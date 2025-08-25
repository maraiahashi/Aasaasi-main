/**
 * Grammar tips and test questions data
 * Organized by topic with examples and explanations
 */

export interface GrammarExample {
  correct: string;
  incorrect: string;
  explanation: string;
}

export interface GrammarTip {
  title: string;
  category: string;
  rule: string;
  examples: GrammarExample[];
}

export interface TestQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const grammarTips: GrammarTip[] = [
  {
    title: "Present Simple with Third Person",
    category: "Verb Forms",
    rule: "Add 's' to verbs when using he/she/it in the present simple",
    examples: [
      { 
        correct: "He goes to school.", 
        incorrect: "He go to school.", 
        explanation: "Add 's' to 'go' → 'goes'" 
      },
      { 
        correct: "She doesn't like it.", 
        incorrect: "She don't like it.", 
        explanation: "Use 'doesn't' with he/she/it, not 'don't'" 
      }
    ]
  },
  {
    title: "Article Usage",
    category: "Articles",
    rule: "Use 'a' before consonant sounds, 'an' before vowel sounds",
    examples: [
      { 
        correct: "An honest person", 
        incorrect: "A honest person", 
        explanation: "'Honest' starts with vowel sound /ɒ/" 
      },
      { 
        correct: "A university", 
        incorrect: "An university", 
        explanation: "'University' starts with consonant sound /j/" 
      }
    ]
  }
];

export const testQuestions: TestQuestion[] = [
  {
    question: "Choose the correct sentence:",
    options: [
      "She don't like coffee.",
      "She doesn't like coffee.", 
      "She not like coffee.",
      "She no like coffee."
    ],
    correct: 1,
    explanation: "Use 'doesn't' with third person singular (he/she/it)"
  },
  {
    question: "Fill in the blank: He _____ to work every day.",
    options: [
      "go",
      "going",
      "goes",
      "gone"
    ],
    correct: 2,
    explanation: "Add 's' to verbs with third person singular in present simple"
  },
  {
    question: "Choose the correct article:",
    options: [
      "A elephant",
      "An elephant",
      "The elephant",
      "No article needed"
    ],
    correct: 1,
    explanation: "'Elephant' starts with a vowel sound, so use 'an'"
  }
];
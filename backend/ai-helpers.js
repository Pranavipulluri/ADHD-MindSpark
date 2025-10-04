const { spawn } = require('child_process');
const path = require('path');

// Gemini AI integration
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAIResponse(message) {
  try {
    // Try Gemini API first
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a friendly, encouraging AI tutor for neurodivergent children and teens. 
    Respond in a warm, supportive way that builds confidence. Use simple language, emojis, and positive reinforcement.
    Keep responses concise but engaging. User message: "${message}"`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (geminiError) {
    console.log('Gemini API failed, using fallback:', geminiError.message);
    // Fallback to simple responses
    return generateSimpleResponse(message);
  }
}

function generateSimpleResponse(input) {
  const lowerInput = input.toLowerCase();
  
  // Math questions
  if (lowerInput.includes('math') || lowerInput.includes('add') || lowerInput.includes('subtract')) {
    return "Math is so cool! Want to try a fun math game? I can help you practice addition, subtraction, multiplication, or division! 🔢";
  }
  
  // Science questions
  if (lowerInput.includes('science') || lowerInput.includes('why') || lowerInput.includes('how')) {
    return "Science is amazing! Everything around us follows scientific rules. What are you curious about? Animals, space, weather, or something else? 🔬";
  }
  
  // Reading and writing
  if (lowerInput.includes('read') || lowerInput.includes('write') || lowerInput.includes('story')) {
    return "Reading opens up whole new worlds! What kind of stories do you like? Adventure, mystery, fantasy, or something else? 📚";
  }
  
  // Encouragement
  if (lowerInput.includes('hard') || lowerInput.includes('difficult') || lowerInput.includes('can\'t')) {
    return "I believe in you! Every expert was once a beginner. Take it one step at a time, and you'll get there! 💪";
  }
  
  // Greetings
  if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
    return "Hello there! I'm so happy to chat with you today! What would you like to learn about? 😊";
  }
  
  // Default responses
  const defaults = [
    "That's interesting! Tell me more about what you're thinking. I'm here to help you learn and explore! 🤔",
    "I love your curiosity! Can you give me a bit more detail so I can help you better?",
    "Great question! Learning is all about asking questions. What specifically would you like to know more about?",
    "You're such a thoughtful learner! Let's explore this together. What part interests you most?"
  ];
  
  return defaults[Math.floor(Math.random() * defaults.length)];
}

async function processDocument(content, options = {}) {
  try {
    console.log('Processing document with local AI...');
    // Use local processing for now
    return await processWithLocalAI(content);
  } catch (error) {
    console.error('Document processing error:', error);
    
    // Final fallback to simple processing
    return {
      summary: generateSummary(content),
      questions: generateQuestions(content),
      analysis: analyzeContent(content)
    };
  }
}

async function processWithLocalAI(content, task = 'all') {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'python-ai', 'simple_ai.py');
    const python = spawn('python', [pythonScript, '--task', task, '--text', content, '--output', 'json']);
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python AI error:', error);
        // Fallback to simple processing
        resolve({
          summary: generateSummary(content),
          questions: generateQuestions(content),
          analysis: analyzeContent(content)
        });
        return;
      }
      
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (parseError) {
        console.error('Failed to parse Python AI output:', parseError);
        // Fallback to simple processing
        resolve({
          summary: generateSummary(content),
          questions: generateQuestions(content),
          analysis: analyzeContent(content)
        });
      }
    });
  });
}

function generateSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const importantSentences = sentences
    .slice(0, Math.min(5, Math.ceil(sentences.length * 0.3)))
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return importantSentences.join('. ') + (importantSentences.length > 0 ? '.' : '');
}

function generateQuestions(text) {
  const questions = [
    "What are the main topics discussed in this text?",
    "What are the key points you should remember?",
    "How does this information connect to what you already know?",
    "What questions do you still have after reading this?",
    "How could you apply this information in real life?"
  ];
  
  return questions.slice(0, 5);
}

function analyzeContent(text) {
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const avgWordsPerSentence = words / Math.max(sentences, 1);
  
  let readingLevel;
  if (avgWordsPerSentence < 10) {
    readingLevel = "Elementary";
  } else if (avgWordsPerSentence < 15) {
    readingLevel = "Middle School";
  } else if (avgWordsPerSentence < 20) {
    readingLevel = "High School";
  } else {
    readingLevel = "College";
  }
  
  return {
    wordCount: words,
    sentenceCount: sentences,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    readingLevel: readingLevel,
    estimatedReadingTime: Math.ceil(words / 200)
  };
}

module.exports = {
  generateAIResponse,
  generateSummary,
  processDocument,
  generateQuestions,
  analyzeContent,
  processWithLocalAI
};
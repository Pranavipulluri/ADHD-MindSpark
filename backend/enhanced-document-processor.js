// Enhanced Document Processor - AI-Powered Version
const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

/**
 * Extract text from PDF files
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

/**
 * Generate summary from text content
 */
function generateSummary(text, maxLength = 500) {
  // Split into paragraphs and sentences
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  const allSentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Find sentences with high importance based on keywords
  const importantWords = ['important', 'significant', 'key', 'main', 'primary', 'essential', 
                          'conclusion', 'therefore', 'thus', 'result', 'shows', 'demonstrates',
                          'critical', 'fundamental', 'principle', 'theory', 'concept'];
  
  // Score sentences based on importance
  const scoredSentences = allSentences.map(sentence => {
    let score = 0;
    const lower = sentence.toLowerCase();
    
    // Higher score for sentences with important keywords
    importantWords.forEach(word => {
      if (lower.includes(word)) score += 3;
    });
    
    // Higher score for sentences in first and last paragraphs (intro/conclusion)
    if (paragraphs[0]?.includes(sentence)) score += 2;
    if (paragraphs[paragraphs.length - 1]?.includes(sentence)) score += 2;
    
    // Prefer medium-length sentences (not too short, not too long)
    if (sentence.length > 50 && sentence.length < 200) score += 1;
    
    // Check for numbers/statistics (often important)
    if (/\d+/.test(sentence)) score += 1;
    
    return { sentence: sentence.trim(), score };
  });
  
  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(s => s.sentence);
  
  // Build summary
  let summary = topSentences.join(' ');
  
  // If summary is too long, trim it
  if (summary.length > maxLength) {
    summary = summary.slice(0, maxLength).split('.').slice(0, -1).join('.') + '.';
  }
  
  return summary || text.slice(0, maxLength);
}

/**
 * Extract key points from text
 */
function extractKeyPoints(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const keyPoints = [];
  
  // Look for numbered points, bullet points, or sentences with key indicators
  const importantPatterns = [
    /^\s*\d+[\.)]\s*(.+)/,  // 1. or 1)
    /^\s*[-•]\s*(.+)/,       // - or •
    /(?:important|key|main|primary|essential|critical)(?:ly)?[:\s]+(.+)/i,
    /(?:remember|note|observe|consider)[:\s]+(.+)/i,
    /(?:conclusion|summary|result)[:\s]+(.+)/i
  ];
  
  for (const sentence of sentences) {
    // Check for pattern matches
    for (const pattern of importantPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        keyPoints.push(match[1]?.trim() || sentence.trim());
        break;
      }
    }
    
    if (keyPoints.length >= 7) break;
  }
  
  // If no structured points found, extract most important sentences
  if (keyPoints.length < 3) {
    const scoredSentences = sentences.map(s => ({
      text: s.trim(),
      score: (s.match(/important|key|main|essential|critical|significant/gi) || []).length
    }));
    
    keyPoints.push(...scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map(s => s.text)
    );
  }
  
  return keyPoints.filter((p, i, arr) => arr.indexOf(p) === i); // Remove duplicates
}

/**
 * Generate flashcards from text
 */
function generateFlashcards(text) {
  const flashcards = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Extract concepts, definitions, and key terms
  for (const sentence of sentences) {
    const s = sentence.trim();
    
    // Pattern 1: "X is/are defined as Y" or "X refers to Y"
    const definitionMatch = s.match(/(.+?)\s+(?:is|are|was|were)\s+(?:defined as|known as|referred to as|called)\s+(.+)/i);
    if (definitionMatch) {
      flashcards.push({
        question: `What is ${definitionMatch[1].trim()}?`,
        answer: definitionMatch[2].trim()
      });
      continue;
    }
    
    // Pattern 2: "X means Y" or "X represents Y"
    const meansMatch = s.match(/(.+?)\s+(?:means|represents|indicates|signifies)\s+(.+)/i);
    if (meansMatch) {
      flashcards.push({
        question: `What does ${meansMatch[1].trim()} mean?`,
        answer: meansMatch[2].trim()
      });
      continue;
    }
    
    // Pattern 3: Extract important concepts (capitalized terms, technical terms)
    const conceptMatch = s.match(/(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are|describes|explains)\s+(.+)/);
    if (conceptMatch) {
      flashcards.push({
        question: `Explain ${conceptMatch[1].trim()}`,
        answer: conceptMatch[2].trim()
      });
      continue;
    }
    
    // Pattern 4: Important facts with keywords
    if (/important|key|essential|critical|significant|main/.test(s.toLowerCase())) {
      const topic = s.split(/\s+/).slice(0, 5).join(' ');
      flashcards.push({
        question: `What is important about: ${topic}...?`,
        answer: s
      });
    }
    
    if (flashcards.length >= 10) break;
  }
  
  // If we didn't get enough, extract key facts
  if (flashcards.length < 5) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 100);
    
    for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
      const firstSentence = paragraphs[i].match(/[^.!?]+[.!?]+/)?.[0]?.trim();
      if (firstSentence) {
        flashcards.push({
          question: `What does the document say about this topic?`,
          answer: firstSentence
        });
      }
    }
  }
  
  return flashcards.slice(0, 10);
}

/**
 * Generate quiz questions from text
 */
function generateQuestions(text) {
  const questions = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Extract important facts for questions
  const importantSentences = sentences.filter(s => {
    const lower = s.toLowerCase();
    return /important|key|main|because|therefore|result|shows|demonstrates|conclusion/.test(lower) 
           || /\d+/.test(s) // Contains numbers
           || s.length > 80; // Substantial content
  });
  
  for (const sentence of importantSentences.slice(0, 10)) {
    const s = sentence.trim();
    
    // Extract the main subject/concept
    const words = s.split(' ').filter(w => w.length > 5 && /^[A-Z]/.test(w));
    const subject = words[0] || s.split(' ').slice(0, 3).join(' ');
    
    // Generate different question types
    const questionTypes = [
      {
        question: `What does the document explain about ${subject}?`,
        correct: s,
        wrong: [
          'This is not mentioned in the document',
          'The opposite of what is actually stated',
          'A partially incorrect interpretation'
        ]
      },
      {
        question: `Which statement is TRUE according to the document?`,
        correct: s,
        wrong: [
          s.replace(/is|are|was|were/, 'is not'),
          'None of the concepts discussed are related',
          'All statements in the document are false'
        ]
      },
      {
        question: `Why is ${subject} important in this context?`,
        correct: s,
        wrong: [
          'It has no significance in the document',
          'It contradicts the main point',
          'It is only mentioned briefly without explanation'
        ]
      }
    ];
    
    const qType = questionTypes[questions.length % 3];
    const allOptions = [qType.correct, ...qType.wrong];
    
    // Shuffle options
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    
    questions.push({
      question: qType.question,
      options: shuffled,
      correctAnswer: shuffled.indexOf(qType.correct),
      explanation: s
    });
    
    if (questions.length >= 8) break;
  }
  
  return questions;
}

/**
 * Process document with AI-like processing
 */
async function processWithBART(content, documentName = 'document') {
  try {
    const summary = generateSummary(content);
    const keyPoints = extractKeyPoints(content);
    const flashcards = generateFlashcards(content);
    const questions = generateQuestions(content);
    
    return {
      summary,
      key_points: keyPoints,
      flashcards,
      questions,
      success: true,
      method: 'enhanced-processor',
      documentName
    };
  } catch (error) {
    console.error('Error in processWithBART:', error);
    return {
      summary: content.slice(0, 500),
      key_points: [],
      flashcards: [],
      questions: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Process a document file
 */
async function processDocument(filePath) {
  try {
    let content = '';
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      content = await extractTextFromPDF(filePath);
    } else if (['.txt', '.md'].includes(ext)) {
      content = await fs.readFile(filePath, 'utf-8');
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
    
    const documentName = path.basename(filePath, ext);
    const processed = await processWithBART(content, documentName);
    
    return {
      content,
      ...processed,
      success: true
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      content: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * Process library documents
 */
async function processLibraryDocuments(libraryPath) {
  try {
    const files = await fs.readdir(libraryPath);
    const documents = [];
    
    for (const file of files) {
      const filePath = path.join(libraryPath, file);
      const result = await processDocument(filePath);
      
      if (result.success) {
        documents.push({
          filename: file,
          ...result
        });
      }
    }
    
    return {
      success: true,
      documents,
      count: documents.length
    };
  } catch (error) {
    console.error('Error processing library:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  processWithBART,
  processDocument,
  processLibraryDocuments,
  generateSummary,
  generateFlashcards,
  generateQuestions,
  extractKeyPoints
};


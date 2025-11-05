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
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Take first few sentences for summary
  let summary = '';
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) break;
    summary += sentence;
  }
  
  return summary.trim() || text.slice(0, maxLength);
}

/**
 * Extract key points from text
 */
function extractKeyPoints(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const keyPoints = [];
  
  // Look for sentences with key indicators
  const indicators = ['important', 'key', 'must', 'should', 'always', 'never', 'remember', 'note', 'significant'];
  
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (indicators.some(indicator => lower.includes(indicator))) {
      keyPoints.push(sentence.trim());
      if (keyPoints.length >= 5) break;
    }
  }
  
  // If no key points found, take first 5 sentences
  if (keyPoints.length === 0) {
    keyPoints.push(...sentences.slice(0, 5).map(s => s.trim()));
  }
  
  return keyPoints;
}

/**
 * Generate flashcards from text
 */
function generateFlashcards(text) {
  const flashcards = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Simple pattern: find definitions and key concepts
  for (let i = 0; i < Math.min(sentences.length, 10); i++) {
    const sentence = sentences[i];
    
    // Look for definition patterns (is, are, means, refers to)
    const definitionMatch = sentence.match(/(.+?)\s+(is|are|means|refers to)\s+(.+)/i);
    
    if (definitionMatch) {
      flashcards.push({
        question: `What ${definitionMatch[2]} ${definitionMatch[1].trim()}?`,
        answer: definitionMatch[3].trim()
      });
    } else {
      // Create Q&A from sentence
      flashcards.push({
        question: `Explain: ${sentence.slice(0, 50)}...`,
        answer: sentence.trim()
      });
    }
    
    if (flashcards.length >= 5) break;
  }
  
  return flashcards;
}

/**
 * Generate quiz questions from text
 */
function generateQuestions(text) {
  const questions = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  for (let i = 0; i < Math.min(sentences.length, 10); i++) {
    const sentence = sentences[i];
    
    // Extract key information for questions
    const words = sentence.split(' ').filter(w => w.length > 4);
    
    if (words.length > 5) {
      questions.push({
        question: `What is mentioned about ${words[Math.floor(Math.random() * Math.min(words.length, 5))]?.toLowerCase()}?`,
        options: [
          sentence.trim(),
          'Not mentioned in the document',
          'Opposite of what is stated',
          'Partially correct information'
        ],
        correctAnswer: 0,
        explanation: sentence.trim()
      });
    }
    
    if (questions.length >= 5) break;
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


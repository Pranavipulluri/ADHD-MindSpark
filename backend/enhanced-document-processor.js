/**const fs = require('fs').promises;

 * Enhanced Document Processor - Fallback Versionconst path = require('path');

 * This is a simplified fallback version for production deploymentconst pdfParse = require('pdf-parse');

 */const { Pool } = require('pg');

const { spawn } = require('child_process');

const fs = require('fs').promises;

const path = require('path');// Database connection

const pool = new Pool({

/**  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Pranavi%23250406@localhost:5432/mindspark_db',

 * Process document with BART AI (fallback version)  ssl: false

 * @param {string} content - The content to process});

 * @returns {Promise<Object>} Processing result

 */async function extractPDFContent(filePath) {

async function processWithBART(content) {  try {

  console.log('⚠️ Using fallback document processor (BART not available)');    console.log('📑 Extracting content from PDF:', path.basename(filePath));

      const dataBuffer = await fs.readFile(filePath);

  // Return a simple structured response    const data = await pdfParse(dataBuffer);

  return {    console.log('✅ PDF content extracted successfully');

    summary: content.slice(0, 500) + (content.length > 500 ? '...' : ''),    return data.text;

    key_points: [],  } catch (error) {

    success: true,    console.error('❌ PDF extraction failed:', error.message);

    method: 'fallback'    return null;

  };  }

}}



/**async function processWithBART(content) {

 * Process a document file (fallback version)  return new Promise((resolve, reject) => {

 * @param {string} filePath - Path to the document file    console.log('🤖 Processing with BART AI Summarizer...');

 * @returns {Promise<Object>} Processing result    

 */    const pythonScript = path.join(__dirname, 'python-ai', 'bart_summarizer.py');

async function processDocument(filePath) {    const python = spawn('python', [pythonScript, '--text', content, '--max-length', '200', '--min-length', '80']);

  console.log('⚠️ Using fallback document processor');

      let output = '';

  try {    let error = '';

    // Read file content

    const content = await fs.readFile(filePath, 'utf-8');    python.stdout.on('data', (data) => {

          output += data.toString();

    return {    });

      content: content,

      success: true,    python.stderr.on('data', (data) => {

      method: 'fallback'      error += data.toString();

    };    });

  } catch (error) {

    console.error('Error reading document:', error);    python.on('close', (code) => {

    return {      if (code !== 0) {

      content: '',        console.error('❌ BART processing failed:', error);

      success: false,        reject(new Error(`BART script failed: ${error}`));

      error: error.message        return;

    };      }

  }

}      try {

        const result = JSON.parse(output);

/**        console.log('✅ BART AI processing completed');

 * Process library documents (fallback version)        resolve(result);

 */      } catch (parseError) {

async function processLibraryDocuments() {        console.error('❌ Failed to parse BART output:', parseError.message);

  console.log('⚠️ Library document processing not available in fallback mode');        reject(new Error(`Failed to parse output: ${parseError.message}`));

  return {      }

    success: false,    });

    message: 'Library processing requires full document processor'

  };    // Set timeout

}    setTimeout(() => {

      python.kill();

module.exports = {      reject(new Error('BART processing timeout'));

  processWithBART,    }, 60000); // 60 second timeout

  processDocument,  });

  processLibraryDocuments}

};

async function enhancedDocumentProcessing() {
  try {
    console.log('🚀 Enhanced Document Processing with Real Content & AI\n');
    console.log('═'.repeat(80));
    
    // Get documents that need processing
    const documents = await pool.query(`
      SELECT id, title, file_url, content, created_at
      FROM documents 
      WHERE file_url IS NOT NULL 
      ORDER BY created_at DESC
      LIMIT 3
    `);
    
    console.log(`\n📄 Found ${documents.rows.length} documents to process\n`);
    
    for (let i = 0; i < documents.rows.length; i++) {
      const doc = documents.rows[i];
      console.log(`📋 Document ${i + 1}/${documents.rows.length}: ${doc.title}`);
      console.log(`📁 File: ${doc.file_url}`);
      
      let actualContent = '';
      
      // Extract real content from file
      if (doc.file_url.toLowerCase().endsWith('.pdf')) {
        const filePath = path.join(__dirname, 'uploads', path.basename(doc.file_url));
        actualContent = await extractPDFContent(filePath);
      } else if (doc.file_url.toLowerCase().endsWith('.txt')) {
        const filePath = path.join(__dirname, 'uploads', path.basename(doc.file_url));
        actualContent = await fs.readFile(filePath, 'utf8');
      }
      
      if (!actualContent || actualContent.trim().length < 100) {
        console.log('⚠️  Insufficient content extracted, skipping...\n');
        continue;
      }
      
      console.log(`📝 Content extracted: ${actualContent.length} characters`);
      console.log(`📖 Preview: ${actualContent.slice(0, 150).replace(/\s+/g, ' ')}...\n`);
      
      // Process with enhanced AI
      let aiResult;
      try {
        aiResult = await processWithBART(actualContent);
        
        // Add some enhancements to the result
        aiResult.flashcards = generateFlashcards(actualContent, aiResult.keyPoints);
        aiResult.quiz = generateQuizQuestions(actualContent, aiResult.concepts);
        
      } catch (bartError) {
        console.log('❌ BART processing failed:', bartError.message);
        console.log('🔄 Using enhanced fallback...');
        
        aiResult = createEnhancedFallback(actualContent);
      }
      
      // Update document with real content and AI processing
      await pool.query(`
        UPDATE documents 
        SET content = $1, ai_summary = $2, ai_processed_at = NOW()
        WHERE id = $3
      `, [actualContent, JSON.stringify(aiResult), doc.id]);
      
      console.log('✅ Document updated successfully!');
      console.log('\n📊 AI Processing Results:');
      console.log('─'.repeat(40));
      console.log(`📝 Summary: ${aiResult.summary}`);
      console.log(`\n🔑 Key Points (${aiResult.keyPoints.length}):`);
      aiResult.keyPoints.forEach((point, idx) => {
        console.log(`   ${idx + 1}. ${point}`);
      });
      console.log(`\n💡 Concepts: ${aiResult.concepts.join(', ')}`);
      console.log(`🎯 Processed by: ${aiResult.processedBy}`);
      if (aiResult.flashcards) {
        console.log(`📚 Flashcards: ${aiResult.flashcards.length} generated`);
      }
      if (aiResult.quiz) {
        console.log(`❓ Quiz questions: ${aiResult.quiz.length} generated`);
      }
      console.log('\n' + '═'.repeat(80) + '\n');
    }
    
    console.log('🎉 Enhanced document processing complete!');
    console.log('💡 Documents now have real content and intelligent AI summaries');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

function createEnhancedFallback(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const words = content.toLowerCase().split(/\s+/);
  
  // Create a better summary using first few sentences
  const summary = sentences.slice(0, 3).join('. ').trim() + '.';
  
  // Extract key points from different parts of the document
  const keyPoints = [
    sentences[0]?.trim(),
    sentences[Math.floor(sentences.length * 0.25)]?.trim(),
    sentences[Math.floor(sentences.length * 0.5)]?.trim(),
    sentences[Math.floor(sentences.length * 0.75)]?.trim(),
    sentences[sentences.length - 1]?.trim()
  ].filter(Boolean).slice(0, 5);
  
  // Extract concepts based on word frequency
  const wordCount = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  words.forEach(word => {
    const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (clean.length > 3 && !stopWords.has(clean)) {
      wordCount[clean] = (wordCount[clean] || 0) + 1;
    }
  });
  
  const concepts = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  return {
    summary: summary,
    keyPoints: keyPoints,
    concepts: concepts,
    importance: "This document contains detailed information relevant to the subject matter and provides valuable insights for study and reference.",
    processedBy: "Enhanced Text Analysis",
    timestamp: new Date().toISOString(),
    flashcards: generateFlashcards(content, keyPoints),
    quiz: generateQuizQuestions(content, concepts)
  };
}

function generateFlashcards(content, keyPoints) {
  const flashcards = [];
  
  keyPoints.slice(0, 3).forEach((point, idx) => {
    flashcards.push({
      question: `What is the key point about: ${point.slice(0, 50)}...?`,
      answer: point,
      category: "Key Concepts"
    });
  });
  
  return flashcards;
}

function generateQuizQuestions(content, concepts) {
  const quiz = [];
  
  concepts.slice(0, 3).forEach((concept, idx) => {
    quiz.push({
      question: `What does the document say about ${concept}?`,
      type: "open-ended",
      concept: concept
    });
  });
  
  return quiz;
}

// Function to process a single document file
async function processDocument(filePath) {
  try {
    console.log('📄 Processing document:', filePath);
    
    // Extract content based on file type
    let content = '';
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      content = await extractPDFContent(filePath);
    } else if (ext === '.txt' || ext === '.md') {
      content = await fs.readFile(filePath, 'utf8');
    } else {
      console.log('⚠️  Unsupported file type, reading as text');
      content = await fs.readFile(filePath, 'utf8');
    }
    
    console.log(`✅ Extracted ${content.length} characters from file`);
    
    // Return the content for further processing
    return {
      content: content,
      extractedLength: content.length,
      fileType: ext
    };
    
  } catch (error) {
    console.error('❌ Error processing document:', error.message);
    return null;
  }
}

// Export functions
module.exports = {
  extractPDFContent,
  processWithBART,
  processDocument
};

// Only run main processing if called directly
if (require.main === module) {
  enhancedDocumentProcessing();
}
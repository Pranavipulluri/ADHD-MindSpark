const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { spawn } = require('child_process');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Pranavi%23250406@localhost:5432/mindspark_db',
  ssl: false
});

// Import BART processing function (optional - only if file exists)
let processWithBART;
try {
  processWithBART = require('../enhanced-document-processor').processWithBART;
} catch (err) {
  console.log('ℹ️ Enhanced document processor not available, using fallback methods');
  processWithBART = null;
}

// Main AI processing function
async function processContent(content, type = 'document') {
  let processed;
  
  try {
    console.log('🧠 Processing content with AI...');
    
    // Try BART AI first (local transformers) - only if available
    if (processWithBART) {
      try {
        console.log('🤖 Using BART transformer for AI processing...');
        const bartResult = await processWithBART(content);
        
        if (bartResult && bartResult.summary) {
          console.log('✅ BART AI processing successful');
        
          // Enhance BART result with additional local processing
          processed = {
            summary: bartResult.summary,
            questions: generateQuestions(content),
            keyPoints: bartResult.key_points || extractKeyPoints(content),
            concepts: extractConcepts(content),
            flashcards: generateFlashcards(content),
            quiz: generateQuiz(content),
            analysis: analyzeContent(content),
            timestamp: new Date(),
            processedBy: 'BART AI Transformer',
            originalContent: content.slice(0, 500) + (content.length > 500 ? '...' : '')
          };
          
          console.log('🎯 BART AI processing completed successfully');
          return processed;
        }
      } catch (bartError) {
        console.log('❌ BART processing failed:', bartError.message);
        console.log('🔄 Falling back to Gemini API...');
      }
    }
    
    // Try Gemini API as fallback
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // Try multiple model names in order of preference
      const modelNames = ["gemini-pro", "gemini-1.5-pro", "gemini-1.0-pro"];
      let model;
      let modelUsed;
      
      for (const modelName of modelNames) {
        try {
          model = genAI.getGenerativeModel({ model: modelName });
          // Test the model with a simple prompt
          await model.generateContent("Test");
          modelUsed = modelName;
          console.log(`✅ Using Gemini model: ${modelName}`);
          break;
        } catch (modelError) {
          console.log(`❌ Model ${modelName} failed: ${modelError.message}`);
          continue;
        }
      }
      
      if (model) {
        // Enhanced prompt for better AI analysis
        const prompt = `Please analyze the following ${type} content and provide a comprehensive analysis:

"${content}"

Please provide:
1. A clear, informative summary (2-3 sentences)
2. Key points or main ideas (3-5 bullet points)
3. Main concepts covered

Respond in a helpful, educational tone.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log('🤖 Gemini response received:', responseText.slice(0, 200) + '...');
        
        // Parse the response into structured format
        const lines = responseText.split('\n').filter(line => line.trim());
        let summary = '';
        let keyPoints = [];
        let concepts = [];
        
        let currentSection = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().includes('summary') || currentSection === 'summary') {
            currentSection = 'summary';
            if (!trimmed.toLowerCase().includes('summary')) {
              summary += trimmed + ' ';
            }
          } else if (trimmed.toLowerCase().includes('key point') || trimmed.toLowerCase().includes('points') || currentSection === 'points') {
            currentSection = 'points';
            if (trimmed.match(/^\d+\./) || trimmed.match(/^[-*]/)) {
              keyPoints.push(trimmed.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, ''));
            }
          } else if (trimmed.toLowerCase().includes('concept') || currentSection === 'concepts') {
            currentSection = 'concepts';
            if (trimmed.match(/^\d+\./) || trimmed.match(/^[-*]/)) {
              concepts.push(trimmed.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, ''));
            }
          } else if (currentSection === '') {
            summary += trimmed + ' ';
          }
        }
        
        // Fallback if parsing didn't work well
        if (!summary || summary.length < 50) {
          summary = responseText.slice(0, 300) + '...';
        }
        if (keyPoints.length === 0) {
          keyPoints = extractKeyPoints(content);
        }
        if (concepts.length === 0) {
          concepts = extractConcepts(content);
        }
        
        // Combine AI summary with local processing
        processed = {
          summary: summary.trim(),
          questions: generateQuestions(content),
          keyPoints: keyPoints,
          concepts: concepts,
          flashcards: generateFlashcards(content),
          quiz: generateQuiz(content),
          analysis: analyzeContent(content),
          timestamp: new Date(),
          processedBy: `Gemini AI (${modelUsed})`,
          originalContent: content.slice(0, 500) + (content.length > 500 ? '...' : '')
        };
        
        console.log('🎯 Gemini AI processing completed successfully');
        return processed;
      }
    }
    
    // If both BART and Gemini fail, use enhanced local processing
    console.log('🔄 Falling back to enhanced local processing...');
    processed = {
      summary: generateSimpleSummary(content),
      questions: generateQuestions(content),
      keyPoints: extractKeyPoints(content),
      concepts: extractConcepts(content),
      flashcards: generateFlashcards(content),
      quiz: generateQuiz(content),
      analysis: analyzeContent(content),
      timestamp: new Date(),
      processedBy: 'Enhanced Local Processing',
      originalContent: content.slice(0, 500) + (content.length > 500 ? '...' : '')
    };
    
    console.log('✅ Enhanced local processing completed');
    return processed;
    
  } catch (error) {
    console.error('❌ All AI processing methods failed:', error.message);
    
    // Ultimate fallback - basic processing
    return {
      summary: `Document content analysis: ${content.slice(0, 200)}${content.length > 200 ? '...' : ''}`,
      questions: generateQuestions(content),
      keyPoints: extractKeyPoints(content),
      concepts: extractConcepts(content),
      flashcards: generateFlashcards(content),
      quiz: generateQuiz(content),
      analysis: analyzeContent(content),
      timestamp: new Date(),
      processedBy: 'Basic Fallback Processing'
    };
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Handle demo tokens for development
  if (token.startsWith('demo-token-')) {
    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID for demo
      email: 'demo@mindspark.com',
      username: 'Demo User'
    };
    return next();
  }

  // In production, you'd verify JWT here
  req.user = {
    id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID for demo
    email: 'demo@mindspark.com',
    username: 'Demo User'
  };
  next();
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI Chat endpoint
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response;

    try {
      // Try Gemini API first
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `You are a friendly, encouraging AI tutor for neurodivergent children and teens. 
      Respond in a warm, supportive way that builds confidence. Use simple language, emojis, and positive reinforcement.
      Keep responses concise but engaging. User message: "${message}"`;
      
      const result = await model.generateContent(prompt);
      response = result.response.text();
    } catch (geminiError) {
      console.log('Gemini API failed, using fallback:', geminiError.message);
      response = getFallbackResponse(message);
    }

    res.json({
      success: true,
      response: response,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to process chat message' });
  }
});

// Simple AI processing endpoint (for testing)
router.post('/process', async (req, res) => {
  try {
    const { content, type } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    console.log('🧠 Processing content with AI...');
    
    const processed = await processContent(content, type);
    
    res.json(processed);
  } catch (error) {
    console.error('❌ AI processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process content',
      details: error.message 
    });
  }
});

// Document processing endpoint
router.post('/process-document', authenticateToken, async (req, res) => {
  try {
    const { content, filename, title, category_id, save_to_library = true } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'No content provided' });
    }

    console.log(`Processing document: ${filename}, content length: ${content.length}`);

    let processed;

    try {
      // Try Gemini API for summary
      if (process.env.GEMINI_API_KEY) {
        console.log('🤖 Attempting Gemini API processing...');
        
        // Try different model names in order of preference
        const modelNames = ["gemini-pro", "gemini-1.5-pro", "gemini-1.0-pro"];
        let model = null;
        let modelUsed = null;
        
        for (const modelName of modelNames) {
          try {
            model = genAI.getGenerativeModel({ model: modelName });
            modelUsed = modelName;
            console.log(`✅ Using model: ${modelName}`);
            break;
          } catch (modelError) {
            console.log(`❌ Model ${modelName} not available:`, modelError.message);
            continue;
          }
        }
        
        if (!model) {
          throw new Error('No valid Gemini model found');
        }
        
        const prompt = `Please analyze this document and provide a clear summary and key insights for students with ADHD:

Document content:
"""
${content.slice(0, 4000)}
"""

Please provide:
1. A clear, concise summary in 2-3 sentences
2. List 3-5 key points
3. Main concepts covered

Respond in a helpful, educational tone.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log('🤖 Gemini response received:', responseText.slice(0, 200) + '...');
        
        // Parse the response into structured format
        const lines = responseText.split('\n').filter(line => line.trim());
        let summary = '';
        let keyPoints = [];
        let concepts = [];
        
        let currentSection = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().includes('summary') || currentSection === 'summary') {
            currentSection = 'summary';
            if (!trimmed.toLowerCase().includes('summary')) {
              summary += trimmed + ' ';
            }
          } else if (trimmed.toLowerCase().includes('key point') || trimmed.toLowerCase().includes('points') || currentSection === 'points') {
            currentSection = 'points';
            if (trimmed.match(/^\d+\./) || trimmed.match(/^[-*]/)) {
              keyPoints.push(trimmed.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, ''));
            }
          } else if (trimmed.toLowerCase().includes('concept') || currentSection === 'concepts') {
            currentSection = 'concepts';
            if (trimmed.match(/^\d+\./) || trimmed.match(/^[-*]/)) {
              concepts.push(trimmed.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, ''));
            }
          } else if (currentSection === '') {
            summary += trimmed + ' ';
          }
        }
        
        // Fallback if parsing didn't work well
        if (!summary || summary.length < 50) {
          summary = responseText.slice(0, 300) + '...';
        }
        if (keyPoints.length === 0) {
          keyPoints = extractKeyPoints(content);
        }
        if (concepts.length === 0) {
          concepts = extractConcepts(content);
        }

        
        // Combine AI summary with local processing
        processed = {
          summary: summary.trim(),
          questions: generateQuestions(content),
          keyPoints: keyPoints,
          concepts: concepts,
          flashcards: generateFlashcards(content),
          quiz: generateQuiz(content),
          analysis: analyzeContent(content),
          timestamp: new Date(),
          processedBy: `Gemini AI (${modelUsed})`
        };
        
        console.log('✅ Gemini processing successful');
      } else {
        throw new Error('Gemini API key not configured');
      }
    } catch (geminiError) {
      console.log('❌ Gemini API failed:', geminiError.message);

      // Try local transformer
      try {
        console.log('🔄 Attempting local AI processing...');
        const localResult = await runLocalAI(content);
        processed = {
          summary: localResult.summary || generateSimpleSummary(content),
          questions: localResult.questions || generateQuestions(content),
          keyPoints: extractKeyPoints(content),
          concepts: ['Local analysis'],
          flashcards: generateFlashcards(content),
          quiz: generateQuiz(content),
          analysis: localResult.analysis || analyzeContent(content),
          timestamp: new Date(),
          processedBy: 'Local AI'
        };
        console.log('✅ Local AI processing successful');
      } catch (localError) {
        console.log('❌ Local AI failed:', localError.message);

        // Final fallback to simple processing
        console.log('🔧 Using simple text processing...');
        processed = {
          summary: generateImprovedSummary(content),
          questions: generateQuestions(content),
          keyPoints: extractKeyPoints(content),
          concepts: extractConcepts(content),
          flashcards: generateFlashcards(content),
          quiz: generateQuiz(content),
          analysis: analyzeContent(content),
          timestamp: new Date(),
          processedBy: 'Simple Processing'
        };
        console.log('✅ Simple processing complete');
      }
    }

    let savedDocument = null;
    let pointsEarned = 0;

    // Save to library if requested
    if (save_to_library) {
      try {
        const documentTitle = title || filename || 'Processed Document';
        const documentContent = `${content}\n\n--- AI PROCESSING RESULTS ---\n\nSUMMARY:\n${processed.summary}\n\nKEY POINTS:\n${processed.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}\n\nANALYSIS:\nReading Level: ${processed.analysis.readingLevel}\nWord Count: ${processed.analysis.wordCount}\nEstimated Reading Time: ${processed.analysis.estimatedReadingTime} minutes`;
        
        // Get default category if none provided
        let finalCategoryId = category_id;
        if (!finalCategoryId) {
          const defaultCategory = await pool.query(
            "SELECT id FROM document_categories WHERE name = 'Notes' LIMIT 1"
          );
          if (defaultCategory.rows.length > 0) {
            finalCategoryId = defaultCategory.rows[0].id;
          }
        }

        // Save document to database
        const document = await pool.query(`
          INSERT INTO documents (user_id, category_id, title, content, tags)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [req.user.id, finalCategoryId, documentTitle, documentContent, ['ai-processed', 'study-material']]);

        savedDocument = document.rows[0];

        // Award points for document processing and storage
        pointsEarned = 5;
        await pool.query(
          'UPDATE profiles SET points = points + $1 WHERE id = $2',
          [pointsEarned, req.user.id]
        );

        // Record progress
        await pool.query(`
          INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned)
          VALUES ($1, 'document', $2, $3)
        `, [req.user.id, savedDocument.id, pointsEarned]);

        console.log(`Document saved to library with ID: ${savedDocument.id}`);
      } catch (saveError) {
        console.error('Failed to save document to library:', saveError);
        // Continue without failing the entire request
      }
    }

    console.log(`Document processed successfully`);

    res.json({
      success: true,
      processed: processed,
      filename,
      saved_document: savedDocument,
      points_earned: pointsEarned,
      message: savedDocument ? 'Document processed and saved to library' : 'Document processed successfully'
    });
  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Test document storage endpoint
router.post('/test-storage', authenticateToken, async (req, res) => {
  try {
    // Test database connection
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('Database connection test:', testQuery.rows[0]);

    // Test document categories
    const categories = await pool.query('SELECT * FROM document_categories LIMIT 3');
    console.log('Available categories:', categories.rows);

    // Test user exists
    const userCheck = await pool.query('SELECT id, username FROM profiles WHERE id = $1', [req.user.id]);
    console.log('User check:', userCheck.rows);

    // Test creating a simple document
    const testDoc = await pool.query(`
      INSERT INTO documents (user_id, category_id, title, content, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      req.user.id, 
      categories.rows[0]?.id || null, 
      'Test Document', 
      'This is a test document to verify storage is working.',
      ['test', 'storage-test']
    ]);

    res.json({
      success: true,
      database_connected: true,
      current_time: testQuery.rows[0].current_time,
      categories: categories.rows,
      user: userCheck.rows[0] || null,
      test_document: testDoc.rows[0],
      message: 'Database connection and document storage working'
    });
  } catch (error) {
    console.error('Storage test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      database_connected: false 
    });
  }
});

// Create note/document endpoint (for library page)
router.post('/create-note', authenticateToken, async (req, res) => {
  try {
    const { title, content, category_name = 'Notes', tags = [] } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and content are required' 
      });
    }

    // Get category ID by name
    let categoryId = null;
    if (category_name) {
      const categoryResult = await pool.query(
        'SELECT id FROM document_categories WHERE name = $1',
        [category_name]
      );
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      }
    }

    // If no category found, use default 'Notes' category
    if (!categoryId) {
      const defaultCategory = await pool.query(
        "SELECT id FROM document_categories WHERE name = 'Notes' LIMIT 1"
      );
      if (defaultCategory.rows.length > 0) {
        categoryId = defaultCategory.rows[0].id;
      }
    }

    // Create the document
    const document = await pool.query(`
      INSERT INTO documents (user_id, category_id, title, content, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, categoryId, title, content, Array.isArray(tags) ? tags : [tags]]);

    // Award points for creating a note
    const pointsEarned = 3;
    await pool.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [pointsEarned, req.user.id]
    );

    // Record progress
    await pool.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned)
      VALUES ($1, 'document', $2, $3)
    `, [req.user.id, document.rows[0].id, pointsEarned]);

    console.log(`Note created successfully: ${document.rows[0].id}`);

    res.json({
      success: true,
      message: 'Note created successfully',
      document: document.rows[0],
      points_earned: pointsEarned
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create note',
      details: error.message 
    });
  }
});

// Save processed document to library endpoint
router.post('/save-to-library', authenticateToken, async (req, res) => {
  try {
    const { title, content, processed_data, category_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    // Get default category if none provided
    let finalCategoryId = category_id;
    if (!finalCategoryId) {
      const defaultCategory = await pool.query(
        "SELECT id FROM document_categories WHERE name = 'Notes' LIMIT 1"
      );
      if (defaultCategory.rows.length > 0) {
        finalCategoryId = defaultCategory.rows[0].id;
      }
    }

    // Format content with AI processing results if provided
    let finalContent = content;
    if (processed_data) {
      finalContent += `\n\n--- AI PROCESSING RESULTS ---\n\nSUMMARY:\n${processed_data.summary || 'No summary available'}`;
      
      if (processed_data.keyPoints && processed_data.keyPoints.length > 0) {
        finalContent += `\n\nKEY POINTS:\n${processed_data.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}`;
      }
      
      if (processed_data.analysis) {
        finalContent += `\n\nANALYSIS:\nReading Level: ${processed_data.analysis.readingLevel}\nWord Count: ${processed_data.analysis.wordCount}\nEstimated Reading Time: ${processed_data.analysis.estimatedReadingTime} minutes`;
      }
    }

    // Save document to database
    const document = await pool.query(`
      INSERT INTO documents (user_id, category_id, title, content, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, finalCategoryId, title, finalContent, ['ai-processed', 'study-material']]);

    // Award points for saving to library
    const pointsEarned = 3;
    await pool.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [pointsEarned, req.user.id]
    );

    // Record progress
    await pool.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned)
      VALUES ($1, 'document', $2, $3)
    `, [req.user.id, document.rows[0].id, pointsEarned]);

    res.json({
      success: true,
      message: 'Document saved to library successfully',
      document: document.rows[0],
      points_earned: pointsEarned
    });
  } catch (error) {
    console.error('Save to library error:', error);
    res.status(500).json({ success: false, error: 'Failed to save document to library' });
  }
});

// Local AI processing function
async function runLocalAI(content) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'python-ai', 'simple_ai.py');
    const python = spawn('python', [pythonScript, '--task', 'all', '--text', content, '--output', 'json']);

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
        reject(new Error(`Python script failed: ${error}`));
        return;
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse output: ${parseError.message}`));
      }
    });

    // Set timeout
    setTimeout(() => {
      python.kill();
      reject(new Error('Python script timeout'));
    }, 30000);
  });
}

// Fallback response function
function getFallbackResponse(input) {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('math') || lowerInput.includes('add') || lowerInput.includes('subtract')) {
    return "Math is so cool! Want to try a fun math game? I can help you practice addition, subtraction, multiplication, or division! 🔢";
  }

  if (lowerInput.includes('science') || lowerInput.includes('why') || lowerInput.includes('how')) {
    return "Science is amazing! Everything around us follows scientific rules. What are you curious about? Animals, space, weather, or something else? 🔬";
  }

  if (lowerInput.includes('read') || lowerInput.includes('write') || lowerInput.includes('story')) {
    return "Reading opens up whole new worlds! What kind of stories do you like? Adventure, mystery, fantasy, or something else? 📚";
  }

  if (lowerInput.includes('hard') || lowerInput.includes('difficult') || lowerInput.includes('can\'t')) {
    return "I believe in you! Every expert was once a beginner. Take it one step at a time, and you'll get there! 💪";
  }

  if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
    return "Hello there! I'm so happy to chat with you today! What would you like to learn about? 😊";
  }

  const defaults = [
    "That's interesting! Tell me more about what you're thinking. I'm here to help you learn and explore! 🤔",
    "I love your curiosity! Can you give me a bit more detail so I can help you better?",
    "Great question! Learning is all about asking questions. What specifically would you like to know more about?",
    "You're such a thoughtful learner! Let's explore this together. What part interests you most?"
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}

// Simple processing functions
function generateSimpleSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const importantSentences = sentences
    .slice(0, Math.min(3, Math.ceil(sentences.length * 0.4)))
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return importantSentences.join('. ') + (importantSentences.length > 0 ? '.' : '');
}

function generateImprovedSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
  
  // Look for key indicator words that suggest important information
  const keyWords = ['important', 'key', 'main', 'primary', 'essential', 'fundamental', 'critical', 'significant'];
  const conceptWords = ['concept', 'principle', 'theory', 'method', 'approach', 'strategy'];
  
  // Score sentences based on importance indicators
  const scoredSentences = sentences.map(sentence => {
    let score = 0;
    const lowerSentence = sentence.toLowerCase();
    
    keyWords.forEach(word => {
      if (lowerSentence.includes(word)) score += 2;
    });
    
    conceptWords.forEach(word => {
      if (lowerSentence.includes(word)) score += 3;
    });
    
    // Prefer sentences that are not too short or too long
    if (sentence.length > 50 && sentence.length < 200) score += 1;
    
    return { sentence: sentence.trim(), score };
  });
  
  // Get top 3 sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.sentence)
    .filter(s => s.length > 0);
  
  if (topSentences.length === 0) {
    return generateSimpleSummary(text);
  }
  
  return topSentences.join('. ') + '.';
}

function extractConcepts(text) {
  const sentences = text.split(/[.!?]+/);
  const concepts = [];
  
  // Look for definition patterns
  sentences.forEach(sentence => {
    const trimmed = sentence.trim().toLowerCase();
    
    // Pattern: "X is a Y" or "X are Y"
    if (trimmed.includes(' is a ') || trimmed.includes(' are ')) {
      const beforeIs = sentence.split(/ is a | is | are /)[0].trim();
      if (beforeIs.length > 3 && beforeIs.length < 50) {
        concepts.push(beforeIs);
      }
    }
    
    // Look for terms that appear to be concepts
    const conceptIndicators = ['concept of', 'principle of', 'theory of', 'method of'];
    conceptIndicators.forEach(indicator => {
      if (trimmed.includes(indicator)) {
        const afterIndicator = sentence.split(indicator)[1];
        if (afterIndicator) {
          const concept = afterIndicator.split(/[.!?,]/)[0].trim();
          if (concept.length > 3 && concept.length < 50) {
            concepts.push(concept);
          }
        }
      }
    });
  });
  
  // Remove duplicates and return first 5
  return [...new Set(concepts)].slice(0, 5);
}

function generateQuestions(text) {
  return [
    "What are the main topics discussed in this text?",
    "What are the key points you should remember?",
    "How does this information connect to what you already know?",
    "What questions do you still have after reading this?",
    "How could you apply this information in real life?"
  ];
}

function extractKeyPoints(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 5).map(s => s.trim());
}

function generateFlashcards(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const flashcards = [];

  sentences.forEach(sentence => {
    const trimmed = sentence.trim();

    if (trimmed.includes(' is ') || trimmed.includes(' are ')) {
      const parts = trimmed.split(/ (is|are) /);
      if (parts.length >= 2) {
        flashcards.push({
          question: `What ${parts[1].split(' ')[0]} ${parts[0]}?`,
          answer: parts.slice(1).join(' ')
        });
      }
    }

    if (trimmed.includes('concept') || trimmed.includes('principle') || trimmed.includes('important')) {
      flashcards.push({
        question: `Explain this key concept`,
        answer: trimmed
      });
    }
  });

  if (flashcards.length === 0) {
    flashcards.push({
      question: "What is the main topic of this content?",
      answer: "Review the key concepts discussed in the text"
    });
  }

  return flashcards.slice(0, 5);
}

function generateQuiz(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const quiz = [];

  sentences.slice(0, 3).forEach((sentence) => {
    const words = sentence.trim().split(' ');
    if (words.length > 8) {
      const importantWords = words.filter(word =>
        word.length > 4 &&
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said'].includes(word.toLowerCase())
      );

      if (importantWords.length > 0) {
        const keyWord = importantWords[Math.floor(Math.random() * importantWords.length)];
        const questionSentence = sentence.replace(new RegExp(keyWord, 'gi'), '____');

        const wrongAnswers = ['information', 'process', 'system'].filter(w => w !== keyWord.toLowerCase()).slice(0, 3);
        const allOptions = [keyWord, ...wrongAnswers];
        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        const correctIndex = shuffled.indexOf(keyWord);

        quiz.push({
          question: `Fill in the blank: ${questionSentence}`,
          options: shuffled,
          correct: correctIndex
        });
      }
    }
  });

  if (quiz.length === 0) {
    quiz.push({
      question: "What is the main topic of this document?",
      options: ["Educational content", "Technical manual", "Research paper", "Story book"],
      correct: 0
    });
  }

  return quiz.slice(0, 3);
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
  router,
  processContent
};
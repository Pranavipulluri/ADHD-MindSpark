const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Pranavi%23250406@localhost:5432/mindspark_db',
  ssl: false
});

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function extractPDFContent(filePath) {
  try {
    console.log('📑 Extracting content from PDF:', filePath);
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    console.log('✅ PDF content extracted successfully');
    return data.text;
  } catch (error) {
    console.error('❌ PDF extraction failed:', error.message);
    return null;
  }
}

async function processWithGemini(content) {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const modelNames = ["gemini-pro", "gemini-1.5-pro", "gemini-1.0-pro"];
  let model = null;
  let modelUsed = null;

  for (const modelName of modelNames) {
    try {
      model = genAI.getGenerativeModel({ model: modelName });
      // Test the model
      await model.generateContent("Test");
      modelUsed = modelName;
      console.log(`✅ Using Gemini model: ${modelName}`);
      break;
    } catch (modelError) {
      console.log(`❌ Model ${modelName} failed: ${modelError.message}`);
      continue;
    }
  }

  if (!model) {
    throw new Error('No working Gemini model found');
  }

  const prompt = `Please analyze this document and provide a comprehensive summary for students with ADHD. Focus on clarity and actionable insights.

Document content:
"""
${content.slice(0, 8000)}
"""

Please provide:
1. A clear, concise summary (3-4 sentences) highlighting the main purpose and key takeaways
2. Key points (4-6 bullet points) - the most important information
3. Main concepts/topics covered (2-4 items)
4. Why this document is important/useful

Format your response as:
SUMMARY: [Your summary here]

KEY POINTS:
- [Point 1]
- [Point 2]
- [Point 3]
- [Point 4]

CONCEPTS:
- [Concept 1]
- [Concept 2]
- [Concept 3]

IMPORTANCE:
[Why this document matters]`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Parse the structured response
  const sections = responseText.split('\n\n');
  let summary = '';
  let keyPoints = [];
  let concepts = [];
  let importance = '';

  for (const section of sections) {
    const lines = section.split('\n').filter(line => line.trim());
    if (lines[0]?.includes('SUMMARY:')) {
      summary = lines[0].replace('SUMMARY:', '').trim();
      if (lines.length > 1) summary += ' ' + lines.slice(1).join(' ');
    } else if (lines[0]?.includes('KEY POINTS:')) {
      keyPoints = lines.slice(1).map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
    } else if (lines[0]?.includes('CONCEPTS:')) {
      concepts = lines.slice(1).map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
    } else if (lines[0]?.includes('IMPORTANCE:')) {
      importance = lines[0].replace('IMPORTANCE:', '').trim();
      if (lines.length > 1) importance += ' ' + lines.slice(1).join(' ');
    }
  }

  return {
    summary: summary || responseText.slice(0, 300),
    keyPoints: keyPoints.length > 0 ? keyPoints : ['Key information extracted from document'],
    concepts: concepts.length > 0 ? concepts : ['Main topics covered'],
    importance: importance || 'Important document for reference',
    processedBy: `Gemini AI (${modelUsed})`,
    timestamp: new Date()
  };
}

async function processDocumentWithRealContent() {
  try {
    console.log('🔍 Finding documents to process with real content...\n');
    
    // Get documents that need real content processing
    const documents = await pool.query(`
      SELECT id, title, file_url, content, created_at
      FROM documents 
      WHERE file_url IS NOT NULL 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`📄 Found ${documents.rows.length} documents with files\n`);
    
    for (const doc of documents.rows) {
      console.log(`🧠 Processing: ${doc.title}`);
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
      
      if (!actualContent || actualContent.trim().length < 50) {
        console.log('⚠️  No sufficient content extracted, skipping...\n');
        continue;
      }
      
      console.log(`📝 Content length: ${actualContent.length} characters`);
      console.log(`📖 Preview: ${actualContent.slice(0, 200)}...\n`);
      
      // Process with Gemini AI
      let aiResult;
      try {
        console.log('🤖 Processing with Gemini AI...');
        aiResult = await processWithGemini(actualContent);
      } catch (geminiError) {
        console.log('❌ Gemini failed:', geminiError.message);
        console.log('🔄 Using fallback processing...');
        
        // Simple fallback processing
        aiResult = {
          summary: `This document contains ${actualContent.length} characters of content. ` + 
                   actualContent.slice(0, 200).replace(/\s+/g, ' ') + '...',
          keyPoints: [
            'Document contains detailed information',
            'Multiple sections and topics covered',
            'Comprehensive content for study'
          ],
          concepts: ['Document analysis', 'Content review'],
          importance: 'Contains valuable information for reference and study',
          processedBy: 'Fallback Processing',
          timestamp: new Date()
        };
      }
      
      // Update document with real content and AI processing
      await pool.query(`
        UPDATE documents 
        SET content = $1, ai_summary = $2, ai_processed_at = NOW()
        WHERE id = $3
      `, [actualContent, JSON.stringify(aiResult), doc.id]);
      
      console.log('✅ Document updated with real content and AI processing!');
      console.log('📊 Results:');
      console.log(`📝 Summary: ${aiResult.summary.slice(0, 150)}...`);
      console.log(`🔑 Key Points: ${aiResult.keyPoints.length} points`);
      console.log(`💡 Concepts: ${aiResult.concepts.join(', ')}`);
      console.log(`🎯 Processed by: ${aiResult.processedBy}\n`);
      console.log('─'.repeat(80) + '\n');
    }
    
    console.log('🎉 Real content processing complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

processDocumentWithRealContent();
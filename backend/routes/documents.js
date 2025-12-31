const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../config/database'); // Use shared pool

// Import AI processing function
const { processContent } = require('./ai');
const { processDocument } = require('../enhanced-document-processor');

const { validate, documentSchema, validateQuery, paginationSchema } = require('../middleware/validation');
const config = require('../config/index');

// Authentication middleware for demo
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (token.startsWith('demo-token-')) {
    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'demo@mindspark.com',
      username: 'Demo User'
    };
    return next();
  }

  req.user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'demo@mindspark.com',
    username: 'Demo User'
  };
  next();
};

// Simple rate limiting for uploads
const uploadRateLimit = (req, res, next) => next();

const router = express.Router();

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  try {
    await fs.access(config.upload.uploadPath);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(config.upload.uploadPath, { recursive: true });
    console.log('📁 Created uploads directory:', config.upload.uploadPath);
  }
};

// Create uploads directory on module load
ensureUploadDir().catch(err => console.error('Failed to create uploads directory:', err));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, config.upload.uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = config.upload.allowedFileTypes;
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedExtensions.includes(fileExtension)) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  }
});

// Get document categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await pool.query('SELECT * FROM document_categories ORDER BY name');
    
    res.json({
      success: true,
      data: {
        categories: categories.rows
      }
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch categories',
      message: 'An error occurred while retrieving document categories'
    });
  }
});

// Upload document
router.post('/', authenticateToken, uploadRateLimit, upload.single('file'), async (req, res) => {
  try {
    const { title, category_id, category_name, content, tags } = req.body;
    
    console.log('📄 Document upload request:', { title, category_id, category_name, content: content ? 'provided' : 'none', tags });
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
        message: 'Document title is required'
      });
    }
    
    let file_url = null;
    let file_type = null;
    let file_size = null;
    
    if (req.file) {
      file_url = `/uploads/${req.file.filename}`;
      file_type = req.file.mimetype;
      file_size = req.file.size;
    }
    
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : null;
    
    // Handle category mapping - if category_name is provided, find the matching category_id
    let finalCategoryId = category_id;
    if (category_name && !category_id) {
      try {
        const categoryResult = await pool.query(
          'SELECT id FROM document_categories WHERE name = $1',
          [category_name]
        );
        if (categoryResult.rows.length > 0) {
          finalCategoryId = categoryResult.rows[0].id;
        }
      } catch (err) {
        console.warn('Failed to find category by name:', category_name, err.message);
      }
    }
    
    const document = await pool.query(`
      INSERT INTO documents (user_id, category_id, title, content, file_url, file_type, file_size, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [req.user.id, finalCategoryId, title, content, file_url, file_type, file_size, tagsArray]);
    
    // Award points for document upload
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

    // Process document with AI if file or content is available
    let aiProcessing = null;
    let contentToProcess = content;
    
    // If no content but file exists, extract content from file
    if (!contentToProcess && req.file) {
      try {
        console.log('📄 Extracting content from uploaded file...');
        const fileProcessingResult = await processDocument(req.file.path);
        if (fileProcessingResult && fileProcessingResult.content) {
          contentToProcess = fileProcessingResult.content;
          console.log(`✅ Extracted ${contentToProcess.length} characters from file`);
        }
      } catch (fileError) {
        console.error('❌ File content extraction failed:', fileError.message);
      }
    }
    
    if (contentToProcess && contentToProcess.trim()) {
      try {
        console.log('🧠 Triggering AI processing for uploaded document...');
        aiProcessing = await processContent(contentToProcess, 'document');
        
        // AI processing results are returned in the response
        // (Not saved to database to avoid schema issues)
        if (aiProcessing) {
          console.log('✅ AI processing completed for document');
        }
      } catch (aiError) {
        console.error('❌ AI processing failed (non-critical):', aiError.message);
        // Don't fail the upload if AI processing fails - it's optional
        aiProcessing = {
          summary: "AI processing unavailable - document uploaded successfully",
          error: aiError.message
        };
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: {
          ...document.rows[0],
          ai_summary: aiProcessing
        },
        points_earned: pointsEarned
      }
    });
  } catch (error) {
    console.error('📄 Document upload error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    
    // Clean up uploaded file if database operation failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload document',
      message: error.message || 'An error occurred while uploading your document',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get user documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Documents GET request from user:', req.user.id);
    const { category_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT d.*, dc.name as category_name, dc.color as category_color
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      WHERE d.user_id = $1
    `;
    let params = [req.user.id];
    
    // Add filters
    if (category_id) {
      query += ` AND d.category_id = $2`;
      params.push(category_id);
    }
    
    if (search) {
      const searchParam = category_id ? '$3' : '$2';
      query += ` AND (d.title ILIKE ${searchParam} OR d.content ILIKE ${searchParam} OR ${searchParam} = ANY(d.tags))`;
      params.push(`%${search}%`);
    }
    
    // Add ordering and pagination
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;
    query += ` ORDER BY d.created_at DESC LIMIT ${limitParam} OFFSET ${offsetParam}`;
    params.push(limit, offset);
    
    console.log('📄 Executing query:', query);
    console.log('📄 With params:', params);
    
    const documents = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM documents WHERE user_id = $1';
    let countParams = [req.user.id];
    
    if (category_id) {
      countQuery += ' AND category_id = $2';
      countParams.push(category_id);
    }
    if (search && category_id) {
      countQuery += ' AND (title ILIKE $3 OR content ILIKE $3 OR $3 = ANY(tags))';
      countParams.push(`%${search}%`);
    } else if (search) {
      countQuery += ' AND (title ILIKE $2 OR content ILIKE $2 OR $2 = ANY(tags))';
      countParams.push(`%${search}%`);
    }
    
    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);
    
    // Get document statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE file_url IS NOT NULL) as files_count,
        COUNT(*) FILTER (WHERE content IS NOT NULL) as notes_count,
        SUM(file_size) as total_storage_used
      FROM documents 
      WHERE user_id = $1
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        documents: documents.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        statistics: stats.rows[0]
      }
    });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch documents',
      message: 'An error occurred while retrieving your documents'
    });
  }
});

// Get document by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await pool.query(`
      SELECT d.*, dc.name as category_name, dc.color as category_color
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, req.user.id]);
    
    if (document.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        message: 'The requested document could not be found'
      });
    }
    
    res.json({
      success: true,
      data: {
        document: document.rows[0]
      }
    });
  } catch (error) {
    console.error('Document fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document'
    });
  }
});

// Update document
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category_id, content, tags, is_shared } = req.body;
    
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : null;
    
    const updatedDocument = await pool.query(`
      UPDATE documents 
      SET title = COALESCE($1, title),
          category_id = COALESCE($2, category_id),
          content = COALESCE($3, content),
          tags = COALESCE($4, tags),
          is_shared = COALESCE($5, is_shared),
          updated_at = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [title, category_id, content, tagsArray, is_shared, id, req.user.id]);
    
    if (updatedDocument.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        message: 'The document could not be found or you do not have permission to edit it'
      });
    }
    
    res.json({
      success: true,
      message: 'Document updated successfully',
      data: {
        document: updatedDocument.rows[0]
      }
    });
  } catch (error) {
    console.error('Document update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await pool.query(
      'SELECT file_url FROM documents WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (document.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        message: 'The document could not be found or you do not have permission to delete it'
      });
    }
    
    // Delete from database
    await pool.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    // Delete file from filesystem if it exists
    if (document.rows[0].file_url) {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(document.rows[0].file_url));
      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        console.warn('Failed to delete file:', fileError.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Document deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

// Download document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await pool.query(
      'SELECT title, file_url, file_type FROM documents WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (document.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const doc = document.rows[0];
    
    if (!doc.file_url) {
      return res.status(400).json({
        success: false,
        error: 'No file associated with this document'
      });
    }
    
    const filePath = path.join(process.cwd(), 'uploads', path.basename(doc.file_url));
    
    try {
      await fs.access(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}"`);
      res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
      res.sendFile(filePath);
    } catch (fileError) {
      res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

// Create note (text-only document)
router.post('/notes', authenticateToken, validate(documentSchema), async (req, res) => {
  try {
    const { title, category_id, content, tags } = req.validatedData;
    
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : null;
    
    const note = await pool.query(`
      INSERT INTO documents (user_id, category_id, title, content, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, category_id, title, content, tagsArray]);
    
    // Award points for creating a note
    const pointsEarned = 2;
    await pool.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [pointsEarned, req.user.id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: {
        document: note.rows[0],
        points_earned: pointsEarned
      }
    });
  } catch (error) {
    console.error('Note creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create note'
    });
  }
});

// Search documents
router.get('/search/query', authenticateToken, async (req, res) => {
  try {
    const { q, category_id, tags } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query'
      });
    }
    
    let query = `
      SELECT d.*, dc.name as category_name, dc.color as category_color,
             ts_rank(to_tsvector('english', d.title || ' ' || COALESCE(d.content, '')), plainto_tsquery('english', $1)) as relevance
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      WHERE d.user_id = $2 
      AND (
        to_tsvector('english', d.title || ' ' || COALESCE(d.content, '')) @@ plainto_tsquery('english', $1)
        OR d.title ILIKE $3
        OR d.content ILIKE $3
        OR $1 = ANY(d.tags)
      )
    `;
    
    let params = [q, req.user.id, `%${q}%`];
    let paramCount = 3;
    
    if (category_id) {
      paramCount++;
      query += ` AND d.category_id = ${paramCount}`;
      params.push(category_id);
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      paramCount++;
      query += ` AND d.tags && ${paramCount}`;
      params.push(tagArray);
    }
    
    query += ' ORDER BY relevance DESC, d.created_at DESC LIMIT 50';
    
    const results = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        results: results.rows,
        query: q,
        total_results: results.rows.length
      }
    });
  } catch (error) {
    console.error('Document search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Get document analytics
router.get('/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get document stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${days} days') as recent_documents,
        COUNT(DISTINCT category_id) as categories_used,
        SUM(file_size) as total_storage,
        COUNT(*) FILTER (WHERE file_url IS NOT NULL) as files_count,
        COUNT(*) FILTER (WHERE content IS NOT NULL AND file_url IS NULL) as notes_count
      FROM documents
      WHERE user_id = $1
    `, [req.user.id]);
    
    // Get category distribution
    const categoryStats = await pool.query(`
      SELECT 
        dc.name as category_name,
        dc.color as category_color,
        COUNT(d.id) as document_count
      FROM document_categories dc
      LEFT JOIN documents d ON dc.id = d.category_id AND d.user_id = $1
      GROUP BY dc.id, dc.name, dc.color
      ORDER BY document_count DESC
    `, [req.user.id]);
    
    // Get upload trends
    const uploadTrends = await pool.query(`
      SELECT 
        DATE(created_at) as upload_date,
        COUNT(*) as uploads
      FROM documents
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY upload_date
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        category_distribution: categoryStats.rows,
        upload_trends: uploadTrends.rows
      }
    });
  } catch (error) {
    console.error('Document analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics'
    });
  }
});

module.exports = router;
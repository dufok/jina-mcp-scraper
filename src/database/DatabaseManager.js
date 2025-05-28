import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple Database Manager for document indexing
 * Focused on core functionality: index, list, search
 */
class DatabaseManager {
  constructor(dbPath = './data/jina-docs.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database and create tables
   */
  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create database connection
      this.db = new Database(this.dbPath);
      
      // Load and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
      
      console.log('✅ Database initialized:', this.dbPath);
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Insert a document with its chunks
   */
  insertDocument(document, chunks) {
    // Insert document
    const insertDoc = this.db.prepare(`
      INSERT INTO documents (title, library, version, file_path)
      VALUES (?, ?, ?, ?)
    `);

    const docResult = insertDoc.run(
      document.title,
      document.library,
      document.version || 'latest',
      document.filePath || null
    );

    const documentId = docResult.lastInsertRowid;

    // Insert chunks
    const insertChunk = this.db.prepare(`
      INSERT INTO chunks (document_id, content, chunk_index, heading_path)
      VALUES (?, ?, ?, ?)
    `);

    const insertFts = this.db.prepare(`
      INSERT INTO chunks_fts (rowid, content, heading_path)
      VALUES (?, ?, ?)
    `);

    const chunkIds = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Insert chunk
      const chunkResult = insertChunk.run(
        documentId,
        chunk.content,
        i,
        chunk.headingPath || ''
      );

      const chunkId = chunkResult.lastInsertRowid;
      chunkIds.push(chunkId);

      // Insert into FTS
      insertFts.run(chunkId, chunk.content, chunk.headingPath || '');
    }

    return { documentId, chunkIds };
  }

  /**
   * Insert embeddings for chunks
   */
  insertEmbeddings(chunkEmbeddings) {
    const insertEmbedding = this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (chunk_id, embedding)
      VALUES (?, ?)
    `);

    const insertMany = this.db.transaction((embeddings) => {
      for (const { chunkId, embedding } of embeddings) {
        // Convert embedding array to JSON string for storage
        const embeddingJson = JSON.stringify(embedding);
        insertEmbedding.run(chunkId, embeddingJson);
      }
    });

    insertMany(chunkEmbeddings);
  }

  /**
   * Search chunks using full-text search
   */
  searchChunks(query, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT 
        c.id as chunk_id,
        c.content,
        c.heading_path,
        d.title,
        d.library,
        d.version,
        d.file_path,
        fts.rank
      FROM chunks_fts fts
      JOIN chunks c ON fts.rowid = c.id
      JOIN documents d ON c.document_id = d.id
      WHERE chunks_fts MATCH ?
      ORDER BY fts.rank
      LIMIT ?
    `);

    return stmt.all(query, limit);
  }

  /**
   * Get all libraries
   */
  getLibraries() {
    const stmt = this.db.prepare(`
      SELECT 
        library,
        version,
        COUNT(*) as document_count,
        MAX(indexed_at) as last_indexed
      FROM documents
      GROUP BY library, version
      ORDER BY library, version
    `);

    return stmt.all();
  }

  /**
   * Get documents in a library
   */
  getDocuments(library = null, version = null) {
    let query = `
      SELECT 
        d.*,
        COUNT(c.id) as chunk_count
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
    `;
    
    const params = [];
    const conditions = [];

    if (library) {
      conditions.push('d.library = ?');
      params.push(library);
    }

    if (version) {
      conditions.push('d.version = ?');
      params.push(version);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY d.id ORDER BY d.indexed_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Delete a library
   */
  deleteLibrary(library, version = null) {
    let query = 'DELETE FROM documents WHERE library = ?';
    const params = [library];

    if (version) {
      query += ' AND version = ?';
      params.push(version);
    }

    const stmt = this.db.prepare(query);
    return stmt.run(...params).changes;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default DatabaseManager;

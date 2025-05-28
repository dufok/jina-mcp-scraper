import fs from 'fs';
import path from 'path';
import SimpleTextSplitter from '../splitter/SimpleTextSplitter.js';

/**
 * Document Indexing Service
 * Handles file processing, chunking, and database storage
 */
class DocumentIndexingService {
  constructor(databaseManager, embeddingsService) {
    this.db = databaseManager;
    this.embeddings = embeddingsService;
    this.splitter = new SimpleTextSplitter({
      maxChunkSize: 1000,
      chunkOverlap: 200
    });
  }

  /**
   * Index a file into the database
   */
  async indexFile(filePath, options = {}) {
    const {
      library,
      version = 'latest',
      title = null,
      separator = null
    } = options;

    console.log(`📁 Indexing file: ${filePath}`);

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file content
      let content = fs.readFileSync(filePath, 'utf-8');

      // If separator is provided, split content by separator
      let documents = [];
      if (separator) {
        const parts = content.split(separator);
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          if (part) {
            documents.push({
              title: title ? `${title} - Part ${i + 1}` : `${path.basename(filePath)} - Part ${i + 1}`,
              content: part,
              url: `file://${filePath}#part-${i + 1}`,
              library,
              version
            });
          }
        }
      } else {
        // Single document
        documents.push({
          title: title || path.basename(filePath, path.extname(filePath)),
          content,
          url: `file://${filePath}`,
          library,
          version
        });
      }

      let totalChunks = 0;
      const results = [];

      for (const doc of documents) {
        // Split document into chunks
        const chunks = this.splitter.splitText(doc.content, {
          source: filePath,
          library,
          version
        });

        console.log(`📄 Document "${doc.title}": ${chunks.length} chunks`);

        // Store document and chunks in database
        const { documentId, chunkIds } = this.db.insertDocument(doc, chunks);

        // Generate embeddings for chunks (optional - skip if embeddings table doesn't exist)
        try {
          const chunkTexts = chunks.map(chunk => chunk.content);
          const embeddings = await this.embeddings.generateEmbeddings(chunkTexts);

          // Store embeddings
          const chunkEmbeddings = chunkIds.map((chunkId, index) => ({
            chunkId,
            embedding: embeddings[index]
          }));

          this.db.insertEmbeddings(chunkEmbeddings);
        } catch (error) {
          console.log('⚠️  Embeddings skipped (table may not exist):', error.message);
        }

        totalChunks += chunks.length;
        results.push({
          documentId,
          title: doc.title,
          chunks: chunks.length
        });
      }

      console.log(`✅ Indexing complete: ${documents.length} documents, ${totalChunks} total chunks`);

      return {
        success: true,
        documentsIndexed: documents.length,
        totalChunks,
        results
      };

    } catch (error) {
      console.error(`❌ Error indexing file ${filePath}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search indexed documents
   */
  async searchDocuments(query, options = {}) {
    const {
      library = null,
      version = null,
      limit = 10,
      useSemanticSearch = true
    } = options;

    console.log(`🔍 Searching for: "${query}"`);

    try {
      let results = [];

      // Full-text search
      const ftsResults = this.db.searchChunks(query, limit * 2);
      
      if (useSemanticSearch && this.embeddings) {
        // Generate embedding for query
        const queryEmbedding = (await this.embeddings.generateEmbeddings([query]))[0];
        
        // TODO: Implement vector similarity search
        // For now, just use full-text search results
        results = ftsResults;
      } else {
        results = ftsResults;
      }

      // Filter by library/version if specified
      if (library || version) {
        results = results.filter(result => {
          if (library && result.library !== library) return false;
          if (version && result.version !== version) return false;
          return true;
        });
      }

      // Limit results
      results = results.slice(0, limit);

      console.log(`📊 Found ${results.length} results`);

      return {
        success: true,
        results: results.map(result => ({
          title: result.title,
          library: result.library,
          version: result.version,
          url: result.url,
          content: result.content,
          headingPath: result.heading_path,
          chunkType: result.chunk_type,
          score: result.rank || 0
        })),
        query,
        totalResults: results.length
      };

    } catch (error) {
      console.error(`❌ Search error:`, error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Get list of indexed libraries
   */
  getIndexedLibraries() {
    return this.db.getLibraries();
  }

  /**
   * Get documents in a library
   */
  getDocuments(library = null, version = null) {
    return this.db.getDocuments(library, version);
  }

  /**
   * Delete a library
   */
  deleteLibrary(library, version = null) {
    const deletedCount = this.db.deleteLibrary(library, version);
    return {
      success: true,
      deletedDocuments: deletedCount
    };
  }
}

export default DocumentIndexingService;

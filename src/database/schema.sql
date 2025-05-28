-- Simple SQLite schema for document indexing
-- Focused on the three core tools: index, list, search

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    library TEXT NOT NULL,
    version TEXT DEFAULT 'latest',
    file_path TEXT,
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks table for storing text chunks
CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    heading_path TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Full-text search using SQLite FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    content,
    heading_path,
    content_unindexed
);

-- Simple indexes
CREATE INDEX IF NOT EXISTS idx_documents_library ON documents(library, version);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);

-- Embeddings table for storing vector embeddings
CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_id INTEGER NOT NULL,
    embedding TEXT NOT NULL, -- JSON array stored as text
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON embeddings(chunk_id);

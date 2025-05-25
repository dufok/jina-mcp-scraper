/**
 * Mock Embeddings Service for development
 * In production, this would use TxtAI or another embedding service
 */
class MockEmbeddingsService {
  constructor() {
    this.dimension = 384; // Common embedding dimension
  }

  /**
   * Generate mock embeddings for text chunks
   */
  async generateEmbeddings(texts) {
    console.log(`🔢 Generating mock embeddings for ${texts.length} text chunks`);
    
    // In a real implementation, this would call TxtAI or another service
    const embeddings = texts.map(text => this.generateMockEmbedding(text));
    
    return embeddings;
  }

  /**
   * Generate a mock embedding vector based on text content
   */
  generateMockEmbedding(text) {
    // Create a deterministic "embedding" based on text content
    // This is just for testing - in production use real embeddings
    const hash = this.simpleHash(text);
    const embedding = new Array(this.dimension);
    
    for (let i = 0; i < this.dimension; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.5;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Simple hash function for consistent mock embeddings
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  /**
   * Calculate similarity between embeddings (cosine similarity)
   */
  calculateSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }
}

export default MockEmbeddingsService;

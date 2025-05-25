/**
 * Simple Text Splitter for document chunking
 * Splits documents intelligently while preserving structure
 */
class SimpleTextSplitter {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 200;
    this.separators = options.separators || ['\n\n', '\n', '. ', ' '];
  }

  /**
   * Split text into chunks with semantic awareness
   */
  splitText(text, metadata = {}) {
    const chunks = [];
    let currentHeading = '';
    
    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      // Check if this is a heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // If we have accumulated content, save it as a chunk
        if (currentChunk.trim()) {
          chunks.push(this.createChunk(currentChunk.trim(), currentHeading, chunkIndex++, metadata));
          currentChunk = '';
        }
        
        // Update current heading
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        currentHeading = this.updateHeadingPath(currentHeading, headingText, level);
        
        // Start new chunk with heading
        currentChunk = trimmed + '\n\n';
      } else {
        // Regular content
        const proposedChunk = currentChunk + trimmed + '\n\n';
        
        if (proposedChunk.length > this.maxChunkSize && currentChunk.trim()) {
          // Current chunk is too big, save it and start new one
          chunks.push(this.createChunk(currentChunk.trim(), currentHeading, chunkIndex++, metadata));
          currentChunk = trimmed + '\n\n';
        } else {
          currentChunk = proposedChunk;
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk.trim(), currentHeading, chunkIndex++, metadata));
    }

    // If no chunks were created, create one from the entire text
    if (chunks.length === 0 && text.trim()) {
      chunks.push(this.createChunk(text.trim(), currentHeading, 0, metadata));
    }

    return chunks;
  }

  /**
   * Create a chunk object
   */
  createChunk(content, headingPath, index, metadata) {
    return {
      content,
      headingPath,
      index,
      type: this.detectChunkType(content),
      tokenCount: content.split(/\s+/).length,
      metadata
    };
  }

  /**
   * Update heading path for hierarchical context
   */
  updateHeadingPath(currentPath, newHeading, level) {
    if (!currentPath) return newHeading;

    const pathParts = currentPath.split(' > ');
    
    // Truncate to appropriate level
    const newPath = pathParts.slice(0, level - 1);
    newPath.push(newHeading);
    
    return newPath.join(' > ');
  }

  /**
   * Detect chunk type based on content
   */
  detectChunkType(content) {
    if (content.includes('```')) return 'code';
    if (content.includes('|') && content.includes('---')) return 'table';
    if (content.match(/^#{1,6}\s+/)) return 'heading';
    return 'text';
  }
}

export default SimpleTextSplitter;

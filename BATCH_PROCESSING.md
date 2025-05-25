# Batch Processing with jina_reader_list

The `jina_reader_list` tool allows you to process multiple URLs from a file in batch, saving all results to an output file.

## Usage

### Parameters

- `inputFile`: Path to file containing URLs (one per line)
- `outputFile`: Path where processed results will be saved
- `format`: Output format (Default, Markdown, HTML, Text, Screenshot, Pageshot) - default: "Markdown"
- `withLinks`: Include links in content - default: false
- `withImages`: Include images in content - default: false
- `delimiter`: Separator between results - default: "\n---\n"

### Example Input File Format

```
https://docs.solidjs.com/reference/basic-reactivity/create-effect
https://docs.solidjs.com/reference/basic-reactivity/create-memo
https://docs.solidjs.com/reference/basic-reactivity/create-resource
```

### Local Usage

```bash
# Your input file with URLs
/path/to/urls.txt

# Output will be saved to
/path/to/output.md
```

### Docker Usage

When using Docker, you need to mount your files into the container:

```bash
# Create a directory for your files
mkdir -p /tmp/jina-data

# Copy your URL file to the mounted directory
cp /path/to/your/urls.txt /tmp/jina-data/

# Run with volume mount
docker run -it --rm \
  -v /tmp/jina-data:/data \
  -e JINA_API_KEY=your_api_key \
  jina-mcp-tools

# In the tool call, use paths relative to the mounted volume:
# inputFile: "/data/urls.txt"
# outputFile: "/data/results.md"
```

### Docker Compose Usage

If using docker-compose, add a volume mount:

```yaml
services:
  jina-mcp:
    build: .
    volumes:
      - ./data:/data  # Mount local ./data directory to /data in container
    environment:
      - JINA_API_KEY=${JINA_API_KEY}
```

Then use paths like:
- inputFile: "/data/urls.txt"
- outputFile: "/data/processed_results.md"

## Output Format

The tool combines all processed content with delimiters:

```
URL: https://example1.com
[Content from first URL]
---
URL: https://example2.com
[Content from second URL]
---
```

## Error Handling

- Invalid URLs are skipped with error messages
- Failed requests are logged in the output
- Processing continues even if some URLs fail
- Final summary shows successful vs total URLs processed

## Tips

1. **File Paths**: Use absolute paths for reliability
2. **Large Batches**: Tool includes 100ms delay between requests to avoid rate limiting
3. **Output Directory**: Tool automatically creates output directories if they don't exist
4. **URL Format**: Only lines starting with "http" are processed as URLs
5. **Container Access**: For Docker, ensure files are in mounted volumes or accessible within container

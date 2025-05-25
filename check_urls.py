import subprocess
import sys
import os

def check_urls(file_path):
    """
    Check URLs from a file using curl to find 404 links and other status codes.
    
    Args:
        file_path (str): Path to the file containing URLs (one per line)
    """
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return
    
    with open(file_path, 'r') as file:
        urls = [line.strip() for line in file if line.strip()]
    
    if not urls:
        print(f"No URLs found in '{file_path}'")
        return
    
    print(f"Checking {len(urls)} URLs from '{file_path}'...")
    print("-" * 60)
    
    not_found_urls = []
    
    for i, url in enumerate(urls, 1):
        try:
            # Use curl to check the URL status
            result = subprocess.run(
                ['curl', '-o', '/dev/null', '-s', '-w', '%{http_code}', url],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=30  # Add timeout to prevent hanging
            )
            
            status_code = result.stdout.strip()
            
            # Color coding for different status codes
            if status_code == '404':
                print(f"[{i:3d}] ❌ {url} - Status Code: {status_code} (NOT FOUND)")
                not_found_urls.append(url)
            elif status_code.startswith('2'):
                print(f"[{i:3d}] ✅ {url} - Status Code: {status_code} (OK)")
            elif status_code.startswith('3'):
                print(f"[{i:3d}] ↗️  {url} - Status Code: {status_code} (REDIRECT)")
            elif status_code.startswith('4'):
                print(f"[{i:3d}] ⚠️  {url} - Status Code: {status_code} (CLIENT ERROR)")
            elif status_code.startswith('5'):
                print(f"[{i:3d}] 💥 {url} - Status Code: {status_code} (SERVER ERROR)")
            else:
                print(f"[{i:3d}] ❓ {url} - Status Code: {status_code} (UNKNOWN)")
                
        except subprocess.TimeoutExpired:
            print(f"[{i:3d}] ⏰ {url} - TIMEOUT (30s)")
        except Exception as e:
            print(f"[{i:3d}] 💔 {url} - Error: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"SUMMARY:")
    print(f"Total URLs checked: {len(urls)}")
    print(f"404 Not Found URLs: {len(not_found_urls)}")
    
    if not_found_urls:
        print("\n404 URLs:")
        for url in not_found_urls:
            print(f"  - {url}")

def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) != 2:
        print("Usage: python check_urls.py <file_path>")
        print("Example: python check_urls.py urls.txt")
        sys.exit(1)
    
    file_path = sys.argv[1]
    check_urls(file_path)

if __name__ == "__main__":
    main()

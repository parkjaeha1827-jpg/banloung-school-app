import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 5000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    server_address = ("", PORT)
    try:
        # Allow reuse address
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(server_address, Handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("==================================================")
            print("  ប្រព័ន្ធគ្រប់គ្រងសាលាបឋមសិក្សា បាន្លួង")
            print(f"  Server កំពុងដំណើរការលើ៖ {url}")
            print("  ចុច Ctrl + C ដើម្បីបិទ Server")
            print("==================================================")
            try:
                webbrowser.open(url)
            except Exception:
                pass
            httpd.serve_forever()
    except OSError as e:
        if "already in use" in str(e).lower() or getattr(e, "winerror", 0) == 10048:
            print(f"Port {PORT} កំពុងដំណើរការស្រាប់។ កំពុងបើកកម្មវិធី...")
            try:
                webbrowser.open(f"http://localhost:{PORT}")
            except Exception:
                pass
        else:
            print(f"Error starting server: {e}")

if __name__ == "__main__":
    main()

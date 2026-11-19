# -*- coding: utf-8 -*-
"""
Flask Web Server for Ban Loung Primary School System
(សាលាបឋមសិក្សា បាន្លួង)
"""
from flask import Flask, send_from_directory, request, jsonify
import os
import json

app = Flask(__name__, static_folder=".")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "school_database.json")

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR, path)

@app.route("/api/data", methods=["GET"])
def get_data():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    return jsonify({"error": "Database file not found"}), 404

@app.route("/api/save", methods=["POST"])
def save_data():
    try:
        new_data = request.json
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)
        
        # Also sync data.js
        js_file = os.path.join(BASE_DIR, "data.js")
        with open(js_file, "w", encoding="utf-8") as f:
            f.write("// Auto-generated Ban Loung Primary School Authentic Database\n")
            f.write("const INITIAL_SCHOOL_DATA = ")
            json.dump(new_data, f, ensure_ascii=False)
            f.write(";\n")
        
        return jsonify({"success": True, "message": "Saved successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 60)
    print("  ប្រព័ន្ធគ្រប់គ្រងសាលាបឋមសិក្សា បាន្លួង (Ban Loung Primary School)")
    print("  កំពុងដំណើរការ Server នៅលើ http://localhost:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False)

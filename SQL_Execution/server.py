
import json
import os
import subprocess
import tempfile
from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS 
import trino
import sys
import json
import re
import traceback
from datetime import datetime
from pyspark.sql import SparkSession

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})


# MySQL connection configuration.
MYSQL_CONFIG = {
    'host': 'localhost',  # Use "localhost" if you map port 3306; otherwise, adjust accordingly.
    'port': 3306,
    'user': 'admin',
    'password': 'admin',
    'database': 'sales'
}

# Trino connection configuration.
TRINO_CONFIG = {
    'host': 'localhost',  # Use "localhost" if you map port 8080.
    'port': 8080,
    'user': 'admin',      # Adjust if necessary.
    'catalog': 'mysql',   # Ensure you have a Trino catalog (in ./trino/catalog) that connects to MySQL.
    'schema': 'sales'
}

@app.route('/execute/mysql', methods=['POST'])
def execute_mysql():
    data = request.get_json()
    query = data.get('query')
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = conn.cursor()
        cursor.execute(query)
        # If the query returns rows, fetch them.
        results = cursor.fetchall() if cursor.description else []
        columns = [col[0] for col in cursor.description] if cursor.description else []
        cursor.close()
        conn.commit()
        conn.close()
        return jsonify({'columns': columns, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/execute/trino', methods=['POST'])
def execute_trino():
    data = request.get_json()
    query = data.get('query')
    try:
        conn = trino.dbapi.connect(
            host=TRINO_CONFIG['host'],
            port=TRINO_CONFIG['port'],
            user=TRINO_CONFIG['user'],
            catalog=TRINO_CONFIG['catalog'],
            schema=TRINO_CONFIG['schema']
        )
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        cursor.close()
        conn.close()
        return jsonify({'columns': columns, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/execute/spark', methods=['POST'])
def execute_spark():
    data = request.get_json()
    query = data.get('query')
    if not query:
        return jsonify({'error': 'No query provided'}), 400
        
    try:
        # Create the temporary script file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.py', mode='w') as tmp_file:
            tmp_file.write(open('sparkscript.py').read())
            local_tmp_path = tmp_file.name

        container_tmp_path = "/tmp/spark_script.py"
        subprocess.check_call(["docker", "cp", local_tmp_path, f"spark_master:{container_tmp_path}"])
        
        # Execute and capture output - redirect stderr to /dev/null to avoid warnings in output
        result = subprocess.run(
            ["docker", "exec", "spark_master", "bash", "-c", f"spark-submit {container_tmp_path} '{query}' 2>/dev/null"],
            capture_output=True,
            text=True
        )

        os.remove(local_tmp_path)
        
        # Attempt to remove the temporary file from the container
        subprocess.run(["docker", "exec", "spark_master", "rm", container_tmp_path], check=False)

        if result.returncode != 0:
            return jsonify({
                'error': f"Spark execution failed: {result.stderr.strip()}"
            }), 500

        # Parse the JSON output from the script
        try:
            output = result.stdout.strip()
            if not output:
                return jsonify({'error': 'No output from Spark job'}), 500
            
            return jsonify(json.loads(output))
        except json.JSONDecodeError as json_err:
            return jsonify({
                'error': f"Failed to parse results: {json_err}",
                'raw_output': output
            }), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/databases', methods=['GET'])
def list_databases():
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES;")
        results = cursor.fetchall()
        # Each result is a tuple with a single database name.
        databases = [db[0] for db in results]
        cursor.close()
        conn.close()
        return jsonify({'databases': databases})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# New endpoint to fetch all tables in a specific database.
@app.route('/databases/<dbname>/tables', methods=['GET'])
def list_tables(dbname):
    try:
        # Create a copy of the mysql config and update the database.
        config = MYSQL_CONFIG.copy()
        config['database'] = dbname
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES;")
        results = cursor.fetchall()
        # Each result is a tuple with a single table name.
        tables = [table[0] for table in results]
        cursor.close()
        conn.close()
        return jsonify({'database': dbname, 'tables': tables})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/databases/<dbname>/tables/<tablename>/schema', methods=['GET'])
def get_table_schema(dbname, tablename):
    try:
        # Create a copy of the MYSQL_CONFIG and update for the specific database.
        config = MYSQL_CONFIG.copy()
        config['database'] = dbname
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        # Use DESCRIBE to get the schema of the table.
        cursor.execute(f"DESCRIBE {tablename};")
        results = cursor.fetchall()
        columns = [col[0] for col in cursor.description] if cursor.description else []
        cursor.close()
        conn.close()
        return jsonify({
            'database': dbname,
            'table': tablename,
            'schema': {
                'columns': columns,
                'results': results
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/databases/<dbname>/schemas', methods=['GET'])
def get_all_schemas(dbname):
    try:
        config = MYSQL_CONFIG.copy()
        config['database'] = dbname
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()

        # Get all tables in the specified database.
        cursor.execute("SHOW TABLES;")
        tables = [table[0] for table in cursor.fetchall()]

        all_schemas = {}

        # For each table, retrieve its schema using DESCRIBE.
        for tablename in tables:
            cursor.execute(f"DESCRIBE {tablename};")
            results = cursor.fetchall()
            columns = [col[0] for col in cursor.description] if cursor.description else []
            all_schemas[tablename] = {
                'columns': columns,
                'results': results
            }

        cursor.close()
        conn.close()
        return jsonify({
            'database': dbname,
            'schemas': all_schemas
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    # Run the Flask server on all interfaces on port 5000.
    app.run(host='0.0.0.0', port=5001, debug=True)

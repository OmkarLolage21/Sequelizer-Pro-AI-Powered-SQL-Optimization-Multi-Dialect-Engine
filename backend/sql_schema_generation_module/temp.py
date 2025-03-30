from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re
from dotenv import load_dotenv
from groq import Groq
import instructor
from pydantic import BaseModel, Field
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
import pickle
import mysql.connector
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow CORS for testing with Thunder Client

# MySQL Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DB = "history"
MYSQL_PORT = 3306

def get_db_connection():
    """Create a connection to the MySQL database."""
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="history",  # Using the database from docker-compose
        port=3306
    )

def init_db():
    """Initialize the database and create necessary tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create schema_history table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS schema_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_query TEXT NOT NULL,
        sql_statements TEXT NOT NULL,
        explanation TEXT,
        schema_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE
    )
    ''')
    
    conn.commit()
    cursor.close()
    conn.close()
    print("Database initialized successfully!")

# Initialize the database on startup
init_db()

with open("ensemble_retriever.pkl", "rb") as f:
    ensemble_retriever = pickle.load(f)
print("Ensemble retriever successfully loaded!")

# Get API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# Contextual Compression with Cohere
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=ensemble_retriever
)

# Initialize Groq Client
clientg = Groq(api_key=GROQ_API_KEY)
clientgg = instructor.from_groq(Groq(), mode=instructor.Mode.JSON)

class OLAPSchemaExplanationResponse(BaseModel):
    explanation: str = Field(description="Reasoning and explanation behind the OLAP schema choice.")

def generate_explanation_ans(inputquery, user_query):
    """Generate structured OLAP schema explanation response."""
    query = f"""
        Given input {inputquery}, extract and return only the explanation, reasoning, and non-code parts.
        Do not include SQL code.
    """
    try:
        response = clientgg.chat.completions.create(
            response_model=OLAPSchemaExplanationResponse,
            model="qwen-2.5-coder-32b",
            messages=[
                {"role": "system", "content": "Provide OLAP schema explanation in JSON format."},
                {"role": "user", "content": query},
            ],
            temperature=0.7,
            max_tokens=5000,
        )
        return response.dict()
    except Exception as e:
        return {"error": f"Unable to generate explanation: {str(e)}"}

# Pydantic Schema Model
class OLAPSchemaResponse(BaseModel):
    sql_statements: str = Field(description="SQL statements to generate the schema with REFRENCES keyword to show relationship between tables.")

def get_olap_best_practices(user_query):
    """Retrieve OLAP best practices."""
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"The user has asked: '{user_query}'. Provide best OLAP practices and recommend either Star or Snowflake schema."
            }
        ],
        model="llama-3.1-8b-instant",
        max_tokens=5000,
    )
    response_text = chat_completion.choices[0].message.content
    return response_text.strip()

def generate_database_schema(user_query, olap_context, llm_res):
    """Generate database schema based on OLAP context."""
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""
                The user has asked: '{user_query}'.
                Given the OLAP context: {olap_context}, and response: {llm_res}, generate a relational database schema including:
                - SQL query to create schema in MySQL
                - Tables and their relationships with refrences keyword to show relationship
                - Columns with appropriate data types
                - Primary and foreign keys
                - Schema type (Star/Snowflake or any other) and its reasoning.
                """
            }
        ],
        model="llama-3.1-8b-instant",
        temperature=0.7,
        max_tokens=5000,
    )
    response_text = chat_completion.choices[0].message.content
    return response_text.strip()

def clean_text(text):
    """Clean unwanted characters from text."""
    return re.sub(r'[\*\#\\]', '', text).strip()

def process_query(user_query):
    """Retrieve documents and OLAP best practices."""
    response = get_olap_best_practices(user_query)
    cleaned_response = clean_text(response)
    retrieved_docs = compression_retriever.invoke(cleaned_response + user_query)
    retrieved_text = "\n\n".join(doc.page_content for doc in retrieved_docs)
    return response, retrieved_text

def generate_final_ans(inputquery, user_query):
    """Generate structured OLAP schema response."""
    query = f"""
        given input {inputquery} , it has reason of using this kind of schema along with sql code , extract and return only code part and nothing else
    """
    try:
        response = clientgg.chat.completions.create(
            response_model=OLAPSchemaResponse,
            model="qwen-2.5-coder-32b",
            messages=[
                {"role": "system", "content": "Provide OLAP schema data in JSON format."},
                {"role": "user", "content": query},
            ],
            temperature=0.7,
            max_tokens=5000,
        )
        return response.dict()
    except Exception as e:
        return {"error": f"Unable to generate schema: {str(e)}"}

def save_schema_to_database(user_query, sql_statements, explanation, username="nio2004"):
    """Save the generated schema to the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Extract schema type from explanation
        schema_type = None
        if isinstance(explanation, dict) and "explanation" in explanation:
            schema_type_match = re.search(r'(Star|Snowflake|Fact\s+Constellation)', explanation["explanation"], re.IGNORECASE)
            if schema_type_match:
                schema_type = schema_type_match.group(0)
        
        # Prepare explanation text
        explanation_text = explanation.get("explanation") if isinstance(explanation, dict) else str(explanation)
        
        # Insert into database
        query = """
        INSERT INTO schema_history 
        (user_query, sql_statements, explanation, schema_type, created_by) 
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (user_query, sql_statements, explanation_text, schema_type, username))
        
        conn.commit()
        schema_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return schema_id
    except Exception as e:
        print(f"Error saving schema to database: {str(e)}")
        return None

@app.route("/generate_schema", methods=["POST"])
def generate_schema():
    """API endpoint to generate OLAP schema with explanation."""
    try:
        # Get JSON input
        data = request.get_json()
        user_query = data.get("user_query", "")
        username = data.get("username", "nio2004")  # Default to nio2004 if not provided

        if not user_query:
            return jsonify({"error": "User query is required"}), 400

        # Process the query
        llmres, olap_context = process_query(user_query)

        # Generate the schema
        ans = generate_database_schema(user_query, olap_context, llmres)
        print(ans)
        fans = generate_final_ans(ans, user_query)
        explanation = generate_explanation_ans(ans, user_query)

        # Save schema to database
        schema_id = None
        if isinstance(fans, dict) and "sql_statements" in fans:
            schema_id = save_schema_to_database(
                user_query, 
                fans["sql_statements"], 
                explanation,
                username
            )

        response_data = {
            "sql_code": fans, 
            "explanation": explanation
        }
        
        if schema_id:
            response_data["schema_id"] = schema_id
            response_data["message"] = "Schema successfully saved to database"

        return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)
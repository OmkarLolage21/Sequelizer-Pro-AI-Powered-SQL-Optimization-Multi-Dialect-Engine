from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.vectorstores import FAISS
from groq import Groq
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
from langchain_huggingface import HuggingFaceEmbeddings
import os
import re
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Get API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# Validate API keys
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY environment variable is not set. Query generation will not work.")
    print("Please set the GROQ_API_KEY in your .env file or as an environment variable.")
    
if not COHERE_API_KEY:
    print("WARNING: COHERE_API_KEY environment variable is not set. Reranking will not work.")
    print("Please set the COHERE_API_KEY in your .env file or as an environment variable.")

global schema
schema = {}

import pickle

# Save the retriever object
with open("retriever.pkl", "rb") as f:
    retriever =pickle.load(f)

# Contextual Compression with Cohere
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)


# Initialize Groq client
groq_client_initialized = False
clientg = None
try:
    if GROQ_API_KEY:
        clientg = Groq(api_key=GROQ_API_KEY)
        groq_client_initialized = True
        print("Groq client initialized successfully.")
    else:
        print("Skipping Groq client initialization due to missing API key.")
except Exception as e:
    print(f"Error initializing Groq client: {str(e)}")
    print("Query generation functionality will be limited.")

def get_spark_query_template():
    return """
    You are a Spark SQL expert. The queries must adhere to the semantics and syntax and should use Spark SQL specific functions.
    Given the following:
    User Question: {user_query}
    Context from Documentation: {context}
    schema of the  tables in the database: {schema}
    
    Please provide:
    1. A detailed Spark SQL query that addresses the user's question
    2. An explanation of the query components
    3. Any relevant Spark-specific optimizations or best practices
    
    Consider:
    - Spark's distributed query execution
    - Appropriate use of Spark's supported data types
    - Dataframe operations and transformations
    - Catalyst optimizer capabilities 
    - Performance optimization techniques
    
    Format your response as:
    QUERY:
    <the SQL query>
    
    EXPLANATION:
    <detailed explanation>
    
    OPTIMIZATIONS:
    <list of Spark-specific optimizations>
    """

def generate_spark_query(user_query, context):
    """Generate a Spark-specific SQL query based on user input and context."""
    if not groq_client_initialized or not clientg:
        return "ERROR: Cannot generate query. GROQ_API_KEY is missing or invalid."
        
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a Spark SQL expert specializing in distributed data processing and optimization."
            },
            {
                "role": "user",
                "content": get_spark_query_template().format(
                    user_query=user_query,
                    context=context
                )
            }
        ],
        model="llama-3.1-8b-instant",
        max_tokens=2000,
        temperature=0.3  # Lower temperature for more focused SQL generation
    )
    
    return chat_completion.choices[0].message.content

def get_spark_best_practices(user_query):
    """Get Spark-specific best practices based on the query."""
    if not groq_client_initialized or not clientg:
        return "ERROR: Cannot generate best practices. GROQ_API_KEY is missing or invalid."
        
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a Spark expert focusing on query optimization and best practices. Only give valid suggestions not too much not too less, a perfect balance with suggestion only if needed at all."
            },
            {
                "role": "user",
                "content": f"""
                Based on this query: '{user_query}', provide Spark-specific best practices considering:
                - Catalyst optimizer benefits
                - DataFrame and SQL optimizations
                - Resource management with executors
                - Performance tuning of Spark applications
                - Data partitioning strategies
                Only include Spark-specific recommendations.
                """
            }
        ],
        model="llama-3.1-8b-instant",
        temperature=0.4
    )
    
    return clean_text(chat_completion.choices[0].message.content)

def clean_text(text):
    """Clean and format text response."""
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)  # Remove code blocks
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize spaces
    return text

def process_query(user_query):
    """Process the user query and return relevant Spark information."""
    if not groq_client_initialized:
        return {
            "error": "Groq client not initialized. Please check if GROQ_API_KEY is set properly."
        }
        
    if compression_retriever is None:
        return {
            "error": "FAISS retriever not available. Unable to load vector database. Please check if the FAISS index exists at the specified path."
        }
    
    # Get Spark best practices
    spark_practices = get_spark_best_practices(user_query)
    
    # Retrieve relevant documentation using FAISS + Cohere reranking
    retrieved_docs = compression_retriever.get_relevant_documents(user_query)
    doc_context = "\n\n".join(doc.page_content for doc in retrieved_docs)
    
    # Generate Spark query
    spark_query = generate_spark_query(user_query, doc_context)
    
    return {
        "best_practices": spark_practices,
        "documentation_context": doc_context,
        "generated_query": spark_query
    }

@app.route('/set_schema', methods=['POST'])
def set_schema():
    global schema
    schema = request.json  # Expecting JSON payload
    return jsonify({"message": "Schema set successfully", "schema": schema}), 200

@app.route('/get_schema', methods=['GET'])
def get_schema():
    return jsonify({"schema": schema}), 200

@app.route('/clear_schema', methods=['POST'])
def clear_schema():
    global schema
    schema = {}
    return jsonify({"message": "Schema cleared successfully"}), 200

@app.route('/api/spark/query', methods=['POST'])
def generate_spark_query_endpoint():
    """API endpoint to generate Spark queries with best practices."""
    try:
        # Get JSON input
        data = request.get_json()
        user_query = data.get("user_query", "")

        if not user_query:
            return jsonify({
                "status": "error",
                "message": "User query is required",
                "timestamp": time.time()
            }), 400

        # Process the Spark query
        results = process_query(user_query)
        
        # Check for errors
        if "error" in results:
            return jsonify({
                "status": "error",
                "message": results["error"],
                "timestamp": time.time()
            }), 500

        return jsonify({
            "status": "success",
            "data": {
                "best_practices": results["best_practices"],
                "generated_query": results["generated_query"]
            },
            "timestamp": time.time(),
            "user": "hriteshMaikap",
            "query_time": "2025-03-29 14:39:49"
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500

@app.route('/api/spark/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API status."""
    return jsonify({
        "status": "success",
        "message": "Spark API is running",
        "timestamp": time.time(),
        "version": "1.0.0"
    })

@app.route('/api/spark/examples', methods=['GET'])
def get_examples():
    """Endpoint to get example Spark queries."""
    examples = [
        "Create a query to analyze daily sales trends with window functions",
        "How to join multiple dataframes efficiently in Spark SQL",
        "Write a query to calculate aggregations on partitioned data",
        "Optimize a query that processes large JSON arrays in Spark"
    ]
    
    return jsonify({
        "status": "success",
        "data": {
            "examples": examples
        },
        "timestamp": time.time()
    })

@app.route('/api/spark/context', methods=['POST'])
def get_context_only():
    """API endpoint to retrieve only the context documents for a query."""
    try:
        # Get JSON input
        data = request.get_json()
        user_query = data.get("user_query", "")

        if not user_query:
            return jsonify({
                "status": "error",
                "message": "User query is required",
                "timestamp": time.time()
            }), 400

        if compression_retriever is None:
            return jsonify({
                "status": "error",
                "message": "FAISS retriever not available. Check server logs for details.",
                "timestamp": time.time()
            }), 500
            
        # Retrieve relevant documentation using FAISS + Cohere reranking
        retrieved_docs = compression_retriever.get_relevant_documents(user_query)
        docs = [{"content": doc.page_content, "metadata": doc.metadata} for doc in retrieved_docs]
        
        return jsonify({
            "status": "success",
            "data": {
                "context_documents": docs
            },
            "timestamp": time.time(),
            "user": "hriteshMaikap"
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5002)
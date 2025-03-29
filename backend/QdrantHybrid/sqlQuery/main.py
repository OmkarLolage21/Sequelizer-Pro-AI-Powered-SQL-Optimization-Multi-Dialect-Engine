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

# Initialize embedding model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize FAISS index
try:
    faiss_index = FAISS.load_local(
        "C:\\Users\\hrite\\OneDrive\\Documents\\COEP-Inspiron-Hackathon\\backend\\QdrantHybrid\\sqlQuery\\data\\faiss_index", 
        embeddings, 
        allow_dangerous_deserialization=True
    )
    print("FAISS index successfully loaded!")
    
    # Set up FAISS retriever
    retriever = faiss_index.as_retriever(
        search_kwargs={"k": 3}  # Retrieve top 3 similar documents
    )
    
    # Contextual Compression with Cohere
    compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
    compression_retriever = ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=retriever
    )
except Exception as e:
    print(f"Error loading FAISS index: {str(e)}")
    compression_retriever = None

# Initialize Groq client
clientg = Groq(api_key=GROQ_API_KEY)

def get_trino_query_template():
    return """
    You are a Trino SQL expert. The queries must adhere to the semantics and syntax and should use Trino specific functions.
    Given the following:
    User Question: {user_query}
    Context from Documentation: {context}
    
    Please provide:
    1. A detailed Trino SQL query that addresses the user's question
    2. An explanation of the query components
    3. Any relevant Trino-specific optimizations or best practices
    
    Consider:
    - Trino's distributed query execution
    - Appropriate use of Trino's supported data types
    - Partition pruning and predicate pushdown
    - Proper join strategies
    - Performance optimization techniques
    
    Format your response as:
    QUERY:
    <the SQL query>
    
    EXPLANATION:
    <detailed explanation>
    
    OPTIMIZATIONS:
    <list of Trino-specific optimizations>
    """

def generate_trino_query(user_query, context):
    """Generate a Trino-specific SQL query based on user input and context."""
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a Trino SQL expert specializing in distributed query optimization."
            },
            {
                "role": "user",
                "content": get_trino_query_template().format(
                    user_query=user_query,
                    context=context
                )
            }
        ],
        model="llama-3.3-70b-versatile",
        max_tokens=2000,
        temperature=0.3  # Lower temperature for more focused SQL generation
    )
    
    return chat_completion.choices[0].message.content

def get_trino_best_practices(user_query):
    """Get Trino-specific best practices based on the query."""
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a Trino expert focusing on query optimization and best practices. Only give valid suggestsions not too much not to less, a perfect balance with suggestion only if needed at all. "
            },
            {
                "role": "user",
                "content": f"""
                Based on this query: '{user_query}', provide Trino-specific best practices considering:
                - Connector optimization
                - Query optimization
                - Resource management
                - Performance tuning
                - Data distribution
                Only include Trino-specific recommendations.
                """
            }
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.4
    )
    
    return clean_text(chat_completion.choices[0].message.content)

def clean_text(text):
    """Clean and format text response."""
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)  # Remove code blocks
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize spaces
    return text

def process_query(user_query):
    """Process the user query and return relevant Trino information."""
    if compression_retriever is None:
        return {
            "error": "FAISS retriever not available. Check server logs for details."
        }
    
    # Get Trino best practices
    trino_practices = get_trino_best_practices(user_query)
    
    # Retrieve relevant documentation using FAISS + Cohere reranking
    retrieved_docs = compression_retriever.get_relevant_documents(user_query)
    doc_context = "\n\n".join(doc.page_content for doc in retrieved_docs)
    
    # Generate Trino query
    trino_query = generate_trino_query(user_query, doc_context)
    
    return {
        "best_practices": trino_practices,
        "documentation_context": doc_context,
        "generated_query": trino_query
    }

@app.route('/api/trino/query', methods=['POST'])
def generate_trino_query_endpoint():
    """API endpoint to generate Trino queries with best practices."""
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

        # Process the Trino query
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

@app.route('/api/trino/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API status."""
    return jsonify({
        "status": "success",
        "message": "Trino API is running",
        "timestamp": time.time(),
        "version": "1.0.0"
    })

@app.route('/api/trino/examples', methods=['GET'])
def get_examples():
    """Endpoint to get example Trino queries."""
    examples = [
        "Create a query to analyze daily sales trends with customer demographics using UNNEST",
        "How to join data from Hive and MySQL using Trino",
        "Write a query to calculate moving averages on time-series data",
        "Optimize a query that processes large JSON arrays in Trino"
    ]
    
    return jsonify({
        "status": "success",
        "data": {
            "examples": examples
        },
        "timestamp": time.time()
    })

@app.route('/api/trino/context', methods=['POST'])
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
    app.run(debug=True, host='0.0.0.0', port=5000)
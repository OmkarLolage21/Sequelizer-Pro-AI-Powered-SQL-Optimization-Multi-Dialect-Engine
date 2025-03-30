from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from langchain_community.vectorstores import FAISS
from groq import Groq
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
import os
import re
import time
from dotenv import load_dotenv
import pickle

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Get API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# Initialize global variables
global current_schema
current_schema = None

# Global feedback dictionary to store user feedback
global feedback
feedback = {}

# Load the retriever object
with open("retriever.pkl", "rb") as f:
    retriever = pickle.load(f)

# Contextual Compression with Cohere
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)
# Initialize Groq client
clientg = Groq(api_key=GROQ_API_KEY)

def get_trino_query_template():
    print("Generating Trino query template...")
    print(current_schema)
    return """
    You are a Trino SQL expert. The queries must adhere to the semantics and syntax and should use Trino specific functions.
    Given the following:
    User Question: {user_query}
    Context from Documentation: {context}
    Previous User Feedback (consider this carefully):
    {feedback_formatted}
    Schema of DB is: {schema}
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
    - The feedback from previous interactions to improve this response
    - Don't use semicolon at the end of the query as trino doesn't support it
    Format your response as:
    QUERY:
    <the SQL query>

    EXPLANATION:
    <detailed explanation>

    OPTIMIZATIONS:
    <list of Trino-specific optimizations>
    """

def generate_trino_query(user_query, context, schema):
    """Generate a Trino-specific SQL query based on user input and context."""
    global feedback
    
    # Format the feedback in a more structured way for the LLM
    feedback_formatted = ""
    if feedback:
        feedback_formatted = "Previous interactions:\n"
        for q, data in feedback.items():
            feedback_formatted += f"Question: {q}\n"
            feedback_formatted += f"Response: {data['response']}\n"
            feedback_formatted += f"User Feedback: {data['feedback']}\n\n"
    else:
        feedback_formatted = "No previous feedback available."
    
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a Trino SQL expert specializing in distributed query optimization. "
            },
            {
                "role": "user",
                "content": get_trino_query_template().format(
                    user_query=user_query,
                    context=context,
                    feedback_formatted=feedback_formatted,
                    schema=schema
                )
            }
        ],
        model="llama-3.3-70b-versatile",
        max_tokens=2000,
        temperature=0.3  # Lower temperature for more focused SQL generation
    )
    
    return chat_completion.choices[0].message.content

def get_trino_best_practices(user_query, schema=None):
    """Get Trino-specific best practices based on the query and schema."""
    schema_context = f"Using this schema: {schema}" if schema else "No specific schema provided."
    
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a Trino expert focusing on query optimization and best practices. Only give valid suggestions not too much not too less, a perfect balance with suggestion only if needed at all."
            },
            {
                "role": "user",
                "content": f"""
                Based on this query: '{user_query}'
                {schema_context}
                
                Provide Trino-specific best practices considering:
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
    global current_schema
    
    if compression_retriever is None:
        return {
            "error": "FAISS retriever not available. Check server logs for details."
        }
    
    # Retrieve relevant documentation using FAISS + Cohere reranking
    retrieved_docs = compression_retriever.get_relevant_documents(user_query)
    doc_context = "\n\n".join(doc.page_content for doc in retrieved_docs)
    
    # Get Trino best practices using global schema
    trino_practices = get_trino_best_practices(user_query, current_schema)
    
    # Generate Trino query using global schema
    trino_query = generate_trino_query(user_query, doc_context, current_schema)
    
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
            "query_time": time.strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500
    
@app.route('/api/trino/feedback', methods=['POST'])
def submit_feedback():
    """API endpoint to submit feedback for the generated Trino query."""
    try:
        global feedback
        
        # Get JSON input
        data = request.get_json()
        user_query = data.get("user_query", "")
        response = data.get("response", "")
        feedback_text = data.get("feedback", "")
        
        if not user_query or not response or not feedback_text:
            return jsonify({
                "status": "error",
                "message": "User query, response, and feedback are all required",
                "timestamp": time.time()
            }), 400
            
        # Add feedback to our dictionary, limited to 3 entries
        if len(feedback) < 3:
            feedback[user_query] = {
                "response": response,
                "feedback": feedback_text
            }
        else:
            # Remove the oldest feedback entry if there are more than 3 entries
            first_key = next(iter(feedback))  # Get the first key
            del feedback[first_key]
            # Add the new feedback
            feedback[user_query] = {
                "response": response,
                "feedback": feedback_text
            }
            
        return jsonify({
            "status": "success",
            "message": "Feedback submitted successfully",
            "timestamp": time.time(),
            "feedback_count": len(feedback)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500

@app.route('/api/trino/get_feedback', methods=['GET'])
def get_feedback_endpoint():
    """API endpoint to get all stored feedback."""
    try:
        global feedback
        
        return jsonify({
            "status": "success",
            "data": {
                "feedback": feedback,
                "count": len(feedback)
            },
            "timestamp": time.time()
        })
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500

@app.route('/api/trino/autocomplete', methods=['POST'])
def autocomplete():
    """API endpoint to provide code autocompletion using Groq's qwen-2.5-coder-32b model."""
    try:
        data = request.get_json()
        code_context = data.get("code_context", "")
        if not code_context:
            return jsonify({
                "status": "error",
                "message": "Code context is required for autocompletion.",
                "timestamp": time.time()
            }), 400
        # Use a concise system prompt for faster code suggestions
        auto_complete_result = clientg.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a code autocompletion assistant. "
                        "You are given with code context: {code_context} "
                        "Here is the context from the user: {user_query} "
                        "Given a short snippet of code that user might write (act as an autocomplete assistant), provide the most appropriate completion suggestion in the code format only, do not generate any other text other than the code "
                        "that fits the context. "
                        "So basically you will be given incomplete code, you need to return the next three to four words. "
                    )
                },
                {
                    "role": "user",
                    "content": code_context
                }
            ],
            model="qwen-2.5-coder-32b",
            max_tokens=50, # Adjust the max tokens as needed
            temperature=0.3 # Lower temperature for more deterministic suggestions
        )
            
        completion = auto_complete_result.choices[0].message.content
        return jsonify({
            "status": "success",
            "data": {
                "completion": completion
            },
            "timestamp": time.time()
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

@app.route('/api/trino/set_global_schema', methods=['POST'])
def set_global_schema():
    """API endpoint to set a global schema for all Trino query generation."""
    try:
        data = request.get_json()
        
        # Get database name from the request body.
        dbname = data.get("dbname", "")
        if not dbname:
            return jsonify({
                "status": "error",
                "message": "Database name (dbname) is required",
                "timestamp": time.time()
            }), 400
        
        # Call the endpoint to fetch all schemas in the provided database.
        schema_endpoint = f"http://localhost:5001/databases/{dbname}/schemas"
        response = requests.get(schema_endpoint, headers={"Accept": "application/json"})
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"Failed to fetch schema information: {response.text}",
                "timestamp": time.time()
            }), response.status_code

        fetched_schema_info = response.json()

        # Get schema definition from the request body.
        # schema_definition = data.get("schema_definition", "")
        schema_definition = fetched_schema_info
        if not schema_definition:
            return jsonify({
                "status": "error",
                "message": "Schema definition is required",
                "timestamp": time.time()
            }), 400
        global current_schema
        # Set the global schema.
        current_schema = schema_definition
            
        return jsonify({
            "status": "success",
            "message": "Global schema set successfully",
            "data": {
                "schema": current_schema,
                "fetched_schema_info": fetched_schema_info
            },
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500

@app.route('/api/trino/delete_schema', methods=['POST'])
def delete_schema():
    """API endpoint to clear the global schema."""
    try:
        # global current_schema
        global current_schema
        current_schema = None
        
        return jsonify({
            "status": "success",
            "message": "Global schema has been cleared",
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500

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

@app.route('/api/trino/get_schema', methods=['GET'])
def get_schema():
    """API endpoint to get the current global schema."""
    try:
        global current_schema
        
        return jsonify({
            "status": "success",
            "data": {
                "schema": current_schema
            },
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": time.time()
        }), 500

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5003)
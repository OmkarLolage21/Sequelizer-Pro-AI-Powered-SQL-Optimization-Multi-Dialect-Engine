from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.vectorstores import FAISS
from groq import Groq
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
import os
import re
import time
from dotenv import load_dotenv
import pickle

global user_query
# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Get API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

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

# Global feedback dictionary to store user feedback
global feedback
feedback = {}

def get_trino_query_template():
    return """
    You are a Trino SQL expert. The queries must adhere to the semantics and syntax and should use Trino specific functions.
    Given the following:
    User Question: {user_query}
    Context from Documentation: {context}

    Previous User Feedback (consider this carefully):
    {feedback_formatted}

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
                "content": "You are a Trino SQL expert specializing in distributed query optimization."
            },
            {
                "role": "user",
                "content": get_trino_query_template().format(
                    user_query=user_query,
                    context=context,
                    feedback_formatted=feedback_formatted
                )
            }
        ],
        model="llama-3.1-8b-instant",
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
    
@app.route('/api/trino/feedback', methods=['POST'])  # Changed to POST
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
                        "you are given with code context : {code_context}"
                        "here is the context from the user : {user_query}"
                        "Given a short snippet of code that user migh write (act as a autocomplete assitance), provide the most appropriate completion suggestion in the code format only, do not generate any other text other than the code "
                        "that fits the context."
                        "So basically you will be given incomplete code, you need to return the next two to three words  "
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
    app.run(debug=True, host='0.0.0.0', port=5003)
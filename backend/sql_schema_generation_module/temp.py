from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re
from dotenv import load_dotenv
from groq import Groq
import instructor
from pydantic import BaseModel, Field
from db_setup import get_weaviate_client
from langchain.retrievers.weaviate_hybrid_search import WeaviateHybridSearchRetriever
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow CORS for testing with Thunder Client

# Get API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# Initialize Weaviate Client
client = get_weaviate_client()

# Hybrid Search Retriever
retriever = WeaviateHybridSearchRetriever(
    client=client,
    index_name="RAG",
    text_key="content",
    alpha=0.5,
    enable_limit=True,
    create_schema_if_missing=True,
    k=1
)

# Contextual Compression with Cohere
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)

# Initialize Groq Client
clientg = Groq(api_key=GROQ_API_KEY)
clientgg = instructor.from_groq(Groq(), mode=instructor.Mode.JSON)


# Pydantic Schema Model
class OLAPSchemaResponse(BaseModel):
    schema_type: str = Field(description="Type of schema used (Star or Snowflake) and reasoning.")
    database_schema: list = Field(description="List of tables, their columns, data types, primary and foreign keys, and relationships.")
    sql_statements: str = Field(description="SQL statements to generate the schema.")


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
                - Tables and their relationships
                - Columns with appropriate data types
                - Primary and foreign keys
                - Schema type (Star/Snowflake) and reasoning.
                """
            }
        ],
        model="llama-3.1-8b-instant",
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
    retrieved_docs = compression_retriever.get_relevant_documents(cleaned_response + user_query)
    retrieved_text = "\n\n".join(doc.page_content for doc in retrieved_docs)
    return response, retrieved_text


def generate_final_ans(inputquery, user_query):
    """Generate structured OLAP schema response."""
    query = f"""
    The user has asked: '{user_query}'.
    Given the OLAP context, and considering the response: {inputquery},
    generate a well-structured OLAP schema and reasoning:
    """
    try:
        response = clientgg.chat.completions.create(
            response_model=OLAPSchemaResponse,
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Provide OLAP schema data in JSON format."},
                {"role": "user", "content": query},
            ],
            temperature=0.2,
            max_tokens=4000,
        )
        return response.dict()
    except Exception as e:
        return {"error": f"Unable to generate schema: {str(e)}"}


@app.route("/generate_schema", methods=["POST"])
def generate_schema():
    """API endpoint to generate OLAP schema."""
    try:
        # Get JSON input
        data = request.get_json()
        user_query = data.get("user_query", "")

        if not user_query:
            return jsonify({"error": "User query is required"}), 400

        # Process the query
        llmres, olap_context = process_query(user_query)

        # Generate the schema
        ans = generate_database_schema(user_query, olap_context, llmres)
        fans = generate_final_ans(ans, user_query)

        return jsonify(fans)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)

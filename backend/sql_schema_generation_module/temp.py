from db_setup import get_weaviate_client
from groq import Groq
from langchain.retrievers.weaviate_hybrid_search import WeaviateHybridSearchRetriever
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
import os
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
    create_schema_if_missing=True
)

# Contextual Compression with Cohere
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)

from groq import Groq

client = Groq(
    api_key="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",
)
def get_olap_best_practices(user_query):
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"The user has asked: '{user_query}'. Based on this, provide the best OLAP (Online Analytical Processing) practices. you should answer just related to OLAP and dont include any user query info just give best OLAP practices based on user query "
                           "Consider data modeling, indexing, partitioning, query optimization, and performance tuning for large-scale analytical workloads.",
                           
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    
    # Get response text
    response_text = chat_completion.choices[0].message.content

    # Clean up unnecessary formatting (removing ** and #)
    cleaned_response = response_text.replace("**", "").replace("#", "").replace("```","")

    return cleaned_response.strip() 

def clean_text(text):
    text = text.replace("**", "").replace("#", "")  # Remove markdown formatting
    text = text.replace("\\", "")  # Remove unnecessary backslashes
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize spaces
    return text

def process_query(user_query):
    """Retrieve documents and OLAP best practices for the given query."""
    response = get_olap_best_practices(user_query)
    cleaned_response = clean_text(response)
    retrieved_docs = compression_retriever.get_relevant_documents(cleaned_response)
    retrieved_text = "\n\n".join(doc.page_content for doc in retrieved_docs)

    return retrieved_text

if __name__ == "__main__":
    user_query = "Give me a database table schema for my employee management system"
    response = process_query(user_query)
    print("\nFinal Response:\n", response)

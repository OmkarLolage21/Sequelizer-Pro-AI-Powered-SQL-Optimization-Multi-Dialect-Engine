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
    enable_limit=True,
    create_schema_if_missing=True,k=1
)

# Contextual Compression with Cohere
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)

from groq import Groq

clientg = Groq(
    api_key="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",
)
def get_olap_best_practices(user_query):
    chat_completion = clientg.chat.completions.create(
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

def generate_database_schema(user_query, olap_context, llm_res):
    chat_completion = clientg.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""
                    The user has asked: '{user_query}'.
                    Given the OLAP context: {olap_context}, and considering the following response: {llm_res}, 
                    generate a well-structured relational database schema having all possible tables related to it that includes:
                    
                    - Tables with their respective names
                    - Columns with appropriate data types
                    - Primary and foreign key constraints
                    - Relationships between tables (one-to-one, one-to-many, many-to-many)

                    
                    Ensure the schema is optimized for analytical workloads and adheres to best database design practices.
                """
            }
        ],
        model="llama-3.3-70b-versatile",
        max_tokens=5000,
    )

    # Get response text
    response_text = chat_completion.choices[0].message.content

    # Clean up unnecessary formatting
    cleaned_response = response_text.replace("", "").replace("#", "").replace("```", "")

    # Return the cleaned schema
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
    retrieved_docs = compression_retriever.get_relevant_documents(cleaned_response+user_query)
    retrieved_text = "\n\n".join(doc.page_content for doc in retrieved_docs)

    return response,retrieved_text

if __name__ == "__main__":
    user_query = "Design a database for an online retail platform tracking sales, inventory, and customer interactions"
    llmres,olap_context = process_query(user_query)
    # print("\nFinal Response:\n", olap_context)
    ans = generate_database_schema(user_query, olap_context, llmres)

    print(ans)



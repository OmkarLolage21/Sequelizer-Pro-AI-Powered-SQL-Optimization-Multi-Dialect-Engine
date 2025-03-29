from db_setup import get_weaviate_client
from groq import Groq
from langchain_community.retrievers import WeaviateHybridSearchRetriever  # Updated import
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

# Hybrid Search Retriever with updated settings
retriever = WeaviateHybridSearchRetriever(
    client=client,
    index_name="TrinoDoc",  # Updated to match your schema
    text_key="content",
    alpha=0.5,
    k=3,  # Increased for better context
    create_schema_if_missing=False
)

# Contextual Compression with Cohere
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)

# Initialize Groq client
clientg = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
    # Get Trino best practices
    trino_practices = get_trino_best_practices(user_query)
    
    # Retrieve relevant documentation
    retrieved_docs = compression_retriever.get_relevant_documents(user_query)
    doc_context = "\n\n".join(doc.page_content for doc in retrieved_docs)
    
    # Generate Trino query
    trino_query = generate_trino_query(user_query, doc_context)
    
    return {
        "best_practices": trino_practices,
        "documentation_context": doc_context,
        "generated_query": trino_query
    }

if __name__ == "__main__":
    # Example queries to test the system
    test_queries = [
        "Create a query to analyze daily sales trends with customer demographics, how can I use UNNEST?"
    ]
    
    for query in test_queries:
        print(f"\n{'='*80}\nProcessing Query: {query}\n{'='*80}")
        results = process_query(query)
        
        print("\nGenerated Trino Query and Explanation:")
        print(results["generated_query"])
        
        print("\nTrino Best Practices:")
        print(results["best_practices"])
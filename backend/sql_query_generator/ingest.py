import os
import weaviate
from langchain_community.retrievers import WeaviateHybridSearchRetriever  # Updated import
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from dotenv import load_dotenv

load_dotenv()

# Environment variables
weaviate_url = "https://9ypedx1xs4mfru7shnztcq.c0.asia-southeast1.gcp.weaviate.cloud"
weaviate_api_key = "XVUADgE0w2SAz3hgod7vqoyPJx3UitmPYFTf"
HF_TOKEN = os.getenv("HF_TOKEN")

# Initialize Weaviate client
client = weaviate.Client(
    url=weaviate_url,
    auth_client_secret=weaviate.AuthApiKey(weaviate_api_key),
    additional_headers={
        "X-HuggingFace-Api-Key": HF_TOKEN
    },
)

# Check if client is ready
print("Weaviate Client Status:", client.is_ready())

# Define class name
CLASS_NAME = "TrinoDoc"

# Check if class exists
try:
    existing_schema = client.schema.get()
    class_exists = any(cls["class"] == CLASS_NAME for cls in existing_schema["classes"])
    
    if not class_exists:
        # Define schema for Trino documentation
        schema = {
            "classes": [
                {
                    "class": CLASS_NAME,
                    "description": "Trino documentation for RAG",
                    "vectorizer": "text2vec-huggingface",
                    "moduleConfig": {
                        "text2vec-huggingface": {
                            "model": "sentence-transformers/all-MiniLM-L6-v2",
                            "type": "text"
                        }
                    },
                    "properties": [
                        {
                            "dataType": ["text"],
                            "description": "The content of the documentation",
                            "moduleConfig": {
                                "text2vec-huggingface": {
                                    "skip": False,
                                    "vectorizePropertyName": False,
                                }
                            },
                            "name": "content",
                        },
                        {
                            "dataType": ["text"],
                            "description": "Source of the document",
                            "name": "source",
                        }
                    ],
                },
            ]
        }
        # Create schema only if it doesn't exist
        client.schema.create(schema)
        print(f"Created new schema with class '{CLASS_NAME}'")
    else:
        print(f"Class '{CLASS_NAME}' already exists, skipping schema creation")
except Exception as e:
    print(f"Error checking/creating schema: {str(e)}")

# Initialize retriever
retriever = WeaviateHybridSearchRetriever(
    alpha=0.5,
    client=client,
    index_name=CLASS_NAME,
    text_key="content",
    attributes=["source"],
    create_schema_if_missing=False,
)

# Load the Trino documentation with UTF-8 encoding
try:
    loader = TextLoader(
        "C:\\Users\\hrite\\OneDrive\\Documents\\COEP-Inspiron-Hackathon\\backend\\sql_query_generator\\trino_data.md",
        encoding='utf-8'  # Explicitly specify UTF-8 encoding
    )
    documents = loader.load()
    print(f"Successfully loaded markdown file")
except UnicodeDecodeError:
    # If UTF-8 fails, try with UTF-16
    try:
        loader = TextLoader(
            "C:\\Users\\hrite\\OneDrive\\Documents\\COEP-Inspiron-Hackathon\\backend\\sql_query_generator\\trino_data.md",
            encoding='utf-16'
        )
        documents = loader.load()
        print(f"Successfully loaded markdown file with UTF-16 encoding")
    except Exception as e:
        print(f"Error loading file with UTF-16: {str(e)}")
except Exception as e:
    print(f"Error loading file: {str(e)}")


# Create text splitter with larger chunk size for technical documentation
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", " ", ""],
    length_function=len
)

# Split documents
split_docs = text_splitter.split_documents(documents)
print(f"Number of document chunks: {len(split_docs)}")

# Add documents to Weaviate
retriever.add_documents(split_docs)
print("Documents added to Weaviate successfully!")

print(retriever.invoke("How to use MySQL with Trino?")[0].page_content)
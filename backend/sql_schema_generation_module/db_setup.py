import weaviate
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

weaviate_url="https://9yqwkasqgihqvmw3koycg.c0.asia-southeast1.gcp.weaviate.cloud"
weaviate_api_key="yTIQQldOtWhMlkmVPx2Fan3o6ZyVEgv32573"
HF_TOKEN = os.getenv("HF_TOKEN")

# Initialize Weaviate Client
client = weaviate.Client(
    url=weaviate_url,
    auth_client_secret=weaviate.AuthApiKey(weaviate_api_key),
    additional_headers={"X-HuggingFace-Api-Key": HF_TOKEN},
)

# Define Schema if needed
schema = {
    "classes": [
        {
            "class": "RAG",
            "description": "Documents for RAG",
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
                    "description": "The content of the paragraph",
                    "moduleConfig": {
                        "text2vec-huggingface": {
                            "skip": False,
                            "vectorizePropertyName": False
                        }
                    },
                    "name": "content",
                },
            ],
        },
    ]
}

# Create Schema if not exists
if "RAG" not in [cls["class"] for cls in client.schema.get()["classes"]]:
    client.schema.create(schema)
    print("Schema created successfully!")

def get_weaviate_client():
    """Return Weaviate client instance."""
    return client

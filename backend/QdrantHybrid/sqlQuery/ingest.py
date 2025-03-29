"""This method can be used if you can compensate for some CPU to process the Embeddings"""

"""Dependencies"""
import logging
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

"""Loading and chunking the knowledge base"""
try:
    logger.info("Loading knowledge base...")
    #there's a byte (0x9d) sometime in txt file that can't be decoded using the default 'charmap' codec (CP1252 encoding)
    loader = TextLoader(file_path='C:\\Users\\hrite\\OneDrive\\Documents\\COEP-Inspiron-Hackathon\\backend\\sql_query_generator\\trino_data.md', encoding='utf-8') 
    knowledge = loader.load()
    logger.info(f"Loaded {len(knowledge)} documents.")
except Exception as e:
    logger.error(f"Error loading file: {e}")
    raise

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n"]
)
documents = text_splitter.split_documents(knowledge)
logger.info(f"Split into {len(documents)} chunks.")

# Inspect the first few chunks
for i, doc in enumerate(documents[:5]):
    logger.info(f"Chunk {i+1}:\n{doc.page_content}\n")

"""Creating vector embeddings and storing them in FAISS"""
try:
    logger.info("Creating embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vector = FAISS.from_documents(documents, embeddings)
    logger.info("Embeddings created successfully.")
except Exception as e:
    logger.error(f"Error creating embeddings: {e}")
    raise

"""Save the FAISS index to disk"""
try:
    logger.info("Saving FAISS index to disk...")
    vector.save_local("backend/data/faiss_index")
    logger.info("FAISS index saved successfully.")
except Exception as e:
    logger.error(f"Error saving FAISS index: {e}")
    raise
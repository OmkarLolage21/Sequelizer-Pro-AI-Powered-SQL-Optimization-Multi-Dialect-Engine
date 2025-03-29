from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from db_setup import get_weaviate_client
from langchain_community.retrievers import WeaviateHybridSearchRetriever
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
import os
import re
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from groq import Groq as DirectGroqClient

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# Initialize Weaviate Client
client = get_weaviate_client()

# Initialize Groq client for direct API calls (for compatibility with existing code)
groq_direct = DirectGroqClient(api_key=GROQ_API_KEY)

# Configure LangChain's Groq integration
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile",
    temperature=0.2
)

# Create specialized retrievers for different purposes
def create_retriever(alpha=0.5, k=3, filter_attributes=None):
    """Create a Weaviate hybrid retriever with optional filters"""
    return WeaviateHybridSearchRetriever(
        client=client,
        index_name="TrinoDoc",
        text_key="content",
        alpha=alpha,
        k=k,
        create_schema_if_missing=False,
        additional_properties=filter_attributes if filter_attributes else []
    )

# Base retriever
base_retriever = create_retriever(alpha=0.5, k=5)

# Create compressed retriever with Cohere reranking
compressor = CohereRerank(cohere_api_key=COHERE_API_KEY)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=base_retriever
)

# Specialized retrievers
sql_retriever = create_retriever(alpha=0.7, k=4, filter_attributes=["category"])  # Prioritize text matching for SQL
explanation_retriever = create_retriever(alpha=0.4, k=3)  # Balance between vector and text for explanations
optimization_retriever = create_retriever(alpha=0.3, k=3, filter_attributes=["performance"])  # Prioritize semantics for optimization

class QueryRefinementAgent:
    """Agent responsible for refining and expanding user queries"""
    
    def __init__(self):
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You refine user queries to make them clearer for SQL generation."),
            ("user", """You are a Trino SQL query understanding expert.
            Your job is to refine and expand the user's query to ensure it's clear and comprehensive.
            
            Original Query: {query}
            
            Please analyze this query and:
            1. Identify any ambiguities or missing information
            2. Expand it to include any implied requirements
            3. Structure it in a way that would help generate optimal Trino SQL
            
            Return only the refined query without explanation.""")
        ])
    
    def refine_query(self, query: str) -> str:
        """Refine and expand the user query"""
        chain = self.prompt | llm
        return chain.invoke({"query": query}).content.strip()

class RetrievalAgent:
    """Agent responsible for retrieving relevant documentation chunks"""
    
    def __init__(self, retriever_type: str):
        self.retriever_type = retriever_type
        if retriever_type == "sql":
            self.retriever = sql_retriever
        elif retriever_type == "explanation":
            self.retriever = explanation_retriever
        elif retriever_type == "optimization":
            self.retriever = optimization_retriever
        else:
            self.retriever = compression_retriever
    
    def retrieve(self, query: str) -> str:
        """Retrieve relevant documentation chunks"""
        docs = self.retriever.get_relevant_documents(query)
        return "\n\n".join([doc.page_content for doc in docs])

class SQLGenerationAgent:
    """Agent responsible for generating Trino SQL queries"""
    
    def __init__(self):
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a Trino SQL expert specializing in distributed query optimization."),
            ("user", """You are a Trino SQL expert. The queries must adhere to the semantics and syntax and should use Trino specific functions.
            Given the following:
            User Question: {query}
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
            <list of Trino-specific optimizations>""")
        ])
    
    def generate_sql(self, query: str, context: str) -> str:
        """Generate a Trino SQL query based on the refined query and context"""
        chain = self.prompt | llm
        return chain.invoke({"query": query, "context": context}).content.strip()

class ExplanationAgent:
    """Agent responsible for explaining Trino concepts"""
    
    def __init__(self):
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a Trino educator specializing in explaining complex database concepts."),
            ("user", """You are a Trino educator specializing in explaining complex Trino concepts.
            
            Based on this user query: {query}
            
            And this documentation context: {context}
            
            Provide a clear, educational explanation of the relevant Trino concepts.
            Focus on helping the user understand the underlying principles and how they apply to their query.""")
        ])
    
    def generate_explanation(self, query: str, context: str) -> str:
        """Generate an explanation of Trino concepts relevant to the query"""
        chain = self.prompt | llm
        return chain.invoke({"query": query, "context": context}).content.strip()

class OptimizationAgent:
    """Agent responsible for providing Trino optimization strategies"""
    
    def __init__(self):
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a Trino performance optimization expert."),
            ("user", """You are a Trino performance optimization expert.
            
            User Query: {query}
            
            Generated SQL: {sql}
            
            Context from Documentation: {context}
            
            Provide specific, actionable Trino optimization strategies for this query considering:
            - Query structure optimizations
            - Join optimizations
            - Predicate pushdown opportunities
            - Partition pruning techniques
            - Resource allocation recommendations
            - Any Trino-specific functions or syntax that could improve performance
            
            Format your response with clear sections and code examples where appropriate.""")
        ])
    
    def generate_optimizations(self, query: str, sql: str, context: str) -> str:
        """Generate optimization strategies for the Trino query"""
        chain = self.prompt | llm
        return chain.invoke({"query": query, "sql": sql, "context": context}).content.strip()

class TrinoAgentOrchestrator:
    """Orchestrator for managing the workflow between Trino agents"""
    
    def __init__(self):
        self.refinement_agent = QueryRefinementAgent()
        self.sql_retriever = RetrievalAgent("sql")
        self.explanation_retriever = RetrievalAgent("explanation")
        self.optimization_retriever = RetrievalAgent("optimization")
        self.sql_generation_agent = SQLGenerationAgent()
        self.explanation_agent = ExplanationAgent()
        self.optimization_agent = OptimizationAgent()
        
        self.intent_prompt = ChatPromptTemplate.from_messages([
            ("system", "You analyze user intent for database queries."),
            ("user", """Analyze this query: "{query}"
            
            Determine which of these intents apply (respond ONLY with a comma-separated list of the applicable intents):
            - SQL (user wants an SQL query)
            - Explanation (user wants explanation of Trino concepts)
            - Optimization (user wants performance optimization advice)""")
        ])
    
    def determine_intent(self, query: str) -> List[str]:
        """Determine the user's intent to decide which tools to use"""
        chain = self.intent_prompt | llm
        response = chain.invoke({"query": query}).content
        intents = [intent.strip() for intent in response.split(',')]
        return intents
    
    def process_query(self, user_query: str) -> Dict[str, Any]:
        """Process the user query using the appropriate agents"""
        # Step 1: Refine the query
        refined_query = self.refinement_agent.refine_query(user_query)
        
        # Step 2: Determine user intent
        intents = self.determine_intent(user_query)
        
        result = {"refined_query": refined_query, "intents": intents}
        
        # Step 3: Process based on intent
        if "SQL" in intents:
            # Retrieve SQL-related documentation
            sql_context = self.sql_retriever.retrieve(refined_query)
            # Generate SQL
            sql_response = self.sql_generation_agent.generate_sql(refined_query, sql_context)
            result["sql_response"] = sql_response
            
            # Extract just the SQL for optimization if needed
            sql_pattern = r"QUERY:\s*(.*?)(?=EXPLANATION:|$)"
            sql_match = re.search(sql_pattern, sql_response, re.DOTALL)
            sql_only = sql_match.group(1).strip() if sql_match else sql_response
            result["sql_only"] = sql_only
        
        if "Explanation" in intents:
            # Retrieve explanation-related documentation
            explanation_context = self.explanation_retriever.retrieve(refined_query)
            # Generate explanation
            explanation = self.explanation_agent.generate_explanation(refined_query, explanation_context)
            result["explanation"] = explanation
        
        if "Optimization" in intents and "SQL" in intents:
            # Retrieve optimization-related documentation
            optimization_context = self.optimization_retriever.retrieve(refined_query)
            # Generate optimization strategies
            optimizations = self.optimization_agent.generate_optimizations(
                refined_query, 
                result.get("sql_only", ""), 
                optimization_context
            )
            result["optimizations"] = optimizations
        
        return result
    
    def format_response(self, results: Dict[str, Any]) -> str:
        """Format the results into a cohesive response"""
        response_parts = []
        
        if "refined_query" in results:
            response_parts.append(f"I understood your query as: '{results['refined_query']}'")
        
        if "sql_response" in results:
            response_parts.append(f"\n{results['sql_response']}")
        
        if "explanation" in results and "Explanation" in results["intents"]:
            response_parts.append(f"\n## Trino Concept Explanation\n{results['explanation']}")
        
        if "optimizations" in results and "Optimization" in results["intents"]:
            response_parts.append(f"\n## Additional Optimization Strategies\n{results['optimizations']}")
        
        return "\n".join(response_parts)

# Main function to use the orchestrator
def process_query(user_query: str) -> str:
    """Process a user query and return a formatted response"""
    orchestrator = TrinoAgentOrchestrator()
    results = orchestrator.process_query(user_query)
    return orchestrator.format_response(results)

if __name__ == "__main__":
    # Example queries to test the system
    test_queries = [
        "Create a query to analyze daily sales trends with customer demographics, how can I use UNNEST?",
        "What are the best practices for partitioning large tables in Trino?",
        "How can I optimize a query that joins three large tables with a GROUP BY clause?"
    ]
    
    for query in test_queries:
        print(f"\n{'='*80}\nProcessing Query: {query}\n{'='*80}")
        response = process_query(query)
        print(response)
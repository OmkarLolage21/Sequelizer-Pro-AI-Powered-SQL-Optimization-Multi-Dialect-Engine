from pyspark.sql import SparkSession
import sys
import json
import re
import traceback
from datetime import datetime, timezone

def execute_query(query):
    # Create a SparkSession with MySQL connector
    spark = SparkSession.builder \
        .appName("ExecuteQuery") \
        .config("spark.jars", "/opt/spark/jars/mysql-connector-java.jar") \
        .getOrCreate()
    
    try:
        # Extract the table name if it's a simple query
        match = re.search(r'FROM\s+(\w+)', query, re.IGNORECASE)
        
        if match:
            table_name = match.group(1)
            
            # Load the table data
            jdbc_df = spark.read \
                .format("jdbc") \
                .option("url", "jdbc:mysql://mysql_db:3306/sales") \
                .option("dbtable", table_name) \
                .option("user", "admin") \
                .option("password", "admin") \
                .load()
            
            # Register the table as a temp view
            jdbc_df.createOrReplaceTempView(table_name)
            
            # Execute the query
            result_df = spark.sql(query)
        else:
            # For queries without a clear table reference or complex queries
            # We'll try to execute them directly through JDBC
            try:
                result_df = spark.read \
                    .format("jdbc") \
                    .option("url", "jdbc:mysql://mysql_db:3306/sales") \
                    .option("dbtable", f"({query}) AS query_result") \
                    .option("user", "admin") \
                    .option("password", "admin") \
                    .load()
            except Exception:
                # Last resort - try to execute as a custom SQL query
                # This requires at least one table to be loaded first
                # Let's try with the customers table as a fallback
                fallback_df = spark.read \
                    .format("jdbc") \
                    .option("url", "jdbc:mysql://mysql_db:3306/sales") \
                    .option("dbtable", "customers") \
                    .option("user", "admin") \
                    .option("password", "admin") \
                    .load()
                
                fallback_df.createOrReplaceTempView("customers")
                result_df = spark.sql(query)
        
        # Collect the schema for better results
        schema = [{"name": field.name, "type": field.dataType.simpleString()} 
                  for field in result_df.schema.fields]
        
        # Convert to list of dictionaries for JSON serialization
        results = [row.asDict() for row in result_df.collect()]
        
        # Create a structured response
        response = {
            "status": "success",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "query": query,
            "schema": schema,
            "count": len(results),
            "results": results
        }
        
        # Print ONLY the JSON results - nothing else to stdout
        print(json.dumps(response))
        
        return True
    except Exception as e:
        error_details = {
            "status": "error",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "query": query,
            "error": str(e)
        }
        print(json.dumps(error_details))
        return False
    finally:
        # Always stop the SparkSession
        spark.stop()

if __name__ == "__main__":
    # Get the query from command line arguments
    if len(sys.argv) > 1:
        query = sys.argv[1]
        execute_query(query)
    else:
        error_response = {
            "status": "error",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "error": "No query provided"
        }
        print(json.dumps(error_response))
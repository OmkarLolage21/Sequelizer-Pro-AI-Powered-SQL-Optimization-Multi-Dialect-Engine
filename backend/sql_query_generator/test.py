from db_setup import get_weaviate_client

client = get_weaviate_client()
try:
    schema = client.schema.get()
    print("Successfully retrieved schema:", schema)
except Exception as e:
    print("Error retrieving schema:", e)

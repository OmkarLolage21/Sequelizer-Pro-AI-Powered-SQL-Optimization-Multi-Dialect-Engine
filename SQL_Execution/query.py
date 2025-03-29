from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("MySQLExample") \
    .getOrCreate()

# Read from MySQL
df = spark.read \
    .format("jdbc") \
    .option("url", "jdbc:mysql://mysql_db:3306/sales") \
    .option("dbtable", "customers") \
    .option("user", "root") \
    .option("password", "root") \
    .load()

# Show results
df.show()

# Perform a Spark SQL query
df.createOrReplaceTempView("customers")
result = spark.sql("SELECT COUNT(*) AS total_customers FROM customers")
result.show()

spark.stop()
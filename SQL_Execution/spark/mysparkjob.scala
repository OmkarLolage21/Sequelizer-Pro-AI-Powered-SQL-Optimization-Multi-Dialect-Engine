// mysparkjob.scala

// Import necessary classes
import org.apache.spark.sql.{SparkSession, DataFrame}

// Create a SparkSession
val spark = SparkSession.builder()
  .appName("Spark MySQL Example")
  .config("spark.master", "local")
  .getOrCreate()

// Define MySQL connection parameters
val jdbcUrl = "jdbc:mysql://mysql_db:3306/sales"
val dbTable = "customers"
val dbUser = "admin"
val dbPassword = "admin"
val driver = "com.mysql.cj.jdbc.Driver"

// Read the 'customers' table into a DataFrame
val df: DataFrame = spark.read
  .format("jdbc")
  .option("url", jdbcUrl)
  .option("dbtable", dbTable)
  .option("user", dbUser)
  .option("password", dbPassword)
  .option("driver", driver)
  .load()

// Show all rows from the 'customers' table
df.show(truncate=false)

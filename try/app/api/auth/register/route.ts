import { NextResponse } from "next/server"
import { hash } from "bcrypt"
import { z } from "zod"
// In a real app, you would use a MongoDB client
// import { connectToDatabase } from "@/lib/mongodb";

// Validation schema
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate request body
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ message: "Invalid input", errors: result.error.errors }, { status: 400 })
    }

    const { name, email, password } = result.data

    // In a real app, you would connect to MongoDB and check if user exists
    // const { db } = await connectToDatabase();
    // const existingUser = await db.collection("users").findOne({ email });

    // For demo purposes, we'll simulate this check
    const existingUser = false

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // In a real app, you would create the user in MongoDB
    // await db.collection("users").insertOne({
    //   name,
    //   email,
    //   password: hashedPassword,
    //   createdAt: new Date(),
    // });

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "An error occurred during registration" }, { status: 500 })
  }
}


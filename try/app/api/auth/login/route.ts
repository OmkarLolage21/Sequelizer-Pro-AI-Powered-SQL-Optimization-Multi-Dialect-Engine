import { NextResponse } from "next/server"
import { compare } from "bcrypt"
import { sign } from "jsonwebtoken"
import { z } from "zod"
import { cookies } from "next/headers"
// In a real app, you would use a MongoDB client
// import { connectToDatabase } from "@/lib/mongodb";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate request body
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ message: "Invalid input", errors: result.error.errors }, { status: 400 })
    }

    const { email, password } = result.data

    // In a real app, you would connect to MongoDB and find the user
    // const { db } = await connectToDatabase();
    // const user = await db.collection("users").findOne({ email });

    // For demo purposes, we'll simulate a user
    const mockUser =
      email === "john.doe@example.com"
        ? {
            _id: "mock-user-id",
            name: "John Doe",
            email: "john.doe@example.com",
            password: await compare("password123", "$2b$10$XfPGJDuWu6aP/p3ZpvNX8O6qH9iUh5N5XM1J3wZrQXMB1bRxUz.Aq"),
          }
        : null

    if (!mockUser) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // In a real app, you would verify the password
    // const isPasswordValid = await compare(password, user.password);

    // For demo purposes, we'll simulate password validation
    const isPasswordValid = true

    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Create JWT token
    const token = sign(
      {
        id: mockUser._id,
        email: mockUser.email,
        name: mockUser.name,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    )

    // Set cookie
    cookies().set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "An error occurred during login" }, { status: 500 })
  }
}


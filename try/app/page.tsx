import { Button } from "@/components/ui/button"
import { BackgroundBeams } from "@/components/ui/background-beams"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { SparklesCore } from "@/components/ui/sparkles"
import Link from "next/link"

export default function LandingPage() {
  const words = "AI-Powered SQL Assistant"

  return (
    <div className="relative h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full absolute inset-0 h-screen">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      <div className="relative z-10 text-center px-6 md:px-10">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8">
          <TextGenerateEffect words={words} />
        </h1>

        <p className="text-gray-300 text-xl md:text-2xl max-w-3xl mx-auto mb-12">
          Transform natural language into optimized database schemas and SQL queries with our intelligent assistant.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6 rounded-full">Login</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-transparent border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 rounded-full">
              Register
            </Button>
          </Link>
        </div>
      </div>

      <BackgroundBeams className="z-0" />
    </div>
  )
}


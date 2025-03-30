"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Navbar } from "@/components/ui/navbar";
import Link from "next/link";
import { Database, Code, Rocket, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSpotlight, setActiveSpotlight] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setActiveSpotlight({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      title: "Generate Schema",
      description: "Create optimized database schemas from natural language descriptions",
      icon: <Database className="h-10 w-10 text-purple-400" />,
      link: "/schema",
      delay: 200,
    },
    {
      title: "Generate SQL",
      description: "Translate English to Trino or Spark SQL queries",
      icon: <Code className="h-10 w-10 text-indigo-400" />,
      link: "/sql",
      delay: 400,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)] animate-pulse"></div>
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_var(--x)_var(--y),rgba(99,102,241,0.15),transparent_30%)] transition-transform duration-300"
          style={{
            '--x': `${activeSpotlight.x}%`,
            '--y': `${activeSpotlight.y}%`
          } as React.CSSProperties}
        ></div>
      </div>

      <Navbar />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className={`max-w-4xl w-full transform transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="text-center mb-12">
            <div className="relative inline-block">
              <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 mb-4">
                Welcome to SQL Assistant
              </h1>
            </div>
            <p className="text-gray-300 text-xl">Your AI-powered companion for database schema design and SQL query generation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Link href={feature.link} key={index} legacyBehavior>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: feature.delay / 1000 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20 h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="text-2xl font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-300 mb-6">{feature.description}</p>
                      <div className="mt-auto">
                        <Button className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors duration-300">
                          Get Started
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Floating elements */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-pink-500/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>
    </div>
  );
}
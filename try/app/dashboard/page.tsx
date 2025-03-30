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
import {
  Database,
  Code,
  History,
  FileText,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

export default function Dashboard() {
  const features = [
    {
      title: "Generate Schema",
      description: "Create optimized database schemas from natural language descriptions",
      icon: <Database className="h-10 w-10 text-blue-500" />,
      link: "/schema",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Generate SQL",
      description: "Translate English to Trino or Spark SQL queries",
      icon: <Code className="h-10 w-10 text-purple-500" />,
      link: "/sql",
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Schema History",
      description: "View and manage your previously generated schemas",
      icon: <History className="h-10 w-10 text-green-500" />,
      link: "/history/schemas",
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Query History",
      description: "Access your previously generated SQL queries",
      icon: <FileText className="h-10 w-10 text-amber-500" />,
      link: "/history/queries",
      color: "from-amber-500 to-yellow-500",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundGradientAnimation>
        <Navbar />

        <div className="relative z-10 container mx-auto px-4 py-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl mb-4">
              Welcome to SQL Assistant
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-gray-300">
              Your AI-powered companion for database schema design and SQL query generation
            </p>
          </motion.div>

          {/* Features Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              What would you like to do?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Link href={feature.link} key={index} legacyBehavior>
                  <motion.div whileHover={{ y: -5 }} className="h-full">
                    <Card className="h-full bg-gray-900/80 backdrop-blur-sm border border-gray-700 overflow-hidden group relative hover:border-gray-500 transition-all">
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-15 transition-opacity duration-300`}
                      />
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {feature.icon}
                          <CardTitle className="text-white">
                            {feature.title}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-gray-400">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button
                          variant="ghost"
                          className="bg-white/10 text-white hover:bg-white hover:text-black transition-all"
                        >
                          Get Started <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </BackgroundGradientAnimation>
    </div>
  );
}
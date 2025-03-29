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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/ui/navbar";
import { LampContainer } from "@/components/ui/lamp";
import Link from "next/link";
import {
  Database,
  Code,
  History,
  FileText,
  Terminal,
  Server,
  Table,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [recentSchemas, setRecentSchemas] = useState<{ id: number; name: string; date: string }[]>([]);
  const [recentQueries, setRecentQueries] = useState<{ id: number; name: string; dialect: string; date: string }[]>([]);

  useEffect(() => {
    setRecentSchemas([
      { id: 1, name: "E-commerce Database", date: "2023-05-15" },
      { id: 2, name: "Healthcare System", date: "2023-05-10" },
      { id: 3, name: "Financial Analytics", date: "2023-05-05" },
    ]);

    setRecentQueries([
      {
        id: 1,
        name: "Monthly Sales Report",
        dialect: "Trino",
        date: "2023-05-14",
      },
      {
        id: 2,
        name: "Customer Segmentation",
        dialect: "Spark",
        date: "2023-05-12",
      },
      {
        id: 3,
        name: "Inventory Analysis",
        dialect: "Trino",
        date: "2023-05-08",
      },
    ]);
  }, []);

  const features = [
    {
      title: "Generate Schema",
      description:
        "Create optimized database schemas from natural language descriptions",
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
    <div className="relative min-h-screen bg-gray-950 overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 -z-10 aurora-background"></div>

      <Navbar />

      <LampContainer className="py-16">
        <div className="mx-auto flex flex-col items-center justify-center space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl">
            Welcome to SQL Assistant
          </h1>
          <p className="max-w-[600px] text-gray-300 md:text-xl/relaxed">
            Your AI-powered companion for database schema design and SQL query
            generation
          </p>
        </div>
      </LampContainer>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          What would you like to do?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Link href={feature.link} key={index}>
              <motion.div whileHover={{ y: -5 }} className="h-full">
                <Card className="h-full bg-gray-900 border border-gray-800 overflow-hidden group relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  ></div>
                  <CardHeader>
                    <div className="flex items-center gap-2">
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
                      className="bg-white text-black group-hover:translate-x-1 transition-transform duration-300"
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
  );
}

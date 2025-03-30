"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Database, Code, Home, LogOut, User, Settings } from "lucide-react"
import { motion } from "framer-motion"

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-700">
      {/* Gradient Background Container */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-indigo-900/30 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent animate-pulse-slow"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Nav Links */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-md p-1.5 mr-2"
              >
                <Database className="h-5 w-5 text-white" />
              </motion.div>
              <span className="text-white font-bold text-lg">SQL Assistant</span>
            </Link>

            <div className="hidden md:flex ml-10 space-x-1">
              {[
                { path: "/dashboard", icon: <Home className="mr-2 h-4 w-4" />, label: "Dashboard" },
                { path: "/schema", icon: <Database className="mr-2 h-4 w-4" />, label: "Schema" },
                { path: "/sql", icon: <Code className="mr-2 h-4 w-4" />, label: "SQL" }
              ].map((item) => (
                <Link href={item.path} key={item.path}>
                  <motion.div whileHover={{ y: -2 }}>
                    <Button
                      variant={isActive(item.path) ? "default" : "ghost"}
                      className={`${isActive(item.path) 
                        ? "bg-gray-700/80 hover:bg-gray-600/80" 
                        : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                      } transition-all`}
                    >
                      {item.icon}
                      {item.label}
                      {isActive(item.path) && (
                        <motion.span
                          layoutId="navActive"
                          className="absolute left-0 bottom-0 h-0.5 w-full bg-purple-500"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Button>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - User Dropdown */}
          <div className="hidden md:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <motion.div whileHover={{ scale: 1.05 }}>
                    <Avatar className="h-8 w-8 border border-gray-600">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                  </motion.div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 bg-gray-800/95 backdrop-blur-lg border border-gray-700" 
                align="end" 
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">John Doe</p>
                    <p className="text-xs leading-none text-gray-400">john.doe@example.com</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="focus:bg-gray-700 focus:text-white">
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-gray-700 focus:text-white">
                  <Settings className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="focus:bg-gray-700 focus:text-white">
                  <LogOut className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700/50 focus:outline-none"
            >
              <svg
                className={`${isOpen ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isOpen ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="md:hidden bg-gray-900/95 backdrop-blur-lg"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {[
              { path: "/dashboard", icon: <Home className="mr-2 h-4 w-4" />, label: "Dashboard" },
              { path: "/schema", icon: <Database className="mr-2 h-4 w-4" />, label: "Schema" },
              { path: "/sql", icon: <Code className="mr-2 h-4 w-4" />, label: "SQL" }
            ].map((item) => (
              <Link href={item.path} key={item.path} onClick={() => setIsOpen(false)}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isActive(item.path) ? "bg-gray-700 text-white" : "text-gray-300 hover:text-white hover:bg-gray-700/50"}`}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-5">
              <Avatar className="h-10 w-10 border border-gray-600">
                <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">John Doe</div>
                <div className="text-sm font-medium leading-none text-gray-400">john.doe@example.com</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  )
}
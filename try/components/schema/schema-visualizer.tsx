"use client"

import { useEffect, useRef, useState } from "react"

interface Column {
  name: string
  type: string
  isPrimary?: boolean
  isNullable?: boolean
}

interface Table {
  name: string
  columns: Column[]
}

interface Relationship {
  from: string
  to: string
  type: string
  fromColumn: string
  toColumn: string
}

interface Schema {
  tables: Table[]
  relationships: Relationship[]
}

interface SchemaVisualizerProps {
  schema: Schema
  isEditMode?: boolean
  zoomLevel?: number
}

interface TablePosition {
  x: number
  y: number
  width: number
  height: number
}

export function SchemaVisualizer({ schema, isEditMode = false, zoomLevel = 1 }: SchemaVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [tablePositions, setTablePositions] = useState<Record<string, TablePosition>>({})
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)

  // Initialize table positions
  useEffect(() => {
    if (!containerRef.current || !schema) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Calculate positions
    const positions: Record<string, TablePosition> = {}

    // Simple layout algorithm
    let currentX = 50
    let currentY = 50
    let maxHeightInRow = 0
    const tableWidth = 220
    const tableSpacing = 40

    schema.tables.forEach((table) => {
      const tableHeight = 40 + table.columns.length * 30

      // Check if we need to move to next row
      if (currentX + tableWidth > width - 50) {
        currentX = 50
        currentY += maxHeightInRow + tableSpacing
        maxHeightInRow = 0
      }

      positions[table.name] = {
        x: currentX,
        y: currentY,
        width: tableWidth,
        height: tableHeight,
      }

      currentX += tableWidth + tableSpacing
      maxHeightInRow = Math.max(maxHeightInRow, tableHeight)
    })

    setTablePositions(positions)
  }, [schema])

  // Render the schema
  useEffect(() => {
    if (!containerRef.current || !schema || Object.keys(tablePositions).length === 0) return

    const container = containerRef.current

    // Clear previous content
    container.innerHTML = ""

    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("width", "100%")
    svg.setAttribute("height", "100%")
    svg.setAttribute("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`)
    svg.style.transform = `scale(${zoomLevel})`
    svg.style.transformOrigin = "center"
    svg.style.transition = "transform 0.3s ease"
    svgRef.current = svg
    container.appendChild(svg)

    // Add defs for markers and gradients
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
    svg.appendChild(defs)

    // Add arrowhead marker
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker")
    marker.setAttribute("id", "arrowhead")
    marker.setAttribute("markerWidth", "10")
    marker.setAttribute("markerHeight", "7")
    marker.setAttribute("refX", "10")
    marker.setAttribute("refY", "3.5")
    marker.setAttribute("orient", "auto")
    defs.appendChild(marker)

    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
    polygon.setAttribute("points", "0 0, 10 3.5, 0 7")
    polygon.setAttribute("fill", "#6366f1")
    marker.appendChild(polygon)

    // Add gradient for relationship lines
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient")
    gradient.setAttribute("id", "relationGradient")
    gradient.setAttribute("x1", "0%")
    gradient.setAttribute("y1", "0%")
    gradient.setAttribute("x2", "100%")
    gradient.setAttribute("y2", "0%")
    defs.appendChild(gradient)

    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop")
    stop1.setAttribute("offset", "0%")
    stop1.setAttribute("stop-color", "#6366f1")
    gradient.appendChild(stop1)

    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop")
    stop2.setAttribute("offset", "100%")
    stop2.setAttribute("stop-color", "#8b5cf6")
    gradient.appendChild(stop2)

    // Draw relationships first (so they appear behind tables)
    schema.relationships.forEach((rel) => {
      const fromTable = tablePositions[rel.from]
      const toTable = tablePositions[rel.to]

      if (!fromTable || !toTable) return

      // Find column positions
      const fromTableObj = schema.tables.find(t => t.name === rel.from)
      const toTableObj = schema.tables.find(t => t.name === rel.to)
      
      const fromColumnIndex = fromTableObj?.columns.findIndex(c => c.name === rel.fromColumn) ?? 0
      const toColumnIndex = toTableObj?.columns.findIndex(c => c.name === rel.toColumn) ?? 0

      const fromY = fromTable.y + 40 + fromColumnIndex * 30 + 15
      const toY = toTable.y + 40 + toColumnIndex * 30 + 15

      // Determine start and end points
      let startX, startY, endX, endY

      if (fromTable.x < toTable.x) {
        // From is to the left of To
        startX = fromTable.x + fromTable.width
        startY = fromY
        endX = toTable.x
        endY = toY
      } else if (fromTable.x > toTable.x) {
        // From is to the right of To
        startX = fromTable.x
        startY = fromY
        endX = toTable.x + toTable.width
        endY = toY
      } else if (fromTable.y < toTable.y) {
        // From is above To
        startX = fromTable.x + fromTable.width / 2
        startY = fromTable.y + fromTable.height
        endX = toTable.x + toTable.width / 2
        endY = toTable.y
      } else {
        // From is below To
        startX = fromTable.x + fromTable.width / 2
        startY = fromTable.y
        endX = toTable.x + toTable.width / 2
        endY = toTable.y + toTable.height
      }

      // Create path group
      const pathGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      pathGroup.setAttribute("class", "relationship")
      pathGroup.setAttribute("data-from", rel.from)
      pathGroup.setAttribute("data-to", rel.to)
      svg.appendChild(pathGroup)

      // Calculate control points for curve
      const dx = Math.abs(endX - startX) / 2
      const dy = Math.abs(endY - startY) / 2
      const controlPoint1X = startX < endX ? startX + dx : startX - dx
      const controlPoint1Y = startY
      const controlPoint2X = startX < endX ? endX - dx : endX + dx
      const controlPoint2Y = endY

      const d = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`

      // Create animated path
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
      path.setAttribute("d", d)
      path.setAttribute("fill", "none")
      path.setAttribute("stroke", "url(#relationGradient)")
      path.setAttribute("stroke-width", "2")
      path.setAttribute("marker-end", "url(#arrowhead)")
      path.setAttribute("stroke-dasharray", "5,5")
      path.setAttribute("stroke-dashoffset", "0")

      // Add animation
      const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate")
      animate.setAttribute("attributeName", "stroke-dashoffset")
      animate.setAttribute("from", "0")
      animate.setAttribute("to", "10")
      animate.setAttribute("dur", "1s")
      animate.setAttribute("repeatCount", "indefinite")
      path.appendChild(animate)

      pathGroup.appendChild(path)

      // Add relationship type label
      const labelX = (startX + endX) / 2
      const labelY = (startY + endY) / 2 - 10

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
      label.setAttribute("x", labelX.toString())
      label.setAttribute("y", labelY.toString())
      label.setAttribute("text-anchor", "middle")
      label.setAttribute("fill", "#9ca3af")
      label.setAttribute("font-size", "10")
      label.textContent = rel.type

      const labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      labelBg.setAttribute("x", (labelX - 30).toString())
      labelBg.setAttribute("y", (labelY - 10).toString())
      labelBg.setAttribute("width", "60")
      labelBg.setAttribute("height", "14")
      labelBg.setAttribute("fill", "#1f2937")
      labelBg.setAttribute("rx", "3")

      pathGroup.appendChild(labelBg)
      pathGroup.appendChild(label)
    })

    // Draw tables
    schema.tables.forEach((table) => {
      const position = tablePositions[table.name]
      if (!position) return

      // Table container
      const tableGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      tableGroup.setAttribute("class", "table")
      tableGroup.setAttribute("data-table", table.name)
      tableGroup.setAttribute("transform", `translate(${position.x}, ${position.y})`)

      if (isEditMode) {
        tableGroup.style.cursor = "move"
        tableGroup.addEventListener("mousedown", (e) => {
          if (!isEditMode) return
          setSelectedTable(table.name)
          setIsDragging(true)
          const rect = svg.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          setDragOffset({
            x: x - position.x,
            y: y - position.y,
          })
          e.preventDefault()
        })

        tableGroup.addEventListener("mouseover", () => {
          setHoveredTable(table.name)
        })

        tableGroup.addEventListener("mouseout", () => {
          setHoveredTable(null)
        })
      }

      svg.appendChild(tableGroup)

      // Table rectangle with gradient background
      const tableRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      tableRect.setAttribute("width", position.width.toString())
      tableRect.setAttribute("height", position.height.toString())
      tableRect.setAttribute("rx", "6")
      tableRect.setAttribute("ry", "6")
      tableRect.setAttribute("fill", "#1f2937")
      tableRect.setAttribute(
        "stroke",
        selectedTable === table.name ? "#6366f1" : hoveredTable === table.name ? "#4b5563" : "#374151",
      )
      tableRect.setAttribute("stroke-width", selectedTable === table.name ? "3" : "2")
      tableGroup.appendChild(tableRect)

      // Table name
      const tableName = document.createElementNS("http://www.w3.org/2000/svg", "text")
      tableName.setAttribute("x", (position.width / 2).toString())
      tableName.setAttribute("y", "25")
      tableName.setAttribute("text-anchor", "middle")
      tableName.setAttribute("fill", "#ffffff")
      tableName.setAttribute("font-weight", "bold")
      tableName.setAttribute("font-size", "14")
      tableName.textContent = table.name
      tableGroup.appendChild(tableName)

      // Separator line
      const separator = document.createElementNS("http://www.w3.org/2000/svg", "line")
      separator.setAttribute("x1", "0")
      separator.setAttribute("y1", "40")
      separator.setAttribute("x2", position.width.toString())
      separator.setAttribute("y2", "40")
      separator.setAttribute("stroke", "#374151")
      separator.setAttribute("stroke-width", "2")
      tableGroup.appendChild(separator)

      // Columns
      table.columns.forEach((column, index) => {
        const columnGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
        tableGroup.appendChild(columnGroup)

        const y = 40 + index * 30 + 20

        // Column name
        const columnName = document.createElementNS("http://www.w3.org/2000/svg", "text")
        columnName.setAttribute("x", "10")
        columnName.setAttribute("y", y.toString())
        columnName.setAttribute("fill", column.isPrimary ? "#8b5cf6" : "#d1d5db")
        columnName.setAttribute("font-size", "12")
        columnName.textContent = column.name
        columnGroup.appendChild(columnName)

        // Column type
        const columnType = document.createElementNS("http://www.w3.org/2000/svg", "text")
        columnType.setAttribute("x", (position.width - 10).toString())
        columnType.setAttribute("y", y.toString())
        columnType.setAttribute("text-anchor", "end")
        columnType.setAttribute("fill", "#9ca3af")
        columnType.setAttribute("font-size", "12")
        columnType.textContent = column.type
        columnGroup.appendChild(columnType)

        // Primary key indicator
        if (column.isPrimary) {
          const keyIcon = document.createElementNS("http://www.w3.org/2000/svg", "text")
          keyIcon.setAttribute("x", (position.width - 35).toString())
          keyIcon.setAttribute("y", y.toString())
          keyIcon.setAttribute("text-anchor", "end")
          keyIcon.setAttribute("fill", "#8b5cf6")
          keyIcon.setAttribute("font-size", "10")
          keyIcon.textContent = "PK"
          columnGroup.appendChild(keyIcon)
        }
      })
    })

    // Add event listeners for dragging
    if (isEditMode) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !selectedTable) return

        const rect = svg.getBoundingClientRect()
        const x = e.clientX - rect.left - dragOffset.x
        const y = e.clientY - rect.top - dragOffset.y

        // Update table position
        setTablePositions((prev) => ({
          ...prev,
          [selectedTable]: {
            ...prev[selectedTable],
            x,
            y,
          },
        }))

        // Update table group position
        const tableGroup = svg.querySelector(`g.table[data-table="${selectedTable}"]`)
        if (tableGroup) {
          tableGroup.setAttribute("transform", `translate(${x}, ${y})`)
        }

        // Update relationship paths
        updateRelationshipPaths(selectedTable)
      }

      const handleMouseUp = () => {
        if (isDragging) {
          setIsDragging(false)
          setSelectedTable(null)
        }
      }

      container.addEventListener("mousemove", handleMouseMove)
      container.addEventListener("mouseup", handleMouseUp)
      container.addEventListener("mouseleave", handleMouseUp)

      return () => {
        container.removeEventListener("mousemove", handleMouseMove)
        container.removeEventListener("mouseup", handleMouseUp)
        container.removeEventListener("mouseleave", handleMouseUp)
      }
    }
  }, [schema, tablePositions, isEditMode, selectedTable, isDragging, dragOffset, hoveredTable, zoomLevel])

  // Function to update relationship paths when tables are moved
  const updateRelationshipPaths = (tableName: string) => {
    if (!svgRef.current) return

    const svg = svgRef.current

    // Find all relationships involving this table
    const relationships = Array.from(
      svg.querySelectorAll(`g.relationship[data-from="${tableName}"], g.relationship[data-to="${tableName}"]`),
    )

    relationships.forEach((relGroup) => {
      const fromTableName = relGroup.getAttribute("data-from") || ""
      const toTableName = relGroup.getAttribute("data-to") || ""

      const fromTable = tablePositions[fromTableName]
      const toTable = tablePositions[toTableName]

      if (!fromTable || !toTable) return

      // Find column positions
      const fromTableObj = schema.tables.find(t => t.name === fromTableName)
      const toTableObj = schema.tables.find(t => t.name === toTableName)
      
      const relationship = schema.relationships.find(r => 
        r.from === fromTableName && r.to === toTableName
      )

      if (!relationship || !fromTableObj || !toTableObj) return

      const fromColumnIndex = fromTableObj.columns.findIndex(c => c.name === relationship.fromColumn)
      const toColumnIndex = toTableObj.columns.findIndex(c => c.name === relationship.toColumn)

      const fromY = fromTable.y + 40 + fromColumnIndex * 30 + 15
      const toY = toTable.y + 40 + toColumnIndex * 30 + 15

      // Determine start and end points
      let startX, startY, endX, endY

      if (fromTable.x < toTable.x) {
        // From is to the left of To
        startX = fromTable.x + fromTable.width
        startY = fromY
        endX = toTable.x
        endY = toY
      } else if (fromTable.x > toTable.x) {
        // From is to the right of To
        startX = fromTable.x
        startY = fromY
        endX = toTable.x + toTable.width
        endY = toY
      } else if (fromTable.y < toTable.y) {
        // From is above To
        startX = fromTable.x + fromTable.width / 2
        startY = fromTable.y + fromTable.height
        endX = toTable.x + toTable.width / 2
        endY = toTable.y
      } else {
        // From is below To
        startX = fromTable.x + fromTable.width / 2
        startY = fromTable.y
        endX = toTable.x + toTable.width / 2
        endY = toTable.y + toTable.height
      }

      // Calculate control points for curve
      const dx = Math.abs(endX - startX) / 2
      const dy = Math.abs(endY - startY) / 2
      const controlPoint1X = startX < endX ? startX + dx : startX - dx
      const controlPoint1Y = startY
      const controlPoint2X = startX < endX ? endX - dx : endX + dx
      const controlPoint2Y = endY

      const d = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`

      // Update path
      const path = relGroup.querySelector("path")
      if (path) {
        path.setAttribute("d", d)
      }

      // Update label position
      const labelX = (startX + endX) / 2
      const labelY = (startY + endY) / 2 - 10

      const label = relGroup.querySelector("text")
      if (label) {
        label.setAttribute("x", labelX.toString())
        label.setAttribute("y", labelY.toString())
      }

      const labelBg = relGroup.querySelector("rect")
      if (labelBg) {
        labelBg.setAttribute("x", (labelX - 30).toString())
        labelBg.setAttribute("y", (labelY - 10).toString())
      }
    })
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-950 rounded-lg overflow-hidden"
      style={{ position: "relative" }}
    >
      {isEditMode && (
        <div className="absolute bottom-4 left-4 z-10 bg-gray-800 p-2 rounded-md text-xs text-gray-300">
          <p>Drag tables to reposition them</p>
        </div>
      )}
    </div>
  )
}
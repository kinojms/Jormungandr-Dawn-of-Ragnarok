// Import the deck data from deckInfo.js
import sampleDeck from "./deckInfo.js"

// State management
let filteredCards = [...sampleDeck.cards]
let currentFilter = "all"
let currentSort = "name"
const flippedCards = new Set()
const scryfallImageCache = {}
const scryfallDataCache = {}

// Carousel state
let currentSlide = 0
let cardsPerSlide = 4
let totalSlides = 0

// Mouse drag state
let isDragging = false
let startX = 0
let scrollLeft = 0

// DOM elements
const themeToggle = document.getElementById("themeToggle")
const typeFilter = document.getElementById("typeFilter")
const sortBy = document.getElementById("sortBy")
const drawHandBtn = document.getElementById("drawHandBtn")
const cardCarousel = document.getElementById("cardCarousel")
const sampleHand = document.getElementById("sampleHand")
const manaCurve = document.getElementById("manaCurve")
const commanderCard = document.getElementById("commanderCard")
const prevBtn = document.getElementById("prevBtn")
const nextBtn = document.getElementById("nextBtn")
const carouselWrapper = document.querySelector(".carousel-wrapper")
const goToStartBtn = document.getElementById("goToStartBtn")
const goToEndBtn = document.getElementById("goToEndBtn")

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light"
  document.documentElement.setAttribute("data-theme", savedTheme)
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
}

let sortDirection = "asc"

function toggleSortDirection() {
  sortDirection = sortDirection === "asc" ? "desc" : "asc"
  filterAndSortCards()
  renderCards()
}

// Initialize the application
function init() {
  initTheme()
  loadCommanderCard()
  renderManaCurve()
  filterAndSortCards()
  renderCards()
  updateCardsPerSlide()
  initCarouselDrag()

  // Event listeners
  themeToggle.addEventListener("click", toggleTheme)
  typeFilter.addEventListener("change", handleFilterChange)
  sortBy.addEventListener("change", handleSortChange)
  drawHandBtn.addEventListener("click", generateSampleHand)
  prevBtn.addEventListener("click", prevSlide)
  nextBtn.addEventListener("click", nextSlide)
  goToStartBtn.addEventListener("click", goToStart)
  goToEndBtn.addEventListener("click", goToEnd)

  const sortDirBtn = document.getElementById("sortDirBtn")
  if (sortDirBtn) {
    sortDirBtn.addEventListener("click", toggleSortDirection)
  }

  // Responsive carousel
  window.addEventListener("resize", () => {
    updateCardsPerSlide()
    renderCards()
  })

  // Touch/swipe support
  let startXTouch = 0
  let endXTouch = 0

  cardCarousel.addEventListener("touchstart", (e) => {
    startXTouch = e.touches[0].clientX
  })

  cardCarousel.addEventListener("touchend", (e) => {
    endXTouch = e.changedTouches[0].clientX
    handleSwipe()
  })

  function handleSwipe() {
    const threshold = 50
    const diff = startXTouch - endXTouch

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
  }
}

// Initialize carousel drag functionality
function initCarouselDrag() {
  carouselWrapper.addEventListener("mousedown", startDrag)
  carouselWrapper.addEventListener("mouseleave", endDrag)
  carouselWrapper.addEventListener("mouseup", endDrag)
  carouselWrapper.addEventListener("mousemove", drag)
  carouselWrapper.addEventListener("scroll", updateIndicatorsFromScroll)

  // Prevent default drag behavior on images
  carouselWrapper.addEventListener("dragstart", (e) => e.preventDefault())
}

function startDrag(e) {
  isDragging = true
  carouselWrapper.style.cursor = "grabbing"
  startX = e.pageX - carouselWrapper.offsetLeft
  scrollLeft = carouselWrapper.scrollLeft
}

function endDrag() {
  isDragging = false
  carouselWrapper.style.cursor = "grab"
}

function drag(e) {
  if (!isDragging) return
  e.preventDefault()
  const x = e.pageX - carouselWrapper.offsetLeft
  const walk = (x - startX) * 1.7 // Reduced scroll sensitivity from 2 to 0.75
  carouselWrapper.scrollLeft = scrollLeft - walk
}

function updateIndicatorsFromScroll() {
  if (!carouselWrapper || totalSlides === 0) return

  const scrollLeft = carouselWrapper.scrollLeft
  const maxScroll = carouselWrapper.scrollWidth - carouselWrapper.clientWidth
  const cardWidth = 280 + 24 // card width + gap
  const cardsPerView = Math.floor(carouselWrapper.offsetWidth / cardWidth)
  const newSlide = Math.round(scrollLeft / (cardWidth * cardsPerView))

  if (newSlide !== currentSlide && newSlide >= 0 && newSlide < totalSlides) {
    currentSlide = Math.min(newSlide, totalSlides - 1)
    updateNavigationButtons()
  }
}

function updateCardsPerSlide() {
  const width = window.innerWidth
  if (width < 480) {
    cardsPerSlide = 1
  } else if (width < 768) {
    cardsPerSlide = 2
  } else if (width < 1024) {
    cardsPerSlide = 3
  } else {
    cardsPerSlide = 4
  }
}

function loadCommanderCard() {
  const commander = sampleDeck.cards.find((card) => card.role === "Commander")
  if (commander) {
    fetchCardData(commander.name).then((cardData) => {
      if (cardData.image) {
        const commanderImageDiv = commanderCard.querySelector(".commander-image")
        commanderImageDiv.innerHTML = `<img src="${cardData.image}" alt="${commander.name}" style="width:100%;height:100%;object-fit:cover;border-radius:0.5rem;" loading="lazy">`
      }
    })
  }
}

// Filter and sort functions
function handleFilterChange(e) {
  currentFilter = e.target.value
  filterAndSortCards()
  renderCards()
}

function handleSortChange(e) {
  currentSort = e.target.value
  filterAndSortCards()
  renderCards()
}

function filterAndSortCards() {
  if (currentFilter === "all") {
    filteredCards = [...sampleDeck.cards]
  } else {
    filteredCards = sampleDeck.cards.filter((card) => card.type.toLowerCase().includes(currentFilter.toLowerCase()))
  }
  filteredCards.sort((a, b) => {
    let result = 0
    if (currentSort === "name") result = a.name.localeCompare(b.name)
    if (currentSort === "mana") result = a.manaCost - b.manaCost
    if (currentSort === "type") result = a.type.localeCompare(b.type)
    if (currentSort === "role") result = a.role.localeCompare(b.role)
    return sortDirection === "asc" ? result : -result
  })
}

// Enhanced Scryfall fetcher that gets both image and card data
async function fetchCardData(cardName) {
  if (scryfallDataCache[cardName]) {
    return scryfallDataCache[cardName]
  }
  try {
    const resp = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`)
    if (!resp.ok) throw new Error("Not found")
    const data = await resp.json()
    const cardData = {
      image: data.image_uris?.normal || data.image_uris?.large || data.image_uris?.small || null,
      oracleText: data.oracle_text || "No card text available.",
      manaCost: data.mana_cost || "",
      typeLine: data.type_line || "",
      power: data.power || null,
      toughness: data.toughness || null,
      rarity: data.rarity || "",
      setName: data.set_name || "",
    }
    scryfallDataCache[cardName] = cardData
    return cardData
  } catch (error) {
    console.warn(`Failed to fetch data for ${cardName}:`, error)
    const fallbackData = {
      image: null,
      oracleText: "Card text unavailable.",
      manaCost: "",
      typeLine: "",
      power: null,
      toughness: null,
      rarity: "",
      setName: "",
    }
    scryfallDataCache[cardName] = fallbackData
    return fallbackData
  }
}

// Legacy function for backward compatibility
async function fetchCardImage(cardName) {
  const data = await fetchCardData(cardName)
  return data.image
}

// Format oracle text for better readability
function formatOracleText(oracleText) {
  if (!oracleText) return "No card text available."

  // Replace newlines with proper breaks and format common MTG symbols
  return oracleText
    .replace(/\n/g, "\n\n")
    .replace(/\{([^}]+)\}/g, "($1)") // Convert mana symbols to readable format
    .replace(/•/g, "•") // Ensure bullet points display correctly
}

// Format mana cost for display
function formatManaCost(manaCost) {
  if (!manaCost) return ""
  return manaCost.replace(/\{([^}]+)\}/g, "($1)")
}

// Smooth scroll animation function
function smoothScrollTo(element, targetScrollLeft, duration = 400) {
  const startScrollLeft = element.scrollLeft
  const distance = targetScrollLeft - startScrollLeft
  const startTime = performance.now()

  function animation(currentTime) {
    const timeElapsed = currentTime - startTime
    const progress = Math.min(timeElapsed / duration, 1)

    // Easing function (ease-out cubic)
    const easeOut = 1 - Math.pow(1 - progress, 3)

    element.scrollLeft = startScrollLeft + distance * easeOut

    if (progress < 1) {
      requestAnimationFrame(animation)
    }
  }

  requestAnimationFrame(animation)
}

// Check if we can scroll in a direction
function canScrollLeft() {
  return carouselWrapper.scrollLeft > 0
}

function canScrollRight() {
  const maxScroll = carouselWrapper.scrollWidth - carouselWrapper.clientWidth
  return carouselWrapper.scrollLeft < maxScroll - 1 // -1 for floating point precision
}

// Carousel functions
function renderCards() {
  cardCarousel.innerHTML = ""
  currentSlide = 0

  totalSlides = Math.ceil(filteredCards.length / cardsPerSlide)

  filteredCards.forEach((card, index) => {
    const cardElement = createCardElement(card)
    cardCarousel.appendChild(cardElement)
  })

  // Reset scroll position
  carouselWrapper.scrollLeft = 0

  updateNavigationButtons()
}

function createCardElement(card) {
  const cardDiv = document.createElement("div")
  cardDiv.className = "card"
  cardDiv.dataset.cardId = card.id

  // Placeholder serpent icon SVG
  const iconPath = `<path d="M20.9 18.55c.06-.43.1-.86.1-1.3 0-1.77-.77-3.37-2-4.47V9.5c0-1.1-.9-2-2-2h-2V5c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v2.5H7c-1.1 0-2 .9-2 2v3.28c-1.23 1.1-2 2.7-2 4.47 0 .44.04.87.1 1.3-1.28.47-2.1 1.7-2.1 3.1 0 1.88 1.56 3.35 3.35 3.35 1.44 0 2.67-.88 3.15-2.15.48.17.98.3 1.5.3.52 0 1.02-.13 1.5-.3.48 1.27 1.71 2.15 3.15 2.15 1.79 0 3.35-1.47 3.35-3.35 0-1.4-.82-2.63-2.1-3.1zM6 19.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"></path>`

  cardDiv.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <div class="card-image">
                    <svg class="card-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${iconPath}
                    </svg>
                </div>
                <div class="card-content">
                    <h3 class="card-name">${card.name}</h3>
                    <div class="card-details">
                        <span class="card-type">${card.type}</span>
                        <span class="card-mana-cost">${card.manaCost}</span>
                    </div>
                    <div class="card-role-container">
                      <span class="card-role">${card.role}</span>
                    </div>
                </div>
            </div>
            <div class="card-back">
                <div class="card-back-content">
                    <h3 class="card-back-name">${card.name}</h3>
                    <div class="card-oracle-text">Loading card text...</div>
                    <div class="card-back-details">
                        <div class="card-type-badge">${card.type}</div>
                    </div>
                </div>
            </div>
        </div>
    `
  fetchCardData(card.name).then((cardData) => {
    if (cardData.image) {
      const cardImageDiv = cardDiv.querySelector(".card-image")
      cardImageDiv.innerHTML = `<img src="${cardData.image}" alt="${card.name}" style="width:100%;height:192px;object-fit:cover;border-radius:0.5rem 0.5rem 0 0;" loading="lazy">`
    }
    const oracleTextDiv = cardDiv.querySelector(".card-oracle-text")
    const backDetailsDiv = cardDiv.querySelector(".card-back-details")
    const formattedText = formatOracleText(cardData.oracleText)
    oracleTextDiv.textContent = formattedText
    let ptText = ""
    if (cardData.power !== null && cardData.toughness !== null) {
      ptText = `<div class="card-pt">${cardData.power}/${cardData.toughness}</div>`
    }
    let manaCostText = ""
    if (cardData.manaCost) {
      manaCostText = `<div class="card-back-mana-cost">${formatManaCost(cardData.manaCost)}</div>`
    }
    backDetailsDiv.innerHTML = `
      ${manaCostText}
      <div class="card-type-badge">${cardData.typeLine || card.type}</div>
      ${ptText}
    `
  })
  cardDiv.addEventListener("click", () => toggleCardFlip(card.id))
  return cardDiv
}

function toggleCardFlip(cardId) {
  const cardElement = document.querySelector(`[data-card-id="${cardId}"]`)
  if (flippedCards.has(cardId)) {
    flippedCards.delete(cardId)
    cardElement.classList.remove("flipped")
  } else {
    flippedCards.add(cardId)
    cardElement.classList.add("flipped")
  }
}

function nextSlide() {
  // Check if we can scroll right, if not, loop back to start
  if (canScrollRight()) {
    const cardWidth = 280 + 24 // card width + gap
    const scrollAmount = cardWidth * cardsPerSlide
    const targetScrollLeft = carouselWrapper.scrollLeft + scrollAmount

    // Use smooth scroll animation
    smoothScrollTo(carouselWrapper, targetScrollLeft, 400)

    if (currentSlide < totalSlides - 1) {
      currentSlide++
    }
  } else {
    // If at the end, loop back to the beginning
    smoothScrollTo(carouselWrapper, 0, 400)
    currentSlide = 0
  }

  updateNavigationButtons()
}

function prevSlide() {
  // Check if we can scroll left, if not, loop to end
  if (canScrollLeft()) {
    const cardWidth = 280 + 24 // card width + gap
    const scrollAmount = cardWidth * cardsPerSlide
    const targetScrollLeft = carouselWrapper.scrollLeft - scrollAmount

    // Use smooth scroll animation
    smoothScrollTo(carouselWrapper, targetScrollLeft, 400)

    if (currentSlide > 0) {
      currentSlide--
    }
  } else {
    // If at the beginning, loop to the end
    const targetScrollLeft = carouselWrapper.scrollWidth - carouselWrapper.clientWidth
    smoothScrollTo(carouselWrapper, targetScrollLeft, 400)
    currentSlide = totalSlides - 1
  }

  updateNavigationButtons()
}

function goToStart() {
  // Use smooth scroll animation to go to start
  smoothScrollTo(carouselWrapper, 0, 600)
  currentSlide = 0
  updateNavigationButtons()
}

function goToEnd() {
  const targetScrollLeft = carouselWrapper.scrollWidth - carouselWrapper.clientWidth
  // Use smooth scroll animation to go to end
  smoothScrollTo(carouselWrapper, targetScrollLeft, 600)
  currentSlide = totalSlides - 1
  updateNavigationButtons()
}

function updateCarouselPosition() {
  const translateX = -(currentSlide * (100 / cardsPerSlide) * cardsPerSlide)
  cardCarousel.style.transform = `translateX(${translateX}%)`
}

function updateNavigationButtons() {
  // Navigation buttons are now always enabled for infinite scrolling
  prevBtn.disabled = false
  nextBtn.disabled = false

  // Only disable start/end buttons when already at those positions
  goToStartBtn.disabled = !canScrollLeft()
  goToEndBtn.disabled = !canScrollRight()

  // Update visual opacity based on scroll position
  prevBtn.style.opacity = canScrollLeft() ? "1" : "0.7"
  nextBtn.style.opacity = canScrollRight() ? "1" : "0.7"
  goToStartBtn.style.opacity = canScrollLeft() ? "1" : "0.5"
  goToEndBtn.style.opacity = canScrollRight() ? "1" : "0.5"
}

function renderManaCurve() {
  const curve = {}
  let totalCards = 0
  let totalManaCost = 0

  sampleDeck.cards.forEach((card) => {
    const cost = Math.min(card.manaCost, 7)
    const key = cost === 7 ? "7+" : cost.toString()
    curve[key] = (curve[key] || 0) + 1
    totalCards++
    totalManaCost += card.manaCost
  })

  const maxCount = Math.max(...Object.values(curve))
  const avgManaCost = (totalManaCost / totalCards).toFixed(1)
  const allCosts = ["0", "1", "2", "3", "4", "5", "6", "7+"]

  allCosts.forEach((cost) => {
    if (!curve[cost]) curve[cost] = 0
  })

  manaCurve.innerHTML = ""

  // Create SVG for line chart with proper dimensions for labels
  const svgContainer = document.createElement("div")
  svgContainer.className = "line-chart-container"

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 500 280") // Reduced height from 300 to 280
  svg.setAttribute("class", "line-chart")

  // Add grid lines for better readability
  const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
  gridGroup.setAttribute("class", "grid-lines")

  // Vertical grid lines
  for (let i = 0; i < 8; i++) {
    const x = i * 50 + 60 // Reduced left margin from 75 to 60
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
    gridLine.setAttribute("x1", x)
    gridLine.setAttribute("y1", 30) // Reduced top margin from 50 to 30
    gridLine.setAttribute("x2", x)
    gridLine.setAttribute("y2", 220)
    gridLine.setAttribute("stroke", "var(--border-color)")
    gridLine.setAttribute("stroke-width", "1")
    gridLine.setAttribute("opacity", "0.3")
    gridGroup.appendChild(gridLine)
  }

  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = 30 + i * 38 // Adjusted spacing and starting point
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
    gridLine.setAttribute("x1", 60) // Reduced left margin from 75 to 60
    gridLine.setAttribute("y1", y)
    gridLine.setAttribute("x2", 440) // Increased right boundary from 425 to 440
    gridLine.setAttribute("y2", y)
    gridLine.setAttribute("stroke", "var(--border-color)")
    gridLine.setAttribute("stroke-width", "1")
    gridLine.setAttribute("opacity", "0.3")
    gridGroup.appendChild(gridLine)
  }

  svg.appendChild(gridGroup)

  // Add Y-axis labels (number of cards)
  for (let i = 0; i <= 5; i++) {
    const y = 220 - i * 38 // Adjusted spacing
    const value = Math.round((maxCount / 5) * i)
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
    label.setAttribute("x", 50) // Reduced left margin from 65 to 50
    label.setAttribute("y", y + 5)
    label.setAttribute("text-anchor", "end")
    label.setAttribute("fill", "var(--text-secondary)")
    label.setAttribute("font-size", "12")
    label.setAttribute("font-family", "Inter, sans-serif")
    label.textContent = value
    svg.appendChild(label)
  }

  // Add X-axis labels (mana costs)
  allCosts.forEach((cost, index) => {
    const x = index * 50 + 60 // Reduced left margin from 75 to 60
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
    label.setAttribute("x", x)
    label.setAttribute("y", 240)
    label.setAttribute("text-anchor", "middle")
    label.setAttribute("fill", "var(--text-secondary)")
    label.setAttribute("font-size", "12")
    label.setAttribute("font-family", "Inter, sans-serif")
    label.textContent = cost
    svg.appendChild(label)
  })

  // Create line path with adjusted coordinates
  const points = allCosts
    .map((cost, index) => {
      const x = index * 50 + 60 // Reduced left margin from 75 to 60
      const y = 220 - (curve[cost] / maxCount) * 190 // Increased height range from 170 to 190
      return `${x},${y}`
    })
    .join(" ")

  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
  line.setAttribute("points", points)
  line.setAttribute("fill", "none")
  line.setAttribute("stroke", "var(--accent-blue)")
  line.setAttribute("stroke-width", "3")
  line.setAttribute("stroke-linecap", "round")
  line.setAttribute("stroke-linejoin", "round")

  // Create dots for each point with adjusted coordinates
  allCosts.forEach((cost, index) => {
    const x = index * 50 + 60 // Reduced left margin from 75 to 60
    const y = 220 - (curve[cost] / maxCount) * 190 // Increased height range from 170 to 190

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    circle.setAttribute("cx", x)
    circle.setAttribute("cy", y)
    circle.setAttribute("r", "4")
    circle.setAttribute("fill", "var(--accent-green)")
    circle.setAttribute("stroke", "var(--accent-blue)")
    circle.setAttribute("stroke-width", "2")
    svg.appendChild(circle)

    // Add value labels on data points
    const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text")
    valueLabel.setAttribute("x", x)
    valueLabel.setAttribute("y", y - 10)
    valueLabel.setAttribute("text-anchor", "middle")
    valueLabel.setAttribute("fill", "var(--text-primary)")
    valueLabel.setAttribute("font-size", "12")
    valueLabel.setAttribute("font-weight", "600")
    valueLabel.setAttribute("font-family", "Inter, sans-serif")
    valueLabel.textContent = curve[cost]
    svg.appendChild(valueLabel)
  })

  svg.appendChild(line)

  // Add axis titles
  const yAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text")
  yAxisTitle.setAttribute("x", 15) // Reduced left margin from 20 to 15
  yAxisTitle.setAttribute("y", 125)
  yAxisTitle.setAttribute("text-anchor", "middle")
  yAxisTitle.setAttribute("fill", "var(--text-primary)")
  yAxisTitle.setAttribute("font-size", "14")
  yAxisTitle.setAttribute("font-weight", "600")
  yAxisTitle.setAttribute("font-family", "Inter, sans-serif")
  yAxisTitle.setAttribute("transform", "rotate(-90 15 125)") // Adjusted rotation point
  yAxisTitle.textContent = "Number of Cards"
  svg.appendChild(yAxisTitle)

  const xAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text")
  xAxisTitle.setAttribute("x", 250)
  xAxisTitle.setAttribute("y", 265) // Reduced bottom margin from 270 to 265
  xAxisTitle.setAttribute("text-anchor", "middle")
  xAxisTitle.setAttribute("fill", "var(--text-primary)")
  xAxisTitle.setAttribute("font-size", "14")
  xAxisTitle.setAttribute("font-weight", "600")
  xAxisTitle.setAttribute("font-family", "Inter, sans-serif")
  xAxisTitle.textContent = "Mana Cost"
  svg.appendChild(xAxisTitle)

  svgContainer.appendChild(svg)

  // Rest of the function remains unchanged
  const labelsContainer = document.createElement("div")
  labelsContainer.className = "curve-labels"

  allCosts.forEach((cost, index) => {
    const labelDiv = document.createElement("div")
    labelDiv.className = "curve-label-item"
    labelDiv.innerHTML = `
      <div class="curve-label">${cost}</div>
      <div class="curve-count">${curve[cost]} cards</div>
    `
    labelsContainer.appendChild(labelDiv)
  })

  manaCurve.appendChild(svgContainer)
  manaCurve.appendChild(labelsContainer)

  // Add statistics section
  const statsSection = document.createElement("div")
  statsSection.className = "mana-curve-stats"

  const lowCostCards = Object.entries(curve)
    .filter(([cost]) => ["0", "1", "2", "3"].includes(cost))
    .reduce((sum, [, count]) => sum + count, 0)

  const midCostCards = Object.entries(curve)
    .filter(([cost]) => ["4", "5", "6"].includes(cost))
    .reduce((sum, [, count]) => sum + count, 0)

  const highCostCards = curve["7+"] || 0

  statsSection.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${avgManaCost}</div>
      <div class="stat-label">Average Mana Cost</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${lowCostCards}</div>
      <div class="stat-label">Low Cost (0-3)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${midCostCards}</div>
      <div class="stat-label">Mid Cost (4-6)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${highCostCards}</div>
      <div class="stat-label">High Cost (7+)</div>
    </div>
  `

  const manaCurveSection = document.querySelector(".mana-curve-section")
  const existingStats = manaCurveSection.querySelector(".mana-curve-stats")
  if (existingStats) {
    existingStats.remove()
  }
  manaCurveSection.appendChild(statsSection)
}

function generateSampleHand() {
  const shuffled = [...sampleDeck.cards].sort(() => Math.random() - 0.5)
  const hand = shuffled.slice(0, 7)
  sampleHand.innerHTML = ""
  hand.forEach((card) => {
    const handCardDiv = document.createElement("div")
    handCardDiv.className = "hand-card"
    fetchCardImage(card.name).then((imgUrl) => {
      if (imgUrl) {
        handCardDiv.innerHTML = `
          <img src="${imgUrl}" alt="${card.name}" style="width:100%;height:80px;object-fit:cover;border-radius:0.5rem 0.5rem 0 0;margin-bottom:0.5rem;" loading="lazy">
          <div class="hand-card-name">${card.name}</div>
          <div class="hand-card-cost">${card.manaCost}</div>
        `
      } else {
        handCardDiv.innerHTML = `
          <div class="hand-card-name">${card.name}</div>
          <div class="hand-card-cost">${card.manaCost}</div>
        `
      }
    })
    sampleHand.appendChild(handCardDiv)
  })

  // Change button text to "Mulligan" and show the sample hand
  drawHandBtn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="16,3 21,3 21,8"></polyline>
      <line x1="4" y1="20" x2="21" y2="3"></line>
      <polyline points="21,16 21,21 16,21"></polyline>
      <line x1="15" y1="15" x2="21" y2="21"></line>
      <line x1="4" y1="4" x2="9" y2="9"></line>
    </svg>
    Mulligan
  `
  document.getElementById("sampleHand").style.display = "grid"
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", init)

// Import the deck data from deckInfo.js
import sampleDeck from "./deckInfo.js"

// State management
let filteredCards = [...sampleDeck.cards]
let currentFilter = "all"
let currentSort = "name"
const flippedCards = new Set()
const scryfallImageCache = {}
const scryfallDataCache = {}

// DOM elements
const themeToggle = document.getElementById("themeToggle")
const typeFilter = document.getElementById("typeFilter")
const sortBy = document.getElementById("sortBy")
const drawHandBtn = document.getElementById("drawHandBtn")
const redrawBtn = document.getElementById("redrawBtn")
const cardGallery = document.getElementById("cardGallery")
const sampleHandSection = document.getElementById("sampleHandSection")
const sampleHand = document.getElementById("sampleHand")
const manaCurve = document.getElementById("manaCurve")

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

let sortDirection = "asc"; // "asc" or "desc"

// Add this function to toggle sort direction
function toggleSortDirection() {
  sortDirection = sortDirection === "asc" ? "desc" : "asc";
  filterAndSortCards();
  renderCards();
}

// Initialize the application
function init() {
  initTheme();
  renderManaCurve();
  filterAndSortCards();
  renderCards();

  // Event listeners
  themeToggle.addEventListener("click", toggleTheme);
  typeFilter.addEventListener("change", handleFilterChange);
  sortBy.addEventListener("change", handleSortChange);
  drawHandBtn.addEventListener("click", generateSampleHand);
  redrawBtn.addEventListener("click", generateSampleHand);

  // Add a button for sort direction (create this button in your HTML)
  const sortDirBtn = document.getElementById("sortDirBtn");
  if (sortDirBtn) {
    sortDirBtn.addEventListener("click", toggleSortDirection);
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
  // Filter cards
  if (currentFilter === "all") {
    filteredCards = [...sampleDeck.cards];
  } else {
    filteredCards = sampleDeck.cards.filter((card) =>
      card.type.toLowerCase().includes(currentFilter.toLowerCase())
    );
  }

  // Sort cards
  filteredCards.sort((a, b) => {
    let result = 0;
    if (currentSort === "name") result = a.name.localeCompare(b.name);
    if (currentSort === "mana") result = a.manaCost - b.manaCost;
    if (currentSort === "type") result = a.type.localeCompare(b.type);
    return sortDirection === "asc" ? result : -result;
  });
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

// Render functions
function renderCards() {
  cardGallery.innerHTML = ""

  filteredCards.forEach((card) => {
    const cardElement = createCardElement(card)
    cardGallery.appendChild(cardElement)
  })
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
                    <div>
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

  // Fetch and set Scryfall data
  fetchCardData(card.name).then((cardData) => {
    // Update front image
    if (cardData.image) {
      const cardImageDiv = cardDiv.querySelector(".card-image")
      cardImageDiv.innerHTML = `<img src="${cardData.image}" alt="${card.name}" style="width:100%;height:192px;object-fit:cover;border-radius:0.5rem 0.5rem 0 0;" loading="lazy">`
    }

    // Update back with oracle text
    const oracleTextDiv = cardDiv.querySelector(".card-oracle-text")
    const backDetailsDiv = cardDiv.querySelector(".card-back-details")

    const formattedText = formatOracleText(cardData.oracleText)
    oracleTextDiv.textContent = formattedText

    // Add power/toughness for creatures
    let ptText = ""
    if (cardData.power !== null && cardData.toughness !== null) {
      ptText = `<div class="card-pt">${cardData.power}/${cardData.toughness}</div>`
    }

    // Add mana cost if available
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

function renderManaCurve() {
  const curve = {}
  let totalCards = 0
  let totalManaCost = 0

  // Calculate mana curve
  sampleDeck.cards.forEach((card) => {
    const cost = Math.min(card.manaCost, 7)
    const key = cost === 7 ? "7+" : cost.toString()
    curve[key] = (curve[key] || 0) + 1
    totalCards++
    totalManaCost += card.manaCost
  })

  const maxCount = Math.max(...Object.values(curve))
  const avgManaCost = (totalManaCost / totalCards).toFixed(1)

  // Ensure all mana costs 0-7+ are represented
  const allCosts = ["0", "1", "2", "3", "4", "5", "6", "7+"]
  allCosts.forEach((cost) => {
    if (!curve[cost]) curve[cost] = 0
  })

  // Render mana curve bars
  manaCurve.innerHTML = ""

  allCosts.forEach((cost) => {
    const count = curve[cost] || 0
    const barDiv = document.createElement("div")
    barDiv.className = "mana-bar"

    const height = maxCount > 0 ? (count / maxCount) * 100 : 0

    barDiv.innerHTML = `
      <div class="bar-container">
        <div class="bar" style="height: ${height}%"></div>
      </div>
      <div class="bar-label">${cost}</div>
      <div class="bar-count">${count}</div>
    `

    // Add hover tooltip
    barDiv.title = `${count} card${count !== 1 ? "s" : ""} with mana cost ${cost}`

    manaCurve.appendChild(barDiv)
  })

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

  // Insert stats after the mana curve
  const manaCurveSection = document.querySelector(".mana-curve-section")
  const existingStats = manaCurveSection.querySelector(".mana-curve-stats")
  if (existingStats) {
    existingStats.remove()
  }
  manaCurveSection.appendChild(statsSection)
}

function generateSampleHand() {
  // Shuffle deck and draw 7 cards
  const shuffled = [...sampleDeck.cards].sort(() => Math.random() - 0.5)
  const hand = shuffled.slice(0, 7)

  // Render sample hand
  sampleHand.innerHTML = ""

  hand.forEach((card) => {
    const handCardDiv = document.createElement("div")
    handCardDiv.className = "hand-card"

    // Add image if available
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

  // Show sample hand section
  sampleHandSection.style.display = "block"
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", init)

export type RecommendationItem = {
  id: string
  name: string
  zone: string
  details: string
  tag?: string
}

export const DHAKA_RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: "rec_1",
    name: "Banani Road 11",
    zone: "Banani",
    details: "Road 11, Block D, Banani, Dhaka",
    tag: "Popular Biriyani Hub",
  },
  {
    id: "rec_2",
    name: "Banani Kamal Ataturk Ave",
    zone: "Banani",
    details: "Kamal Ataturk Avenue, Banani, Dhaka",
    tag: "Fast 30m Delivery",
  },
  {
    id: "rec_3",
    name: "Gulshan 2 Circle & Avenue",
    zone: "Gulshan 2",
    details: "Gulshan 2 Circle, Gulshan Avenue, Dhaka",
    tag: "Diplomatic Zone",
  },
  {
    id: "rec_4",
    name: "Gulshan 1 South Avenue",
    zone: "Gulshan 1",
    details: "South Avenue, Gulshan 1, Dhaka",
    tag: "Fast 30m Delivery",
  },
  {
    id: "rec_5",
    name: "Dhanmondi Satmasjid Road",
    zone: "Dhanmondi",
    details: "Satmasjid Road, Dhanmondi 9/A, Dhaka",
    tag: "Foodie Hotspot",
  },
  {
    id: "rec_6",
    name: "Dhanmondi 27 (Rapa Plaza Area)",
    zone: "Dhanmondi",
    details: "Road 27, Dhanmondi, Dhaka",
    tag: "Biriyani Hotspot",
  },
  {
    id: "rec_7",
    name: "Dhanmondi Lake & Road 32",
    zone: "Dhanmondi",
    details: "Road 32, Dhanmondi, Dhaka",
    tag: "Popular Hub",
  },
  {
    id: "rec_8",
    name: "Uttara Sector 3 (Jasimuddin)",
    zone: "Uttara",
    details: "Sector 3, Jasimuddin Avenue, Uttara, Dhaka",
    tag: "Central Uttara",
  },
  {
    id: "rec_9",
    name: "Uttara Sector 11 & 13",
    zone: "Uttara",
    details: "Garib-e-Newaz Avenue, Sector 11/13, Uttara, Dhaka",
    tag: "Food Street",
  },
  {
    id: "rec_10",
    name: "Bashundhara R/A Block C & D",
    zone: "Bashundhara R/A",
    details: "Block C & D, Bashundhara R/A, Dhaka",
    tag: "University Zone",
  },
  {
    id: "rec_11",
    name: "Bashundhara R/A Main Gate / Kuril",
    zone: "Bashundhara R/A",
    details: "Kuril Bishwa Road / Main Gate, Bashundhara R/A, Dhaka",
    tag: "Express Delivery",
  },
  {
    id: "rec_12",
    name: "Mirpur 10 Circle & Metro",
    zone: "Mirpur",
    details: "Mirpur 10 Roundabout & MRT Station, Dhaka",
    tag: "Metro Hub",
  },
  {
    id: "rec_13",
    name: "Mirpur 2 & Stadium",
    zone: "Mirpur",
    details: "Mirpur 2, National Cricket Stadium Area, Dhaka",
    tag: "Popular Hub",
  },
  {
    id: "rec_14",
    name: "Mirpur 11 & 12 (Block B/C)",
    zone: "Mirpur",
    details: "Block B & C, Mirpur 11, Dhaka",
    tag: "Residential Hub",
  },
  {
    id: "rec_15",
    name: "Mirpur DOHS",
    zone: "Mirpur",
    details: "Mirpur DOHS Residential Area, Dhaka",
    tag: "DOHS Zone",
  },
  {
    id: "rec_16",
    name: "Mohakhali DOHS",
    zone: "Mohakhali",
    details: "Mohakhali DOHS, Dhaka",
    tag: "Express Delivery",
  },
  {
    id: "rec_17",
    name: "Mohakhali Wireless Gate",
    zone: "Mohakhali",
    details: "Wireless Gate & TB Gate, Mohakhali, Dhaka",
    tag: "Central Hub",
  },
  {
    id: "rec_18",
    name: "Mohammadpur Ring Road",
    zone: "Mohammadpur",
    details: "Ring Road, Mohammadpur, Dhaka",
    tag: "Food Street",
  },
  {
    id: "rec_19",
    name: "Mohammadpur Town Hall",
    zone: "Mohammadpur",
    details: "Town Hall & Asad Gate, Mohammadpur, Dhaka",
    tag: "Central Hub",
  },
  {
    id: "rec_20",
    name: "Lalmatia Block A-E",
    zone: "Lalmatia",
    details: "Lalmatia Residential Area, Dhaka",
    tag: "Residential",
  },
  {
    id: "rec_21",
    name: "Old Dhaka (Nazira Bazar)",
    zone: "Old Dhaka",
    details: "Nazira Bazar, Puran Dhaka (Biriyani Capital), Dhaka",
    tag: "Heritage Biriyani",
  },
  {
    id: "rec_22",
    name: "Old Dhaka (Lalbagh Fort)",
    zone: "Old Dhaka",
    details: "Lalbagh Fort Road, Old Dhaka, Dhaka",
    tag: "Heritage",
  },
  {
    id: "rec_23",
    name: "Badda & Merul Badda",
    zone: "Badda",
    details: "DIT Road, Badda, Dhaka",
    tag: "East Zone",
  },
  {
    id: "rec_24",
    name: "Baridhara Diplomatic Zone",
    zone: "Baridhara",
    details: "Park Road, Baridhara Diplomatic Zone, Dhaka",
    tag: "Diplomatic Zone",
  },
  {
    id: "rec_25",
    name: "Motijheel Commercial Area",
    zone: "Motijheel",
    details: "Dilkusha & Shapla Chattar, Motijheel, Dhaka",
    tag: "Commercial Hub",
  },
  {
    id: "rec_26",
    name: "Khilgaon Taltola",
    zone: "Khilgaon",
    details: "Taltola & Shahid Baki Road, Khilgaon, Dhaka",
    tag: "Restaurant Hub",
  },
  {
    id: "rec_27",
    name: "Bailey Road & Shantinagar",
    zone: "Shantinagar",
    details: "Bailey Road (Natok Shoroni), Shantinagar, Dhaka",
    tag: "Food & Culture",
  },
]

export function searchRecommendations(query: string): RecommendationItem[] {
  const clean = query.trim().toLowerCase()
  if (!clean) return DHAKA_RECOMMENDATIONS.slice(0, 8)

  return DHAKA_RECOMMENDATIONS.filter(
    (item) =>
      item.name.toLowerCase().includes(clean) ||
      item.zone.toLowerCase().includes(clean) ||
      item.details.toLowerCase().includes(clean) ||
      item.tag?.toLowerCase().includes(clean),
  )
}

const products = [
  {
    id: "a1e4c8b2-3f6a-4d9e-9c1b-7e2f5a8d3c41",
    image: "weartee-images/Armless 2 Piece Set.jpeg",
    name: "Armless 2 Piece Set",
    rating: { star: 4.5, count: 62 },
    price: 26000,
    category: "sets",
  },
  {
    id: "b2f5d9c3-4a7b-4e0f-8d2c-6f3e6b9d4a52",
    image: "weartee-images/Armless Ribbed Multicolored Two.jpeg",
    name: "Armless Ribbed Multicolored Two",
    rating: { star: 4.6, count: 45 },
    price: 26000,
    category: "sets",
  },
  {
    id: "c3a6e0d4-5b8c-4f1a-9e3d-7a4f7c0e5b63",
    image: "weartee-images/Buckle Down Short Sleeve Top.jpeg",
    name: "Buckle Down Short Sleeve Top",
    rating: { star: 4.7, count: 91 },
    price: 15000,
    category: "tops",
  },
  {
    id: "d4b7f1e5-6c9d-4a2b-8f4e-8b5a8d1f6c74",
    image: "weartee-images/Cambodian Stretchy Maxi Skirt.jpeg",
    name: "Cambodian Stretchy Maxi Skirt",
    rating: { star: 4.4, count: 58 },
    price: 14000,
    category: "skirts",
  },
  {
    id: "e5c8a2f6-7d0e-4b3c-9a5f-9c6b9e2a7d85",
    image: "weartee-images/Classy Vintage Off Shoulder Top.jpeg",
    name: "Classy Vintage Off Shoulder Top",
    rating: { star: 4.3, count: 37 },
    price: 15000,
    category: "tops",
  },
  {
    id: "f6d9b3a7-8e1f-4c4d-8b6a-0d7c0f3b8e96",
    image: "weartee-images/Corduroy Wide Leg Pants.jpeg",
    name: "Corduroy Wide Leg Pants",
    rating: { star: 4.5, count: 40 },
    price: 15000,
    category: "bottoms",
  },
  {
    id: "07eac4b8-9f2a-4d5e-9c7b-1e8d1a4c9fa7",
    image: "weartee-images/Denim Laced Side Capri Pants.jpeg",
    name: "Denim Laced Side Capri Pants",
    rating: { star: 4.2, count: 29 },
    price: 18000,
    category: "bottoms",
  },
  {
    id: "18fbd5c9-0a3b-4e6f-8d8c-2f9e2b5d0ab8",
    image: "weartee-images/Fake Two Piece Lace Bottom Top.jpeg",
    name: "Fake Two Piece Lace Bottom Top",
    rating: { star: 4.6, count: 73 },
    price: 12000,
    category: "tops",
  },
  {
    id: "29ace6d0-1b4c-4f7a-9e9d-3a0f3c6e1bc9",
    image: "weartee-images/Long Sleeve Bow Top.jpeg",
    name: "Long Sleeve Bow Top",
    rating: { star: 4.4, count: 51 },
    price: 15000,
    category: "tops",
  },
  {
    id: "3abdf7e1-2c5d-4a8b-8f0e-4b1a4d7f2cda",
    image: "weartee-images/Long sleeve button down shirt drawstring back.jpeg",
    name: "Long Sleeve Button Down Shirt Drawstring Back",
    rating: { star: 4.5, count: 64 },
    price: 15000,
    category: "tops",
  },
  {
    id: "6deac0b4-5f8a-4d1e-9c3b-7e4d7a0c5f0d",
    image: "weartee-images/Long Sleeve Lace Corset Top.jpeg",
    name: "Long Sleeve Lace Corset Top",
    rating: { star: 4.3, count: 33 },
    price: 13000,
    category: "tops",
  },
  {
    id: "7efbd1c5-6a9b-4e2f-8d4c-8f5e8b1d6a1e",
    image: "weartee-images/Long Sleeve Mesh Maxi Dress.jpeg",
    name: "Long Sleeve Mesh Maxi Dress",
    rating: { star: 4.4, count: 39 },
    price: 23000,
    category: "dresses",
  },
  {
    id: "8f0ce2d6-7b0c-4f3a-9e5d-9a6f9c2e7b2f",
    image: "weartee-images/Long Sleeve Wrap Top.jpeg",
    name: "Long Sleeve Wrap Top",
    rating: { star: 4.2, count: 26 },
    price: 15000,
    category: "tops",
  },
  {
    id: "901df3e7-8c1d-4a4b-8f6e-0b7a0d3f8c30",
    image: "weartee-images/Long Sleeved Mesh Maxi Dress.jpeg",
    name: "Long Sleeved Maxi Dress",
    rating: { star: 4.5, count: 55 },
    price: 23000,
    category: "dresses",
  },
  {
    id: "a12ea4f8-9d2e-4b5c-9a7f-1c8b1e4a9d41",
    image: "weartee-images/Matching 2 Piece Set.jpeg",
    name: "Matching 2 Piece Set",
    rating: { star: 4.7, count: 68 },
    price: 23000,
    category: "sets",
  },
  {
    id: "b23fb5a9-0e3f-4c6d-8b8a-2d9c2f5b0e52",
    image: "weartee-images/Maxi Mesh Skirt.jpeg",
    name: "Maxi Mesh Skirt",
    rating: { star: 4.6, count: 60 },
    price: 15000,
    category: "skirts",
  },
  {
    id: "c340c6ba-1f4a-4d7e-9c9b-3e0d3a6c1f63",
    image: "weartee-images/Off Shoulder Two piece basic set.jpeg",
    name: "Off Shoulder Two Piece Basic Set",
    rating: { star: 4.5, count: 44 },
    price: 24000,
    category: "sets",
  },
  {
    id: "d451d7cb-2a5b-4e8f-8d0c-4f1e4b7d2a74",
    image: "weartee-images/Open side Bow Tie design joggers.jpeg",
    name: "Open Side Bow Tie Design Joggers",
    rating: { star: 4.4, count: 41 },
    price: 15000,
    category: "bottoms",
  },
  {
    id: "e562e8dc-3b6c-4f9a-9e1d-5a2f5c8e3b85",
    image: "weartee-images/Plaid Armless Shirt.jpeg",
    name: "Plaid Armless Shirt",
    rating: { star: 4.6, count: 57 },
    price: 18000,
    category: "tops",
  },
  {
    id: "f673f9ed-4c7d-4a0b-8f2e-6b3a6d9f4c96",
    image: "weartee-images/Polka Dot Maxi Skirt and 3in1 Sleeveless Top.jpeg",
    name: "Polka Dot Maxi Skirt and 3in1 Sleeveless Top",
    rating: { star: 4.3, count: 35 },
    price: 23000,
    category: "sets",
  },
  {
    id: "0784a0fe-5d8e-4b1c-9a3f-7c4b7e0a5da7",
    image: "weartee-images/Ribbed Multicolored Short Sleeve Top.jpeg",
    name: "Ribbed Multicolored Short Sleeve Top",
    rating: { star: 4.5, count: 49 },
    price: 15000,
    category: "tops",
  },
  {
    id: "1895b1af-6e9f-4c2d-8b4a-8d5c8f1b6eb8",
    image: "weartee-images/Scrunched waist laced bottom short sleeve Top.jpeg",
    name: "Scrunched Waist Laced Bottom Short Sleeve Top",
    rating: { star: 4.4, count: 31 },
    price: 15000,
    category: "tops",
  },
  {
    id: "29a6c2b0-7f0a-4d3e-9c5b-9e6d9a2c7fc9",
    image: "weartee-images/Scrunched waist midi dress.jpeg",
    name: "Scrunched Waist Midi Dress",
    rating: { star: 4.5, count: 43 },
    price: 23000,
    category: "dresses",
  },
  {
    id: "3ab7d3c1-8a1b-4e4f-8d6c-0f7e0b3d8a0a",
    image: "weartee-images/Sleeveless Maxi Polka Dot Dress.jpeg",
    name: "Sleeveless Maxi Polka Dot Dress",
    rating: { star: 4.6, count: 52 },
    price: 25000,
    category: "dresses",
  },
  {
    id: "4bc8e4d2-9b2c-4f5a-9e7d-1a8f1c4e9b1b",
    image: "weartee-images/Sleeveless Mesh Dress.jpeg",
    name: "Sleeveless Mesh Dress",
    rating: { star: 4.3, count: 28 },
    price: 25000,
    category: "dresses",
  },
  {
    id: "5cd9f5e3-0c3d-4a6b-8f8e-2b9a2d5f0c2c",
    image: "weartee-images/Slim Waist Wide legged pant.jpeg",
    name: "Slim Waist Wide Legged Pant",
    rating: { star: 4.4, count: 36 },
    price: 15000,
    category: "bottoms",
  },
  {
    id: "6dea06f4-1d4e-4b7c-9a9f-3c0b3e6a1d3d",
    image: "weartee-images/Slitted Short Sleeve Maxi Dress.jpeg",
    name: "Slitted Short Sleeve Maxi Dress",
    rating: { star: 4.5, count: 42 },
    price: 22000,
    category: "dresses",
  },
  {
    id: "7efb17a5-2e5f-4c8d-8b0a-4d1c4f7b2e4e",
    image: "weartee-images/Spaghetti Strap Drawstring Waist Midi Dress.jpeg",
    name: "Spaghetti Strap Drawstring Waist Midi Dress",
    rating: { star: 4.4, count: 34 },
    price: 25000,
    category: "dresses",
  },
  {
    id: "8f0c28b6-3f6a-4d9e-9c1b-5e2d5a8c3f5f",
    image: "weartee-images/Spaghetti Strap Midi Dress Slim Waist.jpeg",
    name: "Spaghetti Strap Midi Dress Slim Waist",
    rating: { star: 4.6, count: 50 },
    price: 25000,
    category: "dresses",
  },
  {
    id: "901d39c7-4a7b-4e0f-8d2c-6f3e6b9d4a60",
    image: "weartee-images/Stripped Maxi 2skirt.jpeg",
    name: "Striped Maxi Skirt",
    rating: { star: 4.3, count: 27 },
    price: 15000,
    category: "skirts",
  },
  {
    id: "a12e4ad8-5b8c-4f1a-9e3d-7a4f7c0e5b71",
    image: "weartee-images/Stripped maxi skirt.jpeg",
    name: "Stripped Maxi Skirt",
    rating: { star: 4.5, count: 38 },
    price: 8000,
    category: "skirts",
  },
  {
    id: "b23f5be9-6c9d-4a2b-8f4e-8b5a8d1f6c82",
    image: "weartee-images/Two Piece Midi Skirt and Tank Top set.jpeg",
    name: "Two Piece Midi Skirt and Tank Top Set",
    rating: { star: 4.4, count: 46 },
    price: 23000,
    category: "sets",
  },
  {
    id: "4d6b7adc-3c6f-4e1b-8a4d-7f0c3e6b1a2c",
    image: "weartee-images/Slim Strapped classy 2 piece set.jpeg",
    name: "Slim Strapped Classy 2 Piece Set",
    rating: { star: 4.5, count: 69 },
    price: 25000,
    category: "sets",
  },
  {
    id: "5e7c8bed-4d7a-4f2c-9b5e-8a1d4f7c2b3d",
    image: "weartee-images/Stripped Long Sleeve off Shoulder Basic 2 piece set.jpeg",
    name: "Stripped Long Sleeve Off Shoulder Basic 2 Piece Set",
    rating: { star: 4.5, count: 112 },
    price: 25000,
    category: "sets",
  },
  {
    id: "f81c25e7-8d1a-4f6c-9b9e-2a5d8f1c6bd7",
    image: "weartee-images/Saint meri leopard short sleeve round neck top.jpeg",
    name: "Saint Meri Leopard Short Sleeve Round Neck Top",
    rating: { star: 4.5, count: 87 },
    price: 15000,
    category: "tops",
  },
  {
    id: "b4d8e1a3-4f7c-4b2e-9d5a-8c1f4b7e2d93",
    image: "weartee-images/Long Sleeve button up shirt-brown.jpeg",
    name: "Long Sleeve Button Up Shirt - Brown",
    rating: { star: 4.5, count: 47 },
    price: 15000,
    category: "tops",
  },
  {
    id: "c5e9f2b4-5a8d-4c3f-8e6b-9d2a5c8f3ea4",
    image: "weartee-images/Long sleeve round neck biker top.jpeg",
    name: "Long Sleeve Round Neck Biker Top",
    rating: { star: 4.6, count: 55 },
    price: 15000,
    category: "tops",
  },
  {
    id: "d6fa03c5-6b9e-4d4a-9f7c-0e3b6d9a4fb5",
    image: "weartee-images/Long sleeve button up shirt black.jpeg",
    name: "Long Sleeve Button Up Shirt - Black",
    rating: { star: 4.4, count: 38 },
    price: 15000,
    category: "tops",
  },
  {
    id: "e70b14d6-7c0f-4e5b-8a8d-1f4c7e0b5ac6",
    image: "weartee-images/long sleeve graphics round neck top.jpeg",
    name: "Long Sleeve Graphics Round Neck Top",
    rating: { star: 4.3, count: 29 },
    price: 15000,
    category: "tops",
  },
  {
    id: "092d36f8-9e2b-4a7d-8c0f-3b6e9a2d7ce8",
    image: "weartee-images/Love neck shaped top.jpeg",
    name: "Love Neck Shaped Top",
    rating: { star: 4.6, count: 61 },
    price: 9000,
    category: "tops",
  },
  {
    id: "1a3e47a9-0f3c-4b8e-9d1a-4c7f0b3e8df9",
    image: "weartee-images/Long sleeve basic top - blue.jpeg",
    name: "Long Sleeve Basic Top - Blue",
    rating: { star: 4.4, count: 33 },
    price: 10000,
    category: "tops",
  },
  {
    id: "2b4f58ba-1a4d-4c9f-8e2b-5d8a1c4f9e0a",
    image: "weartee-images/Long sleeve basic top - onion color.jpeg",
    name: "Long Sleeve Basic Top - Onion",
    rating: { star: 4.3, count: 25 },
    price: 10000,
    category: "tops",
  },
  {
    // CONFIRM: which pink file is this, and is it a separate SKU or a dupe of the one below?
    id: "3c5a69cb-2b5e-4d0a-9f3c-6e9b2d5a0f1b",
    image: "weartee-images/Long sleeve basic top-pink.jpeg",
    name: "Long Sleeve Basic Top - Pink",
    rating: { star: 4.5, count: 42 },
    price: 10000,
    category: "tops",
  },
  {
    // CONFIRM: second pink file — delete this block if it's a duplicate you don't need live
    id: "6f8b7ac1-3e6d-4b9f-8a2c-7d4e8b1f6a5d",
    image: "weartee-images/Long sleeve basic top-pink (2).jpeg",
    name: "Long Sleeve Basic Top - Pink (V2)",
    rating: { star: 4.5, count: 20 },
    price: 10000,
    category: "tops",
  },
  {
    // CONFIRM: price — this "Abunai Brand Club" top wasn't in your priced list, guessed at 15000
    id: "9c1d8ba2-4f7e-4c0a-9b3d-8e5f9c2a7b6e",
    image: "weartee-images/Long sleeve round neck top.jpeg",
    name: "Long Sleeve Round Neck Top",
    rating: { star: 4.4, count: 30 },
    price: 15000,
    category: "tops",
  },
];

/* ------------------------------------------------------------------
 * EDIT ME: sizes & colors per product.
 * Every product below gets the DEFAULT_SIZES / default color ("multi")
 * unless you add an entry here keyed by product id, e.g.
 *   COLOR_OVERRIDES["a1e4c8b2-3f6a-4d9e-9c1b-7e2f5a8d3c41"] = ["pink","brown"];
 * ------------------------------------------------------------------ */
const DEFAULT_SIZES = ["S", "M", "L", "XL"];
const COLOR_OVERRIDES = {
  "f6d9b3a7-8e1f-4c4d-8b6a-0d7c0f3b8e96": ["brown"], // Corduroy Wide Leg Pants
  "07eac4b8-9f2a-4d5e-9c7b-1e8d1a4c9fa7": ["blue"], // Denim Laced Side Capri Pants
};

const SIZE_OVERRIDES = {};

products.forEach((p, i) => {
  p.sizes = SIZE_OVERRIDES[p.id] || [...DEFAULT_SIZES];
  p.colors = COLOR_OVERRIDES[p.id] || ["multi"];
  p.isNew = i >= products.length - 8;
  p.image = String(p.image || "").replace(/ /g, "%20");
  p._index = i;
});

const CATEGORIES = [
  { slug: "tops", label: "Tops" },
  { slug: "dresses", label: "Dresses" },
  { slug: "sets", label: "Two-Piece Sets" },
  { slug: "skirts", label: "Skirts" },
  { slug: "bottoms", label: "Bottoms" },
];

const COLOR_SWATCHES = {
  pink: "#E5A4B3",
  brown: "#7A5443",
  black: "#2B2320",
  white: "#F6F1EC",
  beige: "#D9C4B0",
  blue: "#7C93A6",
  multi: "linear-gradient(135deg,#E5A4B3 0%,#7A5443 100%)",
};

const SHIPPING_FEE = 3500;
const FREE_SHIPPING_THRESHOLD = 50000;

const SHIPPING_BY_STATE = {
  Lagos: 2500,
  Ogun: 3000,
  Oyo: 3500,
  Osun: 3500,
  Ondo: 3500,
  Ekiti: 3500,
  Edo: 4000,
  Delta: 4000,
  Rivers: 4000,
  Bayelsa: 4500,
  Anambra: 4000,
  Enugu: 4000,
  Abia: 4000,
  Imo: 4000,
  Ebonyi: 4000,
  "Cross River": 4500,
  "Akwa Ibom": 4500,
  "Abuja FCT": 4000,
  Kwara: 4000,
  Kogi: 4000,
  Benue: 4500,
  Nasarawa: 4500,
  Plateau: 4500,
  Niger: 4500,
  Taraba: 5000,
  Kaduna: 5000,
  Kano: 5000,
  Katsina: 5500,
  Jigawa: 5500,
  Bauchi: 5000,
  Gombe: 5000,
  Yobe: 5500,
  Borno: 5500,
  Sokoto: 5500,
  Kebbi: 5500,
  Zamfara: 5500,
  Adamawa: 5000,
};

function shippingFeeForState(stateName, subtotal) {
  const sub = Number(subtotal) || 0;
  if (sub <= 0) return 0;
  if (sub >= FREE_SHIPPING_THRESHOLD) return 0;
  const key = String(stateName || "").trim();
  if (key && SHIPPING_BY_STATE[key] != null) return SHIPPING_BY_STATE[key];
  return SHIPPING_FEE;
}

function formatPrice(n) {
  return "\u20A6" + Number(n).toLocaleString("en-NG");
}

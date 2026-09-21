const demos = {
  hamburguesas: {
    brand: "Fuego Burger", kicker: "HECHO AL MOMENTO", title: "Antojo sin rodeos.",
    description: "Hamburguesas, combos y extras listos para pedir.", image: "/assets/demo-gallery/hamburguesa-huevo.webp", accent: "#f1cb55",
    products: [["La clásica",129],["Doble cheese",169],["Especial con huevo",179],["Combo para dos",319]],
  },
  alitas: {
    brand: "Wing Club", kicker: "ELIGE TU SALSA", title: "Más fuego. Más sabor.",
    description: "Alitas, boneless, papas y bebidas para compartir.", image: "/assets/demo-gallery/alitas-buffalo.webp", accent: "#ef6c44",
    products: [["Buffalo clásico",149],["Mango habanero",159],["BBQ ahumado",149],["Paquete Wing Club",329]],
  },
  pizza: {
    brand: "Forno 27", kicker: "MASA LENTA · HORNO FUERTE", title: "La noche pide pizza.",
    description: "Pizzas artesanales, entradas y paquetes para todos.", image: "/assets/demo-gallery/pizza-pepperoni.webp", accent: "#e7b72f",
    products: [["Pepperoni",189],["Cuatro quesos",219],["Prosciutto",249],["Paquete familiar",399]],
  },
  abarrotes: {
    brand: "La Esquina", kicker: "LO DE TODOS LOS DÍAS", title: "Tu despensa, más cerca.",
    description: "Productos básicos organizados para comprar sin perder tiempo.", image: "/assets/demo-gallery/abarrotes-estantes.webp", accent: "#76924f",
    products: [["Despensa básica",499],["Frutas y verduras",189],["Limpieza del hogar",239],["Bebidas y botanas",179]],
  },
  tenis: {
    brand: "Drop 01", kicker: "NUEVA COLECCIÓN", title: "Pisa diferente.",
    description: "Modelos, tallas y colores en una tienda visual y directa.", image: "/assets/demo-gallery/tenis-adidas.webp", accent: "#6d5ce7",
    products: [["Runner One",1299],["Street Low",1499],["Court Classic",1699],["Essential Black",1399]],
  },
  dulceria: {
    brand: "Sugar Lab", kicker: "MEZCLA TU ANTOJO", title: "Color que se come.",
    description: "Cajas, mezclas y regalos dulces para cualquier ocasión.", image: "/assets/demo-gallery/dulces-envolturas.webp", accent: "#e9539d",
    products: [["Caja alegría",249],["Mix enchilado",129],["Gomitas clásicas",99],["Regalo Sugar Lab",349]],
  },
  muebles: {
    brand: "Forma Casa", kicker: "PIEZAS PARA VIVIR", title: "Tu espacio, a tu manera.",
    description: "Muebles y objetos con medidas, acabados y cotización clara.", image: "/assets/demo-gallery/muebles-1.webp", accent: "#8a6b50",
    products: [["Sillón Nube",8490],["Mesa Centro",3290],["Lámpara Arco",2190],["Comedor Roble",12900]],
  },
  ferreteria: {
    brand: "Punto Fijo", kicker: "TODO PARA HACERLO BIEN", title: "La herramienta correcta.",
    description: "Productos por categoría, ficha técnica y existencias visibles.", image: "/assets/demo-gallery/ferreteria-1.webp", accent: "#526777",
    products: [["Taladro 20V",1899],["Juego de llaves",749],["Caja de herramientas",1199],["Esmeril angular",1399]],
  },
  postres: {
    brand: "Miel & Miga", kicker: "HORNEADO PARA TI", title: "Un final más dulce.",
    description: "Pasteles y postres con tamaños, sabores y pedidos especiales.", image: "/assets/demo-gallery/pasteleria-3.webp", accent: "#bc775a",
    products: [["Pastel de chocolate",549],["Cheesecake frutos rojos",489],["Caja de brownies",279],["Pastel personalizado",699]],
  },
  perfumeria: {
    brand: "Essenza", kicker: "ENCUENTRA TU ESENCIA", title: "Deja tu señal.",
    description: "Fragancias organizadas por familias, notas y ocasiones.", image: "/assets/demo-gallery/perfumes-1.webp", accent: "#947a54",
    products: [["Aura floral",899],["Bois intense",1099],["Cítrico 07",849],["Set descubrimiento",499]],
  },
};

const viewer = document.querySelector("#demo-viewer");
const viewerShell = viewer?.querySelector(".viewer-shell");
const productHost = viewer?.querySelector("[data-viewer-products]");
const cartCount = viewer?.querySelector("[data-cart-count]");
const cartTotal = viewer?.querySelector("[data-cart-total]");
const orderButton = viewer?.querySelector("[data-demo-order]");
let activeDemo = null;
let cart = [];

function money(value) {
  return `$${value.toLocaleString("es-MX")} MXN`;
}

function renderCart() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  if (cartCount) cartCount.textContent = String(cart.length);
  if (cartTotal) cartTotal.textContent = money(total);
  if (orderButton) {
    orderButton.disabled = cart.length === 0;
    orderButton.textContent = cart.length ? "Ver pedido de prueba →" : "Agrega un producto para continuar";
  }
}

function openDemo(key, updateUrl = true) {
  const demo = demos[key];
  if (!viewer || !demo) return;
  activeDemo = key;
  cart = [];
  viewer.style.setProperty("--demo-accent", demo.accent);
  viewer.querySelector("[data-viewer-brand]").textContent = demo.brand;
  viewer.querySelector("[data-viewer-kicker]").textContent = demo.kicker;
  viewer.querySelector("[data-viewer-title]").textContent = demo.title;
  viewer.querySelector("[data-viewer-description]").textContent = demo.description;
  const image = viewer.querySelector("[data-viewer-image]");
  image.src = demo.image;
  image.alt = `${demo.brand} · ${demo.title}`;
  productHost.innerHTML = demo.products.map(([name, price], index) => `
    <article class="viewer-product">
      <img src="${demo.image}" alt="" />
      <span>0${index + 1}</span>
      <h4>${name}</h4>
      <p>${money(price)}</p>
      <button type="button" data-add-product="${index}">Agregar +</button>
    </article>`).join("");
  renderCart();
  if (!viewer.open) viewer.showModal();
  viewerShell.scrollTop = 0;
  if (updateUrl) history.replaceState(null, "", `${location.pathname}?demo=${key}`);
}

function closeDemo() {
  viewer?.close();
  activeDemo = null;
  history.replaceState(null, "", location.pathname);
}

document.querySelectorAll("[data-open-demo]").forEach((button) => {
  button.addEventListener("click", () => openDemo(button.dataset.openDemo));
});

viewer?.querySelector("[data-close-demo]")?.addEventListener("click", closeDemo);
viewer?.addEventListener("cancel", (event) => { event.preventDefault(); closeDemo(); });
viewer?.addEventListener("click", (event) => { if (event.target === viewer) closeDemo(); });
productHost?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");
  if (!button || !activeDemo) return;
  const [name, price] = demos[activeDemo].products[Number(button.dataset.addProduct)];
  cart.push({ name, price });
  button.textContent = "Agregado ✓";
  renderCart();
});
orderButton?.addEventListener("click", () => {
  if (!cart.length) return;
  orderButton.textContent = `Pedido de prueba listo · ${cart.length} productos ✓`;
});

const requestedDemo = new URLSearchParams(location.search).get("demo");
if (requestedDemo && demos[requestedDemo]) openDemo(requestedDemo, false);

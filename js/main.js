console.log("js connected");

/* ---------- storage helpers (index + iframe pages share same origin) ---------- */
const DB = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch(e){ return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
const getUsers    = () => DB.get("users", []);
const getCart     = () => DB.get("cart", []);
const currentUser = () => DB.get("currentUser", null);

/* ---------- top bar: user name + cart count ---------- */
function refreshTopBar(){
  let top;
  try { top = window.top; top.document; } catch(e){ return; }
  const badge = top.document.getElementById("cartCount");
  if (badge) badge.textContent = getCart().reduce((s,i)=>s+i.qty,0);
  const box = top.document.getElementById("userBox");
  if (box){
    const u = currentUser();
    box.innerHTML = u ? `Hi, ${u.fullname.split(" ")[0]} <button class="secondary" id="logoutTop">Logout</button>` : "";
    const b = top.document.getElementById("logoutTop");
    if (b) b.onclick = () => { DB.set("currentUser", null); refreshTopBar(); };
  }
}
document.addEventListener("DOMContentLoaded", refreshTopBar);

function toast(msg){
  let t = document.getElementById("toast");
  if(!t){ t = document.createElement("div"); t.id="toast"; t.className="toast"; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = "block";
  setTimeout(()=> t.style.display = "none", 1800);
}

/* ---------- REGISTRATION ---------- */
function initRegistration(){
  const f = document.getElementById("regForm"); if(!f) return;
  f.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const err = document.getElementById("regErr"); err.textContent = "";
    document.getElementById("regOk").textContent = "";
    if (!/^\d{10}$/.test(d.phone)) return err.textContent = "Phone number 10 digits ka hona chahiye.";
    if (d.password.length < 6)     return err.textContent = "Password kam se kam 6 characters ka rakho.";
    if (d.password !== d.confirm)  return err.textContent = "Password aur confirm password match nahi kar rahe.";
    const users = getUsers();
    if (users.some(u => u.username === d.username)) return err.textContent = "Ye username pehle se le liya gaya hai.";
    delete d.confirm; users.push(d); DB.set("users", users);
    f.reset();
    document.getElementById("regOk").textContent = "Registration ho gaya! Ab Login page se login karo.";
  });
}

/* ---------- LOGIN ---------- */
function initLogin(){
  const f = document.getElementById("loginForm"); if(!f) return;
  const status = document.getElementById("loggedIn");
  function render(){
    const u = currentUser();
    f.style.display = u ? "none" : "block";
    status.style.display = u ? "block" : "none";
    if (u) document.getElementById("welcomeName").textContent = u.fullname;
    refreshTopBar();
  }
  f.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const u = getUsers().find(x => x.username === d.username && x.password === d.password);
    const err = document.getElementById("loginErr");
    if (!u) return err.textContent = "Username ya password galat hai. Pehle register karo.";
    err.textContent = ""; DB.set("currentUser", u); f.reset(); render();
  });
  document.getElementById("logoutBtn").onclick = () => { DB.set("currentUser", null); render(); };
  render();
}

/* ---------- CATALOGUE ---------- */
function addToCart(btn){
  const b = btn.closest(".book");
  const item = { id: b.dataset.id, name: b.dataset.name, price: parseFloat(b.dataset.price) };
  const cart = getCart();
  const found = cart.find(i => i.id === item.id);
  found ? found.qty++ : cart.push({ ...item, qty: 1 });
  DB.set("cart", cart); refreshTopBar(); toast(item.name + " cart me add ho gayi");
}
function initCatalogue(){
  document.querySelectorAll(".add-btn").forEach(b => b.addEventListener("click", () => addToCart(b)));
}

/* ---------- CART ---------- */
function initCart(){
  const body = document.getElementById("cartBody"); if(!body) return;
  function render(){
    const cart = getCart();
    document.getElementById("cartTable").style.display = cart.length ? "table" : "none";
    document.getElementById("emptyMsg").style.display = cart.length ? "none" : "block";
    document.getElementById("totalRow").style.display = cart.length ? "block" : "none";
    body.innerHTML = cart.map((i,idx)=>`
      <tr><td>${i.name}</td><td>$${i.price.toFixed(2)}</td>
      <td><input type="number" min="1" value="${i.qty}" data-i="${idx}" class="qty"></td>
      <td>$${(i.price*i.qty).toFixed(2)}</td>
      <td><button class="secondary rm" data-i="${idx}">Remove</button></td></tr>`).join("");
    document.getElementById("total").textContent = cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2);
    body.querySelectorAll(".qty").forEach(el => el.onchange = () => {
      const c = getCart(); c[el.dataset.i].qty = Math.max(1, parseInt(el.value)||1); DB.set("cart", c); render(); refreshTopBar();
    });
    body.querySelectorAll(".rm").forEach(el => el.onclick = () => {
      const c = getCart(); c.splice(el.dataset.i,1); DB.set("cart", c); render(); refreshTopBar();
    });
  }
  document.getElementById("checkout").onclick = () => {
    if (!currentUser()) return toast("Checkout ke liye pehle login karo");
    DB.set("cart", []); render(); refreshTopBar(); toast("Order place ho gaya! Dhanyavaad.");
  };
  document.getElementById("clearCart").onclick = () => { DB.set("cart", []); render(); refreshTopBar(); };
  render();
}

initRegistration(); initLogin(); initCatalogue(); initCart();

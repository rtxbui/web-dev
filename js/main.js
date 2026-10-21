console.log("js connected");

/* ---- localStorage helpers (index and all iframe pages share the same origin) ---- */
const DB = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch(e){ return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
const getUsers = () => DB.get("users", []);
const getCart  = () => DB.get("cart", []);
const getUser  = () => DB.get("currentUser", null);

/* ---- nav bar: Cart (n) and Login/Logout text ---- */
function refreshNav(){
  let top; try { top = window.top; top.document; } catch(e){ return; }
  const cart = top.document.getElementById("cartLink");
  if (cart){ const n = getCart().reduce((s,i)=>s+i.qty,0); cart.textContent = n ? "Cart (" + n + ")" : "Cart"; }
  const login = top.document.getElementById("loginLink");
  if (login){ const u = getUser(); login.textContent = u ? "Logout (" + u.username + ")" : "Login"; }
}
document.addEventListener("DOMContentLoaded", refreshNav);

function toast(msg){
  let t = document.getElementById("toast");
  if (!t){ t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = "block";
  clearTimeout(t._h); t._h = setTimeout(() => t.style.display = "none", 1800);
}

/* ---- REGISTRATION ---- */
(function(){
  const f = document.getElementById("regForm"); if (!f) return;
  const err = document.getElementById("regErr"), ok = document.getElementById("regOk");
  f.addEventListener("submit", e => {
    e.preventDefault(); err.textContent = ""; ok.textContent = "";
    const d = Object.fromEntries(new FormData(f));
    if (!d.gender)                 return err.textContent = "Gender select karo.";
    if (!/^\d{10}$/.test(d.phone)) return err.textContent = "Phone number 10 digits ka hona chahiye.";
    if (d.password.length < 6)     return err.textContent = "Password kam se kam 6 characters ka rakho.";
    if (d.password !== d.confirm)  return err.textContent = "Password aur confirm password match nahi kar rahe.";
    const users = getUsers();
    if (users.some(u => u.username === d.username)) return err.textContent = "Ye username pehle se le liya gaya hai.";
    delete d.confirm; users.push(d); DB.set("users", users);
    f.reset(); ok.textContent = "Registration ho gaya! Ab Login page se login karo.";
  });
  f.addEventListener("reset", () => { err.textContent = ""; ok.textContent = ""; });
})();

/* ---- LOGIN ---- */
(function(){
  const f = document.getElementById("loginForm"); if (!f) return;
  const box = document.getElementById("loggedIn"), err = document.getElementById("loginErr");
  function render(){
    const u = getUser();
    f.style.display = u ? "none" : "block"; box.style.display = u ? "block" : "none";
    if (u) document.getElementById("who").textContent = u.fullname;
    refreshNav();
  }
  f.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const u = getUsers().find(x => x.username === d.username && x.password === d.password);
    if (!u) return err.textContent = "Username ya password galat hai. Pehle register karo.";
    err.textContent = ""; DB.set("currentUser", u); f.reset(); render();
  });
  f.addEventListener("reset", () => err.textContent = "");
  document.getElementById("logoutBtn").onclick = () => { DB.set("currentUser", null); render(); };
  render();
})();

/* ---- CATALOGUE: Add to cart ---- */
document.querySelectorAll(".add-btn").forEach(btn => btn.addEventListener("click", () => {
  const b = btn.closest(".book");
  const cart = getCart(), id = b.dataset.id;
  const found = cart.find(i => i.id === id);
  found ? found.qty++ : cart.push({ id, name: b.dataset.name, price: parseFloat(b.dataset.price), qty: 1 });
  DB.set("cart", cart); refreshNav(); toast(b.dataset.name + " cart me add ho gayi");
}));

/* ---- CART ---- */
(function(){
  const body = document.getElementById("cartBody"); if (!body) return;
  const $ = id => document.getElementById(id);
  function render(){
    const cart = getCart(), has = cart.length > 0;
    $("cartTable").style.display = has ? "table" : "none";
    $("emptyMsg").style.display  = has ? "none" : "block";
    $("cartFoot").style.display  = has ? "block" : "none";
    body.innerHTML = cart.map((i, n) => `<tr><td>${i.name}</td><td>$${i.price.toFixed(2)}</td>
      <td><input type="number" min="1" value="${i.qty}" class="qty" data-n="${n}"></td>
      <td>$${(i.price * i.qty).toFixed(2)}</td>
      <td><button class="light rm" data-n="${n}">Remove</button></td></tr>`).join("");
    $("total").textContent = cart.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2);
    body.querySelectorAll(".qty").forEach(el => el.onchange = () => {
      const c = getCart(); c[el.dataset.n].qty = Math.max(1, parseInt(el.value) || 1); DB.set("cart", c); render(); refreshNav(); });
    body.querySelectorAll(".rm").forEach(el => el.onclick = () => {
      const c = getCart(); c.splice(el.dataset.n, 1); DB.set("cart", c); render(); refreshNav(); });
  }
  $("checkout").onclick = () => {
    if (!getUser()) return toast("Checkout ke liye pehle Login karo");
    DB.set("cart", []); render(); refreshNav(); toast("Order place ho gaya. Dhanyavaad!");
  };
  $("clearCart").onclick = () => { DB.set("cart", []); render(); refreshNav(); };
  render();
})();

"use client";

import { useState } from "react";
import { Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, Boxes, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command, Download, LayoutDashboard, LifeBuoy, LogOut, MoreHorizontal, Package, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Truck, Warehouse, X } from "lucide-react";

type Product = { name: string; sku: string; category: string; stock: number; warehouse: string; status: "Healthy" | "Low stock" | "Out of stock"; color: string };
const products: Product[] = [
  { name: "Everyday Ceramic Mug", sku: "MUG-001", category: "Home & living", stock: 284, warehouse: "Brooklyn, NY", status: "Healthy", color: "bg-[#d7e5d5]" },
  { name: "Canvas Market Tote", sku: "BAG-014", category: "Accessories", stock: 18, warehouse: "Brooklyn, NY", status: "Low stock", color: "bg-[#e6ddcf]" },
  { name: "Linen Table Runner", sku: "LIN-009", category: "Home & living", stock: 142, warehouse: "Austin, TX", status: "Healthy", color: "bg-[#e8d8d0]" },
  { name: "Stoneware Pour Over", sku: "KIT-032", category: "Kitchen", stock: 0, warehouse: "Austin, TX", status: "Out of stock", color: "bg-[#dce0e8]" },
  { name: "Recycled Wool Throw", sku: "TXT-008", category: "Textiles", stock: 67, warehouse: "Portland, OR", status: "Healthy", color: "bg-[#e1d7e5]" },
  { name: "Amber Glass Bottle", sku: "BOT-021", category: "Wellness", stock: 12, warehouse: "Brooklyn, NY", status: "Low stock", color: "bg-[#eadcbe]" },
];
const movements = [
  { title: "Order #ORD-1084 reserved", detail: "2 × Everyday Ceramic Mug · Brooklyn", time: "12 min ago", type: "out" },
  { title: "Stock received", detail: "48 × Linen Table Runner · Austin", time: "46 min ago", type: "in" },
  { title: "Transfer completed", detail: "12 × Amber Glass Bottle · Austin → Brooklyn", time: "2 hours ago", type: "transfer" },
];
const nav = [{ label: "Overview", icon: LayoutDashboard }, { label: "Inventory", icon: Package }, { label: "Orders", icon: Truck }, { label: "Warehouses", icon: Warehouse }, { label: "Activity log", icon: Activity }];

export function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [warehouse, setWarehouse] = useState("All warehouses");
  const filtered = products.filter(p => (p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())) && (warehouse === "All warehouses" || p.warehouse.includes(warehouse)));
  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2800); };
  return <div className="app-grid min-h-screen p-3 sm:p-5 lg:p-7">
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1480px] overflow-hidden rounded-[22px] border border-[#e6eae2] bg-white shadow-[0_16px_70px_rgba(35,57,47,.07)]">
      <aside className="hidden w-[238px] shrink-0 flex-col border-r border-[#edf0eb] bg-[#fcfdfb] px-4 py-5 lg:flex">
        <div className="flex items-center gap-2.5 px-2 pb-8"><div className="flex size-9 items-center justify-center rounded-xl bg-[#174f40] text-[#d5f178]"><Boxes size={20}/></div><div><div className="text-[15px] font-bold tracking-tight">stockroom</div><div className="text-[10px] font-medium tracking-[.18em] text-[#89958e]">INVENTORY, IN SYNC</div></div></div>
        <button className="mb-7 flex items-center gap-2.5 rounded-xl border border-[#e8ece5] bg-white px-3 py-2.5 text-left shadow-sm"><div className="flex size-8 items-center justify-center rounded-lg bg-[#e9f2e8] text-xs font-bold text-[#32765c]">N</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">Northstar Goods</div><div className="text-[10px] text-[#89958e]">Free plan · 3 locations</div></div><ChevronDown size={14} className="text-[#89958e]"/></button>
        <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#a2aaa4]">Workspace</div>
        <nav className="space-y-1">{nav.map(({label,icon:Icon})=><button key={label} onClick={()=>setActive(label)} className={`sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium ${active===label?"bg-[#eef5ec] text-[#1c684e]":"text-[#68756e]"}`}><Icon size={17} strokeWidth={1.8}/>{label}{label==="Orders"&&<span className="ml-auto rounded-full bg-[#f0f2ed] px-2 py-0.5 text-[10px] text-[#748078]">8</span>}</button>)}</nav>
        <div className="mt-8 px-2 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#a2aaa4]">Manage</div><button className="sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#68756e]" onClick={()=>setModal("settings")}><Settings2 size={17}/>Settings</button>
        <div className="mt-auto rounded-xl bg-[#f5f7f2] p-3.5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-[#648e4c]"/>Your workspace</div><div className="mb-2 text-[11px] leading-relaxed text-[#748078]">You’re using 24 of 500 product slots.</div><div className="h-1.5 overflow-hidden rounded-full bg-[#e5e9df]"><div className="h-full w-[18%] rounded-full bg-[#78a55d]"/></div><button className="mt-3 text-[11px] font-semibold text-[#397554]">Manage plan <span aria-hidden="true">→</span></button></div>
        <button className="mt-4 flex items-center gap-2 px-2 py-2 text-xs text-[#77837c]"><CircleHelp size={15}/>Help & support</button>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex h-[66px] items-center justify-between border-b border-[#edf0eb] px-5 sm:px-8"><div className="flex items-center gap-2 text-[12px] text-[#849087]"><span>Workspace</span><span>/</span><span className="font-semibold text-[#263a33]">{active}</span></div><div className="flex items-center gap-2"><button className="hidden items-center gap-2 rounded-lg border border-[#e9ede6] px-3 py-2 text-[11px] text-[#65736c] sm:flex"><Command size={13}/> K</button><button aria-label="Notifications" className="relative rounded-lg p-2 text-[#77847d]"><Bell size={18}/><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#e49b60]"/></button><div className="ml-1 flex size-8 items-center justify-center rounded-full bg-[#d9e8dc] text-[11px] font-bold text-[#356c52]">AM</div></div></header>
        <div className="mx-auto max-w-[1180px] px-5 py-7 sm:px-8 sm:py-9">
          <div className="animate-rise flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#829087]"><span className="size-1.5 rounded-full bg-[#78a55d]"/>Sunday, September 27, 2026</div><h1 className="text-[28px] font-semibold tracking-[-.045em] text-[#20352d] sm:text-[32px]">Good morning, Alex <span className="text-[#c0c9bf]">☀</span></h1><p className="mt-1.5 text-[13px] text-[#859189]">Here’s what’s happening across your inventory today.</p></div><button onClick={()=>setModal("product")} className="flex items-center gap-2 rounded-lg bg-[#205c47] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#174b39]"><Plus size={15}/> Add product</button></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total products" value="248" foot="Across 3 warehouses" icon={<Package size={16}/>} trend="12%"/>
            <Stat label="Units in stock" value="8,429" foot="Across all locations" icon={<Boxes size={16}/>} trend="8.4%"/>
            <Stat label="Open orders" value="36" foot="12 need attention" icon={<Truck size={16}/>} trend="4.2%" down/>
            <Stat label="Stock alerts" value="07" foot="Items below reorder point" icon={<Activity size={16}/>} trend="2 new" alert/>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_330px]">
            <section className="overflow-hidden rounded-xl border border-[#e9ede7] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eff1ed] px-5 py-4"><div><h2 className="text-[14px] font-semibold tracking-tight">Inventory overview</h2><p className="mt-0.5 text-[11px] text-[#8b968f]">A live look at stock across your locations</p></div><button onClick={()=>showToast("Inventory report prepared") } className="flex items-center gap-1.5 rounded-md border border-[#e8ece6] px-2.5 py-1.5 text-[11px] font-medium text-[#65736a]"><Download size={13}/> Export</button></div>
              <div className="flex flex-wrap items-center gap-2 border-b border-[#eff1ed] px-5 py-3"><div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-md border border-[#e9ede7] px-2.5 py-2"><Search size={14} className="text-[#a1aaa3]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products or SKU..." className="w-full bg-transparent text-[11px] outline-none placeholder:text-[#a3aca5]"/></div><button onClick={()=>setWarehouse(warehouse==="All warehouses"?"Brooklyn":"All warehouses")} className="flex items-center gap-2 rounded-md border border-[#e9ede7] px-2.5 py-2 text-[11px] text-[#65736a]"><Warehouse size={13}/>{warehouse}<ChevronDown size={12}/></button><button className="rounded-md border border-[#e9ede7] p-2 text-[#65736a]" aria-label="Filters"><SlidersHorizontal size={14}/></button></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="bg-[#fcfdfb] text-[10px] font-semibold uppercase tracking-[.09em] text-[#99a29a]"><th className="px-5 py-3 font-semibold">Product</th><th className="px-3 py-3 font-semibold">Category</th><th className="px-3 py-3 font-semibold">In stock</th><th className="px-3 py-3 font-semibold">Warehouse</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-4 py-3"></th></tr></thead><tbody>{filtered.map(p=><tr key={p.sku} className="table-row border-t border-[#f0f2ee]"><td className="px-5 py-3"><div className="flex items-center gap-3"><div className={`flex size-9 items-center justify-center rounded-lg ${p.color}`}><Package size={16} className="text-[#66766a]" strokeWidth={1.5}/></div><div><div className="text-[11px] font-semibold text-[#31433a]">{p.name}</div><div className="mt-0.5 text-[10px] text-[#a0a9a1]">{p.sku}</div></div></div></td><td className="px-3 py-3 text-[11px] text-[#77837a]">{p.category}</td><td className="px-3 py-3 text-[12px] font-semibold tabular-nums">{p.stock}</td><td className="px-3 py-3 text-[11px] text-[#77837a]">{p.warehouse}</td><td className="px-3 py-3"><Status status={p.status}/></td><td className="px-4 py-3"><button aria-label={`More options for ${p.name}`} className="rounded p-1 text-[#9ba49c] hover:bg-[#f1f4ee]" onClick={()=>setModal("product")}><MoreHorizontal size={16}/></button></td></tr>)}</tbody></table>{filtered.length===0&&<div className="py-10 text-center text-xs text-[#8b968f]">No products match your search.</div>}</div>
              <div className="flex items-center justify-between border-t border-[#eff1ed] px-5 py-3 text-[10px] text-[#929d94]"><span>Showing 1–{filtered.length} of 248 products</span><div className="flex gap-1"><button className="rounded border border-[#e9ede7] p-1.5"><ChevronLeft size={13}/></button><button className="rounded border border-[#e9ede7] p-1.5"><ChevronRight size={13}/></button></div></div>
            </section>
            <section className="rounded-xl border border-[#e9ede7] bg-white"><div className="flex items-start justify-between px-5 pb-3 pt-4"><div><h2 className="text-[14px] font-semibold tracking-tight">Recent activity</h2><p className="mt-0.5 text-[11px] text-[#8b968f]">Latest inventory movements</p></div><button aria-label="More activity options" className="rounded p-1 text-[#9ba49c]"><MoreHorizontal size={16}/></button></div><div className="px-5"><div className="relative space-y-0 before:absolute before:bottom-7 before:left-[15px] before:top-6 before:w-px before:bg-[#edf0eb]">{movements.map((m,i)=><div key={i} className="relative flex gap-3 py-3.5"><div className={`z-10 flex size-[31px] shrink-0 items-center justify-center rounded-full border border-white ${m.type==="in"?"bg-[#e8f2e6] text-[#58834d]":m.type==="out"?"bg-[#f8ebe3] text-[#c27a4e]":"bg-[#e9eef5] text-[#61799b]"}`}>{m.type==="in"?<ArrowDownLeft size={14}/>:m.type==="out"?<ArrowUpRight size={14}/>:<ArrowLeftRight size={14}/>}</div><div className="min-w-0 flex-1 pt-0.5"><div className="text-[11px] font-semibold text-[#35473d]">{m.title}</div><div className="mt-1 text-[10px] leading-relaxed text-[#89948c]">{m.detail}</div><div className="mt-1.5 text-[9px] text-[#a4ada5]">{m.time}</div></div></div>)}</div></div><button onClick={()=>setActive("Activity log")} className="mt-1 flex w-full items-center justify-center gap-1 border-t border-[#eff1ed] py-3 text-[11px] font-semibold text-[#4e785e] hover:bg-[#fbfcfa]">View all activity <span aria-hidden="true">→</span></button>
              <div className="mx-4 mb-4 mt-4 rounded-lg bg-[#f6f8f3] p-3.5"><div className="flex items-center gap-2 text-[11px] font-semibold"><ShieldCheck size={14} className="text-[#4c805e]"/>Data integrity check</div><p className="mt-1.5 text-[10px] leading-relaxed text-[#849087]">All stock counts match their movement history.</p><div className="mt-2.5 flex items-center gap-1.5 text-[9px] text-[#87948b]"><span className="size-1.5 rounded-full bg-[#70a267]"/>Last checked 8 minutes ago</div></div>
            </section>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#e8ece5] pt-4 text-[10px] text-[#98a199]"><span>© 2026 Stockroom, Inc.</span><div className="flex gap-4"><button>Privacy</button><button>Terms</button><button className="flex items-center gap-1"><LifeBuoy size={12}/> Get help</button></div></div>
        </div>
      </main>
    </div>
    {toast&&<div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg bg-[#204e3c] px-4 py-3 text-xs font-medium text-white shadow-lg"><Check size={15}/>{toast}</div>}
    {modal&&<div className="fixed inset-0 z-20 flex items-center justify-center bg-[#14261f]/30 p-4" onClick={()=>setModal("")}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{modal==="product"?"Add a product":"Workspace settings"}</h2><button onClick={()=>setModal("")} className="rounded p-1 text-[#7c8980]"><X size={18}/></button></div>{modal==="product"?<div className="space-y-3"><Field label="Product name" placeholder="e.g. Stoneware coffee cup"/><div className="grid grid-cols-2 gap-3"><Field label="SKU" placeholder="SKU-001"/><Field label="Starting stock" placeholder="0"/></div><Field label="Reorder point" placeholder="10"/><button onClick={()=>{setModal("");showToast("Product added to your catalog")}} className="mt-2 w-full rounded-lg bg-[#205c47] py-2.5 text-sm font-semibold text-white">Save product</button><p className="text-center text-[10px] text-[#919b93]">Stock and history are saved together in your workspace.</p></div>:<div className="space-y-3"><p className="text-sm text-[#738077]">Northstar Goods · 3 warehouses</p><button onClick={()=>setModal("")} className="w-full rounded-lg border border-[#e6ebe4] px-4 py-2.5 text-left text-sm">Manage team and locations</button><button onClick={()=>setModal("")} className="w-full rounded-lg border border-[#e6ebe4] px-4 py-2.5 text-left text-sm">Account preferences</button><button onClick={()=>setModal("")} className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-[#9a6255]"><LogOut size={15}/> Sign out</button></div>}</div></div>}
  </div>;
}

function Stat({ label, value, foot, icon, trend, down = false, alert = false }: { label: string; value: string; foot: string; icon: React.ReactNode; trend: string; down?: boolean; alert?: boolean }) {
  const badge = alert
    ? "bg-[#fff2e7] text-[#bc7447]"
    : down
      ? "bg-[#f9eeea] text-[#b36f5a]"
      : "bg-[#edf5e9] text-[#5d8850]";
  return (
    <div className="rounded-xl border border-[#e9ede7] bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#77847b]">{label}</span>
        <span className="text-[#91a095]">{icon}</span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-[27px] font-semibold tracking-[-.04em] tabular-nums">{value}</span>
        <span className={`mb-1 flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-semibold ${badge}`}>
          {alert ? null : down ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
          {trend}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-[#9aa39b]">{foot}</div>
    </div>
  );
}

function Status({ status }: { status: Product["status"] }) {
  const color = status === "Healthy"
    ? "bg-[#edf5e9] text-[#56804c]"
    : status === "Low stock"
      ? "bg-[#fff4e6] text-[#b17c39]"
      : "bg-[#fbeceb] text-[#b9655d]";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold ${color}`}>
      <span className="size-1 rounded-full bg-current" />
      {status}
    </span>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block text-xs font-medium text-[#5b6c60]">
      {label}
      <input placeholder={placeholder} className="mt-1.5 w-full rounded-lg border border-[#e5ebe4] px-3 py-2.5 text-sm text-[#24382d] outline-none transition focus:border-[#77a18a]" />
    </label>
  );
}
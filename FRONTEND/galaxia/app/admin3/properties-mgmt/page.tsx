"use client";
import { useState, useEffect, useCallback } from "react";
import { Building, Home, Edit3, Power, Save, X, Loader2, IndianRupee, Ban, Check, Calendar, Plus } from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";
type Tab = "standalone" | "amstelnest" | "ambrose" | "digitaldiaries";

// Standalone override form — manages its own state, fully isolated from parent re-renders
function DdOverrideForm({ rows, onClose, onSaved }: { rows: any[]; onClose: () => void; onSaved: () => void }) {
    const [date, setDate] = useState("");
    const [prices, setPrices] = useState<Record<number, string>>({});
    const [msg, setMsg] = useState("");
    const [saving, setSaving] = useState(false);
    const save = async () => {
        if (!date) return alert("Please select a date");
        const filled = Object.entries(prices).filter(([, v]) => v && v.trim() !== "");
        if (filled.length === 0) return alert("Enter at least one price");
        setSaving(true);
        try {
            let saved = 0;
            for (const [id, price] of filled) {
                await api.post("/properties/dd-override", { pricingId: parseInt(id), date, price: parseInt(price) });
                saved++;
            }
            setMsg(`Override saved! (${saved} tier${saved > 1 ? "s" : ""})`);
            setTimeout(() => { onSaved(); onClose(); }, 1200);
        } catch (e: any) {
            alert("Override failed: " + (e?.message || "Unknown error"));
        } finally { setSaving(false); }
    };
    return (
        <div className="px-5 py-4 bg-indigo-50 border-t border-indigo-200">
            <p className="text-xs font-bold text-indigo-700 mb-3">Override Prices for Specific Date</p>
            <CustomDatePicker
                date={date ? new Date(date + 'T00:00:00') : new Date()}
                onDateChange={(d) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setDate(`${y}-${m}-${day}`);
                }}
            />
            {rows.map((pr: any) => (
                <div key={pr.id} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-600 w-12">{pr.hours}hr{pr.hours > 1 ? "s" : ""}:</span>
                    <input type="text" inputMode="numeric" value={prices[pr.id] || ""} onChange={e => setPrices(p => ({ ...p, [pr.id]: e.target.value.replace(/[^0-9]/g, "") }))} className="flex-1 px-2 py-1.5 border rounded text-xs font-bold text-center" placeholder={`₹${pr.weekdayPrice}`} />
                </div>
            ))}
            {msg && <p className="text-xs text-emerald-600 font-bold mb-2">{msg}</p>}
            <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving..." : <><Plus size={14} className="inline mr-1" />Set Override</>}</button>
                <button onClick={onClose} className="px-3 py-2 bg-white border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"><X size={14} /></button>
            </div>
        </div>
    );
}

export default function PropertiesMgmtPage() {
    const [props, setProps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("standalone");
    const [editId, setEditId] = useState<string | null>(null); // "prop-5" or "sub-12"
    const [editPr, setEditPr] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [overrideId, setOverrideId] = useState<string | null>(null); // "prop-5" or "sub-12"
    const [ovDate, setOvDate] = useState("");
    const [ovPrice, setOvPrice] = useState("");
    const [ovMsg, setOvMsg] = useState("");
    // DD
    const [ddEdit, setDdEdit] = useState<Record<string, { wd: string; we: string; dwd: string; dwe: string }>>({});
    const [ddExEdit, setDdExEdit] = useState<Record<string, string>>({});
    const [ddHrEdit, setDdHrEdit] = useState<Record<string, string>>({});
    // DD Override
    const [ddOvScreen, setDdOvScreen] = useState<number | null>(null);
    const [ddOvPkg, setDdOvPkg] = useState<number | null>(null);

    useEffect(() => { load(); }, []);
    const load = useCallback(async () => {
        try { setLoading(true); const d = await api.get("/properties/all-nested"); setProps(d || []); } catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    const toggleProp = async (p: any) => { try { await api.patch(`/properties/${p.id}`, { isActive: !p.isActive }); await load(); } catch { alert("Failed"); } };
    const toggleSub = async (id: number) => { try { await api.patch(`/properties/sub/${id}/toggle`); await load(); } catch { alert("Failed"); } };
    const toggleScreen = async (id: number) => { try { await api.patch(`/properties/dd-screen/${id}/toggle`); await load(); } catch { alert("Failed"); } };

    // Get pricing: prefers sub-property pricing, falls back to parent (filtered by subPropertyId)
    const getPrice = (prop: any, sub?: any) => {
        let src: any[];
        if (sub?.pricing?.length > 0) {
            src = sub.pricing;
        } else {
            // Filter to parent-only rows (subPropertyId is null)
            src = (prop.pricing || []).filter((t: any) => !t.subPropertyId);
        }
        const base = src.filter((t: any) => !t.overrideDate);
        return { wd: base.find((t: any) => t.dayType === "weekday"), we: base.find((t: any) => t.dayType === "weekend"), sa: base.find((t: any) => t.dayType === "saturday") };
    };

    const startEdit = (key: string, prop: any, sub?: any) => {
        const { wd, we, sa } = getPrice(prop, sub);
        setEditId(key);
        setEditPr({
            weekday_base: String(wd?.basePrice || ""), weekend_base: String(we?.basePrice || ""), saturday_base: String(sa?.basePrice || ""),
            weekday_extra: String(wd?.extraAdultPrice || ""),
        });
    };

    const saveEdit = async () => {
        if (!editId) return; setSaving(true);
        try {
            const body: any = {};
            if (editPr.weekday_base) body.weekday = parseInt(editPr.weekday_base);
            if (editPr.weekend_base) body.weekend = parseInt(editPr.weekend_base);
            if (editPr.saturday_base) body.saturday = parseInt(editPr.saturday_base);
            if (editPr.weekday_extra) body.extraGuest = parseInt(editPr.weekday_extra);
            const [type, id] = editId.split("-");
            if (type === "sub") {
                await api.patch(`/properties/sub/${id}/pricing`, body);
            } else {
                await api.patch(`/properties/${id}/pricing`, body);
            }
            setEditId(null); await load();
        } catch { alert("Failed"); } finally { setSaving(false); }
    };

    const saveOverride = async () => {
        if (!overrideId || !ovDate || !ovPrice) return alert("Enter date and price");
        try {
            const [type, id] = overrideId.split("-");
            const endpoint = type === "sub" ? `/properties/sub/${id}/date-pricing` : `/properties/${id}/date-pricing`;
            const r = await api.post(endpoint, { date: ovDate, price: parseInt(ovPrice) });
            setOvMsg(r.message || "Override saved!"); setTimeout(() => { setOverrideId(null); setOvMsg(""); setOvDate(""); setOvPrice(""); load(); }, 1200);
        } catch { alert("Failed"); }
    };

    // DD pricing saves
    const saveDdPr = async (prId: number) => {
        const matchKey = Object.keys(ddEdit).find(k => k.endsWith(`-${prId}`));
        const e = matchKey ? ddEdit[matchKey] : ddEdit[prId];
        if (!e) return;
        try {
            await api.patch(`/properties/dd-package-pricing/${prId}`, {
                weekdayPrice: parseInt(e.wd), weekendPrice: parseInt(e.we),
                weekdayDiscount: parseInt(e.dwd || '0'), weekendDiscount: parseInt(e.dwe || '0'),
            });
            await load();
        } catch { alert("Failed"); }
    };
    const saveDdEx = async (pkgId: number) => {
        const v = ddExEdit[pkgId]; if (!v) return;
        try { await api.patch(`/properties/dd-package/${pkgId}`, { extraPersonPrice: parseInt(v) }); setDdExEdit(p => { const n = { ...p }; delete n[pkgId]; return n; }); await load(); } catch { alert("Failed"); }
    };
    const saveDdHr = async (pkgId: number) => {
        const v = ddHrEdit[pkgId]; if (!v) return;
        try { await api.patch(`/properties/dd-package/${pkgId}`, { extraHourRate: parseInt(v) }); setDdHrEdit(p => { const n = { ...p }; delete n[pkgId]; return n; }); await load(); } catch { alert("Failed"); }
    };



    const tabs: { key: Tab; label: string }[] = [
        { key: "standalone", label: "Standalone Villas" }, { key: "amstelnest", label: "Amstel Nest" },
        { key: "ambrose", label: "Ambrose" }, { key: "digitaldiaries", label: "Digital Diaries" },
    ];

    const getFiltered = () => {
        switch (tab) {
            case "standalone": return props.filter(p => p.type === "standalone");
            case "amstelnest": return props.filter(p => p.slug === "amstel-nest" || (p.name || "").toLowerCase().includes("amstel"));
            case "ambrose": return props.filter(p => p.slug === "ambrose" || (p.name || "").toLowerCase().includes("ambrose"));
            case "digitaldiaries": return props.filter(p => p.slug === "digital-diaries");
            default: return [];
        }
    };
    const filtered = getFiltered();

    /* ---------- SHARED COMPONENTS ---------- */
    const NI = ({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
        <div className={`relative ${className || ""}`}><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ""))} placeholder={placeholder}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500/20 outline-none" /></div>
    );

    const PrShow = ({ prop, sub }: { prop: any; sub?: any }) => {
        const { wd, we, sa } = getPrice(prop, sub);
        return (<div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Mon-Thu</span><span className="text-slate-700 font-bold">₹{(wd?.basePrice || 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Fri/Sun</span><span className="text-slate-700 font-bold">₹{(we?.basePrice || 0).toLocaleString("en-IN")}</span></div>
            {sa && <div className="flex justify-between text-sm"><span className="text-slate-500">Saturday</span><span className="text-slate-700 font-bold">₹{(sa.basePrice || 0).toLocaleString("en-IN")}</span></div>}
            {wd?.extraAdultPrice > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Extra Guest</span><span className="text-slate-700 font-bold">₹{wd.extraAdultPrice.toLocaleString("en-IN")}/person</span></div>}
        </div>);
    };

    const EditForm = ({ editKey }: { editKey: string }) => {
        if (editId !== editKey) return null;
        const hasSat = !!editPr.saturday_base;
        return (<div className="p-4 space-y-3 border-t border-slate-100 bg-purple-50/30">
            {["weekday", "weekend", ...(hasSat ? ["saturday"] : [])].map(dt => (<div key={dt} className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">{dt === "weekday" ? "Mon-Thu" : dt === "weekend" ? "Fri/Sun" : "Saturday"}</label><NI value={editPr[`${dt}_base`] || ""} onChange={v => setEditPr({ ...editPr, [`${dt}_base`]: v })} /></div>))}
            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Extra Guest</label><NI value={editPr.weekday_extra || ""} onChange={v => setEditPr({ ...editPr, weekday_extra: v })} /></div>
            <div className="flex gap-2"><button onClick={saveEdit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button><button onClick={() => setEditId(null)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"><X size={14} /> Cancel</button></div>
        </div>);
    };

    const OverrideUI = ({ oKey }: { oKey: string }) => {
        if (overrideId !== oKey) return null;
        return (<div className="px-5 py-4 bg-indigo-50/50 border-t border-indigo-100 space-y-3">
            {ovMsg ? <p className="text-sm text-emerald-700 font-bold text-center py-2">✓ {ovMsg}</p> : (<>
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Set Price for Specific Date</p>
                <div className="flex gap-2 items-center"><CustomDatePicker date={ovDate ? new Date(ovDate + 'T00:00:00') : new Date()} onDateChange={(d) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); setOvDate(`${y}-${m}-${day}`); }} /><NI value={ovPrice} onChange={setOvPrice} placeholder="Price" className="flex-1" /></div>
                <button onClick={saveOverride} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"><Plus size={14} className="inline mr-1" />Set Override</button>
            </>)}
        </div>);
    };

    const CardBtns = ({ editKey, onToggle }: { editKey: string; onToggle: () => void; }) => {
        if (editId === editKey) return null;
        const [type, id] = editKey.split("-");
        return (<div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 flex-wrap">
            <button onClick={() => { const p = filtered[0]; const sub = type === "sub" ? (p?.subProperties || []).find((s: any) => s.id === parseInt(id)) : undefined; startEdit(editKey, p, sub); }}
                className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm"><Edit3 size={14} /> Edit</button>
            <button onClick={() => { setOverrideId(overrideId === editKey ? null : editKey); setOvDate(""); setOvPrice(""); setOvMsg(""); }}
                className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600 hover:border-indigo-200 shadow-sm"><Calendar size={14} /> Override</button>
            <button onClick={onToggle} className="flex items-center justify-center gap-1.5 py-2 px-3 border rounded-lg text-sm font-semibold shadow-sm bg-white border-red-200 text-red-600 hover:bg-red-50"><Power size={14} /></button>
        </div>);
    };

    /* ========= STANDALONE VILLAS ========= */
    const VillaCard = ({ p }: { p: any }) => {
        const k = `prop-${p.id}`;
        return (<div className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">{p.name}</h3><p className="text-xs text-slate-500">{p.type}</p></div></div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{p.isActive ? "Active" : "Disabled"}</span>
            </div>
            <div className="p-5"><PrShow prop={p} /></div>
            <EditForm editKey={k} /><CardBtns editKey={k} onToggle={() => toggleProp(p)} /><OverrideUI oKey={k} />
        </div>);
    };

    /* ========= AMSTEL NEST ========= */
    const AmstelNest = () => {
        const a = filtered[0]; if (!a) return <Empty />;
        const subs = a.subProperties || [];
        const std = subs.filter((s: any) => !s.name.toLowerCase().includes("family"));
        const fam = subs.find((s: any) => s.name.toLowerCase().includes("family"));
        const stdCount = std.reduce((sum: number, s: any) => sum + (s.unitCount || 1), 0);
        const stdActive = std.filter((s: any) => s.isActive).reduce((sum: number, s: any) => sum + (s.unitCount || 1), 0);
        return (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Cottages card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">Standard Cottages</h3><p className="text-xs text-slate-500">{stdCount} cottages</p></div></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5"><PrShow prop={a} /></div>
                <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Villas ({stdActive}/{stdCount} active)</p>
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">{Array.from({ length: stdCount }, (_, i) => {
                        const villaNum = i + 1;
                        const isActive = villaNum <= stdActive;
                        const stdSub = std[0]; // The sub-property row to update unitCount on
                        return <button key={i} onClick={async () => {
                            const newCount = isActive ? stdActive - 1 : stdActive + 1;
                            try { await api.patch(`/properties/sub/${stdSub.id}/unit-count`, { unitCount: newCount }); await load(); } catch { alert("Failed"); }
                        }} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border ${isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            <span className="truncate">Villa {villaNum}</span>
                            {isActive ? <Check size={12} /> : <Ban size={12} />}
                        </button>;
                    })}</div>
                </div>
                <EditForm editKey={`prop-${a.id}`} />
                <CardBtns editKey={`prop-${a.id}`} onToggle={() => toggleProp(a)} />
                <OverrideUI oKey={`prop-${a.id}`} />
            </div>
            {/* Family Cottage card */}
            {fam && (<div className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">Family Cottage</h3><p className="text-xs text-slate-500">Premium Family Unit</p></div></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${fam.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{fam.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5"><PrShow prop={a} sub={fam} /></div>
                <EditForm editKey={`sub-${fam.id}`} />
                <CardBtns editKey={`sub-${fam.id}`} onToggle={() => toggleSub(fam.id)} />
                <OverrideUI oKey={`sub-${fam.id}`} />
            </div>)}
        </div>);
    };

    /* ========= AMBROSE ========= */
    const AmbrosePage = () => {
        const a = filtered[0]; if (!a) return <Empty />;
        const villas = a.subProperties || [];
        return (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {villas.map((v: any) => {
                const k = `sub-${v.id}`;
                return (<div key={v.id} className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600"><Home size={18} /></div><h3 className="font-bold text-slate-800">{v.name}</h3></div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.isActive ? "Active" : "Disabled"}</span>
                    </div>
                    <div className="p-5"><PrShow prop={a} sub={v} /></div>
                    <EditForm editKey={k} />
                    <CardBtns editKey={k} onToggle={() => toggleSub(v.id)} />
                    <OverrideUI oKey={k} />
                </div>);
            })}
        </div>);
    };

    /* ========= DIGITAL DIARIES ========= */
    const DDPage = () => {
        const dd = filtered[0]; if (!dd) return <Empty />;
        const screens = dd.ddScreens || [];
        const pkgs = dd.ddPackages || [];

        // Addon state
        const [addonEdits, setAddonEdits] = useState<Record<string, string>>({});
        const [addonSaving, setAddonSaving] = useState(false);

        const defaultAddons = [
            { key: "balloons", label: "Balloons", defaultPrice: 400 },
            { key: "led_banner", label: "LED Banner", defaultPrice: 400 },
            { key: "cake", label: "Cake (250g)", defaultPrice: 400 },
        ];

        // Get addon price from first package's addonPricing JSON, or default
        const getAddonPrice = (key: string) => {
            const p = pkgs[0]; // both packages share addons
            if (p?.addonPricing && typeof p.addonPricing === 'object') {
                const val = (p.addonPricing as any)[key];
                if (val !== undefined) return val;
            }
            return defaultAddons.find(a => a.key === key)?.defaultPrice || 400;
        };

        const saveAddons = async () => {
            setAddonSaving(true);
            try {
                const pricing: Record<string, number> = {};
                for (const a of defaultAddons) {
                    pricing[a.key] = addonEdits[a.key] ? parseInt(addonEdits[a.key]) : getAddonPrice(a.key);
                }
                // Save to all packages
                for (const pkg of pkgs) {
                    await api.patch(`/properties/dd-package/${pkg.id}`, { addonPricing: pricing });
                }
                setAddonEdits({});
                await load();
            } catch { alert("Failed to save add-ons"); }
            finally { setAddonSaving(false); }
        };

        return (<div className="space-y-6">
            {/* 4 Screen Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {screens.map((scr: any) => (
                    <div key={scr.id} className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600"><Building size={20} /></div>
                                <div><h3 className="font-bold text-slate-800">{scr.name}</h3><p className="text-xs text-slate-500">{scr.theme}</p></div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${scr.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{scr.isActive ? "Active" : "Disabled"}</span>
                        </div>

                        {/* Pricing tables per package */}
                        {pkgs.map((pkg: any) => {
                            const rows = Array.isArray(pkg.pricing) ? pkg.pricing : [];
                            return (<div key={pkg.id} className="border-t border-slate-100">
                                <div className="px-5 pt-4 pb-2 flex justify-between items-center flex-wrap gap-2">
                                    <p className="text-xs font-bold text-indigo-600 uppercase">{pkg.name}</p>
                                    <div className="flex items-center gap-4 text-xs flex-wrap">

                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400">Extra/person:</span>
                                        {ddExEdit[pkg.id] !== undefined ? (<div className="flex items-center gap-1.5">
                                            <input type="text" inputMode="numeric" value={ddExEdit[pkg.id]} onChange={e => setDdExEdit({ ...ddExEdit, [pkg.id]: e.target.value.replace(/[^0-9]/g, "") })} className="w-16 px-2 py-1 border rounded text-xs font-bold text-center" />
                                            <button onClick={async () => { await saveDdEx(pkg.id); }} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Save size={14} /></button>
                                            <button onClick={() => setDdExEdit(p => { const n = { ...p }; delete n[pkg.id]; return n; })} className="p-1.5 bg-red-100 text-red-500 rounded hover:bg-red-200"><X size={14} /></button>
                                        </div>) : (
                                            <button onClick={() => setDdExEdit({ ...ddExEdit, [pkg.id]: String(pkg.extraPersonPrice || 0) })} className="font-bold text-slate-700 hover:text-purple-600 underline decoration-dashed">₹{pkg.extraPersonPrice || 0}</button>
                                            )
                                        }
                                        </div>
                                    </div>
                                </div>
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-slate-50"><th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Duration</th><th className="text-center px-2 py-2 text-[10px] font-bold text-red-500 uppercase">Discount</th><th className="text-center px-2 py-2 text-[10px] font-bold text-slate-500 uppercase">Weekday</th><th className="text-center px-2 py-2 text-[10px] font-bold text-red-500 uppercase">Discount</th><th className="text-center px-2 py-2 text-[10px] font-bold text-slate-500 uppercase">Weekend</th><th className="w-14"></th></tr></thead>
                                    <tbody>{rows.map((pr: any) => {
                                        const editKey = `${scr.id}-${pr.id}`;
                                        return (<tr key={pr.id} className="border-t border-slate-100">
                                            <td className="px-3 py-2.5 font-medium text-slate-700 text-xs">{pr.hours}hr{pr.hours > 1 ? 's' : ''}</td>
                                            {ddEdit[editKey] ? (<>
                                                <td className="px-1 py-1.5"><input type="text" inputMode="numeric" value={ddEdit[editKey].dwd} onChange={e => setDdEdit({ ...ddEdit, [editKey]: { ...ddEdit[editKey], dwd: e.target.value.replace(/[^0-9]/g, "") } })} className="w-full px-1 py-1.5 border rounded text-xs font-bold text-center text-red-600" placeholder="0" /></td>
                                                <td className="px-1 py-1.5"><input type="text" inputMode="numeric" value={ddEdit[editKey].wd} onChange={e => setDdEdit({ ...ddEdit, [editKey]: { ...ddEdit[editKey], wd: e.target.value.replace(/[^0-9]/g, "") } })} className="w-full px-1 py-1.5 border rounded text-xs font-bold text-center" /></td>
                                                <td className="px-1 py-1.5"><input type="text" inputMode="numeric" value={ddEdit[editKey].dwe} onChange={e => setDdEdit({ ...ddEdit, [editKey]: { ...ddEdit[editKey], dwe: e.target.value.replace(/[^0-9]/g, "") } })} className="w-full px-1 py-1.5 border rounded text-xs font-bold text-center text-red-600" placeholder="0" /></td>
                                                <td className="px-1 py-1.5"><input type="text" inputMode="numeric" value={ddEdit[editKey].we} onChange={e => setDdEdit({ ...ddEdit, [editKey]: { ...ddEdit[editKey], we: e.target.value.replace(/[^0-9]/g, "") } })} className="w-full px-1 py-1.5 border rounded text-xs font-bold text-center" /></td>
                                                <td className="px-1 py-1.5 flex gap-1 justify-center">
                                                    <button onClick={async () => { await saveDdPr(pr.id); setDdEdit(p => { const n = { ...p }; delete n[editKey]; return n; }); }} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Save size={14} /></button>
                                                    <button onClick={() => setDdEdit(p => { const n = { ...p }; delete n[editKey]; return n; })} className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200"><X size={14} /></button>
                                                </td>
                                            </>) : (<>
                                                <td className="px-2 py-2.5 text-center font-bold text-red-500 text-xs">{pr.weekdayDiscount || 0}</td>
                                                <td className="px-2 py-2.5 text-center font-bold text-slate-800 text-xs">₹{(pr.weekdayPrice || 0).toLocaleString("en-IN")}</td>
                                                <td className="px-2 py-2.5 text-center font-bold text-red-500 text-xs">{pr.weekendDiscount || 0}</td>
                                                <td className="px-2 py-2.5 text-center font-bold text-slate-800 text-xs">₹{(pr.weekendPrice || 0).toLocaleString("en-IN")}</td>
                                                <td className="px-1 py-2.5 text-center"><button onClick={() => setDdEdit({ ...ddEdit, [editKey]: { wd: String(pr.weekdayPrice || 0), we: String(pr.weekendPrice || 0), dwd: String(pr.weekdayDiscount || 0), dwe: String(pr.weekendDiscount || 0) } })} className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg"><Edit3 size={14} /></button></td>
                                            </>)}
                                        </tr>);
                                    })}</tbody>
                                </table>

                                {/* DD Override per package */}
                                {ddOvScreen === scr.id && ddOvPkg === pkg.id ? (
                                    <DdOverrideForm rows={rows} onClose={() => { setDdOvScreen(null); setDdOvPkg(null); }} onSaved={load} />
                                ) : (
                                    <button onClick={() => { setDdOvScreen(scr.id); setDdOvPkg(pkg.id); }} className="w-full py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-t border-slate-100 flex items-center justify-center gap-1.5"><Calendar size={12} /> Override</button>
                                )}
                            </div>);
                        })}

                        {/* Disable Screen button */}
                        <button onClick={() => toggleScreen(scr.id)} className={`w-full py-3 flex items-center justify-center gap-2 text-sm font-bold border-t ${scr.isActive ? 'text-red-600 border-red-100 hover:bg-red-50' : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}>
                            <Power size={14} /> {scr.isActive ? "Disable Screen" : "Enable Screen"}
                        </button>
                    </div>
                ))}
            </div>

            {/* Add-ons — editable from DB */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div><h3 className="font-bold text-slate-800">Add-ons</h3><p className="text-xs text-slate-500">Extra charges applied during booking</p></div>
                    {Object.keys(addonEdits).length > 0 && (
                        <div className="flex gap-2">
                            <button onClick={saveAddons} disabled={addonSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 disabled:opacity-50">
                                {addonSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                            </button>
                            <button onClick={() => setAddonEdits({})} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    )}
                </div>
                <div className="p-5 space-y-3">
                    {defaultAddons.map(addon => {
                        const currentPrice = getAddonPrice(addon.key);
                        const isEditing = addonEdits[addon.key] !== undefined;
                        return (
                            <div key={addon.key} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-amber-50/30">
                                <span className="text-sm font-medium text-slate-700">{addon.label}</span>
                                {isEditing ? (
                                    <NI value={addonEdits[addon.key]} onChange={v => setAddonEdits({ ...addonEdits, [addon.key]: v })} className="w-28" />
                                ) : (
                                    <button onClick={() => setAddonEdits({ ...addonEdits, [addon.key]: String(currentPrice) })} className="text-sm font-bold text-slate-800 hover:text-purple-600 underline decoration-dashed cursor-pointer">
                                        ₹{currentPrice}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>);
    };

    const Empty = () => <div className="text-center py-20 text-slate-500">No properties found.</div>;

    return (<div className="max-w-7xl mx-auto space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-800">Properties Management</h1><p className="text-sm text-slate-500 mt-1">Manage pricing, availability, and sub-properties.</p></div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">{tabs.map(t => <button key={t.key} onClick={() => { setTab(t.key); setEditId(null); setOverrideId(null); }} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t.key ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>)}</div>
        {loading ? <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-purple-500" size={32} /><p className="text-sm text-slate-500 mt-3">Loading…</p></div>
            : tab === "amstelnest" ? <AmstelNest />
            : tab === "ambrose" ? <AmbrosePage />
            : tab === "digitaldiaries" ? <DDPage />
            : filtered.length === 0 ? <Empty />
            : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{filtered.map(p => <VillaCard key={p.id} p={p} />)}</div>}
    </div>);
}

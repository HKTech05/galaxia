"use client";
import { useState, useEffect, useCallback } from "react";
import { Building, Home, Edit3, Power, Save, X, Loader2, IndianRupee, Ban, Check, Calendar, Plus, Trash2, Eye } from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";
type Tab = "standalone" | "amstelnest" | "ambrose" | "digitaldiaries";

// Shared numeric input — defined outside component to keep stable React identity and prevent focus loss
function NI({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
    return (
        <div className={`relative ${className || ""}`}><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ""))} placeholder={placeholder}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500/20 outline-none" /></div>
    );
}

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
    // DD Override popup modal
    const [ddOvScreen, setDdOvScreen] = useState<number | null>(null);
    const [ddOvPkg, setDdOvPkg] = useState<number | null>(null);
    const [ddOvRows, setDdOvRows] = useState<any[]>([]);
    const [ddOvName, setDdOvName] = useState("");
    const [ddOvDate, setDdOvDate] = useState("");
    const [ddOvPrices, setDdOvPrices] = useState<Record<number, string>>({});
    const [ddOvSaving, setDdOvSaving] = useState(false);
    const [ddOvMsg, setDdOvMsg] = useState("");
    // DD View Overrides modal
    const [ddViewOvPkg, setDdViewOvPkg] = useState<any>(null);
    const [ddViewOvName, setDdViewOvName] = useState("");
    // View Overrides modal
    const [viewOvKey, setViewOvKey] = useState<string | null>(null);
    const [viewOvProp, setViewOvProp] = useState<any>(null);
    const [viewOvSub, setViewOvSub] = useState<any>(null);
    // Modal property name for edit/override titles
    const [modalPropName, setModalPropName] = useState("");
    // Master Override
    const [masterOvOpen, setMasterOvOpen] = useState(false);
    const [masterOvHistory, setMasterOvHistory] = useState(false);
    const [masterOvSelected, setMasterOvSelected] = useState<Set<string>>(new Set());
    const [masterOvSingleDate, setMasterOvSingleDate] = useState("");
    const [masterOvRangeFrom, setMasterOvRangeFrom] = useState("");
    const [masterOvRangeTo, setMasterOvRangeTo] = useState("");
    const [masterOvPrices, setMasterOvPrices] = useState<Record<string, string>>({});
    const [masterOvSaving, setMasterOvSaving] = useState(false);
    const [masterOvMsg, setMasterOvMsg] = useState("");

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
            weekday_extra: String(wd?.extraAdultPrice || we?.extraAdultPrice || ""),
            extra_kid: String(wd?.kidsPrice || we?.kidsPrice || ""),
            has_saturday: sa ? "1" : "",
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
            if (editPr.extra_kid) body.extraKid = parseInt(editPr.extra_kid);
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
            case "standalone": return props.filter(p => p.type === "standalone" && p.slug !== "digital-diaries");
            case "amstelnest": return props.filter(p => p.slug === "amstel-nest" || (p.name || "").toLowerCase().includes("amstel"));
            case "ambrose": return props.filter(p => p.slug === "ambrose" || (p.name || "").toLowerCase().includes("ambrose"));
            case "digitaldiaries": return props.filter(p => p.slug === "digital-diaries");
            default: return [];
        }
    };
    const filtered = getFiltered();

    /* ---------- SHARED COMPONENTS ---------- */

    const renderPrShow = (prop: any, sub?: any) => {
        const { wd, we, sa } = getPrice(prop, sub);
        const hasSeparateSat = !!sa;
        const weLabel = hasSeparateSat ? "Fri/Sun" : "Fri/Sat/Sun";
        return (<div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Mon-Thu</span><span className="text-slate-700 font-bold">₹{(wd?.basePrice || 0).toLocaleString("en-IN")}{wd?.personsLabel ? <span className="text-[10px] font-normal text-slate-400 ml-1">· {wd.personsLabel}</span> : null}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">{weLabel}</span><span className="text-slate-700 font-bold">₹{(we?.basePrice || 0).toLocaleString("en-IN")}{we?.personsLabel ? <span className="text-[10px] font-normal text-slate-400 ml-1">· {we.personsLabel}</span> : null}</span></div>
            {sa && <div className="flex justify-between text-sm"><span className="text-slate-500">Saturday</span><span className="text-slate-700 font-bold">₹{(sa.basePrice || 0).toLocaleString("en-IN")}{sa.personsLabel ? <span className="text-[10px] font-normal text-slate-400 ml-1">· {sa.personsLabel}</span> : null}</span></div>}
            {wd?.extraAdultPrice > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Extra Adult</span><span className="text-slate-700 font-bold">₹{wd.extraAdultPrice.toLocaleString("en-IN")}/person</span></div>}
            {wd?.kidsPrice > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Extra Kid</span><span className="text-slate-700 font-bold">₹{wd.kidsPrice.toLocaleString("en-IN")}/child</span></div>}
        </div>);
    };

    // Edit modal — centered popup overlay
    const renderEditModal = () => {
        if (!editId) return null;
        const hasSat = !!editPr.has_saturday;
        const dayTypes = hasSat
            ? [{ key: "weekday", label: "Mon-Thu" }, { key: "weekend", label: "Fri/Sun" }, { key: "saturday", label: "Saturday" }]
            : [{ key: "weekday", label: "Mon-Thu" }, { key: "weekend", label: "Fri/Sat/Sun" }];
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditId(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-purple-50">
                        <div><h3 className="font-bold text-slate-800">Edit Pricing</h3>{modalPropName && <p className="text-xs text-slate-500">{modalPropName}</p>}</div>
                        <button onClick={() => setEditId(null)} className="p-1 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        {dayTypes.map(dt => (<div key={dt.key} className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">{dt.label}</label><NI value={editPr[`${dt.key}_base`] || ""} onChange={v => setEditPr(prev => ({ ...prev, [`${dt.key}_base`]: v }))} /></div>))}
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Extra Adult (per person)</label><NI value={editPr.weekday_extra || ""} onChange={v => setEditPr(prev => ({ ...prev, weekday_extra: v }))} /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Extra Kid (per child)</label><NI value={editPr.extra_kid || ""} onChange={v => setEditPr(prev => ({ ...prev, extra_kid: v }))} /></div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                        <button onClick={saveEdit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button>
                        <button onClick={() => setEditId(null)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"><X size={14} /> Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    // Override modal — centered popup overlay
    const renderOverrideModal = () => {
        if (!overrideId) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setOverrideId(null); setOvMsg(""); }}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-visible" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                        <div><h3 className="font-bold text-slate-800">Set Date Override</h3>{modalPropName && <p className="text-xs text-slate-500">{modalPropName}</p>}</div>
                        <button onClick={() => { setOverrideId(null); setOvMsg(""); }} className="p-1 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        {ovMsg ? <p className="text-sm text-emerald-700 font-bold text-center py-4">✓ {ovMsg}</p> : (<>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                                <CustomDatePicker date={ovDate ? new Date(ovDate + 'T00:00:00') : new Date()} onDateChange={(d) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); setOvDate(`${y}-${m}-${day}`); }} />
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Override Price</label><NI value={ovPrice} onChange={setOvPrice} placeholder="Price" /></div>
                        </>)}
                    </div>
                    {!ovMsg && <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                        <button onClick={saveOverride} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"><Plus size={14} /> Set Override</button>
                        <button onClick={() => { setOverrideId(null); setOvMsg(""); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"><X size={14} /> Cancel</button>
                    </div>}
                </div>
            </div>
        );
    };

    // View Overrides modal — shows all date overrides with delete button
    const renderViewOverridesModal = () => {
        if (!viewOvKey || !viewOvProp) return null;
        // Re-derive fresh data from props state so it updates after delete+reload
        const freshProp = props.find((p: any) => p.id === viewOvProp.id) || viewOvProp;
        const freshSub = viewOvSub ? (freshProp.subProperties || []).find((s: any) => s.id === viewOvSub.id) || viewOvSub : null;
        const pricing = freshSub?.pricing?.length > 0 ? freshSub.pricing : (freshProp.pricing || []).filter((t: any) => freshSub ? t.subPropertyId === freshSub.id : !t.subPropertyId);
        const overrides = pricing.filter((t: any) => t.overrideDate).sort((a: any, b: any) => new Date(a.overrideDate).getTime() - new Date(b.overrideDate).getTime());
        const propName = freshSub?.name || freshProp.name;
        const deleteOverride = async (id: number) => {
            if (!confirm("Delete this override?")) return;
            try { await api.delete(`/properties/pricing/${id}`); await load(); } catch { alert("Failed to delete"); }
        };
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setViewOvKey(null); setViewOvProp(null); setViewOvSub(null); }}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50 shrink-0">
                        <div><h3 className="font-bold text-slate-800">Date Overrides</h3><p className="text-xs text-slate-500">{propName}</p></div>
                        <button onClick={() => { setViewOvKey(null); setViewOvProp(null); setViewOvSub(null); }} className="p-1 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="px-6 py-4 overflow-y-auto flex-1">
                        {overrides.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">No date overrides set</p>
                        ) : (
                            <div className="space-y-2">
                                {overrides.map((ov: any) => {
                                    const d = new Date(ov.overrideDate);
                                    const dateStr = `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`;
                                    return (
                                        <div key={ov.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div><span className="text-sm font-bold text-slate-700">{dateStr}</span><span className="text-xs text-slate-400 ml-2">({ov.dayType})</span></div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-800">₹{ov.basePrice.toLocaleString("en-IN")}</span>
                                                <button onClick={() => deleteOverride(ov.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-3 border-t border-slate-100 shrink-0">
                        <button onClick={() => { setViewOvKey(null); setViewOvProp(null); setViewOvSub(null); }} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200">Close</button>
                    </div>
                </div>
            </div>
        );
    };

    // Build flat list of all staycation properties for Master Override
    const getAllStayProperties = () => {
        const items: { key: string; name: string; type: "prop" | "sub"; id: number; prices: { weekday: number; weekend: number; saturday: number } }[] = [];
        for (const p of props) {
            if (p.type === "dd" || p.slug === "digital-diaries") continue;
            if (p.slug === "ambrose" || p.slug === "amstel-nest") {
                for (const sp of (p.subProperties || [])) {
                    const parentLabel = p.slug === "ambrose" ? "Ambrose" : "Amstel Nest";
                    const spPricing = sp.pricing?.length > 0 ? sp.pricing : (p.pricing || []).filter((t: any) => t.subPropertyId === sp.id);
                    const base = spPricing.filter((t: any) => !t.overrideDate);
                    const wd = base.find((t: any) => t.dayType === "weekday")?.basePrice || 0;
                    const we = base.find((t: any) => t.dayType === "weekend")?.basePrice || 0;
                    const sa = base.find((t: any) => t.dayType === "saturday")?.basePrice || we;
                    items.push({ key: `sub-${sp.id}`, name: `${sp.name} (${parentLabel})`, type: "sub", id: sp.id, prices: { weekday: wd, weekend: we, saturday: sa } });
                }
            } else {
                const basePricing = (p.pricing || []).filter((t: any) => !t.subPropertyId && !t.overrideDate);
                const wd = basePricing.find((t: any) => t.dayType === "weekday")?.basePrice || 0;
                const we = basePricing.find((t: any) => t.dayType === "weekend")?.basePrice || 0;
                const sa = basePricing.find((t: any) => t.dayType === "saturday")?.basePrice || we;
                items.push({ key: `prop-${p.id}`, name: p.name, type: "prop", id: p.id, prices: { weekday: wd, weekend: we, saturday: sa } });
            }
        }
        return items;
    };

    // Get day type label for a date string
    const getDayType = (dateStr: string): { type: "weekday" | "weekend" | "saturday"; label: string } => {
        const d = new Date(dateStr + 'T12:00:00');
        const day = d.getDay();
        if (day === 6) return { type: "saturday", label: "Sat" };
        if (day === 0 || day === 5) return { type: "weekend", label: day === 5 ? "Fri" : "Sun" };
        return { type: "weekday", label: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][day] };
    };

    // Generate dates from single or range
    const getMasterDates = (): string[] => {
        if (masterOvSingleDate) return [masterOvSingleDate];
        if (masterOvRangeFrom && masterOvRangeTo) {
            const dates: string[] = [];
            const from = new Date(masterOvRangeFrom + 'T12:00:00');
            const to = new Date(masterOvRangeTo + 'T12:00:00');
            for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
                dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
            }
            return dates;
        }
        return [];
    };

    const saveMasterOverride = async () => {
        const dates = getMasterDates();
        if (dates.length === 0) return alert("Select at least one date");
        const selected = Array.from(masterOvSelected);
        // Collect all property|date combos that have a price
        const saves: { type: string; id: string; date: string; price: number }[] = [];
        for (const key of selected) {
            const [type, idStr] = key.split("-");
            for (const date of dates) {
                const priceKey = `${key}|${date}`;
                const val = masterOvPrices[priceKey];
                if (val && val.trim() !== "") {
                    const price = parseInt(val);
                    if (!isNaN(price) && price > 0) saves.push({ type, id: idStr, date, price });
                }
            }
        }
        if (saves.length === 0) return alert("Enter at least one price");
        setMasterOvSaving(true);
        try {
            let count = 0;
            for (const s of saves) {
                const endpoint = s.type === "sub" ? `/properties/sub/${s.id}/date-pricing` : `/properties/${s.id}/date-pricing`;
                await api.post(endpoint, { date: s.date, price: s.price });
                count++;
            }
            const propCount = new Set(saves.map(s => `${s.type}-${s.id}`)).size;
            const dateCount = new Set(saves.map(s => s.date)).size;
            setMasterOvMsg(`✓ ${count} override${count !== 1 ? "s" : ""} saved across ${propCount} propert${propCount !== 1 ? "ies" : "y"} and ${dateCount} date${dateCount !== 1 ? "s" : ""}`);
            await load();
        } catch (e: any) {
            alert("Failed: " + (e?.message || "Unknown error"));
        } finally { setMasterOvSaving(false); }
    };

    const renderMasterOverrideModal = () => {
        if (!masterOvOpen) return null;
        const allItems = getAllStayProperties();
        const dates = getMasterDates();
        const selectedItems = allItems.filter(i => masterOvSelected.has(i.key));

        // History view
        if (masterOvHistory) {
            // Collect all overrides from props
            const allOverrides: { name: string; date: string; price: number; dayType: string; id: number }[] = [];
            for (const p of props) {
                if (p.type === "dd" || p.slug === "digital-diaries") continue;
                if (p.slug === "ambrose" || p.slug === "amstel-nest") {
                    for (const sp of (p.subProperties || [])) {
                        const parentLabel = p.slug === "ambrose" ? "Ambrose" : "Amstel Nest";
                        const pricing = sp.pricing?.length > 0 ? sp.pricing : (p.pricing || []).filter((t: any) => t.subPropertyId === sp.id);
                        for (const ov of pricing.filter((t: any) => t.overrideDate)) {
                            allOverrides.push({ name: `${sp.name} (${parentLabel})`, date: ov.overrideDate, price: ov.basePrice, dayType: ov.dayType, id: ov.id });
                        }
                    }
                } else {
                    const pricing = (p.pricing || []).filter((t: any) => !t.subPropertyId);
                    for (const ov of pricing.filter((t: any) => t.overrideDate)) {
                        allOverrides.push({ name: p.name, date: ov.overrideDate, price: ov.basePrice, dayType: ov.dayType, id: ov.id });
                    }
                }
            }
            allOverrides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setMasterOvHistory(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50 shrink-0 rounded-t-2xl">
                            <div><h3 className="font-bold text-slate-800">All Override History</h3><p className="text-xs text-slate-500">All staycation date overrides</p></div>
                            <button onClick={() => setMasterOvHistory(false)} className="p-1 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
                        </div>
                        <div className="px-6 py-4 overflow-y-auto flex-1">
                            {allOverrides.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">No overrides found</p>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="grid grid-cols-[1fr_100px_90px_40px] gap-2 text-[10px] font-bold text-slate-400 uppercase px-3 pb-1">
                                        <span>Property</span><span>Date</span><span className="text-right">Price</span><span></span>
                                    </div>
                                    {allOverrides.map((ov) => {
                                        const d = new Date(ov.date);
                                        const dateStr = `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`;
                                        return (
                                            <div key={ov.id} className="grid grid-cols-[1fr_100px_90px_40px] gap-2 items-center py-2 px-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                                <span className="font-medium text-slate-700 truncate">{ov.name}</span>
                                                <span className="text-slate-500 text-xs">{dateStr}</span>
                                                <span className="text-right font-bold text-slate-800">₹{ov.price.toLocaleString("en-IN")}</span>
                                                <button onClick={async () => { if (!confirm("Delete?")) return; try { await api.delete(`/properties/pricing/${ov.id}`); await load(); } catch { alert("Failed"); } }} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-3 border-t border-slate-100 shrink-0 rounded-b-2xl">
                            <button onClick={() => setMasterOvHistory(false)} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200">Close</button>
                        </div>
                    </div>
                </div>
            );
        }

        // Main modal
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setMasterOvOpen(false); setMasterOvMsg(""); }}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-visible" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 shrink-0 rounded-t-2xl">
                        <div><h3 className="font-bold text-slate-800 text-lg">Master Override</h3><p className="text-xs text-slate-500">Set price overrides across multiple properties and dates at once</p></div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setMasterOvHistory(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline decoration-dashed">View Override History</button>
                            <button onClick={() => { setMasterOvOpen(false); setMasterOvMsg(""); }} className="p-1 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
                        </div>
                    </div>

                    {masterOvMsg ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-lg text-emerald-700 font-bold mb-4">{masterOvMsg}</p>
                            <button onClick={() => { setMasterOvOpen(false); setMasterOvMsg(""); setMasterOvSelected(new Set()); setMasterOvPrices({}); setMasterOvSingleDate(""); setMasterOvRangeFrom(""); setMasterOvRangeTo(""); }} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">Done</button>
                        </div>
                    ) : (
                        <>
                            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
                                {/* Step 1: Select Properties */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase">1. Select Properties</p>
                                        <button onClick={() => { masterOvSelected.size === allItems.length ? setMasterOvSelected(new Set()) : setMasterOvSelected(new Set(allItems.map(i => i.key))); }} className="text-[10px] text-indigo-600 font-bold hover:underline">{masterOvSelected.size === allItems.length ? "Deselect All" : "Select All"}</button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                                        {allItems.map(item => (
                                            <label key={item.key} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${masterOvSelected.has(item.key) ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"}`}>
                                                <input type="checkbox" checked={masterOvSelected.has(item.key)} onChange={() => { const next = new Set(masterOvSelected); next.has(item.key) ? next.delete(item.key) : next.add(item.key); setMasterOvSelected(next); }} className="accent-indigo-600 w-3.5 h-3.5" />
                                                <span className="truncate">{item.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2: Date Selection */}
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">2. Select Date(s)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Single Date</label>
                                            <div className="flex gap-1 items-center">
                                                <input type="date" value={masterOvSingleDate} onChange={e => { setMasterOvSingleDate(e.target.value); setMasterOvRangeFrom(""); setMasterOvRangeTo(""); }} className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                {masterOvSingleDate && <button onClick={() => setMasterOvSingleDate("")} className="p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Or Date Range</label>
                                            <div className="flex gap-1 items-center">
                                                <input type="date" value={masterOvRangeFrom} onChange={e => { setMasterOvRangeFrom(e.target.value); setMasterOvSingleDate(""); }} className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                <span className="text-xs text-slate-400">to</span>
                                                <input type="date" value={masterOvRangeTo} min={masterOvRangeFrom} onChange={e => { setMasterOvRangeTo(e.target.value); setMasterOvSingleDate(""); }} className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                {(masterOvRangeFrom || masterOvRangeTo) && <button onClick={() => { setMasterOvRangeFrom(""); setMasterOvRangeTo(""); }} className="p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>}
                                            </div>
                                        </div>
                                    </div>
                                    {dates.length > 0 && <p className="text-[10px] text-indigo-600 font-medium mt-1">{dates.length} date{dates.length !== 1 ? "s" : ""} selected</p>}
                                </div>

                                {/* Step 3: Price Catalog — per property × per date */}
                                {selectedItems.length > 0 && dates.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">3. Set Override Prices</p>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <div className="grid grid-cols-[1fr_80px_70px_90px_110px] gap-1 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200">
                                                <span>Property</span><span>Date</span><span>Day</span><span className="text-right">Current</span><span>Override</span>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                                                {selectedItems.map(item => (
                                                    dates.map(dateStr => {
                                                        const dt = getDayType(dateStr);
                                                        const currentPrice = item.prices[dt.type];
                                                        const d = new Date(dateStr + 'T12:00:00');
                                                        const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
                                                        const priceKey = `${item.key}|${dateStr}`;
                                                        return (
                                                            <div key={priceKey} className="grid grid-cols-[1fr_80px_70px_90px_110px] gap-1 items-center px-3 py-2">
                                                                <span className="text-xs font-medium text-slate-700 truncate">{item.name}</span>
                                                                <span className="text-[11px] text-slate-500">{dateLabel}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-center ${dt.type === "saturday" ? "bg-orange-50 text-orange-600" : dt.type === "weekend" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>{dt.label}</span>
                                                                <span className="text-xs text-slate-400 text-right">₹{currentPrice.toLocaleString("en-IN")}</span>
                                                                <NI value={masterOvPrices[priceKey] || ""} onChange={v => setMasterOvPrices(prev => ({ ...prev, [priceKey]: v }))} placeholder="₹ Price" />
                                                            </div>
                                                        );
                                                    })
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 rounded-b-2xl">
                                <button onClick={saveMasterOverride} disabled={masterOvSaving || selectedItems.length === 0 || dates.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {masterOvSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save All Overrides
                                </button>
                                <button onClick={() => { setMasterOvOpen(false); setMasterOvMsg(""); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"><X size={14} /> Cancel</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderCardBtns = (editKey: string, onToggle: () => void, prop: any, sub?: any) => {
        const name = sub?.name || prop.name;
        const pricing = sub?.pricing?.length > 0 ? sub.pricing : (prop.pricing || []).filter((t: any) => sub ? t.subPropertyId === sub.id : !t.subPropertyId);
        const ovCount = pricing.filter((t: any) => t.overrideDate).length;
        return (<div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 flex-wrap">
            <button onClick={() => { setModalPropName(name); startEdit(editKey, prop, sub); }}
                className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm"><Edit3 size={14} /> Edit</button>
            <button onClick={() => { setModalPropName(name); setOverrideId(editKey); setOvDate(""); setOvPrice(""); setOvMsg(""); }}
                className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600 hover:border-indigo-200 shadow-sm"><Calendar size={14} /> Override</button>
            <button onClick={() => { setViewOvKey(editKey); setViewOvProp(prop); setViewOvSub(sub || null); }}
                className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-amber-600 hover:border-amber-200 shadow-sm">Overrides{ovCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">{ovCount}</span>}</button>
            <button onClick={onToggle} className="flex items-center justify-center gap-1.5 py-2 px-3 border rounded-lg text-sm font-semibold shadow-sm bg-white border-red-200 text-red-600 hover:bg-red-50"><Power size={14} /></button>
        </div>);
    };

    /* ========= STANDALONE VILLAS ========= */
    const renderVillaCard = (p: any) => {
        const k = `prop-${p.id}`;
        return (<div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">{p.name}</h3><p className="text-xs text-slate-500">{p.type}</p></div></div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{p.isActive ? "Active" : "Disabled"}</span>
            </div>
            <div className="p-5">{renderPrShow(p)}</div>
            {renderCardBtns(k, () => toggleProp(p), p)}
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
                <div className="p-5">{renderPrShow(a)}</div>
                {renderCardBtns(`prop-${a.id}`, () => toggleProp(a), a)}
            </div>
            {/* Family Cottage card */}
            {fam && (<div className="bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">Family Cottage</h3><p className="text-xs text-slate-500">Premium Family Unit</p></div></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${fam.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{fam.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5">{renderPrShow(a, fam)}</div>
                {renderCardBtns(`sub-${fam.id}`, () => toggleSub(fam.id), a, fam)}
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
                    <div className="p-5">{renderPrShow(a, v)}</div>
                    {renderCardBtns(k, () => toggleSub(v.id), a, v)}
                </div>);
            })}
        </div>);
    };

    // DD Override save (popup modal version)
    const saveDdOverride = async () => {
        if (!ddOvDate) return alert("Please select a date");
        const filled = Object.entries(ddOvPrices).filter(([, v]) => v && v.trim() !== "");
        if (filled.length === 0) return alert("Enter at least one price");
        setDdOvSaving(true);
        try {
            let saved = 0;
            for (const [id, price] of filled) {
                await api.post("/properties/dd-override", { pricingId: parseInt(id), date: ddOvDate, price: parseInt(price) });
                saved++;
            }
            setDdOvMsg(`Override saved! (${saved} tier${saved > 1 ? "s" : ""})`);
            await load();
            setTimeout(() => { setDdOvScreen(null); setDdOvPkg(null); setDdOvMsg(""); }, 1200);
        } catch (e: any) { alert("Override failed: " + (e?.message || "Unknown error")); }
        finally { setDdOvSaving(false); }
    };

    // DD Override popup modal
    const renderDdOverrideModal = () => {
        if (ddOvScreen === null || ddOvPkg === null) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setDdOvScreen(null); setDdOvPkg(null); setDdOvMsg(""); }}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-visible" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                        <div><h3 className="font-bold text-slate-800">Set Date Override</h3><p className="text-xs text-slate-500">{ddOvName}</p></div>
                        <button onClick={() => { setDdOvScreen(null); setDdOvPkg(null); setDdOvMsg(""); }} className="p-1 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        {ddOvMsg ? <p className="text-sm text-emerald-700 font-bold text-center py-4">✓ {ddOvMsg}</p> : (<>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                                <CustomDatePicker date={ddOvDate ? new Date(ddOvDate + 'T00:00:00') : new Date()} onDateChange={(d) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); setDdOvDate(`${y}-${m}-${day}`); }} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Override Prices</label>
                                {ddOvRows.map((pr: any) => (
                                    <div key={pr.id} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-600 w-12 shrink-0">{pr.hours}hr{pr.hours > 1 ? "s" : ""}:</span>
                                        <NI value={ddOvPrices[pr.id] || ""} onChange={v => setDdOvPrices(p => ({ ...p, [pr.id]: v }))} placeholder={`₹${pr.weekdayPrice}`} className="flex-1" />
                                    </div>
                                ))}
                            </div>
                        </>)}
                    </div>
                    {!ddOvMsg && <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                        <button onClick={saveDdOverride} disabled={ddOvSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">{ddOvSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Set Override</button>
                        <button onClick={() => { setDdOvScreen(null); setDdOvPkg(null); setDdOvMsg(""); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"><X size={14} /> Cancel</button>
                    </div>}
                </div>
            </div>
        );
    };

    // DD View Overrides modal
    const renderDdViewOverridesModal = () => {
        if (!ddViewOvPkg) return null;
        // Re-derive fresh data from props
        const dd = props.find((p: any) => p.slug === "digital-diaries");
        const freshPkg = dd?.ddPackages?.find((p: any) => p.id === ddViewOvPkg.id) || ddViewOvPkg;
        const allOverrides: any[] = [];
        for (const pr of (freshPkg.pricing || [])) {
            for (const ov of (pr.overrides || [])) {
                allOverrides.push({ ...ov, hours: pr.hours, tierLabel: `${pr.hours}hr${pr.hours > 1 ? 's' : ''}` });
            }
        }
        allOverrides.sort((a, b) => new Date(a.overrideDate).getTime() - new Date(b.overrideDate).getTime());
        const deleteDdOverride = async (id: number) => {
            if (!confirm("Delete this override?")) return;
            try { await api.delete(`/properties/dd-override/${id}`); await load(); } catch { alert("Failed to delete"); }
        };
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setDdViewOvPkg(null); setDdViewOvName(""); }}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50 shrink-0">
                        <div><h3 className="font-bold text-slate-800">Date Overrides</h3><p className="text-xs text-slate-500">{ddViewOvName}</p></div>
                        <button onClick={() => { setDdViewOvPkg(null); setDdViewOvName(""); }} className="p-1 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="px-6 py-4 overflow-y-auto flex-1">
                        {allOverrides.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">No date overrides set</p>
                        ) : (
                            <div className="space-y-2">
                                {allOverrides.map((ov: any) => {
                                    const d = new Date(ov.overrideDate);
                                    const dateStr = `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`;
                                    return (
                                        <div key={ov.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div><span className="text-sm font-bold text-slate-700">{dateStr}</span><span className="text-xs text-slate-400 ml-2">({ov.tierLabel})</span></div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-800">₹{ov.price.toLocaleString("en-IN")}</span>
                                                <button onClick={() => deleteDdOverride(ov.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-3 border-t border-slate-100 shrink-0">
                        <button onClick={() => { setDdViewOvPkg(null); setDdViewOvName(""); }} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200">Close</button>
                    </div>
                </div>
            </div>
        );
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

                                {/* DD Override + View Overrides buttons */}
                                <div className="flex gap-2 border-t border-slate-100 px-3 py-2">
                                    <button onClick={() => { setDdOvScreen(scr.id); setDdOvPkg(pkg.id); setDdOvRows(rows); setDdOvName(`${scr.name} — ${pkg.name}`); setDdOvDate(""); setDdOvPrices({}); setDdOvMsg(""); }} className="flex-1 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center justify-center gap-1.5"><Calendar size={12} /> Override</button>
                                    {(() => { const ovCount = rows.reduce((n: number, pr: any) => n + (pr.overrides?.length || 0), 0); return (
                                        <button onClick={() => { setDdViewOvPkg(pkg); setDdViewOvName(`${scr.name} — ${pkg.name}`); }} className="flex-1 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg flex items-center justify-center gap-1.5">Overrides{ovCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">{ovCount}</span>}</button>
                                    ); })()}
                                </div>
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

    return (<>
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div><h1 className="text-2xl font-bold text-slate-800">Properties Management</h1><p className="text-sm text-slate-500 mt-1">Manage pricing, availability, and sub-properties.</p></div>
                <button onClick={() => { setMasterOvOpen(true); setMasterOvMsg(""); setMasterOvSelected(new Set()); setMasterOvPrices({}); setMasterOvSingleDate(""); setMasterOvRangeFrom(""); setMasterOvRangeTo(""); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700"><Calendar size={16} /> Master Override</button>
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">{tabs.map(t => <button key={t.key} onClick={() => { setTab(t.key); setEditId(null); setOverrideId(null); }} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t.key ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>)}</div>
            {loading ? <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-purple-500" size={32} /><p className="text-sm text-slate-500 mt-3">Loading…</p></div>
                : tab === "amstelnest" ? <AmstelNest />
                : tab === "ambrose" ? <AmbrosePage />
                : tab === "digitaldiaries" ? <DDPage />
                : filtered.length === 0 ? <Empty />
                : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{filtered.map(p => renderVillaCard(p))}</div>}
        </div>
        {renderEditModal()}
        {renderOverrideModal()}
        {renderViewOverridesModal()}
        {renderDdOverrideModal()}
        {renderDdViewOverridesModal()}
        {renderMasterOverrideModal()}
    </>);
}

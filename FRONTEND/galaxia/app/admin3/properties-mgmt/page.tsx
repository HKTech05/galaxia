"use client";
import { useState, useEffect, useCallback } from "react";
import { Building, Home, Edit3, Power, Save, X, Loader2, IndianRupee, Ban, Check, Calendar, Plus } from "lucide-react";
import { api } from "../../../lib/api";
type Tab = "standalone" | "amstelnest" | "ambrose" | "digitaldiaries";

export default function PropertiesMgmtPage() {
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("standalone");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPrices, setEditPrices] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [dateOverrideOpen, setDateOverrideOpen] = useState<number | null>(null);
    const [overrideDate, setOverrideDate] = useState("");
    const [overridePrice, setOverridePrice] = useState("");
    const [overrideMsg, setOverrideMsg] = useState("");
    // DD editing
    const [ddEditingPricing, setDdEditingPricing] = useState<Record<number, { weekdayPrice: string; weekendPrice: string }>>({});
    const [ddEditingExtra, setDdEditingExtra] = useState<Record<number, string>>({});

    useEffect(() => { fetch(); }, []);
    const fetch = useCallback(async () => {
        try { setLoading(true); const d = await api.get("/properties/all-nested"); setProperties(d || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    const toggleProp = async (p: any) => { try { await api.patch(`/properties/${p.id}`, { isActive: !p.isActive }); await fetch(); } catch { alert("Failed"); } };
    const toggleSub = async (id: number) => { try { await api.patch(`/properties/sub/${id}/toggle`); await fetch(); } catch { alert("Failed"); } };
    const toggleScreen = async (id: number) => { try { await api.patch(`/properties/dd-screen/${id}/toggle`); await fetch(); } catch { alert("Failed"); } };

    const startEdit = (p: any) => {
        const pr: Record<string, string> = {};
        (p.pricing || []).forEach((t: any) => { if (!t.overrideDate) { pr[`${t.dayType}_base`] = String(t.basePrice || ""); pr[`${t.dayType}_extra`] = String(t.extraAdultPrice || ""); } });
        setEditingId(p.id); setEditPrices(pr);
    };
    const saveEdit = async () => {
        if (!editingId) return; setSaving(true);
        try {
            const body: any = {};
            if (editPrices.weekday_base) body.weekday = parseInt(editPrices.weekday_base);
            if (editPrices.weekend_base) body.weekend = parseInt(editPrices.weekend_base);
            if (editPrices.saturday_base) body.saturday = parseInt(editPrices.saturday_base);
            if (editPrices.weekday_extra) body.extraGuest = parseInt(editPrices.weekday_extra);
            await api.patch(`/properties/${editingId}/pricing`, body);
            setEditingId(null); await fetch();
        } catch { alert("Failed"); } finally { setSaving(false); }
    };

    const saveOverride = async (pid: number) => {
        if (!overrideDate || !overridePrice) return alert("Enter date and price");
        try {
            const r = await api.post(`/properties/${pid}/date-pricing`, { date: overrideDate, price: parseInt(overridePrice) });
            setOverrideMsg(r.message || "Override saved!"); setTimeout(() => { setDateOverrideOpen(null); setOverrideMsg(""); setOverrideDate(""); setOverridePrice(""); fetch(); }, 1200);
        } catch { alert("Failed"); }
    };

    // DD pricing save
    const saveDdPricing = async (pricingId: number) => {
        const e = ddEditingPricing[pricingId]; if (!e) return;
        try { await api.patch(`/properties/dd-package-pricing/${pricingId}`, { weekdayPrice: parseInt(e.weekdayPrice), weekendPrice: parseInt(e.weekendPrice) }); setDdEditingPricing(p => { const n = { ...p }; delete n[pricingId]; return n; }); await fetch(); } catch { alert("Failed"); }
    };
    const saveDdExtra = async (pkgId: number) => {
        const v = ddEditingExtra[pkgId]; if (!v) return;
        try { await api.patch(`/properties/dd-package/${pkgId}`, { extraPersonPrice: parseInt(v) }); setDdEditingExtra(p => { const n = { ...p }; delete n[pkgId]; return n; }); await fetch(); } catch { alert("Failed"); }
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: "standalone", label: "Standalone Villas" }, { key: "amstelnest", label: "Amstel Nest" },
        { key: "ambrose", label: "Ambrose" }, { key: "digitaldiaries", label: "Digital Diaries" },
    ];
    const getFiltered = () => {
        switch (activeTab) {
            case "standalone": return properties.filter(p => p.type === "standalone");
            case "amstelnest": return properties.filter(p => p.slug === "amstel-nest" || (p.name || "").toLowerCase().includes("amstel"));
            case "ambrose": return properties.filter(p => p.slug === "ambrose" || (p.name || "").toLowerCase().includes("ambrose"));
            case "digitaldiaries": return properties.filter(p => p.slug === "digital-diaries");
            default: return [];
        }
    };
    const filtered = getFiltered();
    const getP = (p: any) => {
        const pr = (p.pricing || []).filter((t: any) => !t.overrideDate);
        return { wd: pr.find((t: any) => t.dayType === "weekday"), we: pr.find((t: any) => t.dayType === "weekend"), sa: pr.find((t: any) => t.dayType === "saturday") };
    };

    /* === SHARED COMPONENTS === */
    const PriceRow = ({ label, val }: { label: string; val: number }) => (
        <div className="flex justify-between text-sm"><span className="text-slate-500">{label}</span><span className="text-slate-700 font-bold">₹{(val || 0).toLocaleString("en-IN")}</span></div>
    );
    const PricingShow = ({ prop }: { prop: any }) => { const { wd, we, sa } = getP(prop); return (<div className="space-y-2"><PriceRow label="Mon-Thu" val={wd?.basePrice} /><PriceRow label="Fri/Sun" val={we?.basePrice} />{sa && <PriceRow label="Saturday" val={sa.basePrice} />}{wd?.extraAdultPrice > 0 && <PriceRow label="Extra Guest" val={wd.extraAdultPrice} />}</div>); };

    const NumInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
        <div className="relative"><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={value} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); onChange(v); }} placeholder={placeholder}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500/20 outline-none" /></div>
    );

    const EditForm = ({ prop }: { prop: any }) => {
        if (editingId !== prop.id) return null;
        const { sa } = getP(prop);
        return (<div className="p-4 space-y-3 border-t border-slate-100 bg-purple-50/30">
            {["weekday", "weekend", ...(sa ? ["saturday"] : [])].map(dt => (<div key={dt} className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">{dt === "weekday" ? "Mon-Thu" : dt === "weekend" ? "Fri/Sun" : "Saturday"}</label><NumInput value={editPrices[`${dt}_base`] || ""} onChange={v => setEditPrices({ ...editPrices, [`${dt}_base`]: v })} /></div>))}
            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Extra Guest</label><NumInput value={editPrices.weekday_extra || ""} onChange={v => setEditPrices({ ...editPrices, weekday_extra: v })} /></div>
            <div className="flex gap-2"><button onClick={saveEdit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button><button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"><X size={14} /> Cancel</button></div>
        </div>);
    };

    const OverrideUI = ({ pid }: { pid: number }) => {
        if (dateOverrideOpen !== pid) return null;
        return (<div className="px-5 py-4 bg-indigo-50/50 border-t border-indigo-100 space-y-3">
            {overrideMsg ? <p className="text-sm text-emerald-700 font-bold text-center py-2">✓ {overrideMsg}</p> : (<>
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Set Price for Specific Date</p>
                <div className="flex gap-2"><input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white outline-none" /><NumInput value={overridePrice} onChange={setOverridePrice} placeholder="Price" /></div>
                <button onClick={() => saveOverride(pid)} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"><Plus size={14} className="inline mr-1" />Set Override</button>
            </>)}
        </div>);
    };

    const Btns = ({ prop, showEdit = true }: { prop: any; showEdit?: boolean }) => {
        if (editingId === prop.id) return null;
        return (<div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 flex-wrap">
            {showEdit && <button onClick={() => startEdit(prop)} className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm"><Edit3 size={14} /> Edit Prices</button>}
            <button onClick={() => { setDateOverrideOpen(dateOverrideOpen === prop.id ? null : prop.id); setOverrideDate(""); setOverridePrice(""); setOverrideMsg(""); }} className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600 hover:border-indigo-200 shadow-sm"><Calendar size={14} /> Override</button>
            <button onClick={() => toggleProp(prop)} className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-lg text-sm font-semibold shadow-sm ${prop.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}><Power size={14} /></button>
        </div>);
    };

    /* ========== STANDALONE ========== */
    const Villa = ({ p }: { p: any }) => (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">{p.name}</h3><p className="text-xs text-slate-500">{p.type}</p></div></div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{p.isActive ? "Active" : "Disabled"}</span>
            </div>
            <div className="p-5"><PricingShow prop={p} /></div>
            <EditForm prop={p} /><Btns prop={p} /><OverrideUI pid={p.id} />
        </div>
    );

    /* ========== AMSTEL NEST ========== */
    const AmstelNest = () => {
        const a = filtered[0]; if (!a) return <Empty />;
        const subs = a.subProperties || [];
        const std = subs.filter((s: any) => !s.name.toLowerCase().includes("family") && s.name.toLowerCase() !== "standard cottage");
        const fam = subs.find((s: any) => s.name.toLowerCase().includes("family"));
        return (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">Standard Cottages</h3><p className="text-xs text-slate-500">{std.length} cottages</p></div></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5"><PricingShow prop={a} /></div>
                <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Cottages ({std.filter((s: any) => s.isActive).length}/{std.length} active)</p>
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">{std.map((s: any) => (<button key={s.id} onClick={() => toggleSub(s.id)} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border ${s.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}><span className="truncate">{s.name}</span>{s.isActive ? <Check size={12} /> : <Ban size={12} />}</button>))}</div>
                </div>
                <EditForm prop={a} /><Btns prop={a} /><OverrideUI pid={a.id} />
            </div>
            {fam && (<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">Family Cottage</h3><p className="text-xs text-slate-500">Premium Family Unit</p></div></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${fam.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{fam.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5"><PricingShow prop={a} /><p className="text-xs text-slate-400 italic mt-2">Shares pricing with Standard Cottages</p></div>
                <EditForm prop={a} />
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <button onClick={() => startEdit(a)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 shadow-sm"><Edit3 size={14} /> Edit Prices</button>
                    <button onClick={() => { setDateOverrideOpen(dateOverrideOpen === a.id ? null : a.id); setOverrideDate(""); setOverridePrice(""); setOverrideMsg(""); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600 hover:border-indigo-200 shadow-sm"><Calendar size={14} /> Override</button>
                    <button onClick={() => toggleSub(fam.id)} className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-lg text-sm font-bold ${fam.isActive ? 'bg-white border-red-200 text-red-600' : 'bg-white border-emerald-200 text-emerald-600'}`}><Power size={14} /></button>
                </div>
                <OverrideUI pid={a.id} />
            </div>)}
        </div>);
    };

    /* ========== AMBROSE ========== */
    const Ambrose = () => {
        const a = filtered[0]; if (!a) return <Empty />;
        const villas = a.subProperties || [];
        return (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {villas.map((v: any) => (<div key={v.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600"><Home size={18} /></div><h3 className="font-bold text-slate-800">{v.name}</h3></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5"><PricingShow prop={a} /></div>
                <EditForm prop={a} />
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <button onClick={() => startEdit(a)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 shadow-sm"><Edit3 size={14} /> Edit</button>
                    <button onClick={() => { setDateOverrideOpen(dateOverrideOpen === a.id ? null : a.id); setOverrideDate(""); setOverridePrice(""); setOverrideMsg(""); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600 hover:border-indigo-200 shadow-sm"><Calendar size={14} /> Override</button>
                    <button onClick={() => toggleSub(v.id)} className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-lg text-sm font-bold ${v.isActive ? 'bg-white border-red-200 text-red-600' : 'bg-white border-emerald-200 text-emerald-600'}`}><Power size={14} /></button>
                </div>
                <OverrideUI pid={a.id} />
            </div>))}
        </div>);
    };

    /* ========== DIGITAL DIARIES ========== */
    const DD = () => {
        const dd = filtered[0]; if (!dd) return <Empty />;
        const screens = dd.ddScreens || [];
        const packages = dd.ddPackages || [];

        return (<div className="space-y-6">
            {/* 4 Screen Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screens.map((scr: any) => (
                    <div key={scr.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600"><Building size={20} /></div>
                                <div><h3 className="font-bold text-slate-800">{scr.name}</h3><p className="text-xs text-slate-500">{scr.theme}</p></div>
                            </div>
                            <button onClick={() => toggleScreen(scr.id)} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${scr.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>{scr.isActive ? "Active" : "Disabled"}</button>
                        </div>
                        {/* Package pricing for this screen (shared) */}
                        <div className="p-4 space-y-4">
                            {packages.map((pkg: any) => {
                                const rows = Array.isArray(pkg.pricing) ? pkg.pricing : [];
                                return (<div key={pkg.id} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-bold text-indigo-700 uppercase">{pkg.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">Extra/person:</span>
                                            {ddEditingExtra[pkg.id] !== undefined ? (
                                                <div className="flex items-center gap-1">
                                                    <input type="text" inputMode="numeric" value={ddEditingExtra[pkg.id]} onChange={e => setDdEditingExtra({ ...ddEditingExtra, [pkg.id]: e.target.value.replace(/[^0-9]/g, '') })} className="w-16 px-2 py-1 border rounded text-xs font-bold text-center" />
                                                    <button onClick={() => saveDdExtra(pkg.id)} className="text-emerald-600 hover:text-emerald-700"><Save size={12} /></button>
                                                    <button onClick={() => setDdEditingExtra(p => { const n = { ...p }; delete n[pkg.id]; return n; })} className="text-red-400 hover:text-red-500"><X size={12} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDdEditingExtra({ ...ddEditingExtra, [pkg.id]: String(pkg.extraPersonPrice || 0) })} className="text-xs font-bold text-slate-700 hover:text-purple-600 underline decoration-dashed cursor-pointer">₹{pkg.extraPersonPrice || 0}</button>
                                            )}
                                        </div>
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead><tr className="bg-slate-50"><th className="text-left px-3 py-1.5 font-bold text-slate-500">Duration</th><th className="text-center px-3 py-1.5 font-bold text-slate-500">Weekday</th><th className="text-center px-3 py-1.5 font-bold text-slate-500">Weekend</th><th className="w-16"></th></tr></thead>
                                        <tbody>{rows.map((pr: any) => (
                                            <tr key={pr.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2 font-medium text-slate-700">{pr.hours}hr{pr.label ? ` (${pr.label})` : ''}</td>
                                                {ddEditingPricing[pr.id] ? (<>
                                                    <td className="px-2 py-1"><input type="text" inputMode="numeric" value={ddEditingPricing[pr.id].weekdayPrice} onChange={e => setDdEditingPricing({ ...ddEditingPricing, [pr.id]: { ...ddEditingPricing[pr.id], weekdayPrice: e.target.value.replace(/[^0-9]/g, '') } })} className="w-full px-2 py-1 border rounded text-xs font-bold text-center" /></td>
                                                    <td className="px-2 py-1"><input type="text" inputMode="numeric" value={ddEditingPricing[pr.id].weekendPrice} onChange={e => setDdEditingPricing({ ...ddEditingPricing, [pr.id]: { ...ddEditingPricing[pr.id], weekendPrice: e.target.value.replace(/[^0-9]/g, '') } })} className="w-full px-2 py-1 border rounded text-xs font-bold text-center" /></td>
                                                    <td className="px-1 py-1 flex gap-1 justify-center"><button onClick={() => saveDdPricing(pr.id)} className="text-emerald-600"><Save size={12} /></button><button onClick={() => setDdEditingPricing(p => { const n = { ...p }; delete n[pr.id]; return n; })} className="text-red-400"><X size={12} /></button></td>
                                                </>) : (<>
                                                    <td className="px-3 py-2 text-center font-bold text-slate-800">₹{(pr.weekdayPrice || 0).toLocaleString("en-IN")}</td>
                                                    <td className="px-3 py-2 text-center font-bold text-slate-800">₹{(pr.weekendPrice || 0).toLocaleString("en-IN")}</td>
                                                    <td className="px-1 py-2 text-center"><button onClick={() => setDdEditingPricing({ ...ddEditingPricing, [pr.id]: { weekdayPrice: String(pr.weekdayPrice || 0), weekendPrice: String(pr.weekendPrice || 0) } })} className="text-purple-500 hover:text-purple-700"><Edit3 size={12} /></button></td>
                                                </>)}
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>);
                            })}
                        </div>
                        {/* Master disable */}
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                            <button onClick={() => toggleScreen(scr.id)} className={`w-full flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-bold ${scr.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}><Power size={14} /> {scr.isActive ? 'Disable Screen' : 'Enable Screen'}</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add-ons Section */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-800">Add-ons</h3><p className="text-xs text-slate-500">Balloons, LED Banner, Cake pricing</p></div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[{ name: "Balloons", price: 500 }, { name: "LED Banner", price: 300 }, { name: "Cake (250g)", price: 450 }].map(addon => (
                        <div key={addon.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-amber-50/30">
                            <span className="text-sm font-medium text-slate-700">{addon.name}</span>
                            <span className="text-sm font-bold text-slate-800">₹{addon.price}</span>
                        </div>
                    ))}
                </div>
                <div className="px-5 pb-4"><p className="text-[10px] text-slate-400 text-center">Add-on prices are included in the celebration package. Update in database if changes needed.</p></div>
            </div>
        </div>);
    };

    const Empty = () => <div className="text-center py-20 text-slate-500">No properties found.</div>;

    return (<div className="max-w-7xl mx-auto space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-800">Properties Management</h1><p className="text-sm text-slate-500 mt-1">Manage pricing, availability, and sub-properties.</p></div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {tabs.map(t => <button key={t.key} onClick={() => { setActiveTab(t.key); setEditingId(null); setDateOverrideOpen(null); }} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === t.key ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>)}
        </div>
        {loading ? <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-purple-500" size={32} /><p className="text-sm text-slate-500 mt-3">Loading…</p></div>
        : activeTab === "amstelnest" ? <AmstelNest />
        : activeTab === "ambrose" ? <Ambrose />
        : activeTab === "digitaldiaries" ? <DD />
        : filtered.length === 0 ? <Empty />
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{filtered.map(p => <Villa key={p.id} p={p} />)}</div>}
    </div>);
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { Building, Home, Edit3, Power, Save, X, Loader2, IndianRupee, Ban, Check, Calendar, Plus } from "lucide-react";
import { api } from "../../../lib/api";
type Tab = "standalone" | "amstelnest" | "ambrose" | "digitaldiaries";

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
    const [ddEdit, setDdEdit] = useState<Record<number, { wd: string; we: string }>>({});
    const [ddExEdit, setDdExEdit] = useState<Record<number, string>>({});

    useEffect(() => { load(); }, []);
    const load = useCallback(async () => {
        try { setLoading(true); const d = await api.get("/properties/all-nested"); setProps(d || []); } catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    const toggleProp = async (p: any) => { try { await api.patch(`/properties/${p.id}`, { isActive: !p.isActive }); await load(); } catch { alert("Failed"); } };
    const toggleSub = async (id: number) => { try { await api.patch(`/properties/sub/${id}/toggle`); await load(); } catch { alert("Failed"); } };
    const toggleScreen = async (id: number) => { try { await api.patch(`/properties/dd-screen/${id}/toggle`); await load(); } catch { alert("Failed"); } };

    // Get pricing: prefers sub-property pricing, falls back to parent
    const getPrice = (prop: any, sub?: any) => {
        const src = (sub?.pricing?.length > 0 ? sub.pricing : prop.pricing) || [];
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
        const e = ddEdit[prId]; if (!e) return;
        try { await api.patch(`/properties/dd-package-pricing/${prId}`, { weekdayPrice: parseInt(e.wd), weekendPrice: parseInt(e.we) }); setDdEdit(p => { const n = { ...p }; delete n[prId]; return n; }); await load(); } catch { alert("Failed"); }
    };
    const saveDdEx = async (pkgId: number) => {
        const v = ddExEdit[pkgId]; if (!v) return;
        try { await api.patch(`/properties/dd-package/${pkgId}`, { extraPersonPrice: parseInt(v) }); setDdExEdit(p => { const n = { ...p }; delete n[pkgId]; return n; }); await load(); } catch { alert("Failed"); }
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
                <div className="flex gap-2"><input type="date" value={ovDate} onChange={e => setOvDate(e.target.value)} className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white outline-none" /><NI value={ovPrice} onChange={setOvPrice} placeholder="Price" className="flex-1" /></div>
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
        return (<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
        const std = subs.filter((s: any) => !s.name.toLowerCase().includes("family") && s.name.toLowerCase() !== "standard cottage");
        const fam = subs.find((s: any) => s.name.toLowerCase().includes("family"));
        return (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Cottages card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div><div><h3 className="font-bold text-slate-800">Standard Cottages</h3><p className="text-xs text-slate-500">{std.length} cottages</p></div></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5"><PrShow prop={a} sub={std[0]} /></div>
                <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Cottages ({std.filter((s: any) => s.isActive).length}/{std.length} active)</p>
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">{std.map((s: any) => <button key={s.id} onClick={() => toggleSub(s.id)} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border ${s.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}><span className="truncate">{s.name}</span>{s.isActive ? <Check size={12} /> : <Ban size={12} />}</button>)}</div>
                </div>
                <EditForm editKey={std[0] ? `sub-${std[0].id}` : `prop-${a.id}`} />
                <CardBtns editKey={std[0] ? `sub-${std[0].id}` : `prop-${a.id}`} onToggle={() => toggleProp(a)} />
                <OverrideUI oKey={std[0] ? `sub-${std[0].id}` : `prop-${a.id}`} />
            </div>
            {/* Family Cottage card */}
            {fam && (<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
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
                return (<div key={v.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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

        return (<div className="space-y-6">
            {/* Screens — enable/disable only */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600"><Building size={20} /></div><div><h3 className="font-bold text-slate-800">Screens</h3><p className="text-xs text-slate-500">{screens.length} screens</p></div></div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${dd.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{dd.isActive ? "Active" : "Disabled"}</span>
                </div>
                <div className="p-5">
                    {screens.length === 0 ? <p className="text-sm text-slate-400">No screens in database.</p> : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{screens.map((s: any) => (
                            <button key={s.id} onClick={() => toggleScreen(s.id)} className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl text-sm font-bold border transition-colors ${s.isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>
                                <span className="font-bold">{s.name}</span><span className="text-[10px] font-medium opacity-70">{s.theme}</span>{s.isActive ? <Check size={14} /> : <Ban size={14} />}
                            </button>
                        ))}</div>
                    )}
                </div>
            </div>

            {/* Packages — shared pricing, editable */}
            {pkgs.map((pkg: any) => {
                const rows = Array.isArray(pkg.pricing) ? pkg.pricing : [];
                return (<div key={pkg.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-lg">{pkg.name}</h3>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-400">Extra/person:</span>
                            {ddExEdit[pkg.id] !== undefined ? (<div className="flex items-center gap-2">
                                <input type="text" inputMode="numeric" value={ddExEdit[pkg.id]} onChange={e => setDdExEdit({ ...ddExEdit, [pkg.id]: e.target.value.replace(/[^0-9]/g, "") })} className="w-20 px-2 py-1.5 border rounded-lg text-sm font-bold text-center" />
                                <button onClick={() => saveDdEx(pkg.id)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Save size={14} /></button>
                                <button onClick={() => setDdExEdit(p => { const n = { ...p }; delete n[pkg.id]; return n; })} className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200"><X size={14} /></button>
                            </div>) : (
                                <button onClick={() => setDdExEdit({ ...ddExEdit, [pkg.id]: String(pkg.extraPersonPrice || 0) })} className="font-bold text-slate-700 hover:text-purple-600 underline decoration-dashed">₹{pkg.extraPersonPrice || 0}</button>
                            )}
                        </div>
                    </div>
                    <div className="p-4">
                        {/* Inclusions */}
                        {pkg.inclusions && (() => { const inc = Array.isArray(pkg.inclusions) ? pkg.inclusions : (typeof pkg.inclusions === "object" ? Object.values(pkg.inclusions) : []); return inc.length > 0 ? (<div className="mb-4"><p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Inclusions</p><div className="flex flex-wrap gap-1.5">{inc.map((i: string, x: number) => <span key={x} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{String(i)}</span>)}</div></div>) : null; })()}
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50"><th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase">Duration</th><th className="text-center px-4 py-2 text-xs font-bold text-slate-500 uppercase">Weekday</th><th className="text-center px-4 py-2 text-xs font-bold text-slate-500 uppercase">Weekend</th><th className="w-24"></th></tr></thead>
                            <tbody>{rows.map((pr: any) => (
                                <tr key={pr.id} className="border-t border-slate-100">
                                    <td className="px-4 py-3 font-medium text-slate-700">{pr.hours} {pr.hours === 1 ? 'Hour' : 'Hours'}{pr.label ? ` (${pr.label})` : ''}</td>
                                    {ddEdit[pr.id] ? (<>
                                        <td className="px-2 py-2"><input type="text" inputMode="numeric" value={ddEdit[pr.id].wd} onChange={e => setDdEdit({ ...ddEdit, [pr.id]: { ...ddEdit[pr.id], wd: e.target.value.replace(/[^0-9]/g, "") } })} className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-center" /></td>
                                        <td className="px-2 py-2"><input type="text" inputMode="numeric" value={ddEdit[pr.id].we} onChange={e => setDdEdit({ ...ddEdit, [pr.id]: { ...ddEdit[pr.id], we: e.target.value.replace(/[^0-9]/g, "") } })} className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-center" /></td>
                                        <td className="px-2 py-2 flex gap-1.5 justify-center">
                                            <button onClick={() => saveDdPr(pr.id)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Save size={16} /></button>
                                            <button onClick={() => setDdEdit(p => { const n = { ...p }; delete n[pr.id]; return n; })} className="p-2 bg-red-100 text-red-500 rounded-lg hover:bg-red-200"><X size={16} /></button>
                                        </td>
                                    </>) : (<>
                                        <td className="px-4 py-3 text-center font-bold text-slate-800">₹{(pr.weekdayPrice || 0).toLocaleString("en-IN")}</td>
                                        <td className="px-4 py-3 text-center font-bold text-slate-800">₹{(pr.weekendPrice || 0).toLocaleString("en-IN")}</td>
                                        <td className="px-4 py-3 text-center"><button onClick={() => setDdEdit({ ...ddEdit, [pr.id]: { wd: String(pr.weekdayPrice || 0), we: String(pr.weekendPrice || 0) } })} className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg"><Edit3 size={16} /></button></td>
                                    </>)}
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>);
            })}

            {/* Add-ons */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-800">Add-ons</h3><p className="text-xs text-slate-500">Extra charges applied during booking</p></div>
                <div className="p-5 space-y-3">
                    {[
                        { key: "balloons", label: "Balloons", defaultPrice: 500 },
                        { key: "led_banner", label: "LED Banner", defaultPrice: 300 },
                        { key: "cake", label: "Cake (250g)", defaultPrice: 450 },
                    ].map(addon => (
                        <div key={addon.key} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-amber-50/30">
                            <span className="text-sm font-medium text-slate-700">{addon.label}</span>
                            <span className="text-sm font-bold text-slate-800">₹{addon.defaultPrice}</span>
                        </div>
                    ))}
                    <p className="text-[10px] text-slate-400 text-center">Add-on pricing is set per booking. Master add-on pricing table coming soon.</p>
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

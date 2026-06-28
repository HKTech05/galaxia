"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    ChefHat, 
    Search, 
    Plus, 
    Trash2, 
    Check, 
    Loader2, 
    FileText, 
    AlertCircle, 
    Calendar,
    User,
    ClipboardCheck,
    Download,
    Coffee,
    RefreshCw
} from "lucide-react";
import { api } from "../../../lib/api";

interface Ingredient {
    id: number;
    nameEn: string;
    nameHi: string;
    category: string;
    unit: string;
    createdAt: string;
}

interface ChefLog {
    id: number;
    adminId: number;
    actionType: string;
    details: string;
    createdAt: string;
    admin?: {
        username: string;
        displayName: string;
        role: string;
    };
}

export default function ChefPortalPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [logs, setLogs] = useState<ChefLog[]>([]);
    const [userRole, setUserRole] = useState<string>("");
    const [userName, setUserName] = useState<string>("");
    const [loadingIngredients, setLoadingIngredients] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    
    // Search & Add State
    const [searchTerm, setSearchTerm] = useState("");
    const [newIngredientName, setNewIngredientName] = useState("");
    const [newIngredientCategory, setNewIngredientCategory] = useState("Dairy");
    const [newIngredientUnit, setNewIngredientUnit] = useState("kg");
    const [addingIngredient, setAddingIngredient] = useState(false);
    const [addError, setAddError] = useState("");

    // Checklist Selection State
    // Format: { [id]: quantity_string }
    const [selectedQuantities, setSelectedQuantities] = useState<Record<number, string>>({});
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [activeIngredient, setActiveIngredient] = useState<Ingredient | null>(null);
    const [tempQuantity, setTempQuantity] = useState("0.5kg");
    const [selectedBrand, setSelectedBrand] = useState("Thumps Up");
    const [selectedVolume, setSelectedVolume] = useState("0.25L");
    const [tempColdDrinks, setTempColdDrinks] = useState<Record<string, string>>({});

    // Submission State
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    // High Tea Requests
    const [highTeaRequests, setHighTeaRequests] = useState<any[]>([]);
    const [loadingHighTea, setLoadingHighTea] = useState(false);
    const [highTeaTab, setHighTeaTab] = useState<"active" | "fulfilled">("active");

    // Timepass Requests
    const [timepassRequests, setTimepassRequests] = useState<any[]>([]);
    const [loadingTimepass, setLoadingTimepass] = useState(false);

    // Chef New Request Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formVilla, setFormVilla] = useState("");
    const [formCategory, setFormCategory] = useState<"High Tea" | "Timepass" | "Normal">("High Tea");
    const [formQuantities, setFormQuantities] = useState<Record<string, number>>({});
    const [formComments, setFormComments] = useState<Record<string, string>>({});
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [modalSubmitting, setModalSubmitting] = useState(false);

    useEffect(() => {
        api.get<any[]>("/hospitality/menu").then(data => {
            if (Array.isArray(data)) setMenuItems(data);
        }).catch(() => {});
    }, []);

    const handleChefCreateSubmit = async () => {
        if (!formVilla.trim()) {
            alert("Please enter a Villa / Screen name.");
            return;
        }
        const selectedItems = Object.entries(formQuantities).map(([itemId, qty]) => {
            const item = menuItems.find(m => m.id === itemId);
            return {
                name: item?.name || "",
                quantity: qty,
                price: item?.price || 0,
                category: item?.category || formCategory,
                comment: formComments[itemId] || ""
            };
        });

        if (selectedItems.length === 0) {
            alert("Please select at least one item.");
            return;
        }

        setModalSubmitting(true);
        try {
            await api.post("/hospitality/requests", {
                villaName: formVilla,
                itemCategory: formCategory,
                items: selectedItems
            });
            setIsCreateModalOpen(false);
            setFormVilla("");
            setFormQuantities({});
            fetchHighTeaRequests();
            fetchTimepassRequests();
            alert("Request created successfully!");
        } catch (err: any) {
            alert(err.message || "Failed to create request.");
        } finally {
            setModalSubmitting(false);
        }
    };

    const isOwnerOrDev = userRole === "owner" || userRole === "developer";

    // Generate dynamic quantity options based on unit
    const getQuantityOptions = (unit: string) => {
        const arr = [];
        if (unit === "kg" || unit === "L") {
            for (let i = 0.5; i <= 20; i += 0.5) {
                arr.push(`${i.toFixed(1).replace(".0", "")}${unit}`);
            }
        } else if (unit === "packet") {
            for (let i = 1; i <= 10; i++) {
                arr.push(`${i} packet${i > 1 ? "s" : ""}`);
            }
        } else if (unit === "piece") {
            for (let i = 1; i <= 15; i++) {
                arr.push(`${i} piece${i > 1 ? "s" : ""}`);
            }
        } else if (unit === "disposable_glass") {
            for (let i = 10; i <= 100; i += 10) {
                arr.push(`${i} glasses`);
            }
        } else {
            // Fallback
            for (let i = 1; i <= 20; i++) {
                arr.push(`${i}kg`);
            }
        }
        return arr;
    };

    // Cold drink brand options
    const BRANDS = ["Thumps Up", "Pepsi", "Soda", "Sprite", "Coca Cola", "Fanta", "Limca"];

    // Cold drink volume options (0.25L to 10L in steps of 0.25L)
    const volumes = useMemo(() => {
        const arr = [];
        for (let v = 0.25; v <= 10.0; v += 0.25) {
            const str = Number(v.toFixed(2)).toString();
            arr.push(`${str}L`);
        }
        return arr;
    }, []);

    // Load initial profile, ingredients, and audit logs
    useEffect(() => {
        // Fetch current user role
        api.get("/auth/me")
            .then(data => {
                setUserRole(data?.role || "");
                setUserName(data?.displayName || data?.username || "Staff");
            })
            .catch(err => {
                console.error("Error fetching auth details:", err);
            });

        // Fetch all ingredients
        fetchIngredients();
    }, []);

    // Load logs only if owner/developer
    useEffect(() => {
        if (isOwnerOrDev) {
            fetchLogs();
        }
    }, [userRole]);

    const fetchHighTeaRequests = async () => {
        setLoadingHighTea(true);
        try {
            const data = await api.get<any[]>("/hospitality/requests?category=High Tea");
            if (Array.isArray(data)) {
                setHighTeaRequests(data);
            }
        } catch (err) {
            console.error("Error fetching high tea requests:", err);
        } finally {
            setLoadingHighTea(false);
        }
    };

    const fetchTimepassRequests = async () => {
        setLoadingTimepass(true);
        try {
            const data = await api.get<any[]>("/hospitality/requests?category=Timepass");
            if (Array.isArray(data)) {
                setTimepassRequests(data);
            }
        } catch (err) {
            console.error("Error fetching timepass requests:", err);
        } finally {
            setLoadingTimepass(false);
        }
    };

    useEffect(() => {
        if (userRole === "chef" || userRole === "owner" || userRole === "developer") {
            fetchHighTeaRequests();
            fetchTimepassRequests();
        }
    }, [userRole]);

    const handleFulfilHighTea = async (id: number) => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: "fulfilled"
            });
            if (res.success) {
                setHighTeaRequests(prev => 
                    prev.map(r => r.id === id ? { ...r, status: "fulfilled" } : r)
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update high tea request.");
        }
    };

    const handleFulfilTimepass = async (id: number) => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: "fulfilled"
            });
            if (res.success) {
                setTimepassRequests(prev => 
                    prev.map(r => r.id === id ? { ...r, status: "fulfilled" } : r)
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update timepass request.");
        }
    };

    const fetchIngredients = async () => {
        setLoadingIngredients(true);
        try {
            const data = await api.get<Ingredient[]>("/chef/ingredients");
            if (Array.isArray(data)) {
                setIngredients(data);
            }
        } catch (err: any) {
            console.error("Error fetching ingredients:", err);
        } finally {
            setLoadingIngredients(false);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const data = await api.get<ChefLog[]>("/chef/logs");
            if (Array.isArray(data)) {
                setLogs(data);
            }
        } catch (err: any) {
            console.error("Error fetching logs:", err);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Filter ingredients based on English or Hindi names
    const filteredIngredients = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return ingredients;
        return ingredients.filter(ing => 
            ing.nameEn.toLowerCase().includes(query) || 
            ing.nameHi.toLowerCase().includes(query)
        );
    }, [ingredients, searchTerm]);

    // Handle when checkbox is clicked
    const handleCheckboxChange = (ingredient: Ingredient, isCheckboxClick: boolean = false) => {
        const isChecked = !!selectedQuantities[ingredient.id];
        
        if (isChecked && isCheckboxClick) {
            // Checked and checkbox clicked: uncheck directly
            const updated = { ...selectedQuantities };
            delete updated[ingredient.id];
            setSelectedQuantities(updated);
        } else {
            // Open centered modal to select/edit quantity
            setActiveIngredient(ingredient);
            const currentVal = selectedQuantities[ingredient.id] || "";
            
            if (ingredient.unit === "cold_drink") {
                // Parse existing selections
                const initialTemp: Record<string, string> = {};
                if (currentVal) {
                    const parts = currentVal.split(", ");
                    for (const part of parts) {
                        const matchedBrand = BRANDS.find(brand => part.startsWith(brand));
                        if (matchedBrand) {
                            const vol = part.substring(matchedBrand.length).trim();
                            initialTemp[matchedBrand] = vol;
                        }
                    }
                }
                setTempColdDrinks(initialTemp);
            } else {
                // For other ingredients, pre-select the existing quantity or fallback to default
                if (currentVal) {
                    setTempQuantity(currentVal);
                } else {
                    if (ingredient.unit === "disposable_glass") {
                        setTempQuantity("10 glasses");
                    } else if (ingredient.unit === "piece") {
                        setTempQuantity("1 piece");
                    } else if (ingredient.unit === "packet") {
                        setTempQuantity("1 packet");
                    } else if (ingredient.unit === "L") {
                        setTempQuantity("0.5L");
                    } else {
                        setTempQuantity("0.5kg"); // kg
                    }
                }
            }
            setModalOpen(true);
        }
    };

    // Confirm Quantity from Modal
    const handleConfirmQuantity = () => {
        if (!activeIngredient) return;
        
        let finalQty = tempQuantity;
        if (activeIngredient.unit === "cold_drink") {
            const selections = Object.entries(tempColdDrinks)
                .filter(([_, vol]) => vol && vol !== "None")
                .map(([brand, vol]) => `${brand} ${vol}`);
            
            if (selections.length === 0) {
                // If nothing selected, uncheck it
                const updated = { ...selectedQuantities };
                delete updated[activeIngredient.id];
                setSelectedQuantities(updated);
                setModalOpen(false);
                setActiveIngredient(null);
                return;
            }
            finalQty = selections.join(", ");
        }
        
        setSelectedQuantities(prev => ({
            ...prev,
            [activeIngredient.id]: finalQty
        }));
        
        setModalOpen(false);
        setActiveIngredient(null);
    };

    // Cancel Quantity Modal
    const handleCancelModal = () => {
        setModalOpen(false);
        setActiveIngredient(null);
    };

    // Add New Ingredient (En -> Auto Hi)
    const handleAddIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newIngredientName.trim();
        if (!name) return;

        setAddingIngredient(true);
        setAddError("");
        try {
            const newIng = await api.post<Ingredient>("/chef/ingredients", { 
                nameEn: name,
                category: newIngredientCategory,
                unit: newIngredientUnit
            });
            setIngredients(prev => [newIng, ...prev].sort((a, b) => a.nameEn.localeCompare(b.nameEn)));
            setNewIngredientName("");
            
            // Reload logs to capture the addition if owner
            if (isOwnerOrDev) {
                fetchLogs();
            }
        } catch (err: any) {
            setAddError(err.message || "Failed to add ingredient.");
        } finally {
            setAddingIngredient(false);
        }
    };

    // Delete Ingredient (Owner/Dev only)
    const handleDeleteIngredient = async (id: number) => {
        if (!confirm("Are you sure you want to delete this ingredient? This will log this deletion.")) return;
        
        try {
            await api.delete(`/chef/ingredients/${id}`);
            setIngredients(prev => prev.filter(ing => ing.id !== id));
            // Remove from selected list if it was checked
            if (selectedQuantities[id]) {
                const updated = { ...selectedQuantities };
                delete updated[id];
                setSelectedQuantities(updated);
            }
            if (isOwnerOrDev) {
                fetchLogs();
            }
        } catch (err: any) {
            alert(err.message || "Failed to delete ingredient.");
        }
    };

    // Done / Submit Checklist
    const handleSubmitChecklist = async () => {
        const selectedIds = Object.keys(selectedQuantities).map(Number);
        if (selectedIds.length === 0) {
            alert("Please select at least one ingredient and specify quantity.");
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        setSubmitSuccess(false);

        // Map selections to structure expected by endpoint
        const submissionList = selectedIds.map(id => {
            const ing = ingredients.find(i => i.id === id);
            return {
                nameEn: ing?.nameEn || "",
                nameHi: ing?.nameHi || "",
                category: ing?.category || "Dairy",
                unit: ing?.unit || "kg",
                quantity: selectedQuantities[id]
            };
        });

        try {
            const todayStr = new Date().toISOString().split("T")[0];
            const res = await api.post("/chef/submit", {
                ingredients: submissionList,
                date: todayStr
            });

            if (res.success) {
                setSubmitSuccess(true);
                // Clear selections upon success
                setSelectedQuantities({});
                
                if (isOwnerOrDev) {
                    fetchLogs();
                }
            } else {
                throw new Error("Failed to submit checklist.");
            }
        } catch (err: any) {
            setSubmitError(err.message || "Failed to submit checklist. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to count selected items
    const selectedCount = Object.keys(selectedQuantities).length;

    // Helper to format date in Hindi/English representation
    const getTodayDateString = () => {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString("en-IN", options);
    };

    // Parse audit log action text to readable sentence
    const renderLogAction = (log: ChefLog) => {
        let detailsObj: any = {};
        try {
            detailsObj = JSON.parse(log.details);
        } catch (_) {}

        switch (log.actionType) {
            case "add_ingredient":
                return `Added ingredient: "${detailsObj.nameEn || ""}" (${detailsObj.nameHi || ""})`;
            case "delete_ingredient":
                return `Deleted ingredient: "${detailsObj.nameEn || ""}" (${detailsObj.nameHi || ""})`;
            case "submit_order":
                const count = detailsObj.ingredients?.length || 0;
                return `Submitted a kitchen checklist with ${count} items for ${detailsObj.date || ""}`;
            default:
                return `Performed action: ${log.actionType}`;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 sm:p-8 shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-transparent border-none">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                            <ChefHat size={36} className="text-purple-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Chef Portal</h1>
                            <p className="text-purple-200 text-xs sm:text-sm font-medium mt-1">
                                Manage daily ingredients requirements and submit supply checklists.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-black/20 px-4 py-2.5 rounded-xl border border-white/5 self-start md:self-auto">
                        <Calendar size={18} className="text-purple-300" />
                        <span className="text-xs sm:text-sm font-semibold tracking-wide font-mono text-purple-100">
                            {getTodayDateString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* High Tea & Timepass Requests Dashboard (only for chef/owner/dev) */}
            {(userRole === "chef" || userRole === "owner" || userRole === "developer") && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* High Tea Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Coffee size={20} className="text-purple-600" />
                                High Tea Requests
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setFormCategory("High Tea"); setIsCreateModalOpen(true); }}
                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                    <Plus size={14} />
                                    New Request
                                </button>
                                <button
                                    onClick={fetchHighTeaRequests}
                                    disabled={loadingHighTea}
                                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
                                >
                                    <RefreshCw size={12} className={loadingHighTea ? "animate-spin" : ""} />
                                    Refresh Orders
                                </button>
                            </div>
                        </div>

                        {/* Tabs for Active / Fulfilled */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                            <button
                                onClick={() => setHighTeaTab("active")}
                                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                                    highTeaTab === "active" 
                                        ? "bg-white text-purple-700 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Active ({highTeaRequests.filter(r => r.status === "pending").length})
                            </button>
                            <button
                                onClick={() => setHighTeaTab("fulfilled")}
                                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                                    highTeaTab === "fulfilled" 
                                        ? "bg-white text-purple-700 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Fulfilled ({highTeaRequests.filter(r => r.status === "fulfilled").length})
                            </button>
                        </div>

                        {loadingHighTea ? (
                            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                <RefreshCw size={18} className="animate-spin text-purple-600" />
                                <span className="text-xs font-semibold">Loading orders...</span>
                            </div>
                        ) : highTeaTab === "active" ? (
                            highTeaRequests.filter(r => r.status === "pending").length === 0 ? (
                                <p className="text-center py-8 text-slate-400 text-sm">No pending High Tea orders.</p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {highTeaRequests.filter(r => r.status === "pending").map((req) => (
                                        <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 flex flex-col justify-between hover:shadow-sm transition-shadow">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                                                    <div>
                                                        <h3 className="font-extrabold text-slate-800 text-sm">{req.villaName}</h3>
                                                        {req.booking ? (
                                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{req.booking.customerName} ({req.booking.bookingRef})</p>
                                                        ) : (
                                                            <p className="text-[10px] text-red-500 font-bold mt-0.5">No active booking today</p>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200/40 px-1.5 py-0.5 rounded">
                                                        {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        })}
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    {req.items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-xs text-slate-700 font-medium">
                                                            <span>
                                                                {item.name}
                                                                {item.comment && (
                                                                    <span className="text-slate-500 font-normal italic ml-1.5 text-[10px]">
                                                                        ({item.comment})
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100/50">× {item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-2 flex justify-end">
                                                <button
                                                    onClick={() => handleFulfilHighTea(req.id)}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                                                >
                                                    <Check size={12} className="stroke-[3px]" />
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            highTeaRequests.filter(r => r.status === "fulfilled").length === 0 ? (
                                <p className="text-center py-8 text-slate-400 text-sm">No past High Tea orders.</p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {highTeaRequests.filter(r => r.status === "fulfilled").map((req) => (
                                        <div key={req.id} className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-200/50 pb-1.5">
                                                <span className="text-slate-700 font-bold text-xs">{req.villaName}</span>
                                                <span className="font-mono">
                                                    {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                {req.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-[11px] text-slate-600 font-medium">
                                                        <span>
                                                            {item.name}
                                                            {item.comment && (
                                                                <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-100/50 px-1 py-0.2 rounded ml-1 font-semibold">
                                                                    ({item.comment})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="font-mono text-slate-400 font-bold">×{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between gap-2 border-t border-slate-200/40 pt-2 mt-1">
                                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg flex-1">
                                                    <span className="font-bold flex items-center gap-1">
                                                        <Check size={10} className="stroke-[3px]" />
                                                        Fulfilled
                                                    </span>
                                                    <span className="text-slate-300">|</span>
                                                    {req.isBilled ? (
                                                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">Billed</span>
                                                    ) : (
                                                        <span className="text-slate-400 font-semibold">Unbilled</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>

                    {/* Timepass Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Coffee size={20} className="text-indigo-600" />
                                Active Timepass Order Requests
                            </h2>
                            <button
                                onClick={fetchTimepassRequests}
                                disabled={loadingTimepass}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={loadingTimepass ? "animate-spin" : ""} />
                                Refresh Orders
                            </button>
                        </div>

                        {loadingTimepass ? (
                            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                <RefreshCw size={18} className="animate-spin text-indigo-600" />
                                <span className="text-xs font-semibold">Loading orders...</span>
                            </div>
                        ) : timepassRequests.filter(r => r.status === "pending").length === 0 ? (
                            <p className="text-center py-8 text-slate-400 text-sm">No pending Timepass orders.</p>
                        ) : (
                            <div className="space-y-4">
                                {timepassRequests.filter(r => r.status === "pending").map((req) => (
                                    <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 flex flex-col justify-between hover:shadow-sm transition-shadow">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                                                <div>
                                                    <h3 className="font-extrabold text-slate-800 text-sm">{req.villaName}</h3>
                                                    {req.booking ? (
                                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{req.booking.customerName} ({req.booking.bookingRef})</p>
                                                    ) : (
                                                        <p className="text-[10px] text-red-500 font-bold mt-0.5">No active booking today</p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200/40 px-1.5 py-0.5 rounded">
                                                    {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                {req.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs text-slate-700 font-medium">
                                                        <span>
                                                            {item.name}
                                                            {item.comment && (
                                                                <span className="text-slate-500 font-normal italic ml-1.5 text-[10px]">
                                                                    ({item.comment})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100/50">× {item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button
                                                onClick={() => handleFulfilTimepass(req.id)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                                            >
                                                <Check size={12} className="stroke-[3px]" />
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Columns (Checklist & Search & Add) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Add Ingredient & Search Bar */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardCheck size={20} className="text-purple-600" />
                                Ingredient Checklist
                            </h2>
                            
                            {/* Search bar */}
                            <div className="relative flex-1 max-w-xs">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        {/* Inline Add Form */}
                        <form onSubmit={handleAddIngredient} className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                            <div className="flex flex-col md:flex-row items-stretch gap-3">
                                <input
                                    type="text"
                                    placeholder="Add new English ingredient name (e.g. Milk)"
                                    value={newIngredientName}
                                    onChange={(e) => setNewIngredientName(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                    disabled={addingIngredient}
                                />
                                <select
                                    value={newIngredientCategory}
                                    onChange={(e) => setNewIngredientCategory(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 font-semibold text-slate-700 transition-colors"
                                    disabled={addingIngredient}
                                >
                                    <option value="Dairy">Dairy</option>
                                    <option value="Kirayana">Kirayana</option>
                                    <option value="Shak Shabji">Shak Shabji</option>
                                </select>
                                <select
                                    value={newIngredientUnit}
                                    onChange={(e) => setNewIngredientUnit(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 font-semibold text-slate-700 transition-colors"
                                    disabled={addingIngredient}
                                >
                                    <option value="kg">kg</option>
                                    <option value="L">L</option>
                                    <option value="packet">packet</option>
                                    <option value="piece">piece</option>
                                    <option value="disposable_glass">Disposable Glass</option>
                                    <option value="cold_drink">Cold Drink</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={addingIngredient || !newIngredientName.trim()}
                                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-purple-100 whitespace-nowrap"
                                >
                                    {addingIngredient ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Plus size={16} />
                                    )}
                                    Add
                                </button>
                            </div>
                        </form>
                        {addError && (
                            <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1 bg-red-50 p-2.5 rounded-lg border border-red-100">
                                <AlertCircle size={14} />
                                {addError}
                            </p>
                        )}
                    </div>

                    {/* Ingredients List Box */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {loadingIngredients ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Loader2 size={36} className="animate-spin text-purple-600" />
                                <p className="text-sm font-semibold tracking-wide">Loading ingredients list...</p>
                            </div>
                        ) : filteredIngredients.length === 0 ? (
                            <div className="py-20 text-center text-slate-500">
                                <p className="font-semibold text-base mb-1">No ingredients found</p>
                                <p className="text-xs text-slate-400">Try searching for something else or add this ingredient above.</p>
                            </div>
                        ) : (
                            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                                {(() => {
                                    const categoriesList = ["Dairy", "Kirayana", "Shak Shabji"];
                                    const grouped: Record<string, Ingredient[]> = {
                                        "Dairy": [],
                                        "Kirayana": [],
                                        "Shak Shabji": []
                                    };
                                    for (const ing of filteredIngredients) {
                                        const cat = ing.category || "Dairy";
                                        if (!grouped[cat]) {
                                            grouped[cat] = [];
                                        }
                                        grouped[cat].push(ing);
                                    }

                                    return categoriesList.map((categoryName) => {
                                        const items = grouped[categoryName] || [];
                                        if (items.length === 0) return null;
                                        return (
                                            <div key={categoryName} className="space-y-0 bg-white">
                                                <div className="bg-purple-50/50 px-5 py-2.5 border-y border-purple-100/40 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                                                    <h3 className="text-xs font-extrabold text-purple-800 uppercase tracking-widest">
                                                        {categoryName}
                                                    </h3>
                                                    <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200/50">
                                                        {items.length} {items.length === 1 ? "Item" : "Items"}
                                                    </span>
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {items.map((ing) => {
                                                        const isChecked = !!selectedQuantities[ing.id];
                                                        const qty = selectedQuantities[ing.id];
                                                        return (
                                                            <div 
                                                                key={ing.id} 
                                                                className={`flex items-center justify-between px-5 py-4 transition-colors ${
                                                                    isChecked ? "bg-purple-50/20" : "hover:bg-slate-50/50"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-4 flex-1">
                                                                    {/* Customized Checkbox */}
                                                                    <label className="flex items-center cursor-pointer relative">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => handleCheckboxChange(ing, true)}
                                                                            className="sr-only peer"
                                                                        />
                                                                        <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all shadow-sm">
                                                                            <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                                                        </div>
                                                                    </label>

                                                                    {/* Text Names */}
                                                                    <div 
                                                                        className="cursor-pointer flex-1"
                                                                        onClick={() => handleCheckboxChange(ing, false)}
                                                                    >
                                                                        <span className="font-semibold text-slate-800 text-sm sm:text-base">
                                                                            {ing.nameEn}
                                                                        </span>
                                                                        <span className="text-slate-400 font-medium text-xs sm:text-sm ml-2">
                                                                            ({ing.nameHi})
                                                                        </span>
                                                                        
                                                                        {/* Selected Quantity Badge */}
                                                                        {isChecked && qty && (
                                                                            <span className="ml-3 inline-flex items-center bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200 animate-in zoom-in-90 duration-150 font-mono">
                                                                                {qty}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Action Icon (Delete for Owner Only) */}
                                                                {isOwnerOrDev && (
                                                                    <button
                                                                        onClick={() => handleDeleteIngredient(ing.id)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-4"
                                                                        title="Delete ingredient"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Summary & Logs) */}
                <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                    
                    {/* Selected Summary Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-800">Checklist Summary</h2>
                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {selectedCount} Selected
                            </span>
                        </div>

                        {selectedCount === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs font-medium">
                                No ingredients selected yet.<br/>Please check ingredients on the left.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                                {Object.entries(selectedQuantities).map(([id, qty]) => {
                                    const ing = ingredients.find(i => i.id === Number(id));
                                    if (!ing) return null;
                                    return (
                                        <div key={id} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                            <span className="font-semibold text-slate-700">{ing.nameEn}</span>
                                            <span className="font-mono text-purple-700 font-bold bg-white px-2 py-0.5 rounded border border-purple-100 shadow-sm">{qty}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                onClick={handleSubmitChecklist}
                                disabled={selectedCount === 0 || submitting}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-100 hover:shadow-lg"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Done
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Owner Exclusives: Audit Logs */}
                    {isOwnerOrDev && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <FileText size={18} className="text-purple-600" />
                                    Audit History Logs
                                </h2>
                                <button 
                                    onClick={fetchLogs} 
                                    disabled={loadingLogs}
                                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 uppercase tracking-widest disabled:opacity-50"
                                >
                                    Refresh
                                </button>
                            </div>

                            {loadingLogs ? (
                                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                    <Loader2 size={18} className="animate-spin text-purple-600" />
                                    <span className="text-xs font-semibold">Loading history logs...</span>
                                </div>
                            ) : logs.length === 0 ? (
                                <p className="text-center py-6 text-slate-400 text-xs">No audit logs found.</p>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {logs.map((log) => {
                                        const isExpanded = expandedLogId === log.id;
                                        let detailsObj: any = {};
                                        try {
                                            detailsObj = JSON.parse(log.details);
                                        } catch (_) {}

                                        return (
                                            <div 
                                                key={log.id} 
                                                onClick={() => {
                                                    if (log.actionType === "submit_order") {
                                                        setExpandedLogId(isExpanded ? null : log.id);
                                                    }
                                                }}
                                                className={`text-[11px] bg-slate-50/80 p-3 rounded-lg border border-slate-100 space-y-1 hover:bg-slate-100 transition-colors ${log.actionType === "submit_order" ? "cursor-pointer" : ""}`}
                                            >
                                                <div className="flex items-center justify-between text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <User size={10} />
                                                        {log.admin?.username || "Admin"} ({log.admin?.role || "staff"})
                                                    </span>
                                                    <span>
                                                        {new Date(log.createdAt).toLocaleDateString("en-IN", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-slate-700 leading-tight">
                                                    {renderLogAction(log)}
                                                </p>
                                                {isExpanded && log.actionType === "submit_order" && detailsObj.ingredients && (
                                                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-slate-500 space-y-1 font-mono text-[10px] bg-white p-2 rounded-lg max-h-[200px] overflow-y-auto shadow-inner">
                                                        {detailsObj.ingredients.flatMap((ing: any, idx: number) => {
                                                            if (ing.unit === "cold_drink") {
                                                                const drinks = ing.quantity.split(", ");
                                                                return drinks.map((drink: string, dIdx: number) => (
                                                                    <div key={`${idx}-${dIdx}`} className="flex justify-between border-b border-slate-50 py-0.5 last:border-b-0">
                                                                        <span>• {drink}</span>
                                                                        <span className="font-bold text-slate-700"></span>
                                                                    </div>
                                                                ));
                                                            }
                                                            return [
                                                                <div key={idx} className="flex justify-between border-b border-slate-50 py-0.5 last:border-b-0">
                                                                    <span>• {ing.nameEn} ({ing.nameHi})</span>
                                                                    <span className="font-bold text-slate-700">{ing.quantity}</span>
                                                                </div>
                                                            ];
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Quantity Modal (Centered, Responsive) */}
            {modalOpen && activeIngredient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`bg-white rounded-2xl shadow-xl border border-slate-100 w-full p-6 relative animate-in zoom-in-95 duration-200 flex flex-col text-center ${activeIngredient.unit === "cold_drink" ? "max-w-md" : "max-w-sm"}`}>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mx-auto mb-4">
                            <ChefHat size={24} />
                        </div>
                        
                        <h3 className="text-base font-bold text-slate-800 mb-1">
                            Select Quantity
                        </h3>
                        <p className="text-sm font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg inline-block mx-auto mb-5 border border-purple-100">
                            {activeIngredient.nameEn} <span className="font-medium text-slate-400">({activeIngredient.nameHi})</span>
                        </p>
 
                        <div className="space-y-4">
                            {activeIngredient.unit === "cold_drink" ? (
                                <div className="space-y-2 px-1 max-h-[280px] overflow-y-auto pr-1 text-left">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                        Brands & Volumes
                                    </p>
                                    {BRANDS.map(brand => {
                                        const currentVol = tempColdDrinks[brand] || "None";
                                        return (
                                            <div key={brand} className="flex items-center justify-between py-1.5 border-b border-slate-100/50 last:border-b-0">
                                                <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                                                    {brand}
                                                </span>
                                                <select
                                                    value={currentVol}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTempColdDrinks(prev => ({
                                                            ...prev,
                                                            [brand]: val
                                                        }));
                                                    }}
                                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500 font-semibold text-slate-800 transition-colors w-24"
                                                >
                                                    <option value="None">None</option>
                                                    {volumes.map(vol => (
                                                        <option key={vol} value={vol}>{vol}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-left mb-1.5 ml-1">
                                        Quantity (dropdown)
                                    </label>
                                    <select 
                                        value={tempQuantity} 
                                        onChange={(e) => setTempQuantity(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 font-semibold text-slate-800 transition-colors"
                                    >
                                        {getQuantityOptions(activeIngredient.unit).map(qty => (
                                            <option key={qty} value={qty}>{qty}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
 
                            <div className="grid grid-cols-2 gap-3 pt-3">
                                <button
                                    onClick={handleCancelModal}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition-colors border border-slate-200/50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmQuantity}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors shadow-sm shadow-purple-100"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Submission Success Dialog */}
            {submitSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 flex flex-col text-center">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                            <Check size={28} className="stroke-[3px]" />
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                            Checklist Submitted!
                        </h3>
                        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block mx-auto mb-4 border border-emerald-100">
                            Submitted Successfully
                        </p>
                        
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">
                            The daily ingredients list has been submitted and the order details were sent directly to WhatsApp.
                        </p>

                        <div className="space-y-2.5">
                            <button
                                onClick={() => setSubmitSuccess(false)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition-colors border border-slate-200/50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submission Error dialog */}
            {submitError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 flex flex-col text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                            <AlertCircle size={28} />
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                            Submission Failed
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">
                            {submitError}
                        </p>

                        <button
                            onClick={() => setSubmitError("")}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition-colors border border-slate-200/50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* New Hospitality Request Modal for Chef */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50">
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <Plus size={18} className="text-purple-600" />
                                Create New Request
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Villa / Screen Name</label>
                                <input
                                    type="text"
                                    value={formVilla}
                                    onChange={e => setFormVilla(e.target.value)}
                                    placeholder="e.g. V1, V2, Amstel C1..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                                <select
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value as any)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                                >
                                    <option value="High Tea">High Tea</option>
                                    <option value="Timepass">Timepass</option>
                                    <option value="Normal">Normal</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select Items & Quantities</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {menuItems.filter(m => m.category === formCategory || formCategory === "Normal").map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{item.name}</p>
                                                <p className="text-[10px] text-slate-500 font-semibold">₹{item.price}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const cur = formQuantities[item.id] || 0;
                                                        if (cur <= 1) {
                                                            const updated = { ...formQuantities };
                                                            delete updated[item.id];
                                                            setFormQuantities(updated);
                                                        } else {
                                                            setFormQuantities({ ...formQuantities, [item.id]: cur - 1 });
                                                        }
                                                    }}
                                                    className="w-7 h-7 bg-white border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center font-mono font-bold text-xs">{formQuantities[item.id] || 0}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const cur = formQuantities[item.id] || 0;
                                                        setFormQuantities({ ...formQuantities, [item.id]: cur + 1 });
                                                    }}
                                                    className="w-7 h-7 bg-white border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChefCreateSubmit}
                                disabled={modalSubmitting}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {modalSubmitting ? "Submitting..." : "Submit Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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
    Download
} from "lucide-react";
import { api } from "../../../lib/api";

interface Ingredient {
    id: number;
    nameEn: string;
    nameHi: string;
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
    const [addingIngredient, setAddingIngredient] = useState(false);
    const [addError, setAddError] = useState("");

    // Checklist Selection State
    // Format: { [id]: quantity_string }
    const [selectedQuantities, setSelectedQuantities] = useState<Record<number, string>>({});
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [activeIngredient, setActiveIngredient] = useState<Ingredient | null>(null);
    const [tempQuantity, setTempQuantity] = useState("1kg");

    // Submission State
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [pdfDownloadUrl, setPdfDownloadUrl] = useState("");
    const [submitError, setSubmitError] = useState("");

    const isOwnerOrDev = userRole === "owner" || userRole === "developer";

    // 1-20kg array
    const quantityOptions = useMemo(() => {
        const arr = [];
        for (let i = 1; i <= 20; i++) {
            arr.push(`${i}kg`);
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
    const handleCheckboxChange = (ingredient: Ingredient) => {
        const isChecked = !!selectedQuantities[ingredient.id];
        
        if (isChecked) {
            // Already checked: uncheck directly
            const updated = { ...selectedQuantities };
            delete updated[ingredient.id];
            setSelectedQuantities(updated);
        } else {
            // Not checked: open centered modal to select quantity
            setActiveIngredient(ingredient);
            setTempQuantity("1kg");
            setModalOpen(true);
        }
    };

    // Confirm Quantity from Modal
    const handleConfirmQuantity = () => {
        if (!activeIngredient) return;
        
        setSelectedQuantities(prev => ({
            ...prev,
            [activeIngredient.id]: tempQuantity
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
            const newIng = await api.post<Ingredient>("/chef/ingredients", { nameEn: name });
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
        setPdfDownloadUrl("");

        // Map selections to structure expected by endpoint
        const submissionList = selectedIds.map(id => {
            const ing = ingredients.find(i => i.id === id);
            return {
                nameEn: ing?.nameEn || "",
                nameHi: ing?.nameHi || "",
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
                setPdfDownloadUrl(res.downloadLink);
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
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                        <form onSubmit={handleAddIngredient} className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Add new English ingredient name (e.g. Milk)"
                                    value={newIngredientName}
                                    onChange={(e) => setNewIngredientName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                    disabled={addingIngredient}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={addingIngredient || !newIngredientName.trim()}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-purple-100"
                            >
                                {addingIngredient ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Plus size={16} />
                                )}
                                Add
                            </button>
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
                            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                                {filteredIngredients.map((ing) => {
                                    const isChecked = !!selectedQuantities[ing.id];
                                    const qty = selectedQuantities[ing.id];
                                    return (
                                        <div 
                                            key={ing.id} 
                                            className={`flex items-center justify-between px-5 py-4 transition-colors ${
                                                isChecked ? "bg-purple-50/40" : "hover:bg-slate-50/50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                {/* Customized Checkbox */}
                                                <label className="flex items-center cursor-pointer relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleCheckboxChange(ing)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all shadow-sm">
                                                        <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                                    </div>
                                                </label>

                                                {/* Text Names */}
                                                <div 
                                                    className="cursor-pointer flex-1"
                                                    onClick={() => handleCheckboxChange(ing)}
                                                >
                                                    <span className="font-semibold text-slate-800 text-sm sm:text-base">
                                                        {ing.nameEn}
                                                    </span>
                                                    <span className="text-slate-400 font-medium text-xs sm:text-sm ml-2">
                                                        ({ing.nameHi})
                                                    </span>
                                                    
                                                    {/* Selected Quantity Badge */}
                                                    {isChecked && qty && (
                                                        <span className="ml-3 inline-flex items-center bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200 animate-in zoom-in-90 duration-150">
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
                        )}
                    </div>
                </div>

                {/* Right Column (Summary & Logs) */}
                <div className="space-y-6">
                    
                    {/* Selected Summary Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 sticky top-24">
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
                                    {logs.map((log) => (
                                        <div key={log.id} className="text-[11px] bg-slate-50/80 p-3 rounded-lg border border-slate-100 space-y-1 hover:bg-slate-50 transition-colors">
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
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quantity Modal (Centered, Responsive) */}
            {modalOpen && activeIngredient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 flex flex-col text-center">
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
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-left mb-1.5 ml-1">
                                    Quantity (dropdown)
                                </label>
                                <select 
                                    value={tempQuantity} 
                                    onChange={(e) => setTempQuantity(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 font-semibold text-slate-800 transition-colors"
                                >
                                    {quantityOptions.map(qty => (
                                        <option key={qty} value={qty}>{qty}</option>
                                    ))}
                                </select>
                            </div>

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
                            The daily ingredients PDF has been generated and the download link was sent to WhatsApp.
                        </p>

                        <div className="space-y-2.5">
                            {pdfDownloadUrl && isOwnerOrDev && (
                                <a
                                    href={pdfDownloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <Download size={16} />
                                    Download PDF
                                </a>
                            )}
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
        </div>
    );
}

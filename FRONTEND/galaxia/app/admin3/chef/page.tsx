"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    ChefHat, 
    Search, 
    Plus, 
    Trash2, 
    Edit,
    Check, 
    Loader2, 
    FileText, 
    AlertCircle, 
    Calendar,
    User,
    ClipboardCheck,
    Download,
    Coffee,
    RefreshCw,
    Package,
    Save,
    ShoppingBag,
    Sun,
    Moon
} from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";

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
    const [adminUsername, setAdminUsername] = useState<string>("");
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
    const [chefActiveTab, setChefActiveTab] = useState<"active" | "fulfilled">("active");
    const [chefFulfilledDate, setChefFulfilledDate] = useState<Date>(new Date());

    // High Tea Requests
    const [highTeaRequests, setHighTeaRequests] = useState<any[]>([]);
    const [loadingHighTea, setLoadingHighTea] = useState(false);
    const [highTeaTab, setHighTeaTab] = useState<"active" | "fulfilled">("active");

    // Timepass Requests
    const [timepassRequests, setTimepassRequests] = useState<any[]>([]);
    const [loadingTimepass, setLoadingTimepass] = useState(false);
    const [timepassTab, setTimepassTab] = useState<"active" | "fulfilled">("active");

    // Normal Requests (Fresh Lime Water & Soda)
    const [normalRequests, setNormalRequests] = useState<any[]>([]);
    const [loadingNormal, setLoadingNormal] = useState(false);
    const [normalTab, setNormalTab] = useState<"active" | "fulfilled">("active");

    // Chef New Request Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
    const [formVilla, setFormVilla] = useState(VILLAS_LIST[0].value);
    const [formCategory, setFormCategory] = useState<"High Tea" | "Timepass" | "Normal">("High Tea");
    const [formQuantities, setFormQuantities] = useState<Record<string, number>>({});
    const [formComments, setFormComments] = useState<Record<string, string>>({});
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [modalSubmitting, setModalSubmitting] = useState(false);

    // E-menu Stock/Inventory management inside Chef portal
    const [currentChefView, setCurrentChefView] = useState<"checklist" | "inventory">("checklist");
    const [savingStock, setSavingStock] = useState(false);
    const [editStocks, setEditStocks] = useState<Record<string, string>>({});

    // Jain / Regular Counter states
    const [counterDate, setCounterDate] = useState<Date>(new Date());
    const [mealCounts, setMealCounts] = useState<{
        jain: number;
        regular: number;
        newJain: number;
        newRegular: number;
        continueJain: number;
        continueRegular: number;
    }>({ jain: 0, regular: 0, newJain: 0, newRegular: 0, continueJain: 0, continueRegular: 0 });
    const [loadingCounts, setLoadingCounts] = useState(false);

    const fetchMealCounts = useCallback(async (targetDate: Date) => {
        setLoadingCounts(true);
        try {
            const year = targetDate.getFullYear();
            const month = String(targetDate.getMonth() + 1).padStart(2, "0");
            const day = String(targetDate.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            const res = await api.get<any>(`/bookings/staycation/daily-report?date=${dateStr}&property=both`);
            if (res && res.summary && res.summary.foodPreference) {
                setMealCounts({
                    jain: res.summary.foodPreference.jain || 0,
                    regular: res.summary.foodPreference.regular || 0,
                    newJain: res.summary.foodPreference.newJain || 0,
                    newRegular: res.summary.foodPreference.newRegular || 0,
                    continueJain: res.summary.foodPreference.continueJain || 0,
                    continueRegular: res.summary.foodPreference.continueRegular || 0
                });
            } else {
                setMealCounts({ jain: 0, regular: 0, newJain: 0, newRegular: 0, continueJain: 0, continueRegular: 0 });
            }
        } catch (err) {
            console.error("Error fetching meal counts for chef portal:", err);
            setMealCounts({ jain: 0, regular: 0, newJain: 0, newRegular: 0, continueJain: 0, continueRegular: 0 });
        } finally {
            setLoadingCounts(false);
        }
    }, []);

    useEffect(() => {
        fetchMealCounts(counterDate);
    }, [counterDate, fetchMealCounts]);

    useEffect(() => {
        api.get<any[]>("/hospitality/menu").then(data => {
            if (Array.isArray(data)) {
                setMenuItems(data);
                const stocks: Record<string, string> = {};
                data.forEach(item => {
                    stocks[item.id] = item.stock != null ? String(item.stock) : "100";
                });
                setEditStocks(stocks);
            }
        }).catch(() => {});
    }, []);

    const handleSaveStock = async () => {
        setSavingStock(true);
        try {
            const updatedMenu = menuItems.map(item => {
                const stockVal = editStocks[item.id];
                const stockNum = stockVal === "" ? 0 : parseInt(stockVal);
                if (isNaN(stockNum) || stockNum < 0) {
                    throw new Error(`Invalid stock value for ${item.name}`);
                }
                return {
                    ...item,
                    stock: stockNum
                };
            });

            await api.put("/hospitality/menu", { menuItems: updatedMenu });
            setMenuItems(updatedMenu);
            alert("E-menu stock updated successfully!");
        } catch (err: any) {
            alert(err.message || "Failed to update stock.");
        } finally {
            setSavingStock(false);
        }
    };

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
            if (modalMode === "edit" && editingRequestId) {
                await api.put(`/hospitality/requests/${editingRequestId}`, {
                    villaName: formVilla,
                    itemCategory: formCategory,
                    items: selectedItems
                });
                alert("Request updated successfully!");
            } else {
                await api.post("/hospitality/requests", {
                    villaName: formVilla,
                    itemCategory: formCategory,
                    items: selectedItems
                });
                alert("Request created successfully!");
            }
            setIsCreateModalOpen(false);
            setFormVilla(VILLAS_LIST[0].value);
            setFormQuantities({});
            setFormComments({});
            fetchHighTeaRequests();
            fetchTimepassRequests();
        } catch (err: any) {
            alert(err.message || "Failed to submit request.");
        } finally {
            setModalSubmitting(false);
        }
    };

    const handleOpenEditModal = (req: any) => {
        setModalMode("edit");
        setEditingRequestId(req.id);
        setFormVilla(req.villaName);
        setFormCategory(req.itemCategory);
        
        const qtys: Record<string, number> = {};
        const cmts: Record<string, string> = {};
        
        req.items.forEach((item: any) => {
            const menuItem = menuItems.find(m => m.name.toLowerCase() === item.name.toLowerCase());
            if (menuItem) {
                qtys[menuItem.id] = item.quantity;
                if (item.comment) {
                    cmts[menuItem.id] = item.comment;
                }
            }
        });
        setFormQuantities(qtys);
        setFormComments(cmts);
        setIsCreateModalOpen(true);
    };

    const handleDeleteRequest = async (id: number) => {
        if (!confirm("Are you sure you want to delete this request?")) return;
        try {
            await api.delete(`/hospitality/requests/${id}`);
            fetchHighTeaRequests();
            fetchTimepassRequests();
            alert("Request deleted successfully.");
        } catch (err: any) {
            alert(err.message || "Failed to delete request.");
        }
    };

    const isOwnerOrDev = userRole === "owner" || userRole === "developer";

    // Generate dynamic quantity options based on unit
    const getQuantityOptions = (unit: string, nameEn?: string) => {
        const arr = [];
        if (unit === "kg" || unit === "L") {
            for (let i = 0.5; i <= 20; i += 0.5) {
                arr.push(`${i.toFixed(1).replace(".0", "")}${unit}`);
            }
        } else if (unit === "packet") {
            if (nameEn?.toLowerCase() === "bread") {
                for (let i = 1; i <= 10; i++) {
                    arr.push(`${i} laadi`);
                }
            } else {
                for (let i = 1; i <= 10; i++) {
                    arr.push(`${i} packet${i > 1 ? "s" : ""}`);
                }
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
                setAdminUsername(data?.username || "");
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

    const fetchNormalRequests = async () => {
        setLoadingNormal(true);
        try {
            const data = await api.get<any[]>("/hospitality/requests?category=Normal&chefOnly=true");
            if (Array.isArray(data)) {
                setNormalRequests(data);
            }
        } catch (err) {
            console.error("Error fetching normal chef requests:", err);
        } finally {
            setLoadingNormal(false);
        }
    };
    const [mealCounter, setMealCounter] = useState<{
        date: string;
        totalGuests: number;
        breakfastEaten: number;
        lunchEaten: number;
        dinnerEaten: number;
        breakfastTotal?: number;
        lunchTotal?: number;
        dinnerTotal?: number;
        breakdown?: {
            breakfast: { eatenNew: number; totalNew: number; eatenCont: number; totalCont: number };
            lunch: { eatenNew: number; totalNew: number; eatenCont: number; totalCont: number };
            dinner: { eatenNew: number; totalNew: number; eatenCont: number; totalCont: number };
        };
        bookings: any[];
    } | null>(null);
    const [loadingMealCounter, setLoadingMealCounter] = useState(false);

    const fetchMealCounter = useCallback(async (targetDate: Date) => {
        setLoadingMealCounter(true);
        try {
            const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
            const data = await api.get(`/meal-counters?date=${dateStr}`);
            setMealCounter(data);
        } catch (err) {
            console.error("Failed to fetch meal counter:", err);
        } finally {
            setLoadingMealCounter(false);
        }
    }, []);

    useEffect(() => {
        if (userRole === "chef" || userRole === "owner" || userRole === "developer") {
            fetchMealCounter(counterDate);
        }
    }, [userRole, counterDate, fetchMealCounter]);

    useEffect(() => {
        if (userRole === "chef" || userRole === "owner" || userRole === "developer") {
            fetchHighTeaRequests();
            fetchTimepassRequests();
            fetchNormalRequests();
        }
    }, [userRole]);

    const combinedRequests = useMemo(() => {
        return [...highTeaRequests, ...timepassRequests, ...normalRequests];
    }, [highTeaRequests, timepassRequests, normalRequests]);

    const matchDate = (dateStr: string, selectedDate: Date) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === selectedDate.getFullYear() &&
               d.getMonth() === selectedDate.getMonth() &&
               d.getDate() === selectedDate.getDate();
    };

    const fetchAllRequests = () => {
        fetchHighTeaRequests();
        fetchTimepassRequests();
        fetchNormalRequests();
    };

    const handleFulfilHighTea = async (id: number, targetStatus: string = "prepared") => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: targetStatus
            });
            if (res.success) {
                setHighTeaRequests(prev => 
                    prev.map(r => r.id === id ? { ...r, status: targetStatus } : r)
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update high tea request.");
        }
    };

    const handleFulfilTimepass = async (id: number, targetStatus: string = "prepared") => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: targetStatus
            });
            if (res.success) {
                setTimepassRequests(prev => 
                    prev.map(r => r.id === id ? { ...r, status: targetStatus } : r)
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update timepass request.");
        }
    };

    const handleFulfilNormal = async (id: number, targetStatus: string = "prepared") => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: targetStatus
            });
            if (res.success) {
                setNormalRequests(prev => 
                    prev.map(r => r.id === id ? { ...r, status: targetStatus } : r)
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update normal chef request.");
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
                // Parse existing selections (e.g. "Pepsi 1L x 2, Sprite 2L x 1")
                const initialTemp: Record<string, string> = {};
                if (currentVal) {
                    const parts = currentVal.split(", ");
                    for (const part of parts) {
                        const matchedBrand = BRANDS.find(brand => part.startsWith(brand));
                        if (matchedBrand) {
                            const remaining = part.substring(matchedBrand.length).trim(); // e.g. "1L x 3" or "1L"
                            const xIndex = remaining.indexOf(" x ");
                            let vol = remaining;
                            let qty = "1";
                            if (xIndex !== -1) {
                                vol = remaining.substring(0, xIndex).trim();
                                qty = remaining.substring(xIndex + 3).trim();
                            }
                            initialTemp[matchedBrand] = `${vol}_${qty}`;
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
                        if (ingredient.nameEn.toLowerCase() === "bread") {
                            setTempQuantity("1 laadi");
                        } else {
                            setTempQuantity("1 packet");
                        }
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
                .filter(([_, volQty]) => volQty && !volQty.startsWith("None"))
                .map(([brand, volQty]) => {
                    const [vol, qty] = volQty.split("_");
                    return `${brand} ${vol} x ${qty || 1}`;
                });
            
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

            {/* Jain / Regular Veg Counter Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                        <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                            <ChefHat size={18} className="text-purple-600" />
                            Guest Food Preference Summary
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">Daily Jain & Regular Veg counts based on active bookings</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 mr-1">Select Date:</span>
                        <CustomDatePicker
                            date={counterDate}
                            onDateChange={(d: Date) => { if (d) setCounterDate(d); }}
                        />
                    </div>
                </div>

                {loadingCounts ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                        <RefreshCw size={16} className="animate-spin text-purple-600" />
                        <span className="text-xs font-bold">Fetching food preference counts...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* New Guests Preference */}
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center border-b border-slate-200/60 pb-1.5">
                                New Guests (Arriving Today)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Jain Veg</span>
                                    <span className="text-2xl font-black text-orange-700 mt-1 block">{mealCounts.newJain || 0}</span>
                                    <span className="text-[9px] text-orange-500 font-semibold mt-0.5 block">Guests</span>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Regular Veg</span>
                                    <span className="text-2xl font-black text-emerald-700 mt-1 block">{mealCounts.newRegular || 0}</span>
                                    <span className="text-[9px] text-emerald-500 font-semibold mt-0.5 block">Guests</span>
                                </div>
                            </div>
                        </div>

                        {/* Continue Guests Preference */}
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center border-b border-slate-200/60 pb-1.5">
                                Continue Guests (Staying)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Jain Veg</span>
                                    <span className="text-2xl font-black text-amber-700 mt-1 block">{mealCounts.continueJain || 0}</span>
                                    <span className="text-[9px] text-amber-500 font-semibold mt-0.5 block">Guests</span>
                                </div>
                                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-center">
                                    <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Regular Veg</span>
                                    <span className="text-2xl font-black text-teal-700 mt-1 block">{mealCounts.continueRegular || 0}</span>
                                    <span className="text-[9px] text-teal-500 font-semibold mt-0.5 block">Guests</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Meal Counters Section */}
            {(userRole === "chef" || userRole === "owner" || userRole === "developer") && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Coffee className="text-amber-500" size={20} />
                                Daily Meal Counts
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">Counts updated by housekeeping staff for the selected date.</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                            Date: {counterDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                    </div>
                    {loadingMealCounter && !mealCounter ? (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                            <RefreshCw size={24} className="animate-spin text-purple-600" />
                            <p className="text-xs font-semibold">Loading counts...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { 
                                    key: "breakfast", 
                                    label: "Breakfast", 
                                    icon: Coffee, 
                                    count: mealCounter?.breakfastEaten || 0, 
                                    total: mealCounter?.breakfastTotal !== undefined ? mealCounter.breakfastTotal : (mealCounter?.totalGuests || 0), 
                                    eatenNew: mealCounter?.breakdown?.breakfast?.eatenNew || 0,
                                    totalNew: mealCounter?.breakdown?.breakfast?.totalNew || 0,
                                    eatenCont: mealCounter?.breakdown?.breakfast?.eatenCont || 0,
                                    totalCont: mealCounter?.breakdown?.breakfast?.totalCont || 0,
                                    color: "from-amber-50 to-orange-50/20 text-amber-800 border-amber-100/70", 
                                    iconColor: "text-amber-600" 
                                },
                                { 
                                    key: "lunch", 
                                    label: "Lunch", 
                                    icon: Sun, 
                                    count: mealCounter?.lunchEaten || 0, 
                                    total: mealCounter?.lunchTotal !== undefined ? mealCounter.lunchTotal : (mealCounter?.totalGuests || 0), 
                                    eatenNew: mealCounter?.breakdown?.lunch?.eatenNew || 0,
                                    totalNew: mealCounter?.breakdown?.lunch?.totalNew || 0,
                                    eatenCont: mealCounter?.breakdown?.lunch?.eatenCont || 0,
                                    totalCont: mealCounter?.breakdown?.lunch?.totalCont || 0,
                                    color: "from-emerald-50 to-teal-50/20 text-emerald-800 border-emerald-100/70", 
                                    iconColor: "text-emerald-600" 
                                },
                                { 
                                    key: "dinner", 
                                    label: "Dinner", 
                                    icon: Moon, 
                                    count: mealCounter?.dinnerEaten || 0, 
                                    total: mealCounter?.dinnerTotal !== undefined ? mealCounter.dinnerTotal : (mealCounter?.totalGuests || 0), 
                                    eatenNew: mealCounter?.breakdown?.dinner?.eatenNew || 0,
                                    totalNew: mealCounter?.breakdown?.dinner?.totalNew || 0,
                                    eatenCont: mealCounter?.breakdown?.dinner?.eatenCont || 0,
                                    totalCont: mealCounter?.breakdown?.dinner?.totalCont || 0,
                                    color: "from-indigo-50 to-blue-50/20 text-indigo-800 border-indigo-100/70", 
                                    iconColor: "text-indigo-600" 
                                }
                            ].map((meal) => {
                                const Icon = meal.icon;
                                return (
                                    <div key={meal.key} className={`bg-gradient-to-r ${meal.color} border rounded-2xl p-5 flex items-center justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl bg-white border border-slate-200/50 ${meal.iconColor}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-sm">{meal.label}</span>
                                                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                                    New: {meal.eatenNew}/{meal.totalNew} · Cont: {meal.eatenCont}/{meal.totalCont}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-black text-2xl tracking-tight">
                                            {meal.count} / {meal.total}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* High Tea, Timepass & Normal Requests Dashboard (only for chef/owner/dev) */}
            {(userRole === "chef" || userRole === "owner" || userRole === "developer") && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ChefHat className="text-purple-600" size={22} />
                                Hospitality Orders Dashboard
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 font-medium">View and manage all guest requests for High Tea, Timepass, and Normal menu items.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => { setModalMode("create"); setFormCategory("Normal"); setFormVilla(VILLAS_LIST[0].value); setFormQuantities({}); setFormComments({}); setIsCreateModalOpen(true); }}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-purple-100 hover:shadow"
                            >
                                <Plus size={14} className="stroke-[3px]" />
                                New Request
                            </button>
                            <button
                                onClick={fetchAllRequests}
                                disabled={loadingHighTea || loadingTimepass || loadingNormal}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors text-slate-700 disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={loadingHighTea || loadingTimepass || loadingNormal ? "animate-spin" : ""} />
                                Refresh Orders
                            </button>
                        </div>
                    </div>

                    {/* Tabs for Active / Fulfilled & Date Picker */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                            <button
                                onClick={() => setChefActiveTab("active")}
                                className={`flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${
                                    chefActiveTab === "active" 
                                        ? "bg-white text-purple-700 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Active Orders ({combinedRequests.filter(r => r.status === "pending").length})
                            </button>
                            <button
                                onClick={() => setChefActiveTab("fulfilled")}
                                className={`flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${
                                    chefActiveTab === "fulfilled" 
                                        ? "bg-white text-purple-700 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Fulfilled Orders ({combinedRequests.filter(r => r.status === "prepared" || r.status === "fulfilled").length})
                            </button>
                        </div>

                        {chefActiveTab === "fulfilled" && (
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className="text-xs font-bold text-slate-500">Select Date:</span>
                                <CustomDatePicker
                                    date={chefFulfilledDate}
                                    onDateChange={(d) => setChefFulfilledDate(d)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Orders List */}
                    {loadingHighTea || loadingTimepass || loadingNormal ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                            <RefreshCw size={32} className="animate-spin text-purple-600" />
                            <p className="text-sm font-semibold">Loading hospitality orders...</p>
                        </div>
                    ) : chefActiveTab === "active" ? (
                        combinedRequests.filter(r => r.status === "pending").length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                                <p className="text-slate-400 text-sm font-semibold">No active orders right now.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {combinedRequests.filter(r => r.status === "pending").map((req) => (
                                    <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                                                <div>
                                                    <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                                        {req.villaName}
                                                        {req.itemCategory === "High Tea" ? (
                                                            <span className="text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded uppercase">High Tea</span>
                                                        ) : req.itemCategory === "Timepass" ? (
                                                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded uppercase">Timepass</span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">Normal</span>
                                                        )}
                                                    </h3>
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

                                            <div className="space-y-1.5">
                                                {req.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs text-slate-700 font-medium">
                                                        <span>
                                                            {item.name}
                                                            {item.comment && (
                                                                <span className="text-amber-700 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded ml-1.5 text-[9px] font-bold">
                                                                    ({item.comment})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100/50">× {item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-3 flex justify-between items-center border-t border-slate-200/40 mt-1">
                                             <div className="flex gap-2">
                                                 {(!["ranjit", "devi"].includes(adminUsername.toLowerCase()) || req.itemCategory !== "Normal") && (
                                                     <>
                                                         <button
                                                             onClick={() => handleOpenEditModal(req)}
                                                             className="p-2 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
                                                             title="Edit Order"
                                                         >
                                                             <Edit size={12} />
                                                         </button>
                                                         <button
                                                             onClick={() => handleDeleteRequest(req.id)}
                                                             className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-red-100"
                                                             title="Delete Order"
                                                         >
                                                             <Trash2 size={12} />
                                                         </button>
                                                     </>
                                                 )}
                                             </div>
                                            <button
                                                onClick={() => {
                                                    if (req.itemCategory === "High Tea") {
                                                        handleFulfilHighTea(req.id);
                                                    } else if (req.itemCategory === "Timepass") {
                                                        handleFulfilTimepass(req.id);
                                                    } else {
                                                        handleFulfilNormal(req.id, "prepared");
                                                    }
                                                }}
                                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                                            >
                                                <Check size={12} className="stroke-[3px]" />
                                                Mark Prepared
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        combinedRequests.filter(r => (r.status === "prepared" || r.status === "fulfilled") && matchDate(r.updatedAt || r.createdAt, chefFulfilledDate)).length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                                <p className="text-slate-400 text-sm font-semibold">No fulfilled orders for this date.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {combinedRequests.filter(r => (r.status === "prepared" || r.status === "fulfilled") && matchDate(r.updatedAt || r.createdAt, chefFulfilledDate)).map((req) => (
                                    <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5 hover:shadow-sm transition-shadow flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-200/60 pb-2.5">
                                                <span className="text-slate-800 font-extrabold text-sm flex items-center gap-2">
                                                    {req.villaName}
                                                    {req.itemCategory === "High Tea" ? (
                                                        <span className="text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded uppercase">High Tea</span>
                                                    ) : req.itemCategory === "Timepass" ? (
                                                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded uppercase">Timepass</span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">Normal</span>
                                                    )}
                                                </span>
                                                <span className="font-mono text-xs">
                                                    {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {req.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs text-slate-600 font-medium">
                                                        <span>
                                                            {item.name}
                                                            {item.comment && (
                                                                <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded ml-1.5 font-bold">
                                                                    ({item.comment})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="font-mono text-slate-400 font-bold">× {item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-3 mt-1">
                                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg flex-1">
                                                <span className="font-bold flex items-center gap-1">
                                                    <Check size={10} className="stroke-[3px]" />
                                                    {req.status === "prepared" ? "Prepared" : "Delivered"}
                                                </span>
                                                <span className="text-slate-300">|</span>
                                                {req.isBilled ? (
                                                    <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">Billed</span>
                                                ) : (
                                                    <span className="text-slate-400 font-semibold">Unbilled</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(!["ranjit", "devi"].includes(adminUsername.toLowerCase()) || req.itemCategory !== "Normal") && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditModal(req)}
                                                            className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors border border-slate-200"
                                                            title="Edit Order"
                                                        >
                                                            <Edit size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRequest(req.id)}
                                                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors border border-red-100"
                                                            title="Delete Order"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
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
                                        const currentVal = tempColdDrinks[brand] || "None_1";
                                        const [currentVol, currentQty] = currentVal.split("_");
                                        const volValue = currentVol || "None";
                                        const qtyValue = parseInt(currentQty || "1") || 1;
                                        return (
                                            <div key={brand} className="flex items-center justify-between py-1.5 border-b border-slate-100/50 last:border-b-0 gap-2">
                                                <span className="font-semibold text-slate-700 text-xs sm:text-sm flex-1 truncate">
                                                    {brand}
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <select
                                                        value={volValue}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setTempColdDrinks(prev => ({
                                                                ...prev,
                                                                [brand]: val === "None" ? "None_1" : `${val}_${qtyValue}`
                                                            }));
                                                        }}
                                                        className="bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:border-purple-500 font-semibold text-slate-800 transition-colors w-20"
                                                    >
                                                        <option value="None">None</option>
                                                        {volumes.map(vol => (
                                                            <option key={vol} value={vol}>{vol}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={qtyValue}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setTempColdDrinks(prev => ({
                                                                ...prev,
                                                                [brand]: `${volValue}_${val}`
                                                            }));
                                                        }}
                                                        disabled={volValue === "None"}
                                                        className="bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:border-purple-500 font-semibold text-slate-800 transition-colors w-14 disabled:opacity-50"
                                                    >
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 24, 30].map(q => (
                                                            <option key={q} value={q}>{q}</option>
                                                        ))}
                                                    </select>
                                                </div>
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
                                        {getQuantityOptions(activeIngredient.unit, activeIngredient.nameEn).map(qty => (
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
                                {modalMode === "edit" ? <Edit size={18} className="text-purple-600" /> : <Plus size={18} className="text-purple-600" />}
                                {modalMode === "edit" ? "Edit Request" : "Create New Request"}
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Villa / Screen Name</label>
                                <select
                                    value={formVilla}
                                    onChange={e => setFormVilla(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                                >
                                    {VILLAS_LIST.map((villa) => (
                                        <option key={villa.value} value={villa.value}>
                                            {villa.name}
                                        </option>
                                    ))}
                                </select>
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

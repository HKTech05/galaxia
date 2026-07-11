"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    ClipboardCheck, 
    Clock, 
    Check, 
    RefreshCw, 
    Calendar,
    User,
    AlertCircle,
    UserCheck,
    Coffee,
    X,
    Plus,
    Trash2,
    Edit,
    Save,
    CheckCircle,
    ShoppingBag,
    Sun,
    Moon
} from "lucide-react";
import { api } from "../../../lib/api";

interface HospitalityRequest {
    id: number;
    villaName: string;
    itemCategory: string;
    items: { name: string; quantity: number; price: number; comment?: string }[];
    status: string;
    isBilled: boolean;
    bookingId: number | null;
    createdAt: string;
    booking?: {
        id: number;
        customerName: string;
        bookingRef: string;
    };
}

const VILLAS_LIST = [
    // Ambrose
    { name: "Ambrose — TAKE-1", value: "TAKE-1" },
    { name: "Ambrose — ALTA", value: "ALTA" },
    { name: "Ambrose — SANTORINI", value: "SANTORINI" },
    { name: "Ambrose — BAMBOOSA", value: "BAMBOOSA" },
    { name: "Ambrose — CYPRESS", value: "CYPRESS" },
    // Amstel Nest
    { name: "Amstel Nest — Cottage 1", value: "Cottage 1" },
    { name: "Amstel Nest — Cottage 2", value: "Cottage 2" },
    { name: "Amstel Nest — Cottage 3", value: "Cottage 3" },
    { name: "Amstel Nest — Cottage 4", value: "Cottage 4" },
    { name: "Amstel Nest — Cottage 5", value: "Cottage 5" },
    { name: "Amstel Nest — Cottage 6", value: "Cottage 6" },
    { name: "Amstel Nest — Cottage 7", value: "Cottage 7" },
    { name: "Amstel Nest — Cottage 8", value: "Cottage 8" },
    { name: "Amstel Nest — Cottage 9", value: "Cottage 9" },
    { name: "Amstel Nest — Cottage 11", value: "Cottage 11" },
    { name: "Amstel Nest — Cottage 12", value: "Cottage 12" },
    { name: "Amstel Nest — Cottage 13", value: "Cottage 13" },
    { name: "Amstel Nest — Cottage 14", value: "Cottage 14" },
    { name: "Amstel Nest — Cottage 15", value: "Cottage 15" },
    { name: "Amstel Nest — Family Cottage", value: "Family Cottage" },
];

const DEFAULT_MENU_ITEMS = [
    // Normal Items
    { id: "water", name: "Water", price: 30, category: "Normal" },
    { id: "limbu_pani", name: "Limbu Pani", price: 50, category: "Normal" },
    { id: "limbu_soda", name: "Limbu Soda", price: 90, category: "Normal" },
    { id: "sprite", name: "Sprite", price: 70, category: "Normal" },
    { id: "thums_up", name: "Thums Up", price: 70, category: "Normal" },
    { id: "special_mocktail", name: "Special Mocktail", price: 1500, category: "Normal" },
    // High Tea Items
    { id: "tea", name: "Tea", price: 40, category: "High Tea" },
    { id: "coffee", name: "Coffee", price: 44, category: "High Tea" },
    { id: "milk", name: "Milk", price: 40, category: "High Tea" },
    { id: "maggi", name: "Maggi", price: 84, category: "High Tea" },
    { id: "fries", name: "French Fries", price: 147, category: "High Tea" },
    { id: "kanda_bhaji", name: "Kanda Bhaji", price: 147, category: "High Tea" },
    { id: "aloo_bhaji", name: "Aloo Bhaji", price: 147, category: "High Tea" },
    { id: "corn_bhaji", name: "Corn Bhaji", price: 147, category: "High Tea" },
    { id: "black_coffee", name: "Black Coffee", price: 35, category: "High Tea" },
    { id: "cold_coffee", name: "Cold Coffee", price: 90, category: "High Tea" },
    // Timepass Items
    { id: "khichiya_papad", name: "Khichiya papad", price: 100, category: "Timepass" },
    { id: "khichiya_fried", name: "Khichiya fried papad", price: 120, category: "Timepass" },
    { id: "khichiya_masala_jain", name: "Khichiya masala papad jain", price: 160, category: "Timepass" },
    { id: "khichiya_masala_regular", name: "Khichiya masala papad regular", price: 160, category: "Timepass" },
    { id: "khichiya_cheese_masala", name: "Khichiya cheese masala papad", price: 180, category: "Timepass" },
    { id: "channa_masala_jain", name: "Channa masala ( jain )", price: 160, category: "Timepass" },
    { id: "channa_masala_regular", name: "Channa masala ( Regular )", price: 160, category: "Timepass" },
    { id: "peanut_masala", name: "Peanut masala", price: 150, category: "Timepass" },
    { id: "chakna_special", name: "Chakna Special", price: 260, category: "Timepass" },
    { id: "paneer_chilly_dry", name: "Paneer chilly dry", price: 280, category: "Timepass" }
];

export default function HousekeepingPortalPage() {
    const [requests, setRequests] = useState<HospitalityRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [userRole, setUserRole] = useState("");
    const [userName, setUserName] = useState("");

    // Food Deliveries (Prepared food ready for delivery)
    const [foodDeliveries, setFoodDeliveries] = useState<HospitalityRequest[]>([]);
    const [loadingFoodDeliveries, setLoadingFoodDeliveries] = useState(false);

    // Dynamic menu state
    const [menuItems, setMenuItems] = useState<any[]>(DEFAULT_MENU_ITEMS);
    const [isHousekeepingMenuOpen, setIsHousekeepingMenuOpen] = useState(false);
    const [isHighTeaMenuOpen, setIsHighTeaMenuOpen] = useState(false);
    const [isTimepassMenuOpen, setIsTimepassMenuOpen] = useState(false);

    // States for adding new menu item
    const [newMenuName, setNewMenuName] = useState("");
    const [newMenuPrice, setNewMenuPrice] = useState("");

    // Draft editing copy of menu items
    const [tempMenuItems, setTempMenuItems] = useState<any[]>([]);

    const handleOpenHousekeepingMenu = () => {
        setTempMenuItems(JSON.parse(JSON.stringify(menuItems)));
        setIsHousekeepingMenuOpen(true);
    };

    const handleOpenHighTeaMenu = () => {
        setTempMenuItems(JSON.parse(JSON.stringify(menuItems)));
        setIsHighTeaMenuOpen(true);
    };

    const handleOpenTimepassMenu = () => {
        setTempMenuItems(JSON.parse(JSON.stringify(menuItems)));
        setIsTimepassMenuOpen(true);
    };

    const handleAddMenuItem = (category: "Normal" | "High Tea" | "Timepass") => {
        const name = newMenuName.trim();
        const price = parseFloat(newMenuPrice);
        if (!name || isNaN(price)) {
            alert("Please enter valid item name and price.");
            return;
        }
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        if (tempMenuItems.some(item => item.id === id)) {
            alert("An item with this name already exists.");
            return;
        }
        const newItem = {
            id,
            name,
            price,
            category
        };
        setTempMenuItems(prev => [...prev, newItem]);
        setNewMenuName("");
        setNewMenuPrice("");
    };

    const handleDeleteMenuItem = (itemId: string) => {
        setTempMenuItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleUpdateMenuItem = (itemId: string, updates: Partial<{ name: string; price: number }>) => {
        setTempMenuItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, ...updates };
            }
            return item;
        }));
    };

    const handleSaveMenuChanges = async () => {
        try {
            const res = await api.put<{ success: boolean; menuItems: any[] }>("/hospitality/menu", {
                menuItems: tempMenuItems
            });
            if (res.success && Array.isArray(res.menuItems)) {
                setMenuItems(res.menuItems);
                setIsHousekeepingMenuOpen(false);
                setIsHighTeaMenuOpen(false);
                setIsTimepassMenuOpen(false);
                alert("Menu updated successfully!");
            }
        } catch (err: any) {
            alert(err.message || "Failed to update menu.");
        }
    };

    const fetchMenu = async () => {
        try {
            const data = await api.get<any[]>("/hospitality/menu");
            if (Array.isArray(data) && data.length > 0) {
                setMenuItems(data);
            }
        } catch (err) {
            console.error("Error fetching menu items:", err);
        }
    };

    // Modal states for creation and editing
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
    const [formVilla, setFormVilla] = useState(VILLAS_LIST[0].value);
    const [formCategory, setFormCategory] = useState<"Normal" | "High Tea" | "Timepass">("Normal");
    const [formQuantities, setFormQuantities] = useState<Record<string, number>>({});
    const [formStatus, setFormStatus] = useState("pending");
    const [formComments, setFormComments] = useState<Record<string, string>>({});
    const [modalSubmitting, setModalSubmitting] = useState(false);

    const handleOpenCreateModal = () => {
        setModalMode("create");
        setEditingRequestId(null);
        setFormVilla(VILLAS_LIST[0].value);
        setFormCategory("Normal");
        setFormQuantities({});
        setFormComments({});
        setFormStatus("pending");
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (req: HospitalityRequest) => {
        setModalMode("edit");
        setEditingRequestId(req.id);
        setFormVilla(req.villaName);
        setFormCategory(req.itemCategory as any);
        setFormStatus(req.status);
        
        // Parse items back to record
        const parsedQuantities: Record<string, number> = {};
        const parsedComments: Record<string, string> = {};
        req.items.forEach(item => {
            const menuItem = menuItems.find(m => m.name === item.name);
            if (menuItem) {
                parsedQuantities[menuItem.id] = item.quantity;
                parsedComments[menuItem.id] = item.comment || "";
            }
        });
        setFormQuantities(parsedQuantities);
        setFormComments(parsedComments);
        setIsModalOpen(true);
    };

    const handleDeleteRequest = async (id: number) => {
        if (!confirm("Are you sure you want to delete this request?")) return;
        try {
            await api.delete(`/hospitality/requests/${id}`);
            fetchRequests();
        } catch (err: any) {
            alert(err.message || "Failed to delete request.");
        }
    };

    const handleFormIncrement = (id: string) => {
        setFormQuantities(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));
    };

    const handleFormDecrement = (id: string) => {
        setFormQuantities(prev => {
            const current = prev[id] || 0;
            if (current <= 1) {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            }
            return {
                ...prev,
                [id]: current - 1
            };
        });
    };

    const handleFormSubmit = async () => {
        const selectedItems = Object.entries(formQuantities).map(([itemId, qty]) => {
            const item = menuItems.find(m => m.id === itemId);
            return {
                name: item?.name || "",
                quantity: qty,
                price: item?.price || 0,
                category: item?.category || "Normal",
                comment: formComments[itemId] || ""
            };
        });

        if (selectedItems.length === 0) {
            alert("Please select at least one item.");
            return;
        }

        setModalSubmitting(true);
        try {
            if (modalMode === "create") {
                await api.post("/hospitality/requests", {
                    villaName: formVilla,
                    itemCategory: formCategory,
                    items: selectedItems
                });
            } else {
                await api.put(`/hospitality/requests/${editingRequestId}`, {
                    villaName: formVilla,
                    itemCategory: formCategory,
                    status: formStatus,
                    items: selectedItems
                });
            }
            setIsModalOpen(false);
            fetchRequests();
        } catch (err: any) {
            alert(err.message || "Something went wrong.");
        } finally {
            setModalSubmitting(false);
        }
    };
    // Guest allocations/allotments states
    const [allocations, setAllocations] = useState<any[]>([]);
    const [loadingAllocations, setLoadingAllocations] = useState(false);
    const [allocationsError, setAllocationsError] = useState("");

    // Edit allotment states
    const [editingAllocationId, setEditingAllocationId] = useState<number | null>(null);
    const [editAllocationUnit, setEditAllocationUnit] = useState("");
    const [editAllocationSubmitting, setEditAllocationSubmitting] = useState(false);
    
    // Meal Counter States
    const [mealCounter, setMealCounter] = useState<{
        date: string;
        totalGuests: number;
        breakfastEaten: number;
        lunchEaten: number;
        dinnerEaten: number;
        breakfastTotal?: number;
        lunchTotal?: number;
        dinnerTotal?: number;
        bookings: Array<{
            bookingId: number;
            bookingRef: string;
            guestName: string;
            villaName: string;
            numGuests: number;
            breakfast: number;
            lunch: number;
            dinner: number;
        }>;
    } | null>(null);
    const [loadingMealCounter, setLoadingMealCounter] = useState(false);
    
    // Date filter: defaults to today (YYYY-MM-DD)
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });

    useEffect(() => {
        // Fetch current user details to check access
        api.get("/auth/me")
            .then(data => {
                setUserRole(data?.role || "");
                setUserName(data?.username || "");
            })
            .catch(err => {
                console.error("Error fetching user role:", err);
            });
        
        // Fetch menu dynamically
        fetchMenu();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await api.get<HospitalityRequest[]>(
                `/hospitality/requests?category=Normal&excludeChefItems=true&date=${selectedDate}`
            );
            if (Array.isArray(data)) {
                setRequests(data);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch housekeeping requests.");
        } finally {
            setLoading(false);
        }
    };

    const fetchFoodDeliveries = async () => {
        setLoadingFoodDeliveries(true);
        try {
            const data = await api.get<HospitalityRequest[]>("/hospitality/requests?foodDeliveries=true");
            if (Array.isArray(data)) {
                setFoodDeliveries(data);
            }
        } catch (err: any) {
            console.error("Failed to fetch food deliveries:", err);
        } finally {
            setLoadingFoodDeliveries(false);
        }
    };

    const handleMarkDelivered = async (id: number) => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: "fulfilled"
            });
            if (res.success) {
                setFoodDeliveries(prev => prev.filter(r => r.id !== id));
                fetchRequests();
            }
        } catch (err: any) {
            alert(err.message || "Failed to mark order as delivered.");
        }
    };

    const fetchAllocations = async () => {
        setLoadingAllocations(true);
        setAllocationsError("");
        try {
            const data = await api.get<any[]>(
                `/hospitality/allocations?date=${selectedDate}`
            );
            if (Array.isArray(data)) {
                setAllocations(data);
            }
        } catch (err: any) {
            setAllocationsError(err.message || "Failed to fetch villa allotments.");
        } finally {
            setLoadingAllocations(false);
        }
    };

    const handleEditAllocation = async (bookingId: number) => {
        if (!editAllocationUnit.trim()) {
            alert("Please select a cottage/villa.");
            return;
        }
        setEditAllocationSubmitting(true);
        try {
            const res = await api.patch<{ success: boolean; whatsappSent: boolean }>(
                `/hospitality/allocations/${bookingId}`,
                { assignedUnit: editAllocationUnit }
            );
            if (res.success) {
                setEditingAllocationId(null);
                setEditAllocationUnit("");
                fetchAllocations();
                alert(res.whatsappSent
                    ? "Cottage re-allotted & WhatsApp notification sent!"
                    : "Cottage re-allotted. WhatsApp notification could not be sent."
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update allotment.");
        } finally {
            setEditAllocationSubmitting(false);
        }
    };

    const getStayStatus = (booking: any, targetDateStr: string) => {
        try {
            const ci = new Date(booking.checkInDate).toISOString().split("T")[0];
            const co = new Date(booking.checkOutDate).toISOString().split("T")[0];
            if (ci === targetDateStr) {
                return { label: "Check-In", bg: "bg-blue-50 text-blue-700 border-blue-100" };
            } else if (co === targetDateStr) {
                return { label: "Check-Out", bg: "bg-amber-50 text-amber-700 border-amber-100" };
            } else {
                return { label: "Continue", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" };
            }
        } catch (e) {
            return { label: "Continue", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        }
    };

    const fetchMealCounter = useCallback(async () => {
        setLoadingMealCounter(true);
        try {
            const data = await api.get(`/meal-counters?date=${selectedDate}`);
            setMealCounter(data);
        } catch (err) {
            console.error("Failed to fetch meal counter:", err);
        } finally {
            setLoadingMealCounter(false);
        }
    }, [selectedDate]);

    const handleUpdateMealCount = async (bookingId: number, meal: "breakfast" | "lunch" | "dinner", change: number) => {
        if (!mealCounter) return;
        
        const booking = mealCounter.bookings.find(b => b.bookingId === bookingId);
        if (!booking) return;
        
        const currentCount = booking[meal] || 0;
        const newCount = Math.max(0, Math.min(booking.numGuests, currentCount + change));
        
        if (currentCount === newCount) return;

        // Optimistic UI update
        setMealCounter(prev => {
            if (!prev) return null;
            const updatedBookings = prev.bookings.map(b => 
                b.bookingId === bookingId ? { ...b, [meal]: newCount } : b
            );
            
            // Recompute aggregates
            const breakfastEaten = updatedBookings.reduce((sum, b) => sum + b.breakfast, 0);
            const lunchEaten = updatedBookings.reduce((sum, b) => sum + b.lunch, 0);
            const dinnerEaten = updatedBookings.reduce((sum, b) => sum + b.dinner, 0);
            
            return {
                ...prev,
                breakfastEaten,
                lunchEaten,
                dinnerEaten,
                bookings: updatedBookings
            };
        });

        try {
            await api.post(`/meal-counters/update`, {
                date: selectedDate,
                bookingId,
                [meal]: newCount
            });
        } catch (err) {
            console.error("Failed to update meal count:", err);
            alert("Failed to update meal count.");
            fetchMealCounter();
        }
    };

    useEffect(() => {
        if (userRole) {
            fetchRequests();
            fetchAllocations();
            fetchFoodDeliveries();
            fetchMealCounter();
        }
    }, [selectedDate, userRole, fetchMealCounter]);

    const handleFulfilRequest = async (id: number) => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: "fulfilled"
            });
            if (res.success) {
                // Update local state
                setRequests(prev => 
                    prev.map(r => r.id === id ? { ...r, status: "fulfilled" } : r)
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update request status.");
        }
    };

    if (userRole && userRole !== "housekeeping" && userRole !== "owner" && userRole !== "developer" && userRole !== "staycation_admin") {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
                <p className="text-slate-400 text-sm">
                    Only Housekeeping staff, Staycation Admins, Owners, or Developers can access this page.
                </p>
            </div>
        );
    }

    const pendingRequests = requests.filter(r => r.status === "pending");
    const fulfilledRequests = requests.filter(r => r.status === "fulfilled");

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                            <ClipboardCheck size={36} className="text-blue-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Housekeeping Portal</h1>
                            <p className="text-blue-200 text-xs sm:text-sm font-medium mt-1">
                                Manage daily in-villa requests, check guest details, and mark requests as done.
                            </p>
                        </div>
                    </div>
                    
                    {/* Date picker */}
                    <div 
                        onClick={(e) => {
                            const inputEl = e.currentTarget.querySelector("input");
                            if (inputEl) {
                                try {
                                    inputEl.showPicker();
                                } catch (err) {
                                    console.error("showPicker error:", err);
                                }
                            }
                        }}
                        className="relative flex items-center gap-3 bg-black/20 px-4 py-2.5 rounded-xl border border-white/5 self-start md:self-auto cursor-pointer hover:bg-black/30 transition-colors animate-none"
                    >
                        <Calendar size={18} className="text-blue-300 pointer-events-none" />
                        <span className="text-xs sm:text-sm font-semibold tracking-wide font-mono text-blue-100 pointer-events-none">
                            {selectedDate.split("-").reverse().join("-")}
                        </span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
                        />
                    </div>
                </div>
            </div>



            {/* Food Deliveries Section (Prepared food ready to serve from chef) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                    <h2 className="text-lg font-extrabold text-amber-900 flex items-center gap-2">
                        <ShoppingBag size={22} className="text-amber-600" />
                        Food Deliveries (Prepared & Ready to Serve)
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchFoodDeliveries}
                            disabled={loadingFoodDeliveries}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-amber-300"
                        >
                            <RefreshCw size={12} className={loadingFoodDeliveries ? "animate-spin" : ""} />
                            Refresh Deliveries
                        </button>
                        <span className="bg-amber-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                            {foodDeliveries.length} Ready to Deliver
                        </span>
                    </div>
                </div>

                {loadingFoodDeliveries ? (
                    <div className="flex items-center justify-center py-6 text-amber-700 gap-2">
                        <RefreshCw size={18} className="animate-spin" />
                        <span className="text-xs font-semibold">Checking for ready food orders...</span>
                    </div>
                ) : foodDeliveries.length === 0 ? (
                    <p className="text-center py-6 text-slate-500 text-xs font-medium italic">
                        No food orders waiting for delivery right now.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {foodDeliveries.map((req) => (
                            <div key={req.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div>
                                            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                                                <span>🏡 {req.villaName}</span>
                                            </h3>
                                            {req.booking && (
                                                <p className="text-[11px] text-slate-500 font-medium">{req.booking.customerName}</p>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                            {new Date(req.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>

                                    <div className="space-y-1 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                                        <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Order Items:</p>
                                        {Array.isArray(req.items) && req.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-xs text-slate-800 font-semibold">
                                                <span>
                                                    {item.name}
                                                    {item.comment && (
                                                        <span className="text-amber-700 italic text-[10px] ml-1">({item.comment})</span>
                                                    )}
                                                </span>
                                                <span className="font-mono font-bold text-amber-900 bg-white px-1.5 rounded border border-amber-200">×{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleMarkDelivered(req.id)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                >
                                    <Check size={14} className="stroke-[3px]" />
                                    Mark Delivered
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main view grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Pending Requests Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:h-[550px] flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Clock size={20} className="text-blue-600" />
                                Pending Requests
                            </h2>
                            <div className="flex items-center gap-3">
                                {userRole !== "housekeeping" && (
                                    <button
                                        onClick={handleOpenCreateModal}
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={14} />
                                        New Request
                                    </button>
                                )}
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200 inline-flex items-center justify-center whitespace-nowrap shrink-0 text-center">
                                    {pendingRequests.length} Pending
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-10">
                                    <RefreshCw size={36} className="animate-spin text-blue-600" />
                                    <p className="text-sm font-semibold tracking-wide">Loading requests...</p>
                                </div>
                            ) : pendingRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 border border-dashed border-slate-200 rounded-xl py-12 px-4">
                                    <Check size={36} className="text-emerald-500 mb-2" />
                                    <p className="font-semibold text-sm text-slate-700">All caught up!</p>
                                    <p className="text-xs mt-1">No pending housekeeping requests for this day.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRequests.map((req) => (
                                        <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4 hover:shadow-sm transition-shadow">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-800">
                                                        {req.villaName}
                                                    </h3>
                                                    {req.booking ? (
                                                        <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                            <User size={12} />
                                                            {req.booking.customerName} ({req.booking.bookingRef})
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-red-500 font-semibold mt-0.5 flex items-center gap-1">
                                                            <AlertCircle size={12} />
                                                            No active booking found today
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-mono font-bold text-slate-400 self-start sm:self-auto bg-slate-200/50 px-2 py-0.5 rounded">
                                                    {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested Items</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {req.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-lg px-3 py-2 shadow-sm">
                                                            <span className="font-semibold text-slate-700">
                                                                {item.name}
                                                                {item.comment && (
                                                                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100/50 px-1 py-0.5 rounded ml-1.5 font-semibold">
                                                                        {item.comment}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                                                                × {item.quantity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-2 flex justify-between items-center gap-2 border-t border-slate-200/40 mt-1">
                                                {userRole !== "housekeeping" && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleOpenEditModal(req)}
                                                            className="p-2 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
                                                            title="Edit Request"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRequest(req.id)}
                                                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-red-100"
                                                            title="Delete Request"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleFulfilRequest(req.id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-100 hover:shadow"
                                                >
                                                    <Check size={14} className="stroke-[3px]" />
                                                    Mark as Done
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fulfilled Requests Column */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:h-[550px] flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <UserCheck size={18} className="text-slate-500" />
                                Fulfilled Requests
                            </h2>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center whitespace-nowrap shrink-0 text-center">
                                {fulfilledRequests.length} Done
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-4">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-slate-400 gap-2 py-10">
                                    <RefreshCw size={16} className="animate-spin text-slate-400" />
                                    <span className="text-xs font-semibold">Loading...</span>
                                </div>
                            ) : fulfilledRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400">
                                    <p className="text-xs font-medium">No fulfilled requests yet for this day.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {fulfilledRequests.map((req) => (
                                        <div key={req.id} className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                                            <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-200/50 pb-1.5">
                                                <span className="text-slate-700 font-bold text-xs">{req.villaName}</span>
                                                <span>
                                                    {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                {req.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-[11px] text-slate-600 font-medium">
                                                        <span>
                                                            {item.name}
                                                            {item.comment && (
                                                                <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-100/50 px-1 py-0.2 rounded ml-1 font-semibold">
                                                                    {item.comment}
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
                                                {userRole !== "housekeeping" && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleOpenEditModal(req)}
                                                            className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors border border-slate-200"
                                                            title="Edit Request"
                                                        >
                                                            <Edit size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRequest(req.id)}
                                                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors border border-red-100"
                                                            title="Delete Request"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Coffee className="text-amber-500" size={20} />
                            Daily Meal Counts
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Counts updated by housekeeping staff for the selected date.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                            Date: {(() => {
                                try {
                                    const parts = selectedDate.split("-");
                                    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                                } catch (e) {
                                    return selectedDate;
                                }
                            })()}
                        </span>
                        <button
                            onClick={fetchMealCounter}
                            disabled={loadingMealCounter}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            title="Refresh meal counts"
                        >
                            <RefreshCw size={14} className={loadingMealCounter ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {loadingMealCounter && !mealCounter ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                        <RefreshCw size={24} className="animate-spin text-purple-600" />
                        <p className="text-xs font-semibold">Loading counts...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { key: "breakfast", label: "Breakfast", icon: Coffee, count: mealCounter?.breakfastEaten || 0, total: mealCounter?.breakfastTotal !== undefined ? mealCounter.breakfastTotal : (mealCounter?.totalGuests || 0), color: "from-amber-50 to-orange-50/20 text-amber-800 border-amber-100/70", iconColor: "text-amber-600" },
                            { key: "lunch", label: "Lunch", icon: Sun, count: mealCounter?.lunchEaten || 0, total: mealCounter?.lunchTotal !== undefined ? mealCounter.lunchTotal : (mealCounter?.totalGuests || 0), color: "from-emerald-50 to-teal-50/20 text-emerald-800 border-emerald-100/70", iconColor: "text-emerald-600" },
                            { key: "dinner", label: "Dinner", icon: Moon, count: mealCounter?.dinnerEaten || 0, total: mealCounter?.dinnerTotal !== undefined ? mealCounter.dinnerTotal : (mealCounter?.totalGuests || 0), color: "from-indigo-50 to-blue-50/20 text-indigo-800 border-indigo-100/70", iconColor: "text-indigo-600" }
                        ].map((meal) => {
                            const Icon = meal.icon;
                            return (
                                <div key={meal.key} className={`bg-gradient-to-r ${meal.color} border rounded-2xl p-5 flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-white border border-slate-200/50 ${meal.iconColor}`}>
                                            <Icon size={20} />
                                        </div>
                                        <span className="font-extrabold text-sm">{meal.label}</span>
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

            {/* Villa Allotments Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardCheck size={20} className="text-indigo-600" />
                        Villa Allotments ({selectedDate.split("-").reverse().join("-")})
                    </h2>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100 inline-flex items-center justify-center whitespace-nowrap shrink-0 text-center">
                        {allocations.length} Active Guests
                    </span>
                </div>

                {loadingAllocations ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                        <RefreshCw size={24} className="animate-spin text-indigo-600" />
                        <p className="text-xs font-semibold">Loading allotments...</p>
                    </div>
                ) : allocationsError ? (
                    <div className="text-red-500 text-xs font-semibold p-3 bg-red-50 rounded-xl flex items-center gap-2">
                        <AlertCircle size={14} />
                        {allocationsError}
                    </div>
                ) : allocations.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-xs font-medium">
                        No guest allotments for this day.
                    </p>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-2.5 px-3">Villa / Cottage</th>
                                        <th className="py-2.5 px-3">Guest Name & Ref</th>
                                        <th className="py-2.5 px-3">Stay Dates</th>
                                        <th className="py-2.5 px-3 text-center">Breakfast</th>
                                        <th className="py-2.5 px-3 text-center">Lunch</th>
                                        <th className="py-2.5 px-3 text-center">Dinner</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs">
                                    {allocations.map((alloc) => {
                                        const unitName = alloc.villaName || alloc.assignedUnit || alloc.subPropertyName || alloc.propertyName || "Not Assigned";
                                        const isEditing = editingAllocationId === alloc.bookingId;

                                        const renderMealCounterCell = (mealKey: "breakfast" | "lunch" | "dinner") => {
                                            const mealBooking = mealCounter?.bookings?.find(mb => mb.bookingId === alloc.bookingId);
                                            if (!mealBooking) {
                                                return <span className="text-[10px] text-slate-400 font-semibold italic">Not Checked-In</span>;
                                            }
                                            const count = (mealBooking as any)[mealKey] || 0;
                                            const maxGuests = mealBooking.numGuests || alloc.numGuests || 2;
                                            return (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => handleUpdateMealCount(mealBooking.bookingId, mealKey, -1)}
                                                        className="w-5 h-5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-extrabold flex items-center justify-center transition-colors text-[10px] cursor-pointer"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="font-black text-[11px] min-w-[28px] text-center">
                                                        {count} / {maxGuests}
                                                    </span>
                                                    <button
                                                        onClick={() => handleUpdateMealCount(mealBooking.bookingId, mealKey, 1)}
                                                        className="w-5 h-5 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 font-extrabold flex items-center justify-center transition-colors text-[10px] cursor-pointer"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            );
                                        };

                                        return (
                                            <tr key={alloc.bookingId} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-3 font-bold text-slate-800">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1.5 w-full min-w-[160px]">
                                                            <select
                                                                value={editAllocationUnit}
                                                                onChange={(e) => setEditAllocationUnit(e.target.value)}
                                                                className="bg-white border border-blue-300 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 flex-1"
                                                            >
                                                                {VILLAS_LIST.map((villa) => (
                                                                    <option key={villa.value} value={villa.value}>
                                                                        {villa.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => handleEditAllocation(alloc.bookingId)}
                                                                disabled={editAllocationSubmitting}
                                                                className="p-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded transition-colors shrink-0 cursor-pointer"
                                                                title="Save & Notify"
                                                            >
                                                                {editAllocationSubmitting ? (
                                                                    <RefreshCw size={12} className="animate-spin" />
                                                                ) : (
                                                                    <Check size={12} />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingAllocationId(null); setEditAllocationUnit(""); }}
                                                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors border border-slate-200 shrink-0 cursor-pointer"
                                                                title="Cancel"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{unitName}</span>
                                                            {(userRole === "owner" || userRole === "developer") && (
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingAllocationId(alloc.bookingId);
                                                                        setEditAllocationUnit(unitName);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                                                    title="Edit Allotment"
                                                                >
                                                                    <Edit size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="font-semibold text-slate-700">{alloc.guestName || alloc.customerName}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{alloc.bookingRef}</div>
                                                </td>
                                                <td className="py-3 px-3 text-slate-500 font-medium">
                                                    {new Date(alloc.checkInDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - {new Date(alloc.checkOutDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                                </td>
                                                <td className="py-3 px-3 text-center">{renderMealCounterCell("breakfast")}</td>
                                                <td className="py-3 px-3 text-center">{renderMealCounterCell("lunch")}</td>
                                                <td className="py-3 px-3 text-center">{renderMealCounterCell("dinner")}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile view vertical cards */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {allocations.map((alloc) => {
                                const unitName = alloc.villaName || alloc.assignedUnit || alloc.subPropertyName || alloc.propertyName || "Not Assigned";
                                const isEditing = editingAllocationId === alloc.bookingId;

                                const renderMobileMealCounter = (mealKey: "breakfast" | "lunch" | "dinner", label: string) => {
                                    const mealBooking = mealCounter?.bookings?.find(mb => mb.bookingId === alloc.bookingId);
                                    if (!mealBooking) {
                                        return (
                                            <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100/50">
                                                <span className="font-bold text-slate-500">{label}</span>
                                                <span className="text-[10px] text-slate-400 font-semibold italic">Not Checked-In</span>
                                            </div>
                                        );
                                    }
                                    const count = (mealBooking as any)[mealKey] || 0;
                                    const maxGuests = mealBooking.numGuests || alloc.numGuests || 2;
                                    return (
                                        <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100/50">
                                            <span className="font-bold text-slate-600">{label}</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleUpdateMealCount(mealBooking.bookingId, mealKey, -1)}
                                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold flex items-center justify-center transition-colors text-xs cursor-pointer"
                                                >
                                                    -
                                                </button>
                                                <span className="font-black text-xs min-w-[32px] text-center text-slate-800">
                                                    {count} / {maxGuests}
                                                </span>
                                                <button
                                                    onClick={() => handleUpdateMealCount(mealBooking.bookingId, mealKey, 1)}
                                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold flex items-center justify-center transition-colors text-xs cursor-pointer"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <div key={alloc.bookingId} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                        <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                                            <div>
                                                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                                    {unitName}
                                                </span>
                                                <div className="text-xs text-slate-600 font-bold mt-0.5">
                                                    {alloc.guestName || alloc.customerName}
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                    {alloc.bookingRef}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <select
                                                            value={editAllocationUnit}
                                                            onChange={(e) => setEditAllocationUnit(e.target.value)}
                                                            className="bg-white border border-blue-300 rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                                                        >
                                                            {VILLAS_LIST.map((villa) => (
                                                                <option key={villa.value} value={villa.value}>
                                                                    {villa.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleEditAllocation(alloc.bookingId)}
                                                            disabled={editAllocationSubmitting}
                                                            className="p-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded transition-colors cursor-pointer"
                                                        >
                                                            {editAllocationSubmitting ? (
                                                                <RefreshCw size={10} className="animate-spin" />
                                                            ) : (
                                                                <Check size={10} />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingAllocationId(null); setEditAllocationUnit(""); }}
                                                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 cursor-pointer"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    (userRole === "owner" || userRole === "developer") && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingAllocationId(alloc.bookingId);
                                                                setEditAllocationUnit(unitName);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                                                            title="Edit Allotment"
                                                        >
                                                            <Edit size={12} />
                                                        </button>
                                                    )
                                                )}
                                                <div className="text-[10px] text-slate-500 font-semibold mt-1">
                                                    {new Date(alloc.checkInDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - {new Date(alloc.checkOutDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            {renderMobileMealCounter("breakfast", "Breakfast")}
                                            {renderMobileMealCounter("lunch", "Lunch")}
                                            {renderMobileMealCounter("dinner", "Dinner")}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Request Modal (Create/Edit) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">
                                {modalMode === "create" ? "New Housekeeping Request" : "Edit Request"}
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Villa Selection */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Villa / Cottage
                                </label>
                                <select
                                    value={formVilla}
                                    onChange={(e) => setFormVilla(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    {VILLAS_LIST.map((villa) => (
                                        <option key={villa.value} value={villa.value}>
                                            {villa.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    Category
                                </label>
                                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormCategory("Normal");
                                        }}
                                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            formCategory === "Normal"
                                                ? "bg-white text-blue-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormCategory("High Tea");
                                        }}
                                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            formCategory === "High Tea"
                                                ? "bg-white text-indigo-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        High Tea
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormCategory("Timepass");
                                        }}
                                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            formCategory === "Timepass"
                                                ? "bg-white text-emerald-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        Timepass
                                    </button>
                                </div>
                            </div>

                            {/* Status Selector (Only in Edit Mode) */}
                            {modalMode === "edit" && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="fulfilled">Fulfilled</option>
                                    </select>
                                </div>
                            )}

                            {/* Items Selection list */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    Items Menu
                                </label>
                                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[220px] overflow-y-auto bg-slate-50/50 p-2 space-y-1.5 scroll-smooth overscroll-contain touch-pan-y [scrollbar-width:thin]">
                                    {menuItems.filter(m => m.category === formCategory).map((item) => {
                                        const qty = formQuantities[item.id] || 0;
                                        return (
                                            <div key={item.id} className="py-2 border-b border-slate-100 last:border-0">
                                                <div 
                                                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                                        qty > 0 
                                                            ? "bg-white border-blue-200 shadow-sm" 
                                                            : "bg-transparent border-transparent hover:bg-white/60"
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{item.name}</p>
                                                        <p className="text-[10px] font-semibold text-slate-400">₹{item.price}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {qty > 0 && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFormDecrement(item.id)}
                                                                    className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm transition-colors"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="font-mono font-bold text-xs text-blue-700 w-4 text-center">
                                                                    {qty}
                                                                </span>
                                                            </>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFormIncrement(item.id)}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                                                                qty > 0 
                                                                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                                                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                                            }`}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                                {qty > 0 && (
                                                    <div className="mt-1.5 pl-2 animate-in slide-in-from-top-1 duration-100">
                                                        <input
                                                            type="text"
                                                            placeholder="Add notes / item comments..."
                                                            value={formComments[item.id] || ""}
                                                            onChange={(e) => setFormComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={modalSubmitting}
                                onClick={handleFormSubmit}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-100"
                            >
                                {modalSubmitting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        {modalMode === "create" ? "Create Request" : "Save Changes"}
                                    </>
                                )}
                            </button>
                        </div>
                           </div>
                </div>
            )}

            {/* Manage Housekeeping Menu Modal */}
            {isHousekeepingMenuOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Manage Housekeeping Menu</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Add, edit, or delete items in the Normal category</p>
                            </div>
                            <button onClick={() => setIsHousekeepingMenuOpen(false)} className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Add Item Form */}
                        <div className="p-6 border-b border-slate-100 space-y-3 bg-blue-50/20">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add New Item</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    placeholder="Item Name (e.g. Limbu Soda)"
                                    value={newMenuName}
                                    onChange={(e) => setNewMenuName(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                                  />
                                <input
                                    type="number"
                                    placeholder="Price (₹)"
                                    value={newMenuPrice}
                                    onChange={(e) => setNewMenuPrice(e.target.value)}
                                    className="w-full sm:w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                                  />
                                <button
                                    onClick={() => handleAddMenuItem("Normal")}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shrink-0"
                                >
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        {/* List & Edit Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0 [scrollbar-width:thin] scroll-smooth overscroll-contain">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Housekeeping Items</p>
                            <div className="space-y-2">
                                {tempMenuItems.filter(item => item.category === "Normal").map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5 hover:bg-white hover:shadow-sm transition-all">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleUpdateMenuItem(item.id, { name: e.target.value })}
                                            className="flex-1 bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs font-bold text-slate-800 rounded px-2 py-1"
                                        />
                                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                                            <span className="text-[10px] font-bold text-slate-400">₹</span>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handleUpdateMenuItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                                className="w-16 bg-transparent border-none text-right focus:bg-white focus:outline-none text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 rounded p-0"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMenuItem(item.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                                            title="Delete Item"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {tempMenuItems.filter(item => item.category === "Normal").length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-6">No housekeeping items in menu.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsHousekeepingMenuOpen(false)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMenuChanges}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                            >
                                Save Menu Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage High Tea Menu Modal */}
            {isHighTeaMenuOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Manage High Tea Menu</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Add, edit, or delete items in the High Tea category</p>
                            </div>
                            <button onClick={() => setIsHighTeaMenuOpen(false)} className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Add Item Form */}
                        <div className="p-6 border-b border-slate-100 space-y-3 bg-indigo-50/20">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add New Item</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    placeholder="Item Name (e.g. French Fries)"
                                    value={newMenuName}
                                    onChange={(e) => setNewMenuName(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                                  />
                                <input
                                    type="number"
                                    placeholder="Price (₹)"
                                    value={newMenuPrice}
                                    onChange={(e) => setNewMenuPrice(e.target.value)}
                                    className="w-full sm:w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                  />
                                <button
                                    onClick={() => handleAddMenuItem("High Tea")}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shrink-0"
                                >
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        {/* List & Edit Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0 [scrollbar-width:thin] scroll-smooth overscroll-contain">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current High Tea Items</p>
                            <div className="space-y-2">
                                {tempMenuItems.filter(item => item.category === "High Tea").map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5 hover:bg-white hover:shadow-sm transition-all">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleUpdateMenuItem(item.id, { name: e.target.value })}
                                            className="flex-1 bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs font-bold text-slate-800 rounded px-2 py-1"
                                        />
                                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                                            <span className="text-[10px] font-bold text-slate-400">₹</span>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handleUpdateMenuItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                                className="w-16 bg-transparent border-none text-right focus:bg-white focus:outline-none text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 rounded p-0"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMenuItem(item.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                                            title="Delete Item"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {tempMenuItems.filter(item => item.category === "High Tea").length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-6">No High Tea items in menu.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsHighTeaMenuOpen(false)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMenuChanges}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                            >
                                Save Menu Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Timepass Menu Modal */}
            {isTimepassMenuOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Manage Timepass Menu</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Add, edit, or delete items in the Timepass category</p>
                            </div>
                            <button onClick={() => setIsTimepassMenuOpen(false)} className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Add Item Form */}
                        <div className="p-6 border-b border-slate-100 space-y-3 bg-emerald-50/20">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add New Item</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    placeholder="Item Name (e.g. Khichiya Masala Papad)"
                                    value={newMenuName}
                                    onChange={(e) => setNewMenuName(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                                  />
                                <input
                                    type="number"
                                    placeholder="Price (₹)"
                                    value={newMenuPrice}
                                    onChange={(e) => setNewMenuPrice(e.target.value)}
                                    className="w-full sm:w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                  />
                                <button
                                    onClick={() => handleAddMenuItem("Timepass")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shrink-0"
                                >
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        {/* List & Edit Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0 [scrollbar-width:thin] scroll-smooth overscroll-contain">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Timepass Items</p>
                            <div className="space-y-2">
                                {tempMenuItems.filter(item => item.category === "Timepass").map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5 hover:bg-white hover:shadow-sm transition-all">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleUpdateMenuItem(item.id, { name: e.target.value })}
                                            className="flex-1 bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-bold text-slate-800 rounded px-2 py-1"
                                        />
                                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                                            <span className="text-[10px] font-bold text-slate-400">₹</span>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handleUpdateMenuItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                                className="w-16 bg-transparent border-none text-right focus:bg-white focus:outline-none text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 rounded p-0"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMenuItem(item.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                                            title="Delete Item"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {tempMenuItems.filter(item => item.category === "Timepass").length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-6">No Timepass items in menu.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsTimepassMenuOpen(false)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMenuChanges}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                            >
                                Save Menu Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

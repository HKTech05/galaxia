"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Info, Clock, CheckCircle, CheckCircle2, Ban, IndianRupee, RotateCcw, BedDouble, AlertTriangle, X, Plus, CalendarDays, Phone, User as UserIcon, Upload, Camera, Loader2, MessageSquare, Image as ImageIcon, FileText } from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";
import IdProofModal from "./IdProofModal";
import { api } from "../../lib/api";
import ManualBookingModal from "./ManualBookingModal";
import { compressImage } from "../../lib/imageCompressor";


const isUnitOccupiedOnDates = (opt: string, selectedBooking: any, bookings: any[]) => {
    if (!selectedBooking) return false;
    return bookings.some(b => {
        if (b.rawId === selectedBooking.rawId) return false;
        const st = (b.status || "").toLowerCase();
        if (st !== "checked in" && st !== "checked_in") return false;
        if (!b.assignedUnit) return false;
        const units = b.assignedUnit.split(", ").map((u: string) => u.trim());
        if (!units.includes(opt)) return false;

        // Date overlap check
        if (b.rawCheckInDate && b.rawCheckOutDate && selectedBooking.rawCheckInDate && selectedBooking.rawCheckOutDate) {
            const bStart = new Date(b.rawCheckInDate).getTime();
            const bEnd = new Date(b.rawCheckOutDate).getTime();
            const sStart = new Date(selectedBooking.rawCheckInDate).getTime();
            const sEnd = new Date(selectedBooking.rawCheckOutDate).getTime();
            if (bStart >= sEnd || bEnd <= sStart) {
                return false; // No date overlap
            }
        }
        return true;
    });
};

const getUnitOptions = (booking: any) => {
    if (!booking) return [];
    const parent = (booking.parentProperty || "").toLowerCase();
    const sub = (booking.property || "").toLowerCase();
    
    if (parent.includes("amstel") || sub.includes("amstel")) {
        if (sub.includes("family")) {
            return ["Family Cottage"];
        } else {
            return [
                "Cottage 1", "Cottage 2", "Cottage 3", "Cottage 4", "Cottage 5",
                "Cottage 6", "Cottage 7", "Cottage 8", "Cottage 9", "Cottage 11",
                "Cottage 12", "Cottage 13", "Cottage 14", "Cottage 15"
            ];
        }
    } else if (parent.includes("ambrose") || sub.includes("ambrose")) {
        return ["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"];
    }
    return [booking.property || ""];
};

export default function StaycationPropertyPortal({ properties, portalName }: { properties: string[], portalName: string }) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("");
    const [username, setUsername] = useState<string>("");

    useEffect(() => {
        api.get<any>("/auth/me").then(data => {
            setUserRole(data?.role || "");
            setUsername(data?.username || "");
        }).catch(() => {});
    }, []);

    // Date Range Filters
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [receptionistMode, setReceptionistMode] = useState<"checkin" | "checkout">("checkin");

    // Fetch bookings from API
    const fetchBookings = useCallback(async () => {
        try {
            const data = await api.get("/bookings/staycation");
            if (Array.isArray(data) && data.length > 0) {
                const mapped = data.map((b: any) => ({
                    id: b.bookingRef || `#ST-${b.id}`,
                    rawId: b.id,
                    customer: b.customerName || "Unknown",
                    phone: b.customerPhone || "",
                    property: b.subProperty 
                        ? b.subProperty.name 
                        : (b.property?.name || "Unknown"),
                    parentProperty: b.property?.name || "Unknown",
                    guests: b.numGuests || 0,
                    kids: b.numKids || 0,
                    pets: b.numPets || 0,
                    checkInDate: b.checkInDate ? new Date(b.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
                    checkOutDate: b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
                    rawCheckInDate: b.checkInDate,
                    rawCheckOutDate: b.checkOutDate,
                    checkInTime: "1:00 PM",
                    checkOutTime: "10:00 AM",
                    depositAmt: `₹${(b.securityDeposit !== null && b.securityDeposit !== undefined ? b.securityDeposit : ((b.property?.name?.includes("Amstel") || b.property?.name?.includes("Hill View")) ? 2000 : 3000)).toLocaleString('en-IN')}`,
                    remainingAmt: `₹${(b.balanceAmount || 0).toLocaleString('en-IN')}`,
                    idProofUrl: b.idProofUrl || null,
                    propertyId: b.propertyId,
                    subPropertyId: b.subPropertyId,
                    guestIds: (b.guestIds || []).map((g: any) => ({
                        id: g.id,
                        fileName: g.fileName,
                        fileType: g.fileType,
                    })),
                    status: b.status === "checked_out" ? "Completed" : 
                            b.status === "confirmed" ? "Confirmed" : 
                            b.status === "checked_in" ? "Checked In" : 
                            b.status || "Pending",
                    addons: b.addons || null,
                    totalAmount: b.totalAmount || 0,
                    numCottages: b.numCottages || 1,
                    depositRefunded: b.depositRefunded || false,
                    depositRefundMethod: b.depositRefundMethod || null,
                    depositRefundedAt: b.depositRefundedAt || null,
                    depositMethod: b.depositMethod || null,
                    balanceMethod: b.balanceMethod || null,
                    depositCollected: b.depositCollected || false,
                    balanceCollected: b.balanceCollected || false,
                    upiPayments: b.upiPayments || [],
                    foodBills: b.foodBills || [],
                    extraGuestCharge: (b.extraGuests || []).reduce((sum: number, eg: any) => sum + (eg.chargeAmount || 0), 0),
                    extraGuestPayment: (b.extraGuests || []).map((eg: any) => eg.paymentMethod).filter(Boolean).join(", ") || "UPI",
                    extraGuests: b.extraGuests || [],
                    assignedUnit: b.assignedUnit || null,
                    comments: b.comments || null,
                }));
                setBookings(mapped);
            }
        } catch (err) {
            console.error("Failed to fetch staycation bookings:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [modalType, setModalType] = useState<"checkin" | "checkout">("checkin");
    const [previewGuestId, setPreviewGuestId] = useState<{ id: number; fileName: string | null; fileType: string | null } | null>(null);
    const [previewPaymentProof, setPreviewPaymentProof] = useState<any | null>(null);
    const [previewPaymentProofUrl, setPreviewPaymentProofUrl] = useState<string | null>(null);
    const [previewPaymentProofLoading, setPreviewPaymentProofLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!previewPaymentProof) {
            setPreviewPaymentProofUrl(null);
            return;
        }

        let cancelled = false;
        (async () => {
            setPreviewPaymentProofLoading(true);
            try {
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                const res = await fetch(`/api/upi-payments/image/${previewPaymentProof.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (cancelled) return;
                if (!res.ok) {
                    throw new Error("Failed to load");
                }
                const blob = await res.blob();
                if (cancelled) return;
                setPreviewPaymentProofUrl(URL.createObjectURL(blob));
            } catch (err) {
                console.error("Error loading payment proof:", err);
            } finally {
                if (!cancelled) setPreviewPaymentProofLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [previewPaymentProof]);

    // Payment collection states
    const [collected20, setCollected20] = useState<string | null>(null);
    const [collectedSec, setCollectedSec] = useState<string | null>(null);
    // UPI proof files
    const [upiProofBalance, setUpiProofBalance] = useState<File | null>(null);
    const [upiProofDeposit, setUpiProofDeposit] = useState<File | null>(null);
    // Split payment amounts
    const [splitCashBalance, setSplitCashBalance] = useState<number>(0);
    const [splitUpiBalance, setSplitUpiBalance] = useState<number>(0);
    const [splitCashDeposit, setSplitCashDeposit] = useState<number>(0);
    const [splitUpiDeposit, setSplitUpiDeposit] = useState<number>(0);

    // Cancel modal state
    const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);

    // Add Extra Guest states
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [extraGuestForm, setExtraGuestForm] = useState({
        guests: 1,
        pets: 0,
        paymentMethod: "UPI",
        idFileName: ""
    });

    // Food Bill modal states
    const [isFoodBillModalOpen, setIsFoodBillModalOpen] = useState(false);
    const [foodBillBooking, setFoodBillBooking] = useState<any>(null);
    const [foodBillForm, setFoodBillForm] = useState({ description: "", amount: "", paymentMethod: "cash" });
    const [foodBillUpiProof, setFoodBillUpiProof] = useState<File | null>(null);
    const [foodBillSubmitting, setFoodBillSubmitting] = useState(false);

    // E-menu food bill states
    const [foodBillItems, setFoodBillItems] = useState<Array<{ id: string; description: string; amount: number; isEMenu?: boolean }>>([]);
    const [customTotalAmount, setCustomTotalAmount] = useState<number | null>(null);
    const [customDescription, setCustomDescription] = useState<string | null>(null);
    const [assignedUnitInput, setAssignedUnitInput] = useState<string>("");
    const [multiAssignedUnits, setMultiAssignedUnits] = useState<string[]>([]);
    const [upiProofRefund, setUpiProofRefund] = useState<File | null>(null);
    const [uploadingRefund, setUploadingRefund] = useState(false);
    const [isAmbroseOverriding, setIsAmbroseOverriding] = useState<boolean>(false);

    useEffect(() => {
        if (selectedBooking && modalType === "checkin") {
            setIsAmbroseOverriding(false);
            const parent = (selectedBooking.parentProperty || "").toLowerCase();
            const isAmbrose = parent.includes("ambrose");
            
            if (isAmbrose) {
                setAssignedUnitInput(selectedBooking.property || "");
                setMultiAssignedUnits([selectedBooking.property || ""]);
            } else {
                const allOpts = getUnitOptions(selectedBooking);
                const opts = allOpts.filter(opt => !isUnitOccupiedOnDates(opt, selectedBooking, bookings));

                const numCottages = selectedBooking.numCottages || 1;
                if (numCottages > 1) {
                    const arr: string[] = [];
                    for (let i = 0; i < numCottages; i++) {
                        arr.push(opts[i] || opts[0] || allOpts[0] || "");
                    }
                    setMultiAssignedUnits(arr);
                } else {
                    if (opts.length > 0) {
                        const bookingProperty = (selectedBooking.property || "").toLowerCase();
                        const matchedIdx = opts.findIndex(opt => opt.toLowerCase() === bookingProperty || opt.toLowerCase().includes(bookingProperty));
                        if (matchedIdx !== -1) {
                            setAssignedUnitInput(opts[matchedIdx]);
                        } else {
                            setAssignedUnitInput(opts[0]);
                        }
                    } else {
                        setAssignedUnitInput(allOpts[0] || "");
                    }
                }
            }
        }
    }, [selectedBooking, modalType, bookings]);

    useEffect(() => {
        if (isFoodBillModalOpen && foodBillBooking) {
            const fetchEMenuRequests = async () => {
                try {
                    const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                    const res = await fetch(`/api/hospitality/requests?bookingId=${foodBillBooking.rawId}&isBilled=false&status=fulfilled`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const itemsList: Array<{ id: string; description: string; amount: number; isEMenu?: boolean }> = [];
                        data.forEach((req: any) => {
                            if (Array.isArray(req.items)) {
                                req.items.forEach((item: any, idx: number) => {
                                    itemsList.push({
                                        id: `emenu-${req.id}-${idx}`,
                                        description: `${item.name} x${item.quantity}${item.comment ? ` (${item.comment})` : ''}`,
                                        amount: (item.price || 0) * (item.quantity || 0),
                                        isEMenu: true
                                    });
                                });
                            }
                        });
                        setFoodBillItems(itemsList);
                    } else {
                        setFoodBillItems([]);
                    }
                } catch (err) {
                    console.error("Error fetching e-menu requests:", err);
                    setFoodBillItems([]);
                }
                setCustomTotalAmount(null);
                setCustomDescription(null);
            };
            fetchEMenuRequests();
        } else {
            setFoodBillItems([]);
            setCustomTotalAmount(null);
            setCustomDescription(null);
        }
    }, [isFoodBillModalOpen, foodBillBooking]);

    const handleFoodBillSubmit = async () => {
        if (!foodBillBooking) return;

        const sumOfItems = foodBillItems.reduce((sum, item) => sum + (parseInt(item.amount as any) || 0), 0);
        const finalAmount = customTotalAmount !== null ? customTotalAmount : sumOfItems;
        const autoDescription = foodBillItems.map(item => `${item.description} (₹${item.amount})`).join(", ");
        const finalDescription = customDescription !== null ? customDescription : autoDescription;

        if (!finalDescription || !finalAmount) {
            alert("Description and Amount are required.");
            return;
        }

        setFoodBillSubmitting(true);
        try {
            let upiProofUrl = null;
            let upiProofKey = null;
             if (foodBillForm.paymentMethod === "upi" && foodBillUpiProof) {
                 const compressed = await compressImage(foodBillUpiProof);
                 const formData = new FormData();
                 formData.append("file", compressed);
                 formData.append("category", "food-bill-proofs");
                 const uploadData = await api.upload<{ url: string }>("/uploads/general", formData);
                 upiProofUrl = uploadData.url;
                 try {
                     const urlObj = new URL(uploadData.url);
                     upiProofKey = urlObj.pathname.slice(1);
                 } catch {
                     upiProofKey = uploadData.url;
                 }
             }
            await api.post("/stay-food-bills", {
                bookingId: foodBillBooking.rawId,
                description: finalDescription,
                amount: finalAmount,
                paymentMethod: foodBillForm.paymentMethod,
                upiProofUrl,
                upiProofKey,
            });

            // Mark e-menu requests as billed
            try {
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                await fetch(`/api/hospitality/requests/bill/${foodBillBooking.rawId}`, {
                    method: "PUT",
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
            } catch (err) {
                console.error("Failed to mark hospitality requests as billed:", err);
            }

            setIsFoodBillModalOpen(false);
            setFoodBillForm({ description: "", amount: "", paymentMethod: "cash" });
            setFoodBillUpiProof(null);
            fetchBookings();
            alert("Food bill added successfully!");
        } catch (err) {
            alert("Failed to add food bill");
        } finally {
            setFoodBillSubmitting(false);
        }
    };

    const calculateExtraGuestPrice = (includeGuests = true, includePets = true) => {
        if (!selectedBooking) return 0;

        const start = selectedBooking.rawCheckInDate ? new Date(selectedBooking.rawCheckInDate) : new Date();
        const end = selectedBooking.rawCheckOutDate ? new Date(selectedBooking.rawCheckOutDate) : new Date();
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        let extraAdultPrice = 0;
        const prop = selectedBooking.property || "";
        const parentProp = selectedBooking.parentProperty || "";
        if (prop.includes("Hill View") || parentProp.includes("Hill View")) extraAdultPrice = 600;
        else if (prop.includes("Mount View") || parentProp.includes("Mount View")) extraAdultPrice = 800;
        else if (prop.includes("Heavenly Villa") || parentProp.includes("Heavenly Villa")) extraAdultPrice = 800;
        else if (prop.includes("La Paraiso") || parentProp.includes("La Paraiso")) extraAdultPrice = 1200;
        else if (prop.includes("Amstel") || parentProp.includes("Amstel")) extraAdultPrice = 2000;
        else if (prop.includes("Ambrose") || parentProp.includes("Ambrose")) extraAdultPrice = 2000;

        let total = 0;
        if (includeGuests) total += extraAdultPrice * extraGuestForm.guests * nights;
        if (includePets) total += 600 * extraGuestForm.pets * nights;

        return Math.round(total);
    };

    const handleAddExtraGuestSubmit = async () => {
        if (!selectedBooking) return;
        try {
            if (extraGuestForm.guests > 0) {
                const extraCharge = calculateExtraGuestPrice(true, false);
                await api.post(`/bookings/staycation/${selectedBooking.rawId}/extra-guest`, {
                    guestName: "Extra Guest",
                    idProofType: "Uploaded",
                    chargeAmount: extraCharge,
                    paymentMethod: extraGuestForm.paymentMethod
                });
            }
            if (extraGuestForm.pets > 0) {
                const petsCharge = calculateExtraGuestPrice(false, true);
                if (petsCharge > 0) {
                    await api.post(`/bookings/staycation/${selectedBooking.rawId}/extra-guest`, {
                        guestName: `Pet (${extraGuestForm.pets})`,
                        idProofType: "None",
                        chargeAmount: petsCharge,
                        paymentMethod: extraGuestForm.paymentMethod
                    });
                }
            }
            fetchBookings();
            setIsAddGuestModalOpen(false);
        } catch (err) {
            alert("Failed to add extra guest / pet");
        }
    };

    // Manual Booking states
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);


    useEffect(() => {
        if (!isActionModalOpen) {
            setCollected20(null);
            setCollectedSec(null);
            setSplitCashBalance(0);
            setSplitUpiBalance(0);
            setSplitCashDeposit(0);
            setSplitUpiDeposit(0);
        }
    }, [isActionModalOpen]);


    // Filter to logically evaluate if a booking intersects the query date range.
    const todaysBookings = bookings.map(b => {
        const matchesProperty = properties.some(p => b.property.includes(p) || (b.parentProperty && b.parentProperty === p));
        if (!matchesProperty) return null;
        if (b.status === "Cancelled") return null;

        const fmtLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const selectedDateStr = fmtLocalDateStr(startDate);

        const rawCID = b.rawCheckInDate ? b.rawCheckInDate.slice(0, 10) : "";
        const rawCOD = b.rawCheckOutDate ? b.rawCheckOutDate.slice(0, 10) : "";

        if (receptionistMode === "checkin") {
            // Active check-ins today: check-in <= selected day AND checkout > selected day
            const isActiveToday = rawCID <= selectedDateStr && rawCOD > selectedDateStr;
            if (isActiveToday) {
                const isContinue = rawCID < selectedDateStr;
                let resolvedStatus = "Pending";
                if (b.status === "Checked In" || b.status === "checked_in") {
                    resolvedStatus = "Checked In";
                } else if (b.status === "checked_out" || b.status === "Completed" || b.status === "Completed") {
                    resolvedStatus = "Checked Out";
                }
                return { ...b, isContinue, status: resolvedStatus };
            }
        } else {
            // Checkout today: check-out === selected day
            const isCheckoutToday = rawCOD === selectedDateStr;
            if (isCheckoutToday) {
                const isCheckedOut = b.status === "Completed" || b.status === "checked_out" || b.status === "checked-out";
                const resolvedStatus = isCheckedOut ? "Checked Out" : "Pending";
                return { ...b, status: resolvedStatus };
            }
        }
        return null;
    }).filter(Boolean) as any[];

    const handleAction = async (booking: any, newStatus: string) => {
        try {
            const numericId = booking.rawId;

            // Upload UPI proof images first if checking in
            if (newStatus === "Checked In" && selectedBooking) {
                const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;

                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                const employee = await api.get(`/employees?propertyId=${selectedBooking.propertyId || ''}`);
                const empId = Array.isArray(employee) && employee[0] ? employee[0].id : null;

                const hasUpiBalance = collected20 === "UPI" || (collected20 === "Split" && splitUpiBalance > 0);
                const actualUpiBalanceAmt = collected20 === "UPI" ? balanceAmt : splitUpiBalance;
                
                let balanceUpiPromise = Promise.resolve();
                if (hasUpiBalance && upiProofBalance) {
                    const compressed = await compressImage(upiProofBalance);
                    const fd = new FormData();
                    fd.append("file", compressed);
                    if (empId) fd.append("employeeId", String(empId));
                    fd.append("bookingRef", booking.id || '');
                    fd.append("guestName", booking.customer || '');
                    fd.append("amount", String(actualUpiBalanceAmt));
                    fd.append("paymentType", "balance");
                    fd.append("note", `Balance — ${selectedBooking.property}`);
                    balanceUpiPromise = api.upload("/upi-payments/upload", fd);
                }

                const hasUpiDeposit = collectedSec === "UPI" || (collectedSec === "Split" && splitUpiDeposit > 0);
                const actualUpiDepositAmt = collectedSec === "UPI" ? depositAmt : splitUpiDeposit;
                
                let depositUpiPromise = Promise.resolve();
                if (hasUpiDeposit && upiProofDeposit) {
                    const compressed = await compressImage(upiProofDeposit);
                    const fd = new FormData();
                    fd.append("file", compressed);
                    if (empId) fd.append("employeeId", String(empId));
                    fd.append("bookingRef", booking.id || '');
                    fd.append("guestName", booking.customer || '');
                    fd.append("amount", String(actualUpiDepositAmt));
                    fd.append("paymentType", "deposit");
                    fd.append("note", `Security deposit — ${selectedBooking.property}`);
                    depositUpiPromise = api.upload("/upi-payments/upload", fd);
                }

                await Promise.all([balanceUpiPromise, depositUpiPromise]);
            }

            await api.patch(`/bookings/staycation/${numericId}/status`, { 
                status: newStatus === "Checked In" ? "checked_in" : 
                        newStatus === "Cancelled" ? "cancelled" : 
                        (newStatus === "Checked Out" || newStatus === "Completed") ? "checked_out" : "confirmed",
                ...(newStatus === "Checked In" ? { 
                    assignedUnit: selectedBooking && selectedBooking.numCottages > 1 
                        ? multiAssignedUnits.filter(Boolean).join(", ") 
                        : assignedUnitInput 
                } : {})
            });
            
            // Record payment if checking in
            if (newStatus === "Checked In" && selectedBooking) {
                const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;

                if (collected20 === "Split") {
                    if (splitCashBalance > 0) {
                        await api.post(`/bookings/staycation/${numericId}/payment`, {
                            paymentType: "balance",
                            amount: splitCashBalance,
                            method: "Cash"
                        });
                    }
                    if (splitUpiBalance > 0) {
                        await api.post(`/bookings/staycation/${numericId}/payment`, {
                            paymentType: "balance",
                            amount: splitUpiBalance,
                            method: "UPI"
                        });
                    }
                } else {
                    await api.post(`/bookings/staycation/${numericId}/payment`, {
                        paymentType: "balance",
                        amount: balanceAmt,
                        method: collected20
                    });
                }

                if (collectedSec === "Split") {
                    if (splitCashDeposit > 0) {
                        await api.post(`/bookings/staycation/${numericId}/payment`, {
                            paymentType: "deposit",
                            amount: splitCashDeposit,
                            method: "Cash"
                        });
                    }
                    if (splitUpiDeposit > 0) {
                        await api.post(`/bookings/staycation/${numericId}/payment`, {
                            paymentType: "deposit",
                            amount: splitUpiDeposit,
                            method: "UPI"
                        });
                    }
                } else {
                    await api.post(`/bookings/staycation/${numericId}/payment`, {
                        paymentType: "deposit",
                        amount: depositAmt,
                        method: collectedSec
                    });
                }

                // Reset states
                setUpiProofBalance(null);
                setUpiProofDeposit(null);
                setSplitCashBalance(0);
                setSplitUpiBalance(0);
                setSplitCashDeposit(0);
                setSplitUpiDeposit(0);
            }

            fetchBookings();
        } catch (err) {
            alert("Failed to update booking status");
        }
    };

    const handleUpdateComments = async (bookingId: number | string, newComments: string) => {
        try {
            await api.patch(`/bookings/staycation/${bookingId}`, {
                comments: newComments
            });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, comments: newComments } : b));
        } catch (err) {
            console.error("Failed to update comments:", err);
            alert("Failed to update comments.");
        }
    };

    return (
        <>
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header Info */}
            <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {portalName.replace(" | Owner View", "")}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Bookings dashboard filtered by checkin/checkout mode.</p>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <button
                        onClick={() => setIsManualBookingOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors mr-2 border border-purple-700"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Manual Booking</span><span className="sm:hidden">New Booking</span>
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                            <button
                                onClick={() => setReceptionistMode("checkin")}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                    receptionistMode === "checkin"
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Checkins
                            </button>
                            <button
                                onClick={() => setReceptionistMode("checkout")}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                    receptionistMode === "checkout"
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Checkouts
                            </button>
                        </div>
                        <CustomDatePicker date={startDate} onDateChange={(d) => {
                            setStartDate(d);
                            setEndDate(d);
                        }} />
                    </div>
                </div>
            </div>

            {todaysBookings.length === 0 ? (
                <div className="bg-white border text-center border-slate-200 rounded-2xl shadow-sm p-16 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <BedDouble size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">No Bookings Found</h2>
                    <p className="text-sm font-medium text-slate-500">There are no {receptionistMode === "checkin" ? "checkins" : "checkouts"} today.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {todaysBookings.map((booking) => (
                        <div key={booking.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">

                            {/* Left Col: Details */}
                            <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-800">{booking.id}</span>
                                        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-100 uppercase tracking-wider">
                                            {booking.property}
                                        </span>
                                    </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                        booking.status === 'Checked In' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        booking.status === 'Checked Out' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                        booking.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}>
                                        {booking.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Guest</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            {booking.customer}
                                            {booking.isContinue && (
                                                <span className="text-red-600 font-extrabold text-sm ml-1.5 animate-pulse">(Continue)</span>
                                            )}
                                        </p>
                                        {booking.phone && (
                                            <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                                                <Phone size={11} className="text-slate-400" />
                                                {booking.phone}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Number of Guests</p>
                                         <p className="text-xl tracking-tight font-black text-slate-800">{booking.guests} adults{booking.kids > 0 && <span className="text-sm font-bold text-blue-600 ml-2">+ {booking.kids} kid{booking.kids > 1 ? 's' : ''}</span>}{booking.pets > 0 && <span className="text-sm font-bold text-purple-600 ml-2">+ {booking.pets} pet{booking.pets > 1 ? 's' : ''}</span>}</p>
                                         {booking.numCottages > 1 && <p className="text-xs font-bold text-indigo-600 mt-1">× {booking.numCottages} cottages</p>}
                                         {(() => {
                                             const propName = ((booking.parentProperty || "") + " " + (booking.property || "")).toLowerCase();
                                             const isAmbroseOrAmstel = propName.includes("ambrose") || propName.includes("amstel");
                                             if (!isAmbroseOrAmstel) return null;

                                             const extraAdultsCount = (booking.extraGuests || []).filter((eg: any) => !eg.guestName?.toLowerCase().includes("pet")).length;
                                             const totalAdults = Math.max(1, (booking.guests || 0) + extraAdultsCount);
                                             return (
                                                 <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 text-cyan-800 rounded-lg border border-cyan-200 text-xs font-bold shadow-xs">
                                                     <span>Complimentary Water: <strong className="text-cyan-900">{totalAdults} Free Bottle{totalAdults > 1 ? 's' : ''}</strong></span>
                                                 </div>
                                             );
                                         })()}
                                     </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Check-in</p>
                                        <p className="text-sm font-bold text-slate-800">{booking.checkInDate}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5"><Clock size={12} className="inline mr-1" />{booking.checkInTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Check-out</p>
                                        <p className="text-sm font-bold text-slate-800">{booking.checkOutDate}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5"><Clock size={12} className="inline mr-1" />{booking.checkOutTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Security Deposit</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1"><IndianRupee size={14} className="text-emerald-600" /> {booking.depositAmt}</p>
                                    </div>

                                    {booking.extraGuestCharge > 0 && (
                                        <div className="mt-2 col-span-2 sm:col-span-4 bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Extra Guest Surcharge: Paid</p>
                                            </div>
                                            <p className="text-sm font-bold text-purple-800 flex items-center">
                                                <IndianRupee size={12} className="mr-0.5" />
                                                {booking.extraGuestCharge.toLocaleString('en-IN')}
                                                <span className="text-[9px] bg-purple-200 text-purple-800 px-1 py-0.5 rounded ml-1.5 uppercase">{booking.extraGuestPayment}</span>
                                            </p>
                                        </div>
                                    )}

                                    {booking.addons && Array.isArray(booking.addons) && booking.addons.length > 0 && (
                                        <div className="mt-2 col-span-2 sm:col-span-5 space-y-2">
                                            {booking.addons.filter((a: any) => a.name === 'Celebration Add-on').map((addon: any, i: number) => (
                                                <div key={i} className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Celebration Add-on</p>
                                                        <p className="text-sm font-bold text-amber-800 mt-0.5">₹{Number(addon.price || 1200).toLocaleString('en-IN')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        {addon.cakeMessage && <p className="text-xs text-slate-700">Cake: <span className="font-bold">{addon.cakeMessage}</span></p>}
                                                        {addon.occasion && <p className="text-xs text-slate-700">Occasion: <span className="font-bold">{addon.occasion}</span></p>}
                                                    </div>
                                                </div>
                                            ))}
                                            {booking.addons.filter((a: any) => a.name === 'Food Preference').map((addon: any, i: number) => (
                                                <div key={`food-${i}`} className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Food:</span>
                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${addon.foodType === 'Jain' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{addon.foodType} (Veg){addon.count ? ` × ${addon.count}` : ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Food Bills Summary */}
                                {booking.foodBills && booking.foodBills.length > 0 && (
                                    <div className="mt-4 col-span-2 sm:col-span-5">
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1.5">Food Bills</p>
                                            {booking.foodBills.map((fb: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-amber-100 last:border-0">
                                                    <span className="font-medium text-amber-800">{fb.description}</span>
                                                    <span className="font-bold text-amber-800">₹{fb.amount.toLocaleString('en-IN')} <span className="text-[9px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded ml-1 uppercase">{fb.paymentMethod}</span></span>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between text-xs font-black text-amber-900 pt-1.5 mt-1 border-t border-amber-200">
                                                <span>Total</span>
                                                <span>₹{booking.foodBills.reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Booking Comments Section */}
                                <div className="mt-6 border-t border-slate-100 pt-6">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <MessageSquare size={14} className="text-slate-400" />
                                        Comments / Notes
                                    </h4>
                                    {(["H&H", "devi", "ranjit", "M&L"].includes(username) || userRole === "receptionist") ? (
                                        booking.comments ? (
                                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-bold text-red-700 leading-relaxed whitespace-pre-wrap">
                                                {booking.comments}
                                            </div>
                                        ) : null
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                defaultValue={booking.comments || ""}
                                                onBlur={(e) => handleUpdateComments(booking.rawId, e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") { handleUpdateComments(booking.rawId, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
                                                placeholder="Add a comment for receptionist (press Enter or click outside to save)..."
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Camera size={14} /> ID Proofs</h4>
                                            <label className="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors">
                                                <Upload size={10} /> Upload
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        try {
                                                            const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                                                            const formData = new FormData();
                                                            formData.append("file", file);
                                                            formData.append("bookingId", String(booking.rawId));
                                                            const res = await fetch("/api/uploads/guest-id", {
                                                                method: "POST",
                                                                headers: { Authorization: `Bearer ${token}` },
                                                                body: formData,
                                                            });
                                                            if (res.ok) {
                                                                alert("ID uploaded!");
                                                                fetchBookings();
                                                            } else {
                                                                alert("Upload failed");
                                                            }
                                                        } catch { alert("Upload failed"); }
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {booking.guestIds && booking.guestIds.length > 0 ? (
                                                booking.guestIds.map((gid: any) => (
                                                    <button
                                                        key={gid.id}
                                                        onClick={() => setPreviewGuestId(gid)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        <span className="truncate max-w-[120px]">{gid.fileName || `ID-${gid.id}`}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium py-2">No IDs uploaded yet</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><ImageIcon size={14} className="text-indigo-600" /> UPI Proofs</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {booking.upiPayments && booking.upiPayments.length > 0 ? (
                                                booking.upiPayments.map((upi: any) => (
                                                    <button
                                                        key={upi.id}
                                                        onClick={() => setPreviewPaymentProof(upi)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                                                    >
                                                        <ImageIcon size={14} />
                                                        <span className="truncate max-w-[150px]">{upi.paymentType.toUpperCase()} - ₹{upi.amount}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium py-2">No UPI proofs found</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Actions */}
                            <div className="p-6 md:w-1/3 bg-slate-50/50 flex flex-col justify-center space-y-3">
                                {receptionistMode === "checkin" ? (
                                    booking.status === "Checked Out" ? (
                                        <div className="text-center p-4">
                                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                                                <CheckCircle2 size={20} className="text-slate-400" />
                                            </div>
                                            <h4 className="font-bold text-slate-800">Checkout Completed</h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">Guest has departed</p>
                                        </div>
                                    ) : booking.status !== "Checked In" ? (
                                        <>
                                            <button
                                                onClick={() => { setSelectedBooking(booking); setModalType('checkin'); setIsActionModalOpen(true); }}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-emerald-700">
                                                <CheckCircle size={18} /> Confirm Check-in
                                            </button>
                                            <button
                                                onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, pets: 0, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                                <Users size={18} className="text-purple-600" /> Add Extra Guest / Pet
                                            </button>
                                            <button
                                                onClick={() => setCancelModalBooking(booking)}
                                                className="w-full bg-white hover:bg-red-50 text-red-600 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-red-200">
                                                <Ban size={18} /> Cancel Booking
                                            </button>
                                            {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                            <button
                                                onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                                <Plus size={18} /> Collect Food Bill
                                            </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, pets: 0, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                                <Users size={18} className="text-purple-600" /> Add Extra Guest / Pet
                                            </button>
                                            {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                            <button
                                                onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                                <Plus size={18} /> Collect Food Bill
                                            </button>
                                            )}
                                        </>
                                    )
                                ) : (
                                    booking.status === "Checked Out" ? (
                                        <div className="text-center p-4">
                                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                                                <CheckCircle size={20} />
                                            </div>
                                            <h4 className="font-bold text-slate-800">Checkout Completed</h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">Guest has departed</p>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setSelectedBooking(booking); setModalType('checkout'); setIsActionModalOpen(true); }}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-indigo-700">
                                                <RotateCcw size={18} /> Initiate Checkout
                                            </button>
                                            <button
                                                onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, pets: 0, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                                <Users size={18} className="text-purple-600" /> Add Extra Guest / Pet
                                            </button>
                                            {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                            <button
                                                onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                                <Plus size={18} /> Collect Food Bill
                                            </button>
                                            )}
                                        </>
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Modal for Payments & Checkins */}
            {isActionModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">
                                    {modalType === 'checkin' ? 'Check-in & Collection' : 'Checkout & Refund'}
                                </h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedBooking.id} • {selectedBooking.customer}</p>
                            </div>
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {modalType === 'checkin' ? (
                                <>
                                    {(() => {
                                        const propName = ((selectedBooking.parentProperty || "") + " " + (selectedBooking.property || "")).toLowerCase();
                                        const isAmbroseOrAmstel = propName.includes("ambrose") || propName.includes("amstel");
                                        if (!isAmbroseOrAmstel) return null;

                                        const extraAdultsCount = (selectedBooking.extraGuests || []).filter((eg: any) => !eg.guestName?.toLowerCase().includes("pet")).length;
                                        const totalAdults = Math.max(1, (selectedBooking.guests || 0) + extraAdultsCount);
                                        return (
                                            <div className="bg-cyan-50 border border-cyan-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs mb-4">
                                                <div>
                                                    <p className="text-xs font-bold text-cyan-900">Complimentary Room Water Bottles</p>
                                                    <p className="text-[11px] font-medium text-cyan-700">{totalAdults} adult guest{totalAdults > 1 ? 's' : ''} arrived</p>
                                                </div>
                                                <span className="text-xs font-black bg-cyan-600 text-white px-2.5 py-1 rounded-lg shadow-xs">
                                                    {totalAdults} Free Bottle{totalAdults > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    {((selectedBooking.parentProperty || "").toLowerCase().includes("ambrose")) ? (
                                        <div className="space-y-1.5 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Assigned Villa (Auto-Allotted)</label>
                                                <button
                                                    onClick={() => {
                                                        const newVal = !isAmbroseOverriding;
                                                        setIsAmbroseOverriding(newVal);
                                                        if (!newVal) {
                                                            setAssignedUnitInput(selectedBooking.property || "");
                                                        }
                                                    }}
                                                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700 uppercase tracking-wider"
                                                >
                                                    {isAmbroseOverriding ? "Cancel Override" : "Edit / Override"}
                                                </button>
                                            </div>
                                            {isAmbroseOverriding ? (
                                                <select
                                                    value={assignedUnitInput}
                                                    onChange={(e) => setAssignedUnitInput(e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 mt-1"
                                                >
                                                    {getUnitOptions(selectedBooking)
                                                        .filter(opt => !isUnitOccupiedOnDates(opt, selectedBooking, bookings))
                                                        .map((opt) => (
                                                            <option key={opt} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                </select>
                                            ) : (
                                                <div className="text-sm font-extrabold text-slate-800 tracking-wide mt-1">{assignedUnitInput || selectedBooking.property}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                                                {selectedBooking.numCottages > 1 ? `Assign Cottages (Select ${selectedBooking.numCottages})` : "Assign Cottage / Room / Villa"}
                                            </label>
                                            
                                            {selectedBooking.numCottages > 1 ? (
                                                <div className="space-y-3 mt-2">
                                                    {Array.from({ length: selectedBooking.numCottages }).map((_, idx) => {
                                                        const availableOpts = getUnitOptions(selectedBooking).filter(opt => {
                                                            const isOccupiedByOther = isUnitOccupiedOnDates(opt, selectedBooking, bookings);
                                                            const isSelectedInOtherDropdown = multiAssignedUnits.some((val, valIdx) => valIdx !== idx && val === opt);
                                                            return !isOccupiedByOther && !isSelectedInOtherDropdown;
                                                        });

                                                        return (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-400">Unit {idx + 1}:</span>
                                                                <select
                                                                    value={multiAssignedUnits[idx] || ""}
                                                                    onChange={(e) => {
                                                                        const newVal = e.target.value;
                                                                        setMultiAssignedUnits(prev => {
                                                                            const copy = [...prev];
                                                                            copy[idx] = newVal;
                                                                            return copy;
                                                                        });
                                                                    }}
                                                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                                >
                                                                    {multiAssignedUnits[idx] && !availableOpts.includes(multiAssignedUnits[idx]) && (
                                                                        <option value={multiAssignedUnits[idx]}>
                                                                            {multiAssignedUnits[idx]}
                                                                        </option>
                                                                    )}
                                                                    {availableOpts.map((opt) => (
                                                                        <option key={opt} value={opt}>
                                                                            {opt}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <select
                                                    value={assignedUnitInput}
                                                    onChange={(e) => setAssignedUnitInput(e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                >
                                                    {getUnitOptions(selectedBooking)
                                                        .filter(opt => !isUnitOccupiedOnDates(opt, selectedBooking, bookings))
                                                        .map((opt) => (
                                                            <option key={opt} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                </select>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-amber-800">20% Remaining Balance</span>
                                            <span className="text-lg font-black text-amber-700">{selectedBooking.remainingAmt}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-amber-800">Security Deposit</span>
                                            <span className="text-lg font-black text-amber-700">{selectedBooking.depositAmt}</span>
                                        </div>
                                                            <div className="space-y-3">
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">20% BALANCE</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setCollected20("Cash")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors border outline outline-0 focus:outline ${collected20 === "Cash"
                                                            ? "bg-emerald-600 text-white border-emerald-700"
                                                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 outline-emerald-500"
                                                            }`}
                                                    >
                                                        {collected20 === "Cash" ? <><CheckCircle size={12} className="inline mr-1" /> Collected Cash</> : "₹ Collect Cash"}
                                                    </button>
                                                    <button
                                                        onClick={() => setCollected20("UPI")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors shadow-sm outline outline-0 focus:outline ${collected20 === "UPI"
                                                            ? "bg-indigo-700 text-white"
                                                            : "bg-indigo-600 hover:bg-indigo-700 text-white outline-indigo-500"
                                                            }`}
                                                    >
                                                        {collected20 === "UPI" ? <><CheckCircle size={12} className="inline mr-1" /> Collected UPI</> : <><span className="bg-white text-indigo-600 px-1 py-0.5 rounded-sm mr-1">UPI</span> Collect</>}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCollected20("Split");
                                                            const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                                            setSplitCashBalance(balanceAmt);
                                                            setSplitUpiBalance(0);
                                                        }}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors shadow-sm border outline outline-0 focus:outline ${collected20 === "Split"
                                                            ? "bg-amber-600 text-white border-amber-700"
                                                            : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 outline-amber-500"
                                                            }`}
                                                    >
                                                        {collected20 === "Split" ? <><CheckCircle size={12} className="inline mr-1" /> Custom Split</> : "Split"}
                                                    </button>
                                                </div>
                                            </div>
                                            {collected20 === "Split" && (
                                                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cash Amount</label>
                                                            <input
                                                                type="number"
                                                                value={splitCashBalance || ''}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                                                    setSplitCashBalance(val);
                                                                    setSplitUpiBalance(Math.max(0, balanceAmt - val));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">UPI Amount</label>
                                                            <input
                                                                type="number"
                                                                value={splitUpiBalance || ''}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                                                    setSplitUpiBalance(val);
                                                                    setSplitCashBalance(Math.max(0, balanceAmt - val));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500">
                                                        Total: ₹{splitCashBalance + splitUpiBalance} (Required: {selectedBooking.remainingAmt})
                                                    </p>
                                                </div>
                                            )}
                                            {(collected20 === "UPI" || (collected20 === "Split" && splitUpiBalance > 0)) && (
                                                <div className="mt-2 space-y-2">
                                                    {upiProofBalance ? (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                            <CheckCircle size={14} className="text-emerald-600" />
                                                            <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{upiProofBalance.name}</span>
                                                            <button type="button" onClick={() => setUpiProofBalance(null)} className="text-xs text-red-500 font-bold ml-auto">Remove</button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofBalance(e.target.files[0]); e.target.value = ''; }} />
                                                                <Camera size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Camera</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofBalance(e.target.files[0]); e.target.value = ''; }} />
                                                                <Upload size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Gallery</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
 
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">SECURITY DEPOSIT</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setCollectedSec("Cash")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors border outline outline-0 focus:outline ${collectedSec === "Cash"
                                                            ? "bg-emerald-600 text-white border-emerald-700"
                                                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 outline-emerald-500"
                                                            }`}
                                                    >
                                                        {collectedSec === "Cash" ? <><CheckCircle size={12} className="inline mr-1" /> Collected Cash</> : "₹ Collect Cash"}
                                                    </button>
                                                    <button
                                                        onClick={() => setCollectedSec("UPI")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors shadow-sm outline outline-0 focus:outline ${collectedSec === "UPI"
                                                            ? "bg-indigo-700 text-white"
                                                            : "bg-indigo-600 hover:bg-indigo-700 text-white outline-indigo-500"
                                                            }`}
                                                    >
                                                        {collectedSec === "UPI" ? <><CheckCircle size={12} className="inline mr-1" /> Collected UPI</> : <><span className="bg-white text-indigo-600 px-1 py-0.5 rounded-sm mr-1">UPI</span> Collect</>}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCollectedSec("Split");
                                                            const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                                            setSplitCashDeposit(depositAmt);
                                                            setSplitUpiDeposit(0);
                                                        }}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors shadow-sm border outline outline-0 focus:outline ${collectedSec === "Split"
                                                            ? "bg-amber-600 text-white border-amber-700"
                                                            : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 outline-amber-500"
                                                            }`}
                                                    >
                                                        {collectedSec === "Split" ? <><CheckCircle size={12} className="inline mr-1" /> Custom Split</> : "Split"}
                                                    </button>
                                                </div>
                                            </div>
                                            {collectedSec === "Split" && (
                                                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cash Amount</label>
                                                            <input
                                                                type="number"
                                                                value={splitCashDeposit || ''}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                                                    setSplitCashDeposit(val);
                                                                    setSplitUpiDeposit(Math.max(0, depositAmt - val));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">UPI Amount</label>
                                                            <input
                                                                type="number"
                                                                value={splitUpiDeposit || ''}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                                                    setSplitUpiDeposit(val);
                                                                    setSplitCashDeposit(Math.max(0, depositAmt - val));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500">
                                                        Total: ₹{splitCashDeposit + splitUpiDeposit} (Required: {selectedBooking.depositAmt})
                                                    </p>
                                                </div>
                                            )}
                                            {(collectedSec === "UPI" || (collectedSec === "Split" && splitUpiDeposit > 0)) && (
                                                <div className="mt-2 space-y-2">
                                                    {upiProofDeposit ? (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                            <CheckCircle size={14} className="text-emerald-600" />
                                                            <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{upiProofDeposit.name}</span>
                                                            <button type="button" onClick={() => setUpiProofDeposit(null)} className="text-xs text-red-500 font-bold ml-auto">Remove</button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofDeposit(e.target.files[0]); e.target.value = ''; }} />
                                                                <Camera size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Camera</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofDeposit(e.target.files[0]); e.target.value = ''; }} />
                                                                <Upload size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Gallery</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        {(() => {
                                            const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                            const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;
                                            const isBalanceValid = collected20 && (
                                                collected20 === "Cash" ||
                                                (collected20 === "UPI" && upiProofBalance) ||
                                                (collected20 === "Split" && (splitCashBalance + splitUpiBalance === balanceAmt) && (splitUpiBalance === 0 || upiProofBalance))
                                            );
                                            const isDepositValid = collectedSec && (
                                                collectedSec === "Cash" ||
                                                (collectedSec === "UPI" && upiProofDeposit) ||
                                                (collectedSec === "Split" && (splitCashDeposit + splitUpiDeposit === depositAmt) && (splitUpiDeposit === 0 || upiProofDeposit))
                                            );
                                            const isSubmitDisabled = !isBalanceValid || !isDepositValid;
                                            return (
                                                <button
                                                    disabled={isSubmitDisabled}
                                                    onClick={() => {
                                                        handleAction(selectedBooking, "Checked In");
                                                        setIsActionModalOpen(false);
                                                    }}
                                                    className={`w-full font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${isSubmitDisabled
                                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                        : "bg-teal-600 hover:bg-teal-700 text-white border border-teal-700"
                                                        }`}
                                                >
                                                    <CheckCircle size={18} /> Confirm Check-in
                                                </button>
                                            );
                                        })()}
                                    </div>                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-indigo-800">Refund Security Deposit</span>
                                            <span className="text-lg font-black text-indigo-700">{selectedBooking.depositAmt}</span>
                                        </div>
                                        {selectedBooking.depositMethod && (
                                            <div className="mt-2 text-[10px] text-indigo-900 font-bold flex items-center gap-1.5 uppercase border-t border-indigo-200/40 pt-1.5">
                                                <span>Collected in:</span>
                                                <span className={`px-1.5 py-0.5 rounded font-extrabold ${
                                                    selectedBooking.depositMethod.toLowerCase().includes("cash")
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-indigo-100 text-indigo-800"
                                                }`}>
                                                    {selectedBooking.depositMethod}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Refund Method</h4>

                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-600">UPI Refund Proof (Required for UPI)</label>
                                                {upiProofRefund && (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                                        Selected
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    id="refund-file-input"
                                                    onChange={(e) => setUpiProofRefund(e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                                <label
                                                    htmlFor="refund-file-input"
                                                    className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                                                >
                                                    <Upload size={14} className="text-indigo-600" />
                                                    {upiProofRefund ? upiProofRefund.name : "Choose Proof File"}
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                disabled={uploadingRefund}
                                                onClick={async () => {
                                                    await api.post(`/bookings/staycation/${selectedBooking.rawId}/refund-deposit`, { method: "cash" });
                                                    handleAction(selectedBooking, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors border border-emerald-200 col-span-1 disabled:opacity-50"
                                            >
                                                <RotateCcw size={16} /> <span className="text-xs">Cash</span>
                                            </button>
                                            
                                            <button
                                                disabled={uploadingRefund || !upiProofRefund}
                                                onClick={async () => {
                                                    try {
                                                        setUploadingRefund(true);
                                                        let proofUrl = null;
                                                        if (upiProofRefund) {
                                                            const compressed = await compressImage(upiProofRefund);
                                                            const fd = new FormData();
                                                            fd.append("file", compressed);
                                                            const uploadData = await api.upload<{ url: string }>("/uploads/general", fd);
                                                            proofUrl = uploadData.url;
                                                        }

                                                        await api.post(`/bookings/staycation/${selectedBooking.rawId}/refund-deposit`, { 
                                                            method: "upi",
                                                            proofImageUrl: proofUrl,
                                                            proofImageKey: proofUrl
                                                        });
                                                        
                                                        setUpiProofRefund(null);
                                                        handleAction(selectedBooking, "Completed");
                                                        setIsActionModalOpen(false);
                                                    } catch (err: any) {
                                                        alert(err.message || "Failed to refund deposit");
                                                    } finally {
                                                        setUploadingRefund(false);
                                                    }
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-200 col-span-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                                                title={!upiProofRefund ? "Please select a proof file first" : ""}
                                            >
                                                {uploadingRefund ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <span className={`font-bold text-[10px] px-1 py-0.5 rounded-sm leading-none ${!upiProofRefund ? 'bg-slate-200 text-slate-500' : 'bg-indigo-200 text-indigo-800'}`}>UPI</span>}
                                                <span className="text-xs">UPI</span>
                                            </button>

                                            <button
                                                disabled={uploadingRefund}
                                                onClick={() => {
                                                    handleAction(selectedBooking, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold rounded-xl transition-colors border border-slate-200 hover:border-red-200 col-span-1 text-xs disabled:opacity-50"
                                            >
                                                <Ban size={16} /> <span className="text-center px-1">Don't Refund<br />Deposit</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom UI Warning Cancel Modal */}
            {cancelModalBooking && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-red-200">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-xl mb-2">Cancel Booking?</h3>
                            <p className="text-sm text-slate-600 font-medium">Are you sure you want to cancel the booking for <strong className="text-slate-800">{cancelModalBooking.customer}</strong>? This action cannot be reversed.</p>
                            <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mt-4 bg-red-50 p-2 rounded border border-red-100">Booking ID: {cancelModalBooking.id}</p>
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                            <button
                                onClick={() => setCancelModalBooking(null)}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200 bg-white shadow-sm"
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={() => {
                                    handleAction(cancelModalBooking, 'Cancelled');
                                    setCancelModalBooking(null);
                                }}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Extra Guest Modal */}
            {isAddGuestModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Users className="text-purple-600" size={20} /> Add Extra Guests</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedBooking.id} • {selectedBooking.property}</p>
                            </div>
                            <button
                                onClick={() => setIsAddGuestModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors bg-white shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 border-b border-slate-100 pb-4">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Number of Extra Guests</label>
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, guests: Math.max(0, extraGuestForm.guests - 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >−</button>
                                        <span className="text-lg font-black text-slate-800 w-6 text-center">{extraGuestForm.guests}</span>
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, guests: Math.min(100, extraGuestForm.guests + 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >+</button>
                                    </div>

                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mt-4">Number of Pets (₹600/pet/night)</label>
                                    <div className="flex items-center gap-3 mt-2 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, pets: Math.max(0, extraGuestForm.pets - 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >−</button>
                                        <span className="text-lg font-black text-slate-800 w-6 text-center">{extraGuestForm.pets}</span>
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, pets: Math.min(10, extraGuestForm.pets + 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >+</button>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 mt-1">Pricing dynamically computed by Property strictly for the booked nights.</p>
                                </div>
                            </div>

                            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Additional Cost</p>
                                        <h2 className="text-3xl font-black text-purple-900 flex items-center">
                                            <IndianRupee size={24} className="mr-1" /> {calculateExtraGuestPrice().toLocaleString('en-IN')}
                                        </h2>
                                        {(() => {
                                            if (!selectedBooking) return null;
                                            const start = selectedBooking.rawCheckInDate ? new Date(selectedBooking.rawCheckInDate) : new Date();
                                            const end = selectedBooking.rawCheckOutDate ? new Date(selectedBooking.rawCheckOutDate) : new Date();
                                            const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                                            const prop = selectedBooking.property || "";
                                            const parentProp = selectedBooking.parentProperty || "";
                                            let extraAdultPrice = 0;
                                            if (prop.includes('Hill View') || parentProp.includes('Hill View')) extraAdultPrice = 600;
                                            else if (prop.includes('Mount View') || parentProp.includes('Mount View')) extraAdultPrice = 800;
                                            else if (prop.includes('Heavenly Villa') || parentProp.includes('Heavenly Villa')) extraAdultPrice = 800;
                                            else if (prop.includes('La Paraiso') || parentProp.includes('La Paraiso')) extraAdultPrice = 1200;
                                            else if (prop.includes('Amstel') || parentProp.includes('Amstel')) extraAdultPrice = 2000;
                                            else if (prop.includes('Ambrose') || parentProp.includes('Ambrose')) extraAdultPrice = 2000;
                                            return (
                                                <div className="mt-2 space-y-0.5 text-[11px] font-medium text-purple-700">
                                                    {extraGuestForm.guests > 0 && <p>Extra guests: {extraGuestForm.guests} × ₹{extraAdultPrice.toLocaleString('en-IN')}/night × {nights} night{nights > 1 ? 's' : ''} = ₹{(extraGuestForm.guests * extraAdultPrice * nights).toLocaleString('en-IN')}</p>}
                                                    {extraGuestForm.pets > 0 && <p>Pets: {extraGuestForm.pets} × ₹600/night × {nights} night{nights > 1 ? 's' : ''} = ₹{(extraGuestForm.pets * 600 * nights).toLocaleString('en-IN')}</p>}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="bg-white p-1 rounded-lg border border-purple-200 flex">
                                        <button
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, paymentMethod: "Cash" })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${extraGuestForm.paymentMethod === 'Cash' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Cash
                                        </button>
                                        <button
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, paymentMethod: "UPI" })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${extraGuestForm.paymentMethod === 'UPI' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            UPI
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddExtraGuestSubmit}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Collect Payment &amp; Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ManualBookingModal
                isOpen={isManualBookingOpen}
                onClose={() => setIsManualBookingOpen(false)}
                onSuccess={fetchBookings}
                properties={properties}
            />
        </div >

            {previewGuestId && (
                <IdProofModal
                    guestId={previewGuestId}
                    onClose={() => setPreviewGuestId(null)}
                    onDelete={async (id) => {
                        const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                        const res = await fetch(`/api/uploads/guest-id/${id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.ok) throw new Error("Delete failed");
                        fetchBookings();
                    }}
                />
            )}

            {previewPaymentProof && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-base uppercase tracking-wide">
                                    UPI Payment Proof Preview
                                </h3>
                                <p className="text-[11px] font-bold text-indigo-600 mt-0.5 uppercase">
                                    {previewPaymentProof.paymentType} Payment • ₹{previewPaymentProof.amount}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewPaymentProof(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center justify-center bg-slate-50 min-h-[300px]">
                            {previewPaymentProofLoading ? (
                                <div className="text-center text-slate-400 font-bold space-y-2 flex flex-col items-center">
                                    <Loader2 size={36} className="text-indigo-600 animate-spin" />
                                    <p className="text-xs">Loading image securely...</p>
                                </div>
                            ) : previewPaymentProofUrl ? (
                                <img
                                    src={previewPaymentProofUrl}
                                    alt="UPI Payment Proof"
                                    className="max-h-[450px] max-w-full rounded-2xl shadow-md border border-slate-200 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "";
                                        alert("Failed to load payment proof image.");
                                    }}
                                />
                            ) : (
                                <div className="text-center text-slate-400 font-bold space-y-2">
                                    <FileText size={48} className="mx-auto text-slate-300 animate-pulse" />
                                    <p className="text-xs">No preview available for this payment</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
                            <button
                                onClick={() => setPreviewPaymentProof(null)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Food Bill Modal */}
            {isFoodBillModalOpen && foodBillBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50 shrink-0">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus size={18} className="text-amber-600" /> Add Food Bill</h3>
                            <button onClick={() => setIsFoodBillModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 shrink-0">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5">{foodBillBooking.id} — {foodBillBooking.customer}</p>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Items list</label>
                                {foodBillItems.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => {
                                                const updated = [...foodBillItems];
                                                updated[index].description = e.target.value;
                                                setFoodBillItems(updated);
                                            }}
                                            placeholder="Item description"
                                            className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-amber-500"
                                        />
                                        <input
                                            type="number"
                                            value={item.amount || ''}
                                            onChange={(e) => {
                                                const updated = [...foodBillItems];
                                                updated[index].amount = parseInt(e.target.value) || 0;
                                                setFoodBillItems(updated);
                                            }}
                                            placeholder="Price"
                                            className="w-20 bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:border-amber-500"
                                        />
                                        {(userRole === "owner" || userRole === "developer" || userRole === "chef") && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = foodBillItems.filter((_, idx) => idx !== index);
                                                    setFoodBillItems(updated);
                                                }}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {foodBillItems.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">No e-menu requests or items added yet.</p>
                                )}
                            </div>

                            {/* Add Item Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setFoodBillItems([
                                        ...foodBillItems,
                                        { id: `custom-${Date.now()}`, description: '', amount: 0 }
                                    ]);
                                }}
                                className="w-full border border-dashed border-slate-300 hover:border-amber-500 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Plus size={14} /> Add Item Line
                            </button>

                            {/* Final Description Override */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Final Description *</label>
                                    {customDescription !== null && (
                                        <button
                                            type="button"
                                            onClick={() => setCustomDescription(null)}
                                            className="text-[10px] text-amber-600 font-bold hover:underline"
                                        >
                                            Reset to auto
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={customDescription !== null ? customDescription : foodBillItems.map(item => `${item.description} (₹${item.amount})`).join(", ")}
                                    onChange={(e) => setCustomDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Final food bill description"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            {/* Final Amount Override */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Final Amount (₹) *</label>
                                    {customTotalAmount !== null && (
                                        <button
                                            type="button"
                                            onClick={() => setCustomTotalAmount(null)}
                                            className="text-[10px] text-amber-600 font-bold hover:underline"
                                        >
                                            Reset to sum (₹{foodBillItems.reduce((sum, item) => sum + (parseInt(item.amount as any) || 0), 0)})
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    value={customTotalAmount !== null ? customTotalAmount : foodBillItems.reduce((sum, item) => sum + (parseInt(item.amount as any) || 0), 0)}
                                    onChange={(e) => setCustomTotalAmount(parseInt(e.target.value) || 0)}
                                    placeholder="Final total amount"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Paid via</label>
                                <div className="bg-slate-50 rounded-lg p-1 flex">
                                    <button type="button" onClick={() => setFoodBillForm({ ...foodBillForm, paymentMethod: 'cash' })} className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${foodBillForm.paymentMethod === 'cash' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}>Cash</button>
                                    <button type="button" onClick={() => setFoodBillForm({ ...foodBillForm, paymentMethod: 'upi' })} className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${foodBillForm.paymentMethod === 'upi' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>UPI</button>
                                </div>
                            </div>
                            {foodBillForm.paymentMethod === 'upi' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">UPI Proof</label>
                                    {foodBillUpiProof ? (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <CheckCircle size={14} className="text-emerald-600" />
                                            <span className="text-xs font-bold text-emerald-700 truncate max-w-[200px]">{foodBillUpiProof.name}</span>
                                            <button type="button" onClick={() => setFoodBillUpiProof(null)} className="text-xs text-red-500 font-bold ml-auto">Remove</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setFoodBillUpiProof(e.target.files[0]); e.target.value = ''; }} />
                                                <Camera size={14} className="text-indigo-600" />
                                                <span className="text-xs font-bold text-indigo-700">Camera</span>
                                            </label>
                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setFoodBillUpiProof(e.target.files[0]); e.target.value = ''; }} />
                                                <Upload size={14} className="text-indigo-600" />
                                                <span className="text-xs font-bold text-indigo-700">Gallery</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                            {(() => {
                                const computedSum = foodBillItems.reduce((sum, item) => sum + (parseInt(item.amount as any) || 0), 0);
                                const finalAmt = customTotalAmount !== null ? customTotalAmount : computedSum;
                                const autoDesc = foodBillItems.map(item => `${item.description} (₹${item.amount})`).join(", ");
                                const finalDesc = customDescription !== null ? customDescription : autoDesc;
                                const isSubmitDisabled = foodBillSubmitting || !finalDesc || !finalAmt;
                                return (
                                    <button
                                        onClick={handleFoodBillSubmit}
                                        disabled={isSubmitDisabled}
                                        className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {foodBillSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} /> Submit Food Bill</>}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

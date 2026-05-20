"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Info, Clock, CheckCircle, CheckCircle2, Ban, IndianRupee, RotateCcw, BedDouble, AlertTriangle, X, Plus, CalendarDays, Phone, User as UserIcon, Upload, Camera } from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";
import IdProofModal from "./IdProofModal";
import { api } from "../../lib/api";

export default function StaycationPropertyPortal({ properties, portalName }: { properties: string[], portalName: string }) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Date Range Filters
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

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
                    checkInTime: "1:00 PM",
                    checkOutTime: "10:00 AM",
                    depositAmt: `₹${(b.securityDeposit || 3000).toLocaleString('en-IN')}`,
                    remainingAmt: `₹${(b.balanceAmount || 0).toLocaleString('en-IN')}`,
                    idProofUrl: b.idProofUrl || null,
                    guestIds: (b.guestIds || []).map((g: any) => ({
                        id: g.id,
                        fileName: g.fileName,
                        fileType: g.fileType,
                    })),
                    status: b.status === "checked_out" ? "Completed" : 
                            b.status === "confirmed" ? "Pending Arrival" : 
                            b.status === "checked_in" ? "Checked In" : 
                            b.status || "Pending Arrival",
                    addons: b.addons || null,
                    totalAmount: b.totalAmount || 0,
                    numCottages: b.numCottages || 1,
                    propertyId: b.propertyId || null,
                    depositRefunded: b.depositRefunded || false,
                    depositRefundMethod: b.depositRefundMethod || null,
                    depositRefundedAt: b.depositRefundedAt || null,
                    foodBills: b.foodBills || [],
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

    // Payment collection states
    const [collected20, setCollected20] = useState<string | null>(null);
    const [collectedSec, setCollectedSec] = useState<string | null>(null);
    // UPI proof files
    const [upiProofBalance, setUpiProofBalance] = useState<File | null>(null);
    const [upiProofDeposit, setUpiProofDeposit] = useState<File | null>(null);

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

    const handleFoodBillSubmit = async () => {
        if (!foodBillBooking || !foodBillForm.description || !foodBillForm.amount) return;
        setFoodBillSubmitting(true);
        try {
            let upiProofUrl = null;
            let upiProofKey = null;
            if (foodBillForm.paymentMethod === "upi" && foodBillUpiProof) {
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                const formData = new FormData();
                formData.append("file", foodBillUpiProof);
                formData.append("category", "food-bill-proofs");
                const uploadRes = await fetch("/api/uploads/general", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    upiProofUrl = uploadData.url;
                    upiProofKey = uploadData.url;
                }
            }
            await api.post("/stay-food-bills", {
                bookingId: foodBillBooking.rawId,
                description: foodBillForm.description,
                amount: parseInt(foodBillForm.amount),
                paymentMethod: foodBillForm.paymentMethod,
                upiProofUrl,
                upiProofKey,
            });
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

        // standard parser for "DD Mmm, YYYY"
        const startStr = selectedBooking.checkInDate.replace(',', '');
        const endStr = selectedBooking.checkOutDate.replace(',', '');
        const start = new Date(startStr);
        const end = new Date(endStr);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        let extraAdultPrice = 0;
        const prop = selectedBooking.property;
        if (prop.includes("Hill View")) extraAdultPrice = 600;
        else if (prop.includes("Mount View")) extraAdultPrice = 800;
        else if (prop.includes("Heavenly Villa")) extraAdultPrice = 800;
        else if (prop.includes("La Paraiso")) extraAdultPrice = 1200;
        else if (prop.includes("Amstel")) extraAdultPrice = 1000;
        else if (prop.includes("Ambrose")) extraAdultPrice = 2000;

        let total = 0;
        if (includeGuests) total += extraAdultPrice * extraGuestForm.guests * nights;
        if (includePets) total += 600 * extraGuestForm.pets * nights;

        return Math.round(total + (total * 0.05));
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
    const AMBROSE_VILLAS = ["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"];
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        name: "",
        guests: 2,
        kids: 0,
        pets: 0,
        phone: "",
        email: "",
        checkInDate: new Date(),
        checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        property: properties[0] || "Hill View",
        villa: (properties[0] || "").includes("Amstel") ? "Standard Cottage" : "TAKE-1",
        paymentMethod: "Cash"
    });

    // Fetch DB property list for villa name → subPropertyId resolution
    const [dbPropertyList, setDbPropertyList] = useState<any[]>([]);
    // Live pricing from DB: { "Ambrose/BAMBOOSA": { weekday: 10500, weekend: 11500, saturday: 13000, extraAdult: 2000, baseGuests: 4 }, ... }
    const [livePricing, setLivePricing] = useState<Record<string, { weekday: number; weekend: number; saturday: number; extraAdult: number; kidsCharge: number; baseGuests: number }>>({});
    useEffect(() => {
        api.get("/properties").then(data => {
            if (Array.isArray(data)) setDbPropertyList(data);
        }).catch(() => {});
        // Fetch live pricing for all staycation properties
        const slugs = ["hill-view", "mount-view", "heavenly-villa", "la-paraiso", "amstel-nest", "ambrose"];
        (async () => {
            const pm: Record<string, { weekday: number; weekend: number; saturday: number; extraAdult: number; kidsCharge: number; baseGuests: number }> = {};
            for (const slug of slugs) {
                try {
                    const d = await api.get(`/properties/${slug}/availability`);
                    const mapName: Record<string, string> = { "hill-view": "Hill View", "mount-view": "Mount View", "heavenly-villa": "Heavenly Villa", "la-paraiso": "La Paraiso", "amstel-nest": "Amstel Nest", "ambrose": "Ambrose" };
                    const propName = mapName[slug] || slug;
                    // Parent-level pricing
                    if (d.pricing) {
                        const wd = d.pricing.weekday; const we = d.pricing.weekend; const sa = d.pricing.saturday;
                        const personsNum = wd?.personsLabel ? (parseInt(wd.personsLabel.replace(/[^0-9]/g, '')) || 2) : 2;
                        pm[propName] = {
                            weekday: wd ? parseInt(wd.price) : 0, weekend: we ? parseInt(we.price) : 0,
                            saturday: sa ? parseInt(sa.price) : (we ? parseInt(we.price) : 0),
                            extraAdult: wd?.extraAdult || 0, kidsCharge: 1000, baseGuests: personsNum,
                        };
                    }
                    // Sub-property pricing
                    if (d.subProperties && d.subPropertyPricing) {
                        for (const sp of d.subProperties) {
                            const spP = d.subPropertyPricing[sp.id];
                            if (spP) {
                                const spWd = spP.weekday; const spWe = spP.weekend; const spSa = spP.saturday;
                                // Only use sub-property pricing if at least weekday or weekend has actual data
                                if (!spWd && !spWe) continue;
                                const spPersons = spWd?.personsLabel ? (parseInt(spWd.personsLabel.replace(/[^0-9]/g, '')) || 2) : 2;
                                pm[`${propName}/${sp.name.toUpperCase()}`] = {
                                    weekday: spWd ? parseInt(spWd.price) : (spWe ? parseInt(spWe.price) : 0),
                                    weekend: spWe ? parseInt(spWe.price) : (spWd ? parseInt(spWd.price) : 0),
                                    saturday: spSa ? parseInt(spSa.price) : (spWe ? parseInt(spWe.price) : (spWd ? parseInt(spWd.price) : 0)),
                                    extraAdult: spWd?.extraAdult || spWe?.extraAdult || 2000, kidsCharge: 1000, baseGuests: spPersons,
                                };
                            }
                        }
                    }
                } catch {}
            }
            setLivePricing(pm);
        })();
    }, []);

    // Resolve villa name to subPropertyId from DB
    const resolveSubPropertyId = (propertyName: string, villaName: string): number | null => {
        for (const p of dbPropertyList) {
            if (!propertyName.includes(p.name)) continue;
            if (p.subProperties && p.subProperties.length > 0) {
                for (const sp of p.subProperties) {
                    if (sp.name.toUpperCase() === villaName.toUpperCase() ||
                        sp.name.toLowerCase().replace(/\s+/g, '-') === villaName.toLowerCase().replace(/\s+/g, '-')) {
                        return sp.id;
                    }
                }
            }
        }
        return null;
    };
    const [customSplitMode, setCustomSplitMode] = useState(false);
    const [customPrepaid, setCustomPrepaid] = useState("");
    const [customBalance, setCustomBalance] = useState("");

    // Decoration Add-on states
    const [manualDecoration, setManualDecoration] = useState(false);
    const [manualCakeMsg, setManualCakeMsg] = useState("");
    const [manualOccasion, setManualOccasion] = useState("Birthday");
    const DECORATION_PRICE = 1200;

    // Food Preference state (Ambrose & Amstel Nest only)
    const [manualFoodType, setManualFoodType] = useState<"Regular" | "Jain">("Regular");

    // Coupon states
    const [manualCouponCode, setManualCouponCode] = useState("");
    const [manualAppliedCoupon, setManualAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [manualCouponError, setManualCouponError] = useState("");
    const [manualCouponLoading, setManualCouponLoading] = useState(false);
    const [manualDiscountAmount, setManualDiscountAmount] = useState(0);

    const isAmbroseOrAmstel = manualForm.property.includes("Ambrose") || manualForm.property.includes("Amstel");

    const calculatePrice = () => {
        let roomTotal = 0;
        let extraAdultTotal = 0;
        let extraKidsTotal = 0;
        const start = new Date(manualForm.checkInDate);
        const end = new Date(manualForm.checkOutDate);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        for (let i = 0; i < nights; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const day = currentDate.getDay();
            const isWeekend = day === 0 || day === 5 || day === 6;
            const isSaturday = day === 6;

            let basePrice = 0;
            let extraAdultPrice = 0;
            let kidsPrice = 0;
            let baseGuests = 2;

            const prop = manualForm.property;

            // Look up live DB pricing (case-insensitive key match)
            let liveKey = "";
            if (prop.includes("Ambrose")) {
                liveKey = `Ambrose/${manualForm.villa.toUpperCase()}`;
            } else if (prop.includes("Amstel")) {
                liveKey = manualForm.villa === "Family Cottage" ? "Amstel Nest/FAMILY COTTAGE" : "Amstel Nest/STANDARD COTTAGE";
            } else {
                // Direct property match
                for (const k of Object.keys(livePricing)) {
                    if (prop.includes(k)) { liveKey = k; break; }
                }
            }
            // Case-insensitive fallback: if exact key not found, try matching uppercase
            let lp = livePricing[liveKey];
            if (!lp) {
                const upperKey = liveKey.toUpperCase();
                for (const [k, v] of Object.entries(livePricing)) {
                    if (k.toUpperCase() === upperKey) { lp = v; break; }
                }
            }
            // If sub-property pricing not found, fall back to parent property pricing
            // (e.g. Amstel Nest Standard Cottage has no sub-property pricing; parent has 4950/6950)
            if (!lp && (prop.includes("Amstel") || prop.includes("Ambrose"))) {
                const parentKey = prop.includes("Amstel") ? "Amstel Nest" : "Ambrose";
                lp = livePricing[parentKey];
            }

            if (lp) {
                // Use live DB pricing
                basePrice = isSaturday ? lp.saturday : (day === 0 || day === 5) ? lp.weekend : lp.weekday;
                extraAdultPrice = lp.extraAdult;
                kidsPrice = lp.kidsCharge;
                baseGuests = lp.baseGuests;
            } else {
                // Fallback hardcoded (only used if API fails)
                if (prop.includes("Hill View")) { basePrice = isWeekend ? 3950 : 2500; extraAdultPrice = 600; kidsPrice = 400; }
                else if (prop.includes("Mount View")) { basePrice = isWeekend ? 4950 : 3500; extraAdultPrice = 800; kidsPrice = 500; }
                else if (prop.includes("Heavenly")) { basePrice = isWeekend ? 4950 : 3950; extraAdultPrice = 800; kidsPrice = 500; }
                else if (prop.includes("La Paraiso")) { basePrice = isWeekend ? 7500 : 4950; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = isWeekend ? 4 : 2; }
                else if (prop.includes("Amstel")) { basePrice = isWeekend ? 6950 : 4950; extraAdultPrice = 2000; kidsPrice = 1000; }
                else if (prop.includes("Ambrose")) { basePrice = isWeekend ? 6500 : 5500; extraAdultPrice = 2000; kidsPrice = 1000; }
            }

            roomTotal += basePrice;
            // Count adults + kids together against included persons
            const extraAdults = Math.max(0, manualForm.guests - baseGuests);
            const freeKidsSlots = Math.max(0, baseGuests - manualForm.guests);
            const extraKids = Math.max(0, manualForm.kids - freeKidsSlots);
            extraAdultTotal += extraAdults * extraAdultPrice;
            extraKidsTotal += extraKids * kidsPrice;
        }

        let subtotal = roomTotal + extraAdultTotal + extraKidsTotal;

        // Add decoration price
        if (manualDecoration) subtotal += DECORATION_PRICE;
        // Apply coupon discount
        let manualCouponDiscount = 0;
        if (manualAppliedCoupon) {
            if (manualAppliedCoupon.discountType === "percentage") {
                manualCouponDiscount = Math.round(subtotal * manualAppliedCoupon.discountValue / 100);
            } else {
                manualCouponDiscount = Number(manualAppliedCoupon.discountValue);
            }
            subtotal -= manualCouponDiscount;
        }
        // Add 5% GST
        const baseAmount = Math.round(subtotal);
        const gstAmount = Math.round(baseAmount * 0.05);
        let finalTotal = baseAmount + gstAmount;
        // Add pet charges (₹600/pet flat — no GST)
        finalTotal += manualForm.pets * 600;
        // Subtract admin discount (from total including taxes)
        finalTotal = Math.max(0, finalTotal - manualDiscountAmount);
        // Round to nearest 10
        finalTotal = Math.round(finalTotal / 10) * 10;
        return {
            basePrice: baseAmount,
            gstAmount,
            totalAmount: finalTotal,
            roomTotal: Math.round(roomTotal),
            extraAdultCharge: Math.round(extraAdultTotal),
            extraKidsCharge: Math.round(extraKidsTotal),
            nightlyRoomRate: Math.round(roomTotal / nights),
        };
    };

    const handleManualBookingSubmit = async () => {
        if (!manualForm.name || manualForm.name.trim() === '') {
            alert("Please provide the guest's name before booking.");
            return;
        }
        
        const calculated = calculatePrice();
        
        try {
            // Resolve property ID from DB property list
            let propId: number | null = null;
            for (const p of dbPropertyList) {
                if (manualForm.property.includes(p.name)) { propId = p.id; break; }
            }
            // Fallback to hardcoded map if DB list not loaded
            if (!propId) {
                const fallbackMap: Record<string, number> = {
                    "Hill View": 1, "Mount View": 2, "Heavenly Villa": 3,
                    "La Paraiso": 4, "Amstel Nest": 5, "Ambrose": 6, "Digital Diaries": 7
                };
                propId = Object.entries(fallbackMap).find(([name]) => manualForm.property.includes(name))?.[1] || 1;
            }

            // Resolve sub-property ID for Ambrose / Amstel Nest villas
            const subPropId = (manualForm.property.includes("Ambrose") || manualForm.property.includes("Amstel"))
                ? resolveSubPropertyId(manualForm.property, manualForm.villa)
                : null;

            // Build addons array
            const bookingAddons: any[] = [];
            if (manualDecoration) {
                bookingAddons.push({ name: 'Celebration Add-on', price: DECORATION_PRICE, cakeMessage: manualCakeMsg || '', occasion: manualOccasion });
            }
            if (isAmbroseOrAmstel) {
                bookingAddons.push({ name: 'Food Preference', foodType: manualFoodType });
            }

            const nights = Math.max(1, Math.ceil((new Date(manualForm.checkOutDate).getTime() - new Date(manualForm.checkInDate).getTime()) / (1000 * 3600 * 24)));

            await api.post("/bookings/staycation", {
                customerName: manualForm.name,
                customerPhone: manualForm.phone || "0000000000",
                customerEmail: manualForm.email || null,
                propertyId: propId,
                subPropertyId: subPropId,
                numGuests: manualForm.guests,
                numKids: manualForm.kids || 0,
                numPets: manualForm.pets || 0,
                checkInDate: `${manualForm.checkInDate.getFullYear()}-${String(manualForm.checkInDate.getMonth() + 1).padStart(2, '0')}-${String(manualForm.checkInDate.getDate()).padStart(2, '0')}`,
                checkOutDate: `${manualForm.checkOutDate.getFullYear()}-${String(manualForm.checkOutDate.getMonth() + 1).padStart(2, '0')}-${String(manualForm.checkOutDate.getDate()).padStart(2, '0')}`,
                nightlyRate: calculated.nightlyRoomRate,
                totalAmount: calculated.totalAmount,
                advanceAmount: customSplitMode ? parseInt(customPrepaid || '0') : calculated.totalAmount,
                balanceAmount: customSplitMode ? parseInt(customBalance || '0') : 0,
                securityDeposit: 3000,
                basePrice: calculated.basePrice,
                extraAdultCharge: calculated.extraAdultCharge,
                extraKidsCharge: calculated.extraKidsCharge,
                gstAmount: calculated.gstAmount,
                advancePaid: true,
                advanceMethod: manualForm.paymentMethod,
                source: "reception",
                couponCode: manualAppliedCoupon?.code || null,
                addons: bookingAddons.length > 0 ? bookingAddons : null,
            });
            fetchBookings();
            setIsManualBookingOpen(false);
            // Reset all form states for next booking
            setManualForm({
                name: "",
                guests: 2,
                kids: 0,
                pets: 0,
                phone: "",
                email: "",
                checkInDate: new Date(),
                checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
                property: properties[0] || "Hill View",
                villa: (properties[0] || "").includes("Amstel") ? "Standard Cottage" : "TAKE-1",
                paymentMethod: "Cash"
            });
            setCustomSplitMode(false);
            setCustomPrepaid("");
            setCustomBalance("");
            setManualDecoration(false);
            setManualCakeMsg("");
            setManualOccasion("Birthday");
            setManualFoodType("Regular");
            setManualCouponCode("");
            setManualAppliedCoupon(null);
            setManualCouponError("");
            setManualDiscountAmount(0);
        } catch (err: any) {
            alert(err?.message || err?.error || "Failed to create manual booking");
        }
    };

    useEffect(() => {
        if (!isActionModalOpen) {
            setCollected20(null);
            setCollectedSec(null);
        }
    }, [isActionModalOpen]);


    // Filter to logically evaluate if a booking intersects the query date range.
    const todaysBookings = bookings.filter(b => {
        const matchesProperty = properties.some(p => b.property.includes(p) || (b.parentProperty && b.parentProperty === p));
        if (!matchesProperty) return false;
        if (b.status === "Cancelled") return false;

        const rangeStart = new Date(startDate);
        rangeStart.setHours(0, 0, 0, 0);

        const rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);

        const bStart = new Date(b.checkInDate);
        bStart.setHours(0, 0, 0, 0);

        const bEnd = new Date(b.checkOutDate);
        bEnd.setHours(0, 0, 0, 0);

        // Overlap logic: A booking intersects the range if it starts before the range ends AND ends after the range starts.
        const overlaps = (bStart <= rangeEnd) && (bEnd >= rangeStart);

        return overlaps || b.status === "Checked In";
    });

    const handleAction = async (booking: any, newStatus: string) => {
        try {
            const numericId = booking.rawId;
            await api.patch(`/bookings/staycation/${numericId}/status`, { 
                status: newStatus === "Checked In" ? "checked_in" : 
                        newStatus === "Cancelled" ? "cancelled" : 
                        (newStatus === "Checked Out" || newStatus === "Completed") ? "checked_out" : "confirmed"
            });
            
            // Record payment if checking in
            if (newStatus === "Checked In" && selectedBooking) {
                const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;

                await api.post(`/bookings/staycation/${numericId}/payment`, {
                    paymentType: "balance",
                    amount: balanceAmt,
                    method: collected20
                });
                await api.post(`/bookings/staycation/${numericId}/payment`, {
                    paymentType: "deposit",
                    amount: depositAmt,
                    method: collectedSec
                });

                // Upload UPI proof images if UPI was used
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                const employee = await api.get(`/employees?propertyId=${selectedBooking.propertyId || ''}`);
                const empId = Array.isArray(employee) && employee[0] ? employee[0].id : null;

                if (collected20 === "UPI" && upiProofBalance && empId) {
                    const fd = new FormData();
                    fd.append("file", upiProofBalance);
                    fd.append("employeeId", String(empId));
                    fd.append("bookingRef", booking.id || '');
                    fd.append("guestName", booking.customer || '');
                    fd.append("amount", String(balanceAmt));
                    fd.append("paymentType", "balance");
                    fd.append("note", `Balance — ${selectedBooking.property}`);
                    await fetch("/api/upi-payments/upload", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    });
                }
                if (collectedSec === "UPI" && upiProofDeposit && empId) {
                    const fd = new FormData();
                    fd.append("file", upiProofDeposit);
                    fd.append("employeeId", String(empId));
                    fd.append("bookingRef", booking.id || '');
                    fd.append("guestName", booking.customer || '');
                    fd.append("amount", String(depositAmt));
                    fd.append("paymentType", "deposit");
                    fd.append("note", `Security deposit — ${selectedBooking.property}`);
                    await fetch("/api/upi-payments/upload", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    });
                }
                // Reset proof states
                setUpiProofBalance(null);
                setUpiProofDeposit(null);
            }

            fetchBookings();
        } catch (err) {
            alert("Failed to update booking status");
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
                    <p className="text-sm font-medium text-slate-500 mt-1">Bookings dashboard filtered by date range.</p>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <button
                        onClick={() => setIsManualBookingOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors mr-2"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Manual Booking</span><span className="sm:hidden">New Booking</span>
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest hidden xl:inline">From:</span>
                        <CustomDatePicker date={startDate} onDateChange={(d) => {
                            setStartDate(d);
                            if (d > endDate) setEndDate(d);
                        }} />
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">To:</span>
                        <CustomDatePicker date={endDate} onDateChange={(d) => {
                            setEndDate(d);
                            if (d < startDate) setStartDate(d);
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
                    <p className="text-sm font-medium text-slate-500">There are no bookings intersecting this date range.</p>
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
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${booking.status === 'Checked In' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        booking.status === 'Pending Checkout' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            booking.status === 'Completed' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                                'bg-slate-50 text-slate-700 border-slate-200'
                                        }`}>
                                        {booking.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Guest</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">{booking.customer}</p>
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

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Camera size={14} /> ID Proofs</h4>
                                        <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors">
                                            <Upload size={12} /> Upload
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
                            </div>

                            {/* Right Col: Actions */}
                            <div className="p-6 md:w-1/3 bg-slate-50/50 flex flex-col justify-center space-y-3">
                                {booking.status === "Pending Arrival" && (
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
                                            <Plus size={18} /> Add Food Bill
                                        </button>
                                        )}
                                    </>
                                )}

                                {booking.status === "Checked In" && (
                                    <>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setModalType('checkout'); setIsActionModalOpen(true); }}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-indigo-700">
                                            <RotateCcw size={18} /> Initiate Checkout
                                        </button>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, pets: 0, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200 mt-2">
                                            <Users size={18} className="text-purple-600" /> Add Extra Guest / Pet
                                        </button>
                                        {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                        <button
                                            onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                            className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                            <Plus size={18} /> Add Food Bill
                                        </button>
                                        )}
                                    </>
                                )}

                                {booking.status === "Pending Checkout" && (
                                    <>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setModalType('checkout'); setIsActionModalOpen(true); }}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-indigo-700">
                                            <RotateCcw size={18} /> Initiate Checkout
                                        </button>
                                        {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                        <button
                                            onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                            className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                            <Plus size={18} /> Add Food Bill
                                        </button>
                                        )}
                                    </>
                                )}

                                {booking.status === "Completed" && (
                                    <div className="text-center p-4">
                                        <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                                            <CheckCircle size={20} />
                                        </div>
                                        <h4 className="font-bold text-slate-800">Checkout Completed</h4>
                                        <p className="text-xs font-medium text-slate-500 mt-1">Guest has departed</p>
                                    </div>
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
                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-amber-800">20% Remaining Balance</span>
                                            <span className="text-lg font-black text-amber-700">{selectedBooking.remainingAmt}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-amber-800">Security Deposit</span>
                                            <span className="text-lg font-black text-amber-700">{selectedBooking.depositAmt}</span>
                                        </div>
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
                                                </div>
                                            </div>
                                            {collected20 === "UPI" && (
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
                                                </div>
                                            </div>
                                            {collectedSec === "UPI" && (
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
                                        <button
                                            disabled={!collected20 || !collectedSec || (collected20 === "UPI" && !upiProofBalance) || (collectedSec === "UPI" && !upiProofDeposit)}
                                            onClick={() => {
                                                handleAction(selectedBooking, "Checked In");
                                                setIsActionModalOpen(false);
                                            }}
                                            className={`w-full font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${(!collected20 || !collectedSec || (collected20 === "UPI" && !upiProofBalance) || (collectedSec === "UPI" && !upiProofDeposit))
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-teal-600 hover:bg-teal-700 text-white border border-teal-700"
                                                }`}
                                        >
                                            <CheckCircle size={18} /> Confirm Check-in
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-indigo-800">Refund Security Deposit</span>
                                            <span className="text-lg font-black text-indigo-700">{selectedBooking.depositAmt}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Refund Method</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                onClick={async () => {
                                                    await api.post(`/bookings/staycation/${selectedBooking.rawId}/refund-deposit`, { method: "cash" });
                                                    handleAction(selectedBooking, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors border border-emerald-200 col-span-1"
                                            >
                                                <RotateCcw size={16} /> <span className="text-xs">Cash</span>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    await api.post(`/bookings/staycation/${selectedBooking.rawId}/refund-deposit`, { method: "upi" });
                                                    handleAction(selectedBooking, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-200 col-span-1"
                                            >
                                                <span className="font-bold text-[10px] bg-indigo-200 text-indigo-800 px-1 py-0.5 rounded-sm leading-none">UPI</span> <span className="text-xs">UPI</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleAction(selectedBooking, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold rounded-xl transition-colors border border-slate-200 hover:border-red-200 col-span-1 text-xs"
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
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, guests: Math.min(10, extraGuestForm.guests + 1) })}
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
                                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Additional Cost (Inc. Taxes)</p>
                                        <h2 className="text-3xl font-black text-purple-900 flex items-center">
                                            <IndianRupee size={24} className="mr-1" /> {calculateExtraGuestPrice().toLocaleString('en-IN')}
                                        </h2>
                                        {(() => {
                                            if (!selectedBooking) return null;
                                            const startStr = selectedBooking.checkInDate.replace(',', '');
                                            const endStr = selectedBooking.checkOutDate.replace(',', '');
                                            const start = new Date(startStr);
                                            const end = new Date(endStr);
                                            const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                                            const prop = selectedBooking.property;
                                            let extraAdultPrice = 0;
                                            if (prop.includes('Hill View')) extraAdultPrice = 600;
                                            else if (prop.includes('Mount View')) extraAdultPrice = 800;
                                            else if (prop.includes('Heavenly Villa')) extraAdultPrice = 800;
                                            else if (prop.includes('La Paraiso')) extraAdultPrice = 1200;
                                            else if (prop.includes('Amstel')) extraAdultPrice = 1000;
                                            else if (prop.includes('Ambrose')) extraAdultPrice = 2000;
                                            return (
                                                <div className="mt-2 space-y-0.5 text-[11px] font-medium text-purple-700">
                                                    {extraGuestForm.guests > 0 && <p>Extra guests: {extraGuestForm.guests} × ₹{extraAdultPrice.toLocaleString('en-IN')}/night × {nights} night{nights > 1 ? 's' : ''} = ₹{(extraGuestForm.guests * extraAdultPrice * nights).toLocaleString('en-IN')}</p>}
                                                    {extraGuestForm.pets > 0 && <p>Pets: {extraGuestForm.pets} × ₹600/night × {nights} night{nights > 1 ? 's' : ''} = ₹{(extraGuestForm.pets * 600 * nights).toLocaleString('en-IN')}</p>}
                                                    <p className="text-purple-500">+ Taxes</p>
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

            {/* Manual Booking Modal */}
            {isManualBookingOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus className="text-purple-600" size={20} /> Add Walk-in Booking</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Full 100% payment collection required.</p>
                            </div>
                            <button
                                onClick={() => setIsManualBookingOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors bg-white shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Guest Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Guest Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Guest Name</label>
                                        <div className="relative">
                                            <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="e.g. Rahul Sharma" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone (Optional)</label>
                                        <div className="relative">
                                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="tel" value={manualForm.phone} onChange={e => setManualForm({ ...manualForm, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="+91" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email (Optional)</label>
                                        <div className="relative">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                            <input type="email" value={manualForm.email} onChange={e => setManualForm({ ...manualForm, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="guest@example.com" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Adults</label>
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-slate-400" />
                                            <button type="button" onClick={() => setManualForm({ ...manualForm, guests: Math.max(1, manualForm.guests - 1) })} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center transition-colors border border-slate-200">−</button>
                                            <span className="w-10 text-center text-sm font-bold text-slate-800">{manualForm.guests}</span>
                                            <button type="button" onClick={() => setManualForm({ ...manualForm, guests: Math.min(15, manualForm.guests + 1) })} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center transition-colors border border-slate-200">+</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Kids (5–12 yrs) — ₹{manualForm.property.includes('Hill View') ? '400' : manualForm.property.includes('Mount View') ? '500' : manualForm.property.includes('Heavenly') ? '500' : manualForm.property.includes('La Paraiso') ? '800' : '1,000'}/kid/night</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setManualForm({ ...manualForm, kids: Math.max(0, manualForm.kids - 1) })} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center transition-colors border border-slate-200">−</button>
                                            <span className="w-10 text-center text-sm font-bold text-slate-800">{manualForm.kids}</span>
                                            <button type="button" onClick={() => setManualForm({ ...manualForm, kids: Math.min(6, manualForm.kids + 1) })} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center transition-colors border border-slate-200">+</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pets (₹600/pet/trip)</label>
                                        <div className="relative">
                                            <input type="text" inputMode="numeric" value={manualForm.pets} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setManualForm({ ...manualForm, pets: Math.min(3, parseInt(val) || 0) }); }} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="Max 3" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Booking Info</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col justify-end">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check-in Date</label>
                                        <CustomDatePicker date={manualForm.checkInDate} onDateChange={(d) => setManualForm({ ...manualForm, checkInDate: d })} />
                                    </div>
                                    <div className="space-y-1.5 flex flex-col justify-end">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check-out Date</label>
                                        <CustomDatePicker date={manualForm.checkOutDate} onDateChange={(d) => setManualForm({ ...manualForm, checkOutDate: d })} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Property</label>
                                        <select value={manualForm.property} onChange={e => {
                                            const newProp = e.target.value;
                                            const newVilla = newProp.includes("Amstel") ? "Standard Cottage" : "TAKE-1";
                                            setManualForm({ ...manualForm, property: newProp, villa: newVilla });
                                        }} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none font-medium text-slate-800">
                                            {properties.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>

                                    {manualForm.property.includes("Ambrose") && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ambrose Villa Theme</label>
                                            <select value={manualForm.villa} onChange={e => setManualForm({ ...manualForm, villa: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none font-medium text-slate-800">
                                                {AMBROSE_VILLAS.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {manualForm.property.includes("Amstel") && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cottage Type</label>
                                            <select value={manualForm.villa} onChange={e => setManualForm({ ...manualForm, villa: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none font-medium text-slate-800">
                                                <option value="Standard Cottage">Standard Cottage</option>
                                                <option value="Family Cottage">Family Cottage</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Celebration Decoration Add-on */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-4 border border-amber-200 rounded-xl bg-amber-50">
                                    <input
                                        type="checkbox"
                                        id="manual-decoration"
                                        checked={manualDecoration}
                                        onChange={(e) => setManualDecoration(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 accent-purple-600 cursor-pointer"
                                    />
                                    <label htmlFor="manual-decoration" className="cursor-pointer flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-slate-800">Celebration Add-on</h4>
                                            <span className="text-sm font-bold text-amber-700">+ ₹{DECORATION_PRICE.toLocaleString('en-IN')}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">Cake, balloons & banner</p>
                                    </label>
                                </div>
                                {manualDecoration && (
                                    <div className="grid grid-cols-1 gap-3 pl-2 animate-in fade-in">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Occasion</label>
                                            <select value={manualOccasion} onChange={(e) => setManualOccasion(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none">
                                                <option>Birthday</option>
                                                <option>Anniversary</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Food Preference — Ambrose & Amstel Nest only */}
                            {isAmbroseOrAmstel && (
                                <div className="p-4 border border-emerald-200 rounded-xl bg-emerald-50 space-y-2">
                                    <h4 className="text-sm font-bold text-slate-800">Food Preference</h4>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Both options are vegetarian only</p>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setManualFoodType("Regular")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${manualFoodType === "Regular" ? "bg-emerald-600 text-white border-emerald-700 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>Regular (Veg)</button>
                                        <button type="button" onClick={() => setManualFoodType("Jain")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${manualFoodType === "Jain" ? "bg-emerald-600 text-white border-emerald-700 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>Jain (Veg)</button>
                                    </div>
                                </div>
                            )}

                            {/* Summary & Payment */}
                            <div className="bg-purple-50 rounded-xl p-4 sm:p-5 border border-purple-100 mt-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Calculated Total (Inc. Taxes)</p>
                                        <h2 className="text-3xl font-black text-purple-900 flex items-center">
                                            <IndianRupee size={24} className="mr-1" /> {calculatePrice().totalAmount.toLocaleString('en-IN')}
                                        </h2>
                                        {(() => {
                                            const p = calculatePrice();
                                            return <p className="text-xs text-slate-500 mt-1">Base ₹{p.basePrice.toLocaleString('en-IN')} + GST ₹{p.gstAmount.toLocaleString('en-IN')}</p>;
                                        })()}
                                    </div>

                                    <div className="bg-white p-1 rounded-lg border border-purple-200 flex">
                                        <button
                                            onClick={() => setManualForm({ ...manualForm, paymentMethod: "Cash" })}
                                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-sm font-bold transition-all ${manualForm.paymentMethod === 'Cash' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Cash
                                        </button>
                                        <button
                                            onClick={() => setManualForm({ ...manualForm, paymentMethod: "UPI" })}
                                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-sm font-bold transition-all ${manualForm.paymentMethod === 'UPI' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            UPI
                                        </button>
                                    </div>
                                </div>

                                {/* Coupon Code */}
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coupon Code</label>
                                    {manualAppliedCoupon ? (
                                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                                            <div>
                                                <span className="text-sm font-bold text-emerald-700">✓ {manualAppliedCoupon.code}</span>
                                                <span className="text-xs text-emerald-600 ml-2">
                                                    ({manualAppliedCoupon.discountType === 'percentage' ? `${manualAppliedCoupon.discountValue}% off` : `₹${manualAppliedCoupon.discountValue} off`})
                                                </span>
                                            </div>
                                            <button onClick={() => { setManualAppliedCoupon(null); setManualCouponCode(""); setManualCouponError(""); }} className="text-xs font-bold text-red-500 hover:text-red-700">Remove</button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={manualCouponCode}
                                                onChange={e => { setManualCouponCode(e.target.value.toUpperCase()); setManualCouponError(""); }}
                                                className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                                placeholder="ENTER CODE"
                                            />
                                            <button
                                                onClick={async () => {
                                                    if (!manualCouponCode.trim()) return;
                                                    setManualCouponLoading(true);
                                                    setManualCouponError("");
                                                    try {
                                                        const result = await api.post("/coupons/validate", { code: manualCouponCode });
                                                        if (result?.valid) {
                                                            setManualAppliedCoupon({ code: result.code, discountType: result.discountType, discountValue: result.discountValue });
                                                        } else {
                                                            setManualCouponError("Invalid or expired");
                                                        }
                                                    } catch (err: any) {
                                                        setManualCouponError(err?.message || "Invalid code");
                                                    } finally {
                                                        setManualCouponLoading(false);
                                                    }
                                                }}
                                                disabled={manualCouponLoading || !manualCouponCode.trim()}
                                                className="shrink-0 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors"
                                            >
                                                {manualCouponLoading ? "..." : "Apply"}
                                            </button>
                                        </div>
                                    )}
                                    {manualCouponError && <p className="text-xs text-red-500 font-bold mt-1">{manualCouponError}</p>}
                                </div>

                                {/* Admin Discount */}
                                <div className="border border-dashed border-purple-200 rounded-xl p-3 bg-purple-50/50">
                                    <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 block">Admin Discount (₹)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={manualDiscountAmount || ""}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                                    setManualDiscountAmount(val);
                                                }}
                                                placeholder="0"
                                                className="w-full pl-8 pr-3 py-2 border border-purple-200 rounded-lg text-sm font-bold text-purple-800 focus:ring-2 focus:ring-purple-500/20 outline-none bg-white"
                                            />
                                        </div>
                                        {manualDiscountAmount > 0 && (
                                            <button onClick={() => setManualDiscountAmount(0)} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Split Mode */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Split</label>
                                    <div className="bg-slate-50 rounded-lg p-1 flex">
                                        <button type="button" onClick={() => { setCustomSplitMode(false); }} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${!customSplitMode ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Full Payment</button>
                                        <button type="button" onClick={() => { setCustomSplitMode(true); setCustomPrepaid(String(calculatePrice().totalAmount)); setCustomBalance('0'); }} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customSplitMode ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Custom Split</button>
                                    </div>
                                </div>
                                {customSplitMode && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prepaid (₹)</label>
                                            <input
                                                type="number"
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                                value={customPrepaid}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setCustomPrepaid(val);
                                                    const prepaidNum = parseInt(val || '0');
                                                    setCustomBalance(String(Math.max(0, calculatePrice().totalAmount - prepaidNum)));
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Balance (₹)</label>
                                            <input
                                                type="number"
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                                value={customBalance}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={handleManualBookingSubmit}
                                    disabled={!manualForm.name}
                                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Confirm Payment &amp; Check-in
                                </button>
                            </div>
                        </div>
                    </div>
                </div >
            )
            }
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

            {/* Food Bill Modal */}
            {isFoodBillModalOpen && foodBillBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus size={18} className="text-amber-600" /> Add Food Bill</h3>
                            <button onClick={() => setIsFoodBillModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5">{foodBillBooking.id} — {foodBillBooking.customer}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Description *</label>
                                <input type="text" value={foodBillForm.description} onChange={e => setFoodBillForm({ ...foodBillForm, description: e.target.value })} placeholder="e.g. Dinner for 4, Snacks order" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount (₹) *</label>
                                <input type="text" inputMode="numeric" value={foodBillForm.amount} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setFoodBillForm({ ...foodBillForm, amount: val }); }} placeholder="e.g. 2500" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
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
                            <button
                                onClick={handleFoodBillSubmit}
                                disabled={foodBillSubmitting || !foodBillForm.description || !foodBillForm.amount}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {foodBillSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} /> Submit Food Bill</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

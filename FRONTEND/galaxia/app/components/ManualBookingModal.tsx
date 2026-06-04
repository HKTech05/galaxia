"use client";

import { useState, useEffect } from "react";
import { Users, IndianRupee, X, Plus, Phone, User as UserIcon, CheckCircle } from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";
import { api } from "../../lib/api";

interface ManualBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    properties: string[];
}

const DECORATION_PRICE = 1200;
const AMBROSE_VILLAS = ["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"];

export default function ManualBookingModal({ isOpen, onClose, onSuccess, properties }: ManualBookingModalProps) {
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

    // Ambrose specific selection state
    const [selectedAmbroseVillas, setSelectedAmbroseVillas] = useState<string[]>([]);

    // Amstel Nest specific selection quantities
    const [amstelStandardCount, setAmstelStandardCount] = useState<number>(1);
    const [amstelFamilySelected, setAmstelFamilySelected] = useState<boolean>(false);

    // DB property list and live pricing
    const [dbPropertyList, setDbPropertyList] = useState<any[]>([]);
    const [livePricing, setLivePricing] = useState<Record<string, { weekday: number; weekend: number; saturday: number; extraAdult: number; kidsCharge: number; baseGuests: number }>>({});

    // Split payment state
    const [customSplitMode, setCustomSplitMode] = useState(false);
    const [customPrepaid, setCustomPrepaid] = useState("");
    const [customBalance, setCustomBalance] = useState("");

    // Decoration states
    const [manualDecoration, setManualDecoration] = useState(false);
    const [manualCakeMsg, setManualCakeMsg] = useState("");
    const [manualOccasion, setManualOccasion] = useState("Birthday");

    // Food preferences
    const [manualRegularCount, setManualRegularCount] = useState<string>("0");
    const [manualJainCount, setManualJainCount] = useState<string>("0");

    // Coupon states
    const [manualCouponCode, setManualCouponCode] = useState("");
    const [manualAppliedCoupon, setManualAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [manualCouponError, setManualCouponError] = useState("");
    const [manualCouponLoading, setManualCouponLoading] = useState(false);
    const [manualDiscountAmount, setManualDiscountAmount] = useState(0);

    const isAmbroseOrAmstel = manualForm.property.includes("Ambrose") || manualForm.property.includes("Amstel");

    // Load property list and pricing from backend
    useEffect(() => {
        if (!isOpen) return;

        api.get("/properties").then(data => {
            if (Array.isArray(data)) setDbPropertyList(data);
        }).catch(() => {});

        const slugs = ["hill-view", "mount-view", "heavenly-villa", "la-paraiso", "amstel-nest", "ambrose"];
        (async () => {
            const pm: Record<string, { weekday: number; weekend: number; saturday: number; extraAdult: number; kidsCharge: number; baseGuests: number }> = {};
            for (const slug of slugs) {
                try {
                    const d = await api.get(`/properties/${slug}/availability`);
                    const mapName: Record<string, string> = { "hill-view": "Hill View", "mount-view": "Mount View", "heavenly-villa": "Heavenly Villa", "la-paraiso": "La Paraiso", "amstel-nest": "Amstel Nest", "ambrose": "Ambrose" };
                    const propName = mapName[slug] || slug;
                    
                    if (d.pricing) {
                        const wd = d.pricing.weekday; 
                        const we = d.pricing.weekend; 
                        const sa = d.pricing.saturday;
                        const personsNum = wd?.personsLabel ? (parseInt(wd.personsLabel.replace(/[^0-9]/g, '')) || 2) : 2;
                        pm[propName] = {
                            weekday: wd ? parseInt(wd.price) : 0, 
                            weekend: we ? parseInt(we.price) : 0,
                            saturday: sa ? parseInt(sa.price) : (we ? parseInt(we.price) : 0),
                            extraAdult: wd?.extraAdult || 0, 
                            kidsCharge: 1000, 
                            baseGuests: personsNum,
                        };
                    }

                    if (d.subProperties && d.subPropertyPricing) {
                        for (const sp of d.subProperties) {
                            const spP = d.subPropertyPricing[sp.id];
                            if (spP) {
                                const spWd = spP.weekday; 
                                const spWe = spP.weekend; 
                                const spSa = spP.saturday;
                                if (!spWd && !spWe) continue;
                                const spPersons = spWd?.personsLabel ? (parseInt(spWd.personsLabel.replace(/[^0-9]/g, '')) || 2) : 2;
                                pm[`${propName}/${sp.name.toUpperCase()}`] = {
                                    weekday: spWd ? parseInt(spWd.price) : (spWe ? parseInt(spWe.price) : 0),
                                    weekend: spWe ? parseInt(spWe.price) : (spWd ? parseInt(spWd.price) : 0),
                                    saturday: spSa ? parseInt(spSa.price) : (spWe ? parseInt(spWe.price) : (spWd ? parseInt(spWd.price) : 0)),
                                    extraAdult: spWd?.extraAdult || spWe?.extraAdult || 2000, 
                                    kidsCharge: 1000, 
                                    baseGuests: spPersons,
                                };
                            }
                        }
                    }
                } catch {}
            }
            setLivePricing(pm);
        })();
    }, [isOpen]);

    // Reset some configurations when property selection changes
    const handlePropertyChange = (newProp: string) => {
        const isAmstel = newProp.includes("Amstel");
        const defaultVilla = isAmstel ? "Standard Cottage" : "TAKE-1";
        setManualForm(prev => ({ ...prev, property: newProp, villa: defaultVilla }));
        
        if (isAmstel) {
            setAmstelStandardCount(1);
            setAmstelFamilySelected(false);
        }
        if (newProp.includes("Ambrose")) {
            setSelectedAmbroseVillas([]);
        }
    };

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

    const getUnitRates = (propName: string, villaName: string, day: number, isWeekend: boolean, isSaturday: boolean) => {
        let basePrice = 0;
        let extraAdultPrice = 0;
        let kidsPrice = 0;
        let baseGuests = 2;

        let liveKey = "";
        if (propName.includes("Ambrose")) {
            liveKey = `Ambrose/${villaName.toUpperCase()}`;
        } else if (propName.includes("Amstel")) {
            liveKey = villaName === "Family Cottage" ? "Amstel Nest/FAMILY COTTAGE" : "Amstel Nest/STANDARD COTTAGE";
        } else {
            for (const k of Object.keys(livePricing)) {
                if (propName.includes(k)) { liveKey = k; break; }
            }
        }

        let lp = livePricing[liveKey];
        if (!lp) {
            const upperKey = liveKey.toUpperCase();
            for (const [k, v] of Object.entries(livePricing)) {
                if (k.toUpperCase() === upperKey) { lp = v; break; }
            }
        }
        if (!lp && (propName.includes("Amstel") || propName.includes("Ambrose"))) {
            const parentKey = propName.includes("Amstel") ? "Amstel Nest" : "Ambrose";
            lp = livePricing[parentKey];
        }

        if (lp) {
            basePrice = isSaturday ? lp.saturday : (day === 0 || day === 5) ? lp.weekend : lp.weekday;
            extraAdultPrice = lp.extraAdult;
            kidsPrice = lp.kidsCharge;
            baseGuests = lp.baseGuests;
        } else {
            if (propName.includes("Hill View")) { basePrice = isWeekend ? 3950 : 2500; extraAdultPrice = 600; kidsPrice = 400; }
            else if (propName.includes("Mount View")) { basePrice = isWeekend ? 4950 : 3500; extraAdultPrice = 800; kidsPrice = 500; }
            else if (propName.includes("Heavenly")) { basePrice = isWeekend ? 4950 : 3950; extraAdultPrice = 800; kidsPrice = 500; }
            else if (propName.includes("La Paraiso")) { basePrice = isWeekend ? 7500 : 4950; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = isWeekend ? 4 : 2; }
            else if (propName.includes("Amstel")) {
                if (villaName === "Family Cottage") { basePrice = 9000; extraAdultPrice = 2000; kidsPrice = 1000; baseGuests = 4; }
                else { basePrice = isWeekend ? 6950 : 4950; extraAdultPrice = 2000; kidsPrice = 1000; baseGuests = 2; }
            }
            else if (propName.includes("Ambrose")) { basePrice = isWeekend ? 6500 : 5500; extraAdultPrice = 2000; kidsPrice = 1000; baseGuests = 4; }
        }

        return { basePrice, extraAdultPrice, kidsPrice, baseGuests };
    };

    const calculatePrice = () => {
        const isAmstel = manualForm.property.includes("Amstel");
        const isAmbrose = manualForm.property.includes("Ambrose");
        if (isAmbrose && selectedAmbroseVillas.length === 0) {
            return {
                basePrice: 0,
                gstAmount: 0,
                totalAmount: 0,
                roomTotal: 0,
                extraAdultCharge: 0,
                extraKidsCharge: 0,
                nightlyRoomRate: 0,
                specialDiscount: 0,
            };
        }
        if (isAmstel && amstelStandardCount === 0 && !amstelFamilySelected) {
            return {
                basePrice: 0,
                gstAmount: 0,
                totalAmount: 0,
                roomTotal: 0,
                extraAdultCharge: 0,
                extraKidsCharge: 0,
                nightlyRoomRate: 0,
                specialDiscount: 0,
            };
        }

        let roomTotal = 0;
        let extraAdultTotal = 0;
        let extraKidsTotal = 0;
        const start = new Date(manualForm.checkInDate);
        const end = new Date(manualForm.checkOutDate);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        let totalBaseGuests = 0;
        let sampleExtraAdultPrice = 2000;
        let sampleKidsPrice = 1000;

        for (let i = 0; i < nights; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const day = currentDate.getDay();
            const isWeekend = day === 0 || day === 5 || day === 6;
            const isSaturday = day === 6;

            if (isAmstel) {
                if (amstelStandardCount > 0) {
                    const stdRates = getUnitRates(manualForm.property, "Standard Cottage", day, isWeekend, isSaturday);
                    roomTotal += stdRates.basePrice * amstelStandardCount;
                    if (i === 0) {
                        totalBaseGuests += stdRates.baseGuests * amstelStandardCount;
                        sampleExtraAdultPrice = stdRates.extraAdultPrice;
                        sampleKidsPrice = stdRates.kidsPrice;
                    }
                }
                if (amstelFamilySelected) {
                    const famRates = getUnitRates(manualForm.property, "Family Cottage", day, isWeekend, isSaturday);
                    roomTotal += famRates.basePrice;
                    if (i === 0) {
                        totalBaseGuests += famRates.baseGuests;
                        sampleExtraAdultPrice = famRates.extraAdultPrice;
                        sampleKidsPrice = famRates.kidsPrice;
                    }
                }
            } else if (manualForm.property.includes("Ambrose")) {
                for (const villa of selectedAmbroseVillas) {
                    const rates = getUnitRates(manualForm.property, villa, day, isWeekend, isSaturday);
                    roomTotal += rates.basePrice;
                    if (i === 0) {
                        totalBaseGuests += rates.baseGuests;
                        sampleExtraAdultPrice = rates.extraAdultPrice;
                        sampleKidsPrice = rates.kidsPrice;
                    }
                }
            } else {
                const rates = getUnitRates(manualForm.property, manualForm.villa, day, isWeekend, isSaturday);
                roomTotal += rates.basePrice;
                if (i === 0) {
                    totalBaseGuests = rates.baseGuests;
                    sampleExtraAdultPrice = rates.extraAdultPrice;
                    sampleKidsPrice = rates.kidsPrice;
                }
            }
        }

        const extraAdults = Math.max(0, manualForm.guests - totalBaseGuests);
        const freeKidsSlots = Math.max(0, totalBaseGuests - manualForm.guests);
        const extraKids = Math.max(0, manualForm.kids - freeKidsSlots);

        extraAdultTotal = extraAdults * sampleExtraAdultPrice * nights;
        extraKidsTotal = extraKids * sampleKidsPrice * nights;

        let specialDiscount = 0;
        if (isAmbrose) {
            const numVillas = selectedAmbroseVillas.length;
            if (numVillas > 0) {
                let guestsLeft = manualForm.guests;
                let kidsLeft = manualForm.kids;
                const villaGuests: Record<string, number> = {};
                const villaKids: Record<string, number> = {};
                selectedAmbroseVillas.forEach((v, idx) => {
                    if (idx === numVillas - 1) {
                        villaGuests[v] = Math.max(1, guestsLeft);
                        villaKids[v] = Math.max(0, kidsLeft);
                    } else {
                        const g = Math.max(1, Math.round(manualForm.guests / numVillas));
                        const k = Math.round(manualForm.kids / numVillas);
                        villaGuests[v] = g;
                        villaKids[v] = k;
                        guestsLeft -= g;
                        kidsLeft -= k;
                    }
                });

                for (const v of selectedAmbroseVillas) {
                    const isAmbroseVilla = v === "TAKE-1" || v === "ALTA" || v === "SANTORINI";
                    if (isAmbroseVilla) {
                        const totalG = villaGuests[v] + villaKids[v];
                        if (totalG === 4) {
                            for (let i = 0; i < nights; i++) {
                                const currentDate = new Date(start);
                                currentDate.setDate(start.getDate() + i);
                                const day = currentDate.getDay();
                                const isSaturday = day === 6;
                                if (isSaturday) {
                                    specialDiscount += 500;
                                }
                            }
                        }
                    }
                }
            }
        } else if (manualForm.property.includes("La Paraiso")) {
            const totalG = manualForm.guests + manualForm.kids;
            const extraAdultCharge = 1200;
            const kidsChargeNum = 800;
            for (let i = 0; i < nights; i++) {
                const currentDate = new Date(start);
                currentDate.setDate(start.getDate() + i);
                const day = currentDate.getDay();
                const isWeekend = day === 0 || day === 5 || day === 6;
                if (!isWeekend) {
                    if (totalG === 4) {
                        const exAdults = Math.max(0, manualForm.guests - 2);
                        const freeKidsSlots = Math.max(0, 2 - manualForm.guests);
                        const extraKids = Math.max(0, manualForm.kids - freeKidsSlots);
                        const extraChargesForNight = (exAdults * extraAdultCharge) + (extraKids * kidsChargeNum);
                        const subtotalForNight = 4950 + extraChargesForNight;
                        if (subtotalForNight > 6500) {
                            specialDiscount += (subtotalForNight - 6500);
                        }
                    }
                } else {
                    if (totalG >= 3) {
                        let extraAdultsCount = 0;
                        let extraKidsCount = 0;
                        for (let slot = 3; slot <= Math.min(4, totalG); slot++) {
                            if (slot <= manualForm.guests) {
                                extraAdultsCount++;
                            } else {
                                extraKidsCount++;
                            }
                        }
                        specialDiscount += (extraAdultsCount * extraAdultCharge) + (extraKidsCount * kidsChargeNum);
                    }
                }
            }
        }

        let subtotal = roomTotal + extraAdultTotal + extraKidsTotal - specialDiscount;

        if (manualDecoration) subtotal += DECORATION_PRICE;

        let manualCouponDiscount = 0;
        if (manualAppliedCoupon) {
            if (manualAppliedCoupon.discountType === "percentage") {
                manualCouponDiscount = Math.round(subtotal * manualAppliedCoupon.discountValue / 100);
            } else {
                manualCouponDiscount = Number(manualAppliedCoupon.discountValue);
            }
            subtotal -= manualCouponDiscount;
        }

        const baseAfterCoupon = Math.round(subtotal);
        const gstAfterCoupon = Math.round(baseAfterCoupon * 0.05);
        const totalAfterCoupon = baseAfterCoupon + gstAfterCoupon;

        const totalAfterAdmin = Math.max(0, totalAfterCoupon - manualDiscountAmount);

        const baseAmount = Math.round(totalAfterAdmin / 1.05);
        const gstAmount = totalAfterAdmin - baseAmount;

        let finalTotal = baseAmount + gstAmount;
        finalTotal += manualForm.pets * 600;
        finalTotal = Math.round(finalTotal / 10) * 10;

        return {
            basePrice: baseAmount,
            gstAmount,
            totalAmount: finalTotal,
            roomTotal: Math.round(roomTotal),
            extraAdultCharge: Math.round(extraAdultTotal),
            extraKidsCharge: Math.round(extraKidsTotal),
            nightlyRoomRate: Math.round(roomTotal / nights),
            specialDiscount: Math.round(specialDiscount),
        };
    };

    const handleManualBookingSubmit = async () => {
        if (!manualForm.name || manualForm.name.trim() === '') {
            alert("Please provide the guest's name before booking.");
            return;
        }

        const isAmstel = manualForm.property.includes("Amstel");
        if (isAmstel && amstelStandardCount === 0 && !amstelFamilySelected) {
            alert("Please select at least one Standard Cottage or Family Cottage for booking.");
            return;
        }

        const start = new Date(manualForm.checkInDate);
        const end = new Date(manualForm.checkOutDate);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        const checkInDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const checkOutDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        // Get Property ID
        let propId: number | null = null;
        for (const p of dbPropertyList) {
            if (manualForm.property.includes(p.name)) { propId = p.id; break; }
        }
        if (!propId) {
            const fallbackMap: Record<string, number> = {
                "Hill View": 1, "Mount View": 2, "Heavenly Villa": 3,
                "La Paraiso": 4, "Amstel Nest": 5, "Ambrose": 6
            };
            propId = Object.entries(fallbackMap).find(([name]) => manualForm.property.includes(name))?.[1] || 1;
        }

        const isAmbrose = manualForm.property.includes("Ambrose");

        // Helper to check range overlap
        const getDatesInRange = (startDate: Date, endDate: Date): string[] => {
            const list: string[] = [];
            const temp = new Date(startDate);
            while (temp < endDate) {
                list.push(`${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}-${String(temp.getDate()).padStart(2, '0')}`);
                temp.setDate(temp.getDate() + 1);
            }
            return list;
        };
        const stayDates = getDatesInRange(start, end);

        // 1. Conflict Validation
        try {
            if (isAmbrose) {
                if (selectedAmbroseVillas.length === 0) {
                    alert("Please select at least one Ambrose Villa.");
                    return;
                }
                for (const villa of selectedAmbroseVillas) {
                    const subPropId = resolveSubPropertyId(manualForm.property, villa);
                    if (subPropId) {
                        const data = await api.get(`/bookings/staycation/booked-dates?propertyId=${propId}&subPropertyId=${subPropId}&startDate=${checkInDateStr}&endDate=${checkOutDateStr}`);
                        const bookedDates = data.dates || [];
                        const conflicts = stayDates.filter(d => bookedDates.includes(d));
                        if (conflicts.length > 0) {
                            alert(`Ambrose Villa "${villa}" is booked/unavailable on: ${conflicts.join(", ")}`);
                            return;
                        }
                    }
                }
            } else if (isAmstel) {
                const stdSubPropId = resolveSubPropertyId(manualForm.property, "Standard Cottage");
                const famSubPropId = resolveSubPropertyId(manualForm.property, "Family Cottage");

                if (amstelStandardCount > 0 && stdSubPropId) {
                    const data = await api.get(`/bookings/staycation/booked-dates?propertyId=${propId}&subPropertyId=${stdSubPropId}&startDate=${checkInDateStr}&endDate=${checkOutDateStr}`);
                    const dateCounts = data.dateCounts || {};
                    const conflicts: string[] = [];
                    for (const d of stayDates) {
                        const bookedCount = dateCounts[d] || 0;
                        if (14 - bookedCount < amstelStandardCount) {
                            conflicts.push(d);
                        }
                    }
                    if (conflicts.length > 0) {
                        alert(`Standard Cottage does not have ${amstelStandardCount} units available on: ${conflicts.join(", ")}`);
                        return;
                    }
                }

                if (amstelFamilySelected && famSubPropId) {
                    const data = await api.get(`/bookings/staycation/booked-dates?propertyId=${propId}&subPropertyId=${famSubPropId}&startDate=${checkInDateStr}&endDate=${checkOutDateStr}`);
                    const bookedDates = data.dates || [];
                    const conflicts = stayDates.filter(d => bookedDates.includes(d));
                    if (conflicts.length > 0) {
                        alert(`Family Cottage is booked/unavailable on: ${conflicts.join(", ")}`);
                        return;
                    }
                }
            } else {
                const data = await api.get(`/bookings/staycation/booked-dates?propertyId=${propId}&startDate=${checkInDateStr}&endDate=${checkOutDateStr}`);
                const bookedDates = data.dates || [];
                const conflicts = stayDates.filter(d => bookedDates.includes(d));
                if (conflicts.length > 0) {
                    alert(`This property is booked/unavailable on: ${conflicts.join(", ")}`);
                    return;
                }
            }
        } catch (err: any) {
            console.error("Conflict check error:", err);
        }

        const calculated = calculatePrice();

        try {
            if (isAmstel) {
                const stdSubPropId = resolveSubPropertyId(manualForm.property, "Standard Cottage");
                const famSubPropId = resolveSubPropertyId(manualForm.property, "Family Cottage");

                if (amstelStandardCount > 0 && amstelFamilySelected) {
                    // BOTH Standard and Family Selected (split booking)
                    let stdRoomTotal = 0;
                    let famRoomTotal = 0;
                    for (let i = 0; i < nights; i++) {
                        const currentDate = new Date(start);
                        currentDate.setDate(start.getDate() + i);
                        const day = currentDate.getDay();
                        const isWeekend = day === 0 || day === 5 || day === 6;
                        const isSaturday = day === 6;

                        let stdBase = isSaturday ? (livePricing["Amstel Nest/STANDARD COTTAGE"]?.saturday || 6950) : (day === 0 || day === 5) ? (livePricing["Amstel Nest/STANDARD COTTAGE"]?.weekend || 6950) : (livePricing["Amstel Nest/STANDARD COTTAGE"]?.weekday || 4950);
                        stdRoomTotal += stdBase * amstelStandardCount;

                        let famBase = livePricing["Amstel Nest/FAMILY COTTAGE"]?.weekday || 9000;
                        famRoomTotal += famBase;
                    }

                    // Split guests
                    const stdCap = 2 * amstelStandardCount;
                    const famCap = 4;

                    const stdGuests = Math.min(stdCap, Math.max(1, manualForm.guests - 1));
                    const famGuests = Math.max(1, manualForm.guests - stdGuests);

                    const stdKids = Math.round(manualForm.kids / 2);
                    const famKids = manualForm.kids - stdKids;

                    const stdPets = Math.round(manualForm.pets / 2);
                    const famPets = manualForm.pets - stdPets;

                    const stdExtraAdults = Math.max(0, stdGuests - stdCap);
                    const famExtraAdults = Math.max(0, famGuests - famCap);

                    const stdFreeKidsSlots = Math.max(0, stdCap - stdGuests);
                    const stdExtraKids = Math.max(0, stdKids - stdFreeKidsSlots);

                    const famFreeKidsSlots = Math.max(0, famCap - famGuests);
                    const famExtraKids = Math.max(0, famKids - famFreeKidsSlots);

                    const stdExtraAdultCharge = stdExtraAdults * 2000 * nights;
                    const stdExtraKidsCharge = stdExtraKids * 1000 * nights;
                    const famExtraAdultCharge = famExtraAdults * 2000 * nights;
                    const famExtraKidsCharge = famExtraKids * 1000 * nights;

                    const stdDecorCharge = manualDecoration ? DECORATION_PRICE : 0;
                    const famDecorCharge = 0;

                    const stdRawBase = stdRoomTotal + stdExtraAdultCharge + stdExtraKidsCharge + stdDecorCharge;
                    const famRawBase = famRoomTotal + famExtraAdultCharge + famExtraKidsCharge + famDecorCharge;

                    // Split discounts equally
                    const couponAmt = manualAppliedCoupon ? (manualAppliedCoupon.discountType === "percentage" ? Math.round((stdRawBase + famRawBase) * manualAppliedCoupon.discountValue / 100) : manualAppliedCoupon.discountValue) : 0;
                    const totalDiscount = couponAmt + Math.round(manualDiscountAmount / 1.05);

                    const stdDiscount = Math.round(totalDiscount / 2);
                    const famDiscount = totalDiscount - stdDiscount;

                    // Direct base prices
                    const stdBasePrice = Math.max(0, stdRawBase - stdDiscount);
                    const famBasePrice = Math.max(0, famRawBase - famDiscount);

                    // Apply 5% GST directly
                    const stdGst = Math.round(stdBasePrice * 0.05);
                    const famGst = Math.round(famBasePrice * 0.05);

                    const stdTotal = stdBasePrice + stdGst + stdPets * 600;
                    const famTotal = famBasePrice + famGst + famPets * 600;

                    // Split advance equally
                    let stdAdvance = stdTotal;
                    let famAdvance = famTotal;
                    if (customSplitMode) {
                        const prepaidNum = parseInt(customPrepaid || '0');
                        stdAdvance = Math.round(prepaidNum / 2);
                        famAdvance = prepaidNum - stdAdvance;
                    }

                    const stdBalance = stdTotal - stdAdvance;
                    const famBalance = famTotal - famAdvance;

                    const regCount = parseInt(manualRegularCount) || 0;
                    const jCount = parseInt(manualJainCount) || 0;
                    const stdRegCount = Math.round(regCount / 2);
                    const famRegCount = regCount - stdRegCount;
                    const stdJCount = Math.round(jCount / 2);
                    const famJCount = jCount - stdJCount;

                    const stdAddons: any[] = [];
                    const famAddons: any[] = [];

                    if (manualDecoration) {
                        stdAddons.push({ name: 'Celebration Add-on', price: DECORATION_PRICE, cakeMessage: manualCakeMsg || '', occasion: manualOccasion });
                    }
                    if (stdRegCount > 0) stdAddons.push({ name: 'Food Preference', foodType: 'Regular', count: stdRegCount });
                    if (stdJCount > 0) stdAddons.push({ name: 'Food Preference', foodType: 'Jain', count: stdJCount });

                    if (famRegCount > 0) famAddons.push({ name: 'Food Preference', foodType: 'Regular', count: famRegCount });
                    if (famJCount > 0) famAddons.push({ name: 'Food Preference', foodType: 'Jain', count: famJCount });

                    const commonPayload = {
                        customerName: manualForm.name,
                        customerPhone: manualForm.phone || "0000000000",
                        customerEmail: manualForm.email || null,
                        propertyId: propId,
                        checkInDate: checkInDateStr,
                        checkOutDate: checkOutDateStr,
                        securityDeposit: 3000,
                        advancePaid: true,
                        advanceMethod: manualForm.paymentMethod,
                        source: "reception",
                        couponCode: manualAppliedCoupon?.code || null,
                    };

                    await api.post("/bookings/staycation", {
                        ...commonPayload,
                        subPropertyId: stdSubPropId,
                        numGuests: stdGuests,
                        numKids: stdKids,
                        numPets: stdPets,
                        numCottages: amstelStandardCount,
                        nightlyRate: Math.round(stdRoomTotal / nights / amstelStandardCount),
                        totalAmount: stdTotal,
                        advanceAmount: stdAdvance,
                        balanceAmount: stdBalance,
                        basePrice: stdBasePrice,
                        extraAdultCharge: stdExtraAdultCharge,
                        extraKidsCharge: stdExtraKidsCharge,
                        gstAmount: stdGst,
                        discountAmount: stdDiscount,
                        addons: stdAddons.length > 0 ? stdAddons : null,
                    });

                    await api.post("/bookings/staycation", {
                        ...commonPayload,
                        subPropertyId: famSubPropId,
                        numGuests: famGuests,
                        numKids: famKids,
                        numPets: famPets,
                        numCottages: 1,
                        nightlyRate: Math.round(famRoomTotal / nights),
                        totalAmount: famTotal,
                        advanceAmount: famAdvance,
                        balanceAmount: famBalance,
                        basePrice: famBasePrice,
                        extraAdultCharge: famExtraAdultCharge,
                        extraKidsCharge: famExtraKidsCharge,
                        gstAmount: famGst,
                        discountAmount: famDiscount,
                        addons: famAddons.length > 0 ? famAddons : null,
                    });
                } else if (amstelStandardCount > 0) {
                    // Standard Cottage ONLY
                    const stdAddons: any[] = [];
                    const regCount = parseInt(manualRegularCount) || 0;
                    const jCount = parseInt(manualJainCount) || 0;
                    if (manualDecoration) {
                        stdAddons.push({ name: 'Celebration Add-on', price: DECORATION_PRICE, cakeMessage: manualCakeMsg || '', occasion: manualOccasion });
                    }
                    if (regCount > 0) stdAddons.push({ name: 'Food Preference', foodType: 'Regular', count: regCount });
                    if (jCount > 0) stdAddons.push({ name: 'Food Preference', foodType: 'Jain', count: jCount });

                    const commonPayload = {
                        customerName: manualForm.name,
                        customerPhone: manualForm.phone || "0000000000",
                        customerEmail: manualForm.email || null,
                        propertyId: propId,
                        checkInDate: checkInDateStr,
                        checkOutDate: checkOutDateStr,
                        securityDeposit: 3000,
                        advancePaid: true,
                        advanceMethod: manualForm.paymentMethod,
                        source: "reception",
                        couponCode: manualAppliedCoupon?.code || null,
                    };

                    await api.post("/bookings/staycation", {
                        ...commonPayload,
                        subPropertyId: stdSubPropId,
                        numGuests: manualForm.guests,
                        numKids: manualForm.kids || 0,
                        numPets: manualForm.pets || 0,
                        numCottages: amstelStandardCount,
                        nightlyRate: calculated.nightlyRoomRate,
                        totalAmount: calculated.totalAmount,
                        advanceAmount: customSplitMode ? parseInt(customPrepaid || '0') : calculated.totalAmount,
                        balanceAmount: customSplitMode ? parseInt(customBalance || '0') : 0,
                        basePrice: calculated.basePrice,
                        extraAdultCharge: calculated.extraAdultCharge,
                        extraKidsCharge: calculated.extraKidsCharge,
                        gstAmount: calculated.gstAmount,
                        discountAmount: manualDiscountAmount,
                        addons: stdAddons.length > 0 ? stdAddons : null,
                    });
                } else if (amstelFamilySelected) {
                    // Family Cottage ONLY
                    const famAddons: any[] = [];
                    const regCount = parseInt(manualRegularCount) || 0;
                    const jCount = parseInt(manualJainCount) || 0;
                    if (manualDecoration) {
                        famAddons.push({ name: 'Celebration Add-on', price: DECORATION_PRICE, cakeMessage: manualCakeMsg || '', occasion: manualOccasion });
                    }
                    if (regCount > 0) famAddons.push({ name: 'Food Preference', foodType: 'Regular', count: regCount });
                    if (jCount > 0) famAddons.push({ name: 'Food Preference', foodType: 'Jain', count: jCount });

                    const commonPayload = {
                        customerName: manualForm.name,
                        customerPhone: manualForm.phone || "0000000000",
                        customerEmail: manualForm.email || null,
                        propertyId: propId,
                        checkInDate: checkInDateStr,
                        checkOutDate: checkOutDateStr,
                        securityDeposit: 3000,
                        advancePaid: true,
                        advanceMethod: manualForm.paymentMethod,
                        source: "reception",
                        couponCode: manualAppliedCoupon?.code || null,
                    };

                    await api.post("/bookings/staycation", {
                        ...commonPayload,
                        subPropertyId: famSubPropId,
                        numGuests: manualForm.guests,
                        numKids: manualForm.kids || 0,
                        numPets: manualForm.pets || 0,
                        numCottages: 1,
                        nightlyRate: calculated.nightlyRoomRate,
                        totalAmount: calculated.totalAmount,
                        advanceAmount: customSplitMode ? parseInt(customPrepaid || '0') : calculated.totalAmount,
                        balanceAmount: customSplitMode ? parseInt(customBalance || '0') : 0,
                        basePrice: calculated.basePrice,
                        extraAdultCharge: calculated.extraAdultCharge,
                        extraKidsCharge: calculated.extraKidsCharge,
                        gstAmount: calculated.gstAmount,
                        discountAmount: manualDiscountAmount,
                        addons: famAddons.length > 0 ? famAddons : null,
                    });
                }

            } else if (isAmbrose) {
                // Ambrose (handles 1 or more villas)
                const numVillas = selectedAmbroseVillas.length;
                const roomTotals: Record<string, number> = {};

                let sumRoomTotals = 0;
                for (const v of selectedAmbroseVillas) {
                    let roomTotalV = 0;
                    for (let i = 0; i < nights; i++) {
                        const currentDate = new Date(start);
                        currentDate.setDate(start.getDate() + i);
                        const day = currentDate.getDay();
                        const isWeekend = day === 0 || day === 5 || day === 6;
                        const isSaturday = day === 6;
                        const rates = getUnitRates(manualForm.property, v, day, isWeekend, isSaturday);
                        roomTotalV += rates.basePrice;
                    }
                    roomTotals[v] = roomTotalV;
                    sumRoomTotals += roomTotalV;
                }

                // Distribute guests, kids, pets, food counts
                let guestsLeft = manualForm.guests;
                let kidsLeft = manualForm.kids;
                let petsLeft = manualForm.pets;
                let regLeft = parseInt(manualRegularCount) || 0;
                let jainLeft = parseInt(manualJainCount) || 0;

                const villaGuests: Record<string, number> = {};
                const villaKids: Record<string, number> = {};
                const villaPets: Record<string, number> = {};
                const villaReg: Record<string, number> = {};
                const villaJain: Record<string, number> = {};

                selectedAmbroseVillas.forEach((v, idx) => {
                    if (idx === numVillas - 1) {
                        villaGuests[v] = Math.max(1, guestsLeft);
                        villaKids[v] = Math.max(0, kidsLeft);
                        villaPets[v] = Math.max(0, petsLeft);
                        villaReg[v] = Math.max(0, regLeft);
                        villaJain[v] = Math.max(0, jainLeft);
                    } else {
                        const g = Math.max(1, Math.round(manualForm.guests / numVillas));
                        const k = Math.round(manualForm.kids / numVillas);
                        const p = Math.round(manualForm.pets / numVillas);
                        const r = Math.round((parseInt(manualRegularCount) || 0) / numVillas);
                        const j = Math.round((parseInt(manualJainCount) || 0) / numVillas);

                        villaGuests[v] = g;
                        villaKids[v] = k;
                        villaPets[v] = p;
                        villaReg[v] = r;
                        villaJain[v] = j;

                        guestsLeft -= g;
                        kidsLeft -= k;
                        petsLeft -= p;
                        regLeft -= r;
                        jainLeft -= j;
                    }
                });

                // Calculate base raw prices for each villa
                const villaRawBases: Record<string, number> = {};
                selectedAmbroseVillas.forEach((v, idx) => {
                    const guestsV = villaGuests[v];
                    const rates = getUnitRates(manualForm.property, v, start.getDay(), start.getDay() === 0 || start.getDay() === 5 || start.getDay() === 6, start.getDay() === 6);
                    const baseGuestsV = rates.baseGuests;
                    const extraAdultPriceV = rates.extraAdultPrice;
                    const kidsPriceV = rates.kidsPrice;

                    const extraAdultsV = Math.max(0, guestsV - baseGuestsV);
                    const freeKidsSlotsV = Math.max(0, baseGuestsV - guestsV);
                    const extraKidsV = Math.max(0, villaKids[v] - freeKidsSlotsV);

                    const extraAdultChargeV = extraAdultsV * extraAdultPriceV * nights;
                    const extraKidsChargeV = extraKidsV * kidsPriceV * nights;
                    const decorChargeV = (idx === 0 && manualDecoration) ? DECORATION_PRICE : 0;

                    let vSpecialDiscount = 0;
                    const isAmbroseVilla = v === "TAKE-1" || v === "ALTA" || v === "SANTORINI";
                    if (isAmbroseVilla && (guestsV + villaKids[v]) === 4) {
                        for (let i = 0; i < nights; i++) {
                            const currentDate = new Date(start);
                            currentDate.setDate(start.getDate() + i);
                            const day = currentDate.getDay();
                            if (day === 6) {
                                vSpecialDiscount += 500;
                            }
                        }
                    }

                    villaRawBases[v] = roomTotals[v] + extraAdultChargeV + extraKidsChargeV + decorChargeV - vSpecialDiscount;
                });

                const totalRawBase = Object.values(villaRawBases).reduce((s, val) => s + val, 0);

                const couponAmt = manualAppliedCoupon ? (manualAppliedCoupon.discountType === "percentage" ? Math.round(totalRawBase * manualAppliedCoupon.discountValue / 100) : manualAppliedCoupon.discountValue) : 0;
                const totalDiscount = couponAmt + Math.round(manualDiscountAmount / 1.05);

                let discountLeft = totalDiscount;
                const villaDiscounts: Record<string, number> = {};
                selectedAmbroseVillas.forEach((v, idx) => {
                    if (idx === numVillas - 1) {
                        villaDiscounts[v] = Math.max(0, discountLeft);
                    } else {
                        const d = Math.round(totalDiscount / numVillas);
                        villaDiscounts[v] = d;
                        discountLeft -= d;
                    }
                });

                // Base, GST, and totals for each villa
                const villaBasePrices: Record<string, number> = {};
                const villaGsts: Record<string, number> = {};
                const villaTotals: Record<string, number> = {};

                selectedAmbroseVillas.forEach(v => {
                    villaBasePrices[v] = Math.max(0, villaRawBases[v] - villaDiscounts[v]);
                    villaGsts[v] = Math.round(villaBasePrices[v] * 0.05);
                    villaTotals[v] = villaBasePrices[v] + villaGsts[v] + villaPets[v] * 600;
                });

                const grandCombinedTotal = Object.values(villaTotals).reduce((s, val) => s + val, 0);

                let advanceLeft = customSplitMode ? parseInt(customPrepaid || '0') : grandCombinedTotal;
                const villaAdvances: Record<string, number> = {};
                selectedAmbroseVillas.forEach((v, idx) => {
                    if (idx === numVillas - 1) {
                        villaAdvances[v] = Math.max(0, advanceLeft);
                    } else {
                        const adv = customSplitMode ? Math.round(parseInt(customPrepaid || '0') / numVillas) : villaTotals[v];
                        villaAdvances[v] = adv;
                        advanceLeft -= adv;
                    }
                });

                const commonPayload = {
                    customerName: manualForm.name,
                    customerPhone: manualForm.phone || "0000000000",
                    customerEmail: manualForm.email || null,
                    propertyId: propId,
                    checkInDate: checkInDateStr,
                    checkOutDate: checkOutDateStr,
                    securityDeposit: 3000,
                    advancePaid: true,
                    advanceMethod: manualForm.paymentMethod,
                    source: "reception",
                    couponCode: manualAppliedCoupon?.code || null,
                };

                for (const v of selectedAmbroseVillas) {
                    const subPropId = resolveSubPropertyId(manualForm.property, v);
                    const villaAddons: any[] = [];
                    if (selectedAmbroseVillas.indexOf(v) === 0 && manualDecoration) {
                        villaAddons.push({ name: 'Celebration Add-on', price: DECORATION_PRICE, cakeMessage: manualCakeMsg || '', occasion: manualOccasion });
                    }
                    if (villaReg[v] > 0) villaAddons.push({ name: 'Food Preference', foodType: 'Regular', count: villaReg[v] });
                    if (villaJain[v] > 0) villaAddons.push({ name: 'Food Preference', foodType: 'Jain', count: villaJain[v] });

                    const basePrice = villaBasePrices[v];
                    const payloadRates = getUnitRates(manualForm.property, v, start.getDay(), start.getDay() === 0 || start.getDay() === 5 || start.getDay() === 6, start.getDay() === 6);
                    const extraAdultsV = Math.max(0, villaGuests[v] - payloadRates.baseGuests);
                    const freeKidsSlotsV = Math.max(0, payloadRates.baseGuests - villaGuests[v]);
                    const extraKidsV = Math.max(0, villaKids[v] - freeKidsSlotsV);
                    const extraAdultCharge = extraAdultsV * payloadRates.extraAdultPrice * nights;
                    const extraKidsCharge = extraKidsV * payloadRates.kidsPrice * nights;

                    await api.post("/bookings/staycation", {
                        ...commonPayload,
                        subPropertyId: subPropId,
                        numGuests: villaGuests[v],
                        numKids: villaKids[v],
                        numPets: villaPets[v],
                        numCottages: 1,
                        nightlyRate: Math.round(roomTotals[v] / nights),
                        totalAmount: villaTotals[v],
                        advanceAmount: villaAdvances[v],
                        balanceAmount: villaTotals[v] - villaAdvances[v],
                        basePrice: basePrice,
                        extraAdultCharge: extraAdultCharge,
                        extraKidsCharge: extraKidsCharge,
                        gstAmount: villaGsts[v],
                        discountAmount: villaDiscounts[v],
                        addons: villaAddons.length > 0 ? villaAddons : null,
                    });
                }
            } else {
                // Standalone villas (Hill View, Mount View, La Paraiso, Heavenly Villa)
                const bookingAddons: any[] = [];
                if (manualDecoration) {
                    bookingAddons.push({ name: 'Celebration Add-on', price: DECORATION_PRICE, cakeMessage: manualCakeMsg || '', occasion: manualOccasion });
                }

                await api.post("/bookings/staycation", {
                    customerName: manualForm.name,
                    customerPhone: manualForm.phone || "0000000000",
                    customerEmail: manualForm.email || null,
                    propertyId: propId,
                    subPropertyId: null,
                    numGuests: manualForm.guests,
                    numKids: manualForm.kids || 0,
                    numPets: manualForm.pets || 0,
                    numCottages: 1,
                    checkInDate: checkInDateStr,
                    checkOutDate: checkOutDateStr,
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
                    discountAmount: manualDiscountAmount,
                    addons: bookingAddons.length > 0 ? bookingAddons : null,
                });
            }

            onSuccess();
            onClose();

            // Reset forms
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
            setSelectedAmbroseVillas([]);
            setAmstelStandardCount(1);
            setAmstelFamilySelected(false);
            setCustomSplitMode(false);
            setCustomPrepaid("");
            setCustomBalance("");
            setManualDecoration(false);
            setManualCakeMsg("");
            setManualOccasion("Birthday");
            setManualRegularCount("0");
            setManualJainCount("0");
            setManualCouponCode("");
            setManualAppliedCoupon(null);
            setManualCouponError("");
            setManualDiscountAmount(0);

            alert("Manual booking created successfully!");

        } catch (err: any) {
            alert(err?.message || err?.error || "Failed to create manual booking");
        }
    };

    if (!isOpen) return null;

    const calcResult = calculatePrice();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus className="text-purple-600" size={20} /> Add Manual Booking</h3>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Full 100% payment collection required.</p>
                    </div>
                    <button
                        onClick={onClose}
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
                                <select value={manualForm.property} onChange={e => handlePropertyChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none font-medium text-slate-800">
                                    {properties.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>

                            {manualForm.property.includes("Ambrose") && (
                                <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Select Ambrose Villas *</label>
                                    <div className="space-y-2">
                                        {AMBROSE_VILLAS.map(v => {
                                            const isSelected = selectedAmbroseVillas.includes(v);
                                            return (
                                                <div key={v} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                                                    <span className="text-sm font-bold text-slate-700">{v}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedAmbroseVillas(prev => {
                                                                if (prev.includes(v)) {
                                                                    return prev.filter(x => x !== v);
                                                                } else {
                                                                    return [...prev, v];
                                                                }
                                                            });
                                                        }}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all flex items-center justify-center min-w-[80px] ${
                                                            isSelected
                                                                ? "bg-purple-50 border-purple-300 text-purple-700 font-extrabold"
                                                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                                        }`}
                                                    >
                                                        {isSelected ? "✓" : "Select"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {manualForm.property.includes("Amstel") && (
                                <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Select Villas / Cottages *</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                                            <div>
                                                <span className="text-sm font-bold text-slate-700">Standard Cottage</span>
                                                <span className="ml-2 text-xs text-slate-400">(14 units)</span>
                                            </div>
                                            <div className="flex items-center border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                                                <button type="button" onClick={() => setAmstelStandardCount(prev => Math.max(0, prev - 1))} className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 font-bold text-sm">−</button>
                                                <span className="px-3 py-1.5 text-sm font-bold text-slate-700 min-w-[32px] text-center">{amstelStandardCount}</span>
                                                <button type="button" onClick={() => setAmstelStandardCount(prev => Math.min(14, prev + 1))} className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 font-bold text-sm">+</button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                                            <div>
                                                <span className="text-sm font-bold text-slate-700">Family Cottage</span>
                                                <span className="ml-2 text-xs text-slate-400">(1 unit)</span>
                                            </div>
                                            <button type="button" onClick={() => setAmstelFamilySelected(prev => !prev)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${amstelFamilySelected ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                                                {amstelFamilySelected ? "Selected ✓" : "Select"}
                                            </button>
                                        </div>
                                    </div>
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
                        <div className="p-4 border border-emerald-200 rounded-xl bg-emerald-50 space-y-3">
                            <h4 className="text-sm font-bold text-slate-800">Food Preference</h4>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Both options are vegetarian only</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Regular Veg Count</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={manualRegularCount} 
                                        onChange={(e) => setManualRegularCount(e.target.value)} 
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Jain Veg Count</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={manualJainCount} 
                                        onChange={(e) => setManualJainCount(e.target.value)} 
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary & Payment */}
                    <div className="bg-purple-50 rounded-xl p-4 sm:p-5 border border-purple-100 mt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Calculated Total (Inc. Taxes)</p>
                                <h2 className="text-3xl font-black text-purple-900 flex items-center">
                                    <IndianRupee size={24} className="mr-1" /> {calcResult.totalAmount.toLocaleString('en-IN')}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Base ₹{calcResult.basePrice.toLocaleString('en-IN')} + Taxes ₹{calcResult.gstAmount.toLocaleString('en-IN')}</p>
                                {(calcResult.specialDiscount ?? 0) > 0 && (
                                    <p className="text-xs text-emerald-600 font-bold mt-1">
                                        Discount: -₹{(calcResult.specialDiscount ?? 0).toLocaleString('en-IN')}
                                    </p>
                                )}
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
                        <div className="border border-dashed border-purple-200 rounded-xl p-3 bg-purple-50/50 mb-4">
                            <label className="text-[10px] font-bold text-purple-600 tracking-wider mb-1.5 block">Admin Price Reduction (₹) — applied to Total (Base+GST)</label>
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
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Split</label>
                            <div className="bg-slate-50 rounded-lg p-1 flex">
                                <button type="button" onClick={() => { setCustomSplitMode(false); }} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${!customSplitMode ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Full Payment</button>
                                <button type="button" onClick={() => { setCustomSplitMode(true); setCustomPrepaid(String(calcResult.totalAmount)); setCustomBalance('0'); }} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customSplitMode ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Custom Split</button>
                            </div>
                        </div>
                        {customSplitMode && (
                            <div className="grid grid-cols-2 gap-3 mb-4 animate-in fade-in">
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
                                            setCustomBalance(String(Math.max(0, calcResult.totalAmount - prepaidNum)));
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
        </div>
    );
}

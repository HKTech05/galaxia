"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    ShieldCheck,
    Plus,
    Camera,
    CheckCircle2,
    XCircle,
    Trash2,
    RefreshCw,
    User,
    Calendar,
    Phone,
    X,
    Clock,
    UserCheck,
    UserX,
    HelpCircle,
    Eye
} from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";

interface SecurityStaff {
    id: number;
    name: string;
    role: string | null;
    phone: string | null;
    photoUrl: string | null;
    isActive: boolean;
    attendance?: {
        id: number;
        status: "present" | "absent";
        photoUrl: string | null;
        markedAt: string;
        markedBy: string | null;
    } | null;
}

export default function SecurityPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [staffList, setStaffList] = useState<SecurityStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [submittingId, setSubmittingId] = useState<number | null>(null);

    // Add Staff Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newStaffName, setNewStaffName] = useState("");
    const [newStaffRole, setNewStaffRole] = useState("");
    const [newStaffPhone, setNewStaffPhone] = useState("");
    const [addingStaff, setAddingStaff] = useState(false);

    // Delete Modal
    const [deletingStaff, setDeletingStaff] = useState<SecurityStaff | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Camera Capture State
    const [cameraTargetStaff, setCameraTargetStaff] = useState<SecurityStaff | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState("");
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Lightbox Modal for Thumbnail
    const [activeLightboxImg, setActiveLightboxImg] = useState<{ url: string; name: string } | null>(null);

    const formatDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const dateStr = formatDateStr(selectedDate);

    const fetchAttendanceData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ date: string; staff: SecurityStaff[] }>(`/security/attendance?date=${dateStr}`);
            setStaffList(res.staff || []);
        } catch (err) {
            console.error("Failed to fetch security staff attendance:", err);
        } finally {
            setLoading(false);
        }
    }, [dateStr]);

    useEffect(() => {
        fetchAttendanceData();
    }, [fetchAttendanceData]);

    // Handle Adding New Staff
    const handleAddStaff = async () => {
        if (!newStaffName.trim()) {
            alert("Please enter staff name.");
            return;
        }
        setAddingStaff(true);
        try {
            await api.post("/security/staff", {
                name: newStaffName.trim(),
                role: newStaffRole.trim() || null,
                phone: newStaffPhone.trim() || null
            });
            setShowAddModal(false);
            setNewStaffName("");
            setNewStaffRole("");
            setNewStaffPhone("");
            fetchAttendanceData();
        } catch (err: any) {
            alert(err.message || "Failed to add staff member.");
        } finally {
            setAddingStaff(false);
        }
    };

    // Handle Deleting Staff
    const handleDeleteStaff = async () => {
        if (!deletingStaff) return;
        setDeleting(true);
        try {
            await api.delete(`/security/staff/${deletingStaff.id}`);
            setDeletingStaff(null);
            fetchAttendanceData();
        } catch (err: any) {
            alert(err.message || "Failed to delete staff member.");
        } finally {
            setDeleting(false);
        }
    };

    // Open Camera Modal & Start Stream
    const openCameraModal = async (staff: SecurityStaff) => {
        setCameraTargetStaff(staff);
        setCapturedPhoto(null);
        setCameraError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error("Camera access error:", err);
            setCameraError("Camera access denied or unavailable. You can also upload a photo directly.");
        }
    };

    // Stop Camera Stream
    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const closeCameraModal = () => {
        stopCamera();
        setCameraTargetStaff(null);
        setCapturedPhoto(null);
    };

    // Take Picture from Video Element
    const takeSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setCapturedPhoto(dataUrl);
            stopCamera();
        }
    };

    // Handle Direct File Upload (Fallback for Camera Input)
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setCapturedPhoto(result);
                stopCamera();
            };
            reader.readAsDataURL(file);
        }
    };

    // Mark Attendance (Present / Absent)
    const markAttendance = async (staff: SecurityStaff, status: "present" | "absent", photoBase64?: string | null) => {
        setSubmittingId(staff.id);
        try {
            await api.post("/security/attendance", {
                staffId: staff.id,
                date: dateStr,
                status,
                photoUrl: photoBase64 !== undefined ? photoBase64 : (staff.attendance?.photoUrl || null)
            });
            if (cameraTargetStaff?.id === staff.id) {
                closeCameraModal();
            }
            fetchAttendanceData();
        } catch (err: any) {
            alert(err.message || "Failed to mark attendance.");
        } finally {
            setSubmittingId(null);
        }
    };

    // Calculate Counts
    const totalStaff = staffList.length;
    const presentCount = staffList.filter(s => s.attendance?.status === "present").length;
    const absentCount = staffList.filter(s => s.attendance?.status === "absent").length;
    const pendingCount = staffList.filter(s => !s.attendance).length;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-16">
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 shrink-0">
                        <ShieldCheck size={36} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Security & Staff Attendance</h1>
                        <p className="text-sm font-semibold text-slate-500 mt-1">
                            Daily photo attendance log and staff management
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
                        <Calendar size={16} className="text-slate-400" />
                        <CustomDatePicker
                            date={selectedDate}
                            onDateChange={(d) => setSelectedDate(d)}
                        />
                    </div>

                    <button
                        onClick={fetchAttendanceData}
                        disabled={loading}
                        className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
                        title="Refresh attendance records"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin text-purple-600" : ""} />
                    </button>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-sm transition-colors text-sm"
                    >
                        <Plus size={18} />
                        <span>Add Staff</span>
                    </button>
                </div>
            </div>

            {/* Attendance Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{totalStaff}</p>
                    </div>
                    <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                        <User size={20} />
                    </div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Present</p>
                        <p className="text-2xl font-black text-emerald-800 mt-1">{presentCount}</p>
                    </div>
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                        <UserCheck size={20} />
                    </div>
                </div>

                <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Absent</p>
                        <p className="text-2xl font-black text-red-800 mt-1">{absentCount}</p>
                    </div>
                    <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                        <UserX size={20} />
                    </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</p>
                        <p className="text-2xl font-black text-amber-800 mt-1">{pendingCount}</p>
                    </div>
                    <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                        <HelpCircle size={20} />
                    </div>
                </div>
            </div>

            {/* Staff Attendance List */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-purple-600" />
                        Staff Attendance List ({selectedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})
                    </h2>
                    <span className="text-xs font-semibold text-slate-400">
                        {staffList.length} Members Listed
                    </span>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <RefreshCw size={32} className="animate-spin text-purple-600" />
                        <p className="text-sm font-semibold">Loading staff records...</p>
                    </div>
                ) : staffList.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 space-y-3">
                        <User size={40} className="mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">No staff members added yet.</p>
                        <p className="text-xs text-slate-400">Click the "+ Add Staff" button above to register your first staff member.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staffList.map((staff) => {
                            const att = staff.attendance;
                            const isSubmitting = submittingId === staff.id;

                            return (
                                <div
                                    key={staff.id}
                                    className={`border rounded-2xl p-4.5 space-y-4 transition-all duration-200 ${
                                        att?.status === "present"
                                            ? "bg-emerald-50/30 border-emerald-200"
                                            : att?.status === "absent"
                                                ? "bg-red-50/30 border-red-200"
                                                : "bg-slate-50/50 border-slate-200"
                                    }`}
                                >
                                    {/* Staff Header Info & Delete */}
                                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="font-extrabold text-base text-slate-800 leading-snug">
                                                {staff.name}
                                            </h3>
                                            {staff.role && (
                                                <span className="inline-block text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md mt-1">
                                                    {staff.role}
                                                </span>
                                            )}
                                            {staff.phone && (
                                                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 mt-1">
                                                    <Phone size={12} />
                                                    {staff.phone}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setDeletingStaff(staff)}
                                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                                            title="Delete Staff"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Captured Thumbnail & Timestamp */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            {att?.photoUrl ? (
                                                <button
                                                    onClick={() => setActiveLightboxImg({ url: att.photoUrl!, name: staff.name })}
                                                    className="group relative block w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-90 transition-opacity"
                                                    title="Click to view full size"
                                                >
                                                    <img
                                                        src={att.photoUrl}
                                                        alt={staff.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                        <Eye size={16} />
                                                    </div>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openCameraModal(staff)}
                                                    className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-400 bg-white hover:bg-purple-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-purple-600 transition-colors"
                                                    title="Capture Photo"
                                                >
                                                    <Camera size={20} />
                                                    <span className="text-[9px] font-bold mt-0.5">Photo</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-1">
                                            {/* Status Badge */}
                                            {att ? (
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                                                        att.status === "present"
                                                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                            : "bg-red-100 text-red-800 border-red-200"
                                                    }`}
                                                >
                                                    {att.status === "present" ? (
                                                        <>
                                                            <CheckCircle2 size={13} />
                                                            <span>PRESENT</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle size={13} />
                                                            <span>ABSENT</span>
                                                        </>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                    NOT MARKED
                                                </span>
                                            )}

                                            {/* Timestamp */}
                                            {att?.markedAt ? (
                                                <p className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                                    <Clock size={10} />
                                                    {new Date(att.markedAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 font-semibold italic">No record today</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Green YES / Red NO & Re-take Camera */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => markAttendance(staff, "present")}
                                            disabled={isSubmitting}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all ${
                                                att?.status === "present"
                                                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                            }`}
                                        >
                                            <CheckCircle2 size={15} />
                                            <span>YES (Present)</span>
                                        </button>

                                        <button
                                            onClick={() => markAttendance(staff, "absent")}
                                            disabled={isSubmitting}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all ${
                                                att?.status === "absent"
                                                    ? "bg-red-600 text-white shadow-sm shadow-red-200"
                                                    : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                            }`}
                                        >
                                            <XCircle size={15} />
                                            <span>NO (Absent)</span>
                                        </button>

                                        <button
                                            onClick={() => openCameraModal(staff)}
                                            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
                                            title="Retake Photo"
                                        >
                                            <Camera size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Camera Capture Modal */}
            {cameraTargetStaff && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden space-y-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                                    <Camera size={20} className="text-purple-600" />
                                    Capture Photo — {cameraTargetStaff.name}
                                </h3>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">Take photo using device camera or file browser</p>
                            </div>
                            <button
                                onClick={closeCameraModal}
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Live Video Stream / Preview */}
                            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                                {capturedPhoto ? (
                                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-contain" />
                                ) : (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />
                                        <canvas ref={canvasRef} className="hidden" />
                                    </>
                                )}
                            </div>

                            {cameraError && (
                                <p className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                                    {cameraError}
                                </p>
                            )}

                            {/* Camera Action Controls */}
                            <div className="flex flex-col gap-3">
                                {!capturedPhoto ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={takeSnapshot}
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm text-sm"
                                        >
                                            <Camera size={18} />
                                            <span>Take Snapshot</span>
                                        </button>

                                        <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-2xl cursor-pointer text-xs flex items-center justify-center">
                                            <span>Upload File</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleFileInput}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => markAttendance(cameraTargetStaff, "present", capturedPhoto)}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-sm"
                                            >
                                                <CheckCircle2 size={18} />
                                                <span>Save & Mark YES (Present)</span>
                                            </button>

                                            <button
                                                onClick={() => markAttendance(cameraTargetStaff, "absent", capturedPhoto)}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-sm"
                                            >
                                                <XCircle size={18} />
                                                <span>Save & Mark NO (Absent)</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setCapturedPhoto(null);
                                                openCameraModal(cameraTargetStaff);
                                            }}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs"
                                        >
                                            Retake Photo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                                <Plus size={20} className="text-purple-600" />
                                Add New Staff Member
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newStaffName}
                                    onChange={(e) => setNewStaffName(e.target.value)}
                                    placeholder="e.g. Ramesh Kumar"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    Role / Designation
                                </label>
                                <input
                                    type="text"
                                    value={newStaffRole}
                                    onChange={(e) => setNewStaffRole(e.target.value)}
                                    placeholder="e.g. Security Guard, Supervisor, Housekeeper"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={newStaffPhone}
                                    onChange={(e) => setNewStaffPhone(e.target.value)}
                                    placeholder="e.g. 9876543210"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddStaff}
                                disabled={addingStaff}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                                {addingStaff ? "Adding..." : "Add Staff"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingStaff && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-center">
                        <div className="p-3 bg-red-50 text-red-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-800">Delete Staff Member?</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Are you sure you want to remove <strong className="text-slate-700">{deletingStaff.name}</strong>? They will be deleted from the attendance roster.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setDeletingStaff(null)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteStaff}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Lightbox Modal */}
            {activeLightboxImg && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setActiveLightboxImg(null)}
                >
                    <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-2">
                            <h4 className="font-extrabold text-sm text-slate-800">{activeLightboxImg.name} — Attendance Photo</h4>
                            <button
                                onClick={() => setActiveLightboxImg(null)}
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <img
                            src={activeLightboxImg.url}
                            alt={activeLightboxImg.name}
                            className="w-full max-h-[70vh] object-contain rounded-2xl bg-slate-950"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

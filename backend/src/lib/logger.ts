import prisma from "./prisma";

export type AuditAction =
    | "login_success"
    | "login_failure"
    | "booking_created"
    | "booking_cancelled"
    | "booking_status_update"
    | "payment_recorded"
    | "user_status_change"
    | "file_upload"
    | "file_delete"
    | "image_upload"
    | "image_delete"
    | "coupon_created"
    | "coupon_deleted"
    | "profile_updated"
    | "employee_updated"
    | "customer_login"
    | "review_approved"
    | "review_rejected"
    | "review_deleted"
    | "update_status"
    | "register_success"
    | "register_failure"
    | "fetch_profile_success"
    | "fetch_profile_failure"
    | "update_profile_success"
    | "update_profile_failure";

interface LogOptions {
    adminId?: number;
    action: AuditAction;
    entityType: string;
    entityId?: number;
    details?: Record<string, any>;
    ipAddress?: string;
    isDeveloper?: boolean;
}

/**
 * Log an audit event to the AuditLog table.
 * Fire-and-forget — errors are caught and logged to console only.
 */
export async function auditLog(opts: LogOptions): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                adminId: opts.adminId,
                action: opts.action,
                entityType: opts.entityType,
                entityId: opts.entityId,
                details: opts.details || {},
                isDeveloper: opts.isDeveloper || false,
            },
        });
    } catch (err) {
        console.error("[AuditLog] Failed to write:", err);
    }
}

/**
 * Helper to extract IP from request
 */
export function getClientIp(req: any): string {
    return req.ip || req.headers["x-forwarded-for"] || "unknown";
}

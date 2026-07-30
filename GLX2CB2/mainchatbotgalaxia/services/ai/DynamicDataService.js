const { pool } = require("../db");

class DynamicDataService {
  /**
   * Helper to calculate per-night accurate availability for a property / sub-property
   */
  async calculateSubPropertyAvailability(propertyId, subPropertyId, capacity, cleanCheckIn, cleanCheckOut) {
    const startDate = new Date(cleanCheckIn);
    const endDate = new Date(cleanCheckOut);

    let minAvailable = capacity;
    let maxBooked = 0;
    let maxBlocked = 0;

    const current = new Date(startDate);
    while (current < endDate) {
      const dStr = current.toISOString().split("T")[0];

      let bQuery = `
        SELECT COALESCE(SUM(COALESCE(num_cottages, 1)), 0) as cnt
        FROM staycation_bookings
        WHERE property_id = $1
          AND status NOT IN ('cancelled', 'no_show', 'transferred')
          AND (check_in_date + INTERVAL '5 hours 30 minutes')::date <= $2::date
          AND (check_out_date + INTERVAL '5 hours 30 minutes')::date > $2::date
      `;
      let bParams = [propertyId, dStr];
      if (subPropertyId) {
        bQuery += " AND sub_property_id = $3";
        bParams.push(subPropertyId);
      }
      const bRes = await pool.query(bQuery, bParams);
      const booked = parseInt(bRes.rows[0]?.cnt || 0);

      let blkQuery = `
        SELECT COALESCE(SUM(COALESCE(num_units, 1)), 0) as cnt
        FROM blocked_dates
        WHERE property_id = $1
          AND (blocked_date + INTERVAL '5 hours 30 minutes')::date = $2::date
      `;
      let blkParams = [propertyId, dStr];
      if (subPropertyId) {
        blkQuery += " AND sub_property_id = $3";
        blkParams.push(subPropertyId);
      }
      const blkRes = await pool.query(blkQuery, blkParams);
      const blocked = parseInt(blkRes.rows[0]?.cnt || 0);

      const occupied = booked + blocked;
      const avail = Math.max(0, capacity - occupied);

      if (avail < minAvailable) minAvailable = avail;
      if (booked > maxBooked) maxBooked = booked;
      if (blocked > maxBlocked) maxBlocked = blocked;

      current.setDate(current.getDate() + 1);
    }

    return {
      capacity,
      bookedCount: maxBooked,
      blockedCount: maxBlocked,
      availableUnits: minAvailable,
      isAvailable: minAvailable > 0
    };
  }

  /**
   * Check if a staycation property (or specific sub-property) is available for a date range.
   */
  async checkStaycationAvailability(propertySlug, checkIn, checkOut, subPropertySlug = null) {
    try {
      console.log("[DynamicDataService] checkStaycationAvailability CALLED WITH:", { propertySlug, checkIn, checkOut, subPropertySlug });
      // 1. Normalize dates (YYYY-MM-DD)
      const cleanCheckIn = String(checkIn).split("T")[0];
      let cleanCheckOut = checkOut ? String(checkOut).split("T")[0] : null;
      if (!cleanCheckOut || cleanCheckOut === cleanCheckIn) {
        const inDateObj = new Date(cleanCheckIn);
        inDateObj.setDate(inDateObj.getDate() + 1);
        cleanCheckOut = inDateObj.toISOString().split("T")[0];
      }

      // 2. Find property
      const propRes = await pool.query(
        "SELECT id, name, slug, type FROM properties WHERE (LOWER(slug) = LOWER($1) OR LOWER(name) = LOWER($1)) AND is_active = true",
        [propertySlug]
      );
      if (propRes.rows.length === 0) return { error: `Property '${propertySlug}' not found` };
      const property = propRes.rows[0];

      // If checking for Ambrose or Amstel Nest with no subProperty specified, check all sub-properties individually!
      if (!subPropertySlug && (property.slug === "ambrose" || property.slug === "amstel-nest")) {
        const allSubs = await pool.query(
          "SELECT id, name, slug, unit_count FROM sub_properties WHERE property_id = $1 AND is_active = true ORDER BY id ASC",
          [property.id]
        );

        const subResults = [];
        for (const sub of allSubs.rows) {
          const cap = sub.unit_count || 1;
          const availCalc = await this.calculateSubPropertyAvailability(property.id, sub.id, cap, cleanCheckIn, cleanCheckOut);
          subResults.push({
            subPropertyName: sub.name,
            subPropertySlug: sub.slug,
            capacity: cap,
            bookedCount: availCalc.bookedCount,
            blockedCount: availCalc.blockedCount,
            availableUnits: availCalc.availableUnits,
            isAvailable: availCalc.isAvailable,
            statusText: availCalc.isAvailable ? `${availCalc.availableUnits} of ${cap} available` : "SOLD OUT / BOOKED"
          });
        }

        return {
          propertyName: property.name,
          checkIn: cleanCheckIn,
          checkOut: cleanCheckOut,
          isMultiUnit: true,
          subPropertiesAvailability: subResults
        };
      }

      // Single specific sub-property or single-unit property (La Paraiso, Heavenly Villa, Hill View, Mount View)
      let subProperty = null;
      if (subPropertySlug) {
        const subRes = await pool.query(
          "SELECT id, name, slug, unit_count FROM sub_properties WHERE property_id = $1 AND (LOWER(slug) = LOWER($2) OR LOWER(name) = LOWER($2)) AND is_active = true",
          [property.id, subPropertySlug]
        );
        if (subRes.rows.length > 0) subProperty = subRes.rows[0];
      }

      let capacity = 1;
      if (subProperty) {
        capacity = subProperty.unit_count || 1;
      } else {
        const capRes = await pool.query(
          "SELECT COALESCE(SUM(unit_count), 1) as total FROM sub_properties WHERE property_id = $1 AND is_active = true",
          [property.id]
        );
        capacity = parseInt(capRes.rows[0]?.total || 1);
      }

      const availCalc = await this.calculateSubPropertyAvailability(property.id, subProperty ? subProperty.id : null, capacity, cleanCheckIn, cleanCheckOut);
      console.log("[DynamicDataService] checkStaycationAvailability RESULT:", { cleanCheckIn, cleanCheckOut, capacity, availCalc });

      return {
        propertyName: property.name,
        subPropertyName: subProperty ? subProperty.name : null,
        checkIn: cleanCheckIn,
        checkOut: cleanCheckOut,
        capacity,
        bookedCount: availCalc.bookedCount,
        blockedCount: availCalc.blockedCount,
        availableUnits: availCalc.availableUnits,
        isAvailable: availCalc.isAvailable,
        statusText: availCalc.isAvailable ? `${availCalc.availableUnits} unit(s) available` : "NOT AVAILABLE / FULLY BOOKED"
      };
    } catch (err) {
      console.error("[DynamicDataService] Staycation availability check error:", err.message);
      return { error: "Failed to verify availability" };
    }
  }

  /**
   * Check if a Digital Diaries screen (private cinema) is available for a slot or full day.
   */
  async checkDigitalDiariesAvailability(screenSlug, bookingDate, startHour = null, durationHours = 2) {
    try {
      const cleanBookingDate = String(bookingDate).split("T")[0];
      const screenRes = await pool.query(
        "SELECT id, name, slug FROM dd_screens WHERE (LOWER(slug) = LOWER($1) OR LOWER(name) = LOWER($1)) AND is_active = true",
        [screenSlug]
      );
      if (screenRes.rows.length === 0) return { error: `Screen '${screenSlug}' not found` };
      const screen = screenRes.rows[0];

      if (startHour !== null && startHour !== undefined) {
        const numStartHour = Number(startHour);
        const endHour = numStartHour + durationHours;

        // Check DD bookings on this date that overlap hours
        const bookingsRes = await pool.query(
          `SELECT id, booking_ref, start_hour, duration_hours
           FROM dd_bookings
           WHERE screen_id = $1
             AND booking_date = $2
             AND status NOT IN ('cancelled', 'no_show')
             AND start_hour < $4
             AND (start_hour + duration_hours) > $3`,
          [screen.id, cleanBookingDate, numStartHour, endHour]
        );

        // Check blocked slots on this date
        const blockedRes = await pool.query(
          `SELECT id, start_hour, end_hour
           FROM blocked_dates
           WHERE screen_id = $1
             AND blocked_date = $2
             AND (
               (start_hour IS NULL AND end_hour IS NULL) OR
               (start_hour < $4 AND end_hour > $3)
             )`,
          [screen.id, cleanBookingDate, numStartHour, endHour]
        );

        const isAvailable = bookingsRes.rows.length === 0 && blockedRes.rows.length === 0;

        return {
          screenName: screen.name,
          bookingDate: cleanBookingDate,
          requestedStartHour: numStartHour,
          requestedDuration: durationHours,
          isAvailable,
          statusText: isAvailable ? `AVAILABLE for ${numStartHour}:00 (${durationHours} hrs)` : `SLOT BOOKED / OCCUPIED`,
          conflictingBookings: bookingsRes.rows.length,
          conflictingBlocks: blockedRes.rows.length
        };
      }

      // If startHour is NULL, check ALL bookings and blocks for the full day!
      const dayBookings = await pool.query(
        `SELECT start_hour, duration_hours, (start_hour + duration_hours) as end_hour
         FROM dd_bookings
         WHERE screen_id = $1
           AND booking_date = $2
           AND status NOT IN ('cancelled', 'no_show')
         ORDER BY start_hour ASC`,
        [screen.id, cleanBookingDate]
      );

      const dayBlocks = await pool.query(
        `SELECT start_hour, end_hour
         FROM blocked_dates
         WHERE screen_id = $1 AND blocked_date = $2`,
        [screen.id, cleanBookingDate]
      );

      const bookedSlots = dayBookings.rows.map(b => `${b.start_hour}:00 to ${b.end_hour}:00`);
      const blockedSlots = dayBlocks.rows.map(b => (b.start_hour ? `${b.start_hour}:00 to ${b.end_hour}:00` : "FULL DAY BLOCKED"));

      const isFullDayBlocked = dayBlocks.rows.some(b => b.start_hour === null);

      // Calculate available free time ranges between 10:00 (10 AM) and 22:00 (10 PM - Venue Closes at 10 PM)
      const occupiedHours = new Set();
      dayBookings.rows.forEach(b => {
        const start = Number(b.start_hour);
        const end = Number(b.end_hour);
        for (let h = start; h < end; h++) occupiedHours.add(h);
      });
      dayBlocks.rows.forEach(b => {
        if (b.start_hour !== null && b.end_hour !== null) {
          const start = Number(b.start_hour);
          const end = Number(b.end_hour);
          for (let h = start; h < end; h++) occupiedHours.add(h);
        }
      });

      const freeRanges = [];
      let currentStart = null;
      for (let h = 10; h <= 22; h++) {
        const isOccupied = isFullDayBlocked || occupiedHours.has(h) || h === 22;
        if (!isOccupied && currentStart === null) {
          currentStart = h;
        } else if (isOccupied && currentStart !== null) {
          const startFmt = currentStart > 12 ? `${currentStart - 12} PM` : currentStart === 12 ? '12 PM' : `${currentStart} AM`;
          const endFmt = h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`;
          freeRanges.push(`${startFmt} - ${endFmt}`);
          currentStart = null;
        }
      }

      const availableSlotsText = isFullDayBlocked
        ? "None (Full Day Blocked)"
        : freeRanges.length > 0
          ? freeRanges.join(", ")
          : "None (All slots fully booked)";

      const isAvailableForSomeSlots = !isFullDayBlocked && (freeRanges.length > 0);

      return {
        screenName: screen.name,
        bookingDate: cleanBookingDate,
        isAvailable: isAvailableForSomeSlots,
        availableTimeSlots: freeRanges,
        bookedTimeSlots: bookedSlots,
        blockedTimeSlots: blockedSlots,
        summaryText: isFullDayBlocked 
          ? `FULL DAY BLOCKED / UNAVAILABLE on ${cleanBookingDate}` 
          : freeRanges.length > 0 
            ? `Available time slots on ${cleanBookingDate} for ${screen.name}: ${availableSlotsText}.${bookedSlots.length > 0 ? ` (Booked: ${bookedSlots.join(", ")})` : ''}` 
            : `All time slots FULLY BOOKED on ${cleanBookingDate} for ${screen.name}.`
      };
    } catch (err) {
      console.error("[DynamicDataService] DD availability check error:", err.message);
      return { error: "Failed to check screen availability" };
    }
  }

  /**
   * Get booking voucher details by booking reference.
   */
  async getBookingStatus(bookingRef) {
    const refUpper = bookingRef.toUpperCase().trim();
    try {
      // 1. Check staycation
      const stayRes = await pool.query(
        `SELECT sb.*, p.name as property_name, sp.name as sub_property_name
         FROM staycation_bookings sb
         JOIN properties p ON sb.property_id = p.id
         LEFT JOIN sub_properties sp ON sb.sub_property_id = sp.id
         WHERE sb.booking_ref = $1`,
        [refUpper]
      );

      if (stayRes.rows.length > 0) {
        const booking = stayRes.rows[0];
        return {
          type: "Staycation",
          bookingRef: booking.booking_ref,
          customerName: booking.customer_name,
          customerPhone: booking.customer_phone,
          propertyName: booking.property_name,
          subPropertyName: booking.sub_property_name,
          checkInDate: booking.check_in_date.toISOString().split("T")[0],
          checkOutDate: booking.check_out_date.toISOString().split("T")[0],
          status: booking.status,
          paymentStatus: booking.advance_paid ? "Paid" : "Pending",
          totalAmount: booking.total_amount,
          balanceAmount: booking.balance_amount,
          securityDeposit: booking.security_deposit,
          numGuests: booking.num_guests,
          numKids: booking.num_kids,
          numPets: booking.num_pets
        };
      }

      // 2. Check digital diaries
      const ddRes = await pool.query(
        `SELECT db.*, s.name as screen_name, pkg.name as package_name
         FROM dd_bookings db
         JOIN dd_screens s ON db.screen_id = s.id
         JOIN dd_packages pkg ON db.package_id = pkg.id
         WHERE db.booking_ref = $1`,
        [refUpper]
      );

      if (ddRes.rows.length > 0) {
        const booking = ddRes.rows[0];
        return {
          type: "Digital Diaries",
          bookingRef: booking.booking_ref,
          customerName: booking.customer_name,
          customerPhone: booking.customer_phone,
          screenName: booking.screen_name,
          packageName: booking.package_name,
          bookingDate: booking.booking_date.toISOString().split("T")[0],
          startHour: booking.start_hour,
          durationHours: booking.duration_hours,
          status: booking.status,
          paymentStatus: booking.payment_status,
          totalAmount: booking.total_amount,
          amountPaid: booking.amount_paid,
          amountToCollect: booking.amount_to_collect,
          numGuests: booking.num_guests,
          occasion: booking.occasion
        };
      }

      return null; // Not found
    } catch (err) {
      console.error("[DynamicDataService] Get booking status error:", err.message);
      return { error: "Failed to fetch booking details" };
    }
  }

  /**
   * Validate a coupon code.
   */
  async validateCoupon(code) {
    const codeUpper = code.toUpperCase().trim();
    try {
      const res = await pool.query(
        `SELECT * FROM coupons WHERE code = $1 AND is_active = true`,
        [codeUpper]
      );

      if (res.rows.length === 0) {
        return { valid: false, error: "Coupon not found or inactive" };
      }

      const coupon = res.rows[0];
      const now = new Date();

      if (coupon.current_uses >= coupon.max_uses) {
        return { valid: false, error: "Coupon usage limit reached" };
      }

      if (coupon.expiry_hours) {
        const expiresAt = new Date(coupon.created_at.getTime() + coupon.expiry_hours * 3600000);
        if (expiresAt <= now) return { valid: false, error: "Coupon has expired" };
      } else if (new Date(coupon.expiry_date) < now) {
        return { valid: false, error: "Coupon has expired" };
      }

      return {
        valid: true,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: parseFloat(coupon.discount_value),
        maxUses: coupon.max_uses,
        currentUses: coupon.current_uses
      };
    } catch (err) {
      console.error("[DynamicDataService] Coupon validation error:", err.message);
      return { valid: false, error: "Failed to validate coupon" };
    }
  }

  /**
   * Query the latest active offers/coupons.
   */
  async getActiveOffers() {
    try {
      const now = new Date();
      const res = await pool.query(
        `SELECT code, discount_type, discount_value, expiry_date 
         FROM coupons 
         WHERE is_active = true 
           AND current_uses < max_uses 
           AND expiry_date >= $1
         LIMIT 5`,
        [now]
      );
      return res.rows.map(r => ({
        code: r.code,
        type: r.discount_type,
        value: parseFloat(r.discount_value),
        expiry: r.expiry_date.toISOString().split("T")[0]
      }));
    } catch (err) {
      console.error("[DynamicDataService] Fetch active offers error:", err.message);
      return [];
    }
  }
}

module.exports = new DynamicDataService();

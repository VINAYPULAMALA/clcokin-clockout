// backend/authMiddleware.js

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    let currentUser;

    // ✅ Always trust query params first (these come from logged-in user)
    currentUser = {
      access_level: req.query.access_level,
      staff_id: req.query.staff_id,
      venue_id: req.query.venue_id,
      business_id: req.query.business_id,
    };

    // ✅ Fallback to body only if query missing (e.g. during login)
    if (!currentUser.access_level && req.body) {
      currentUser.access_level = req.body.access_level;
      currentUser.staff_id = req.body.staff_id;
      currentUser.venue_id = req.body.venue_id;
      currentUser.business_id = req.body.business_id;
    }

    console.log("🔐 requireRole DEBUG:", {
      allowedRoles,
      receivedData: currentUser,
      reqQuery: req.query,
      reqBody: req.body,
    });

    if (!currentUser || !currentUser.access_level) {
      return res.status(401).json({ error: "Unauthorized: no user context" });
    }

    if (!allowedRoles.includes(currentUser.access_level)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }

    req.currentUser = currentUser;
    next();
  };
}

function restrictVenue() {
  return (req, res, next) => {
    const currentUser = req.currentUser || {};

    // ✅ Safely extract venue_id from query or body
    const venueId =
      (req.query && req.query.venue_id) ||
      (req.body && req.body.venue_id);

    console.log("🏢 restrictVenue DEBUG:", {
      currentUser,
      venueId,
      reqQuery: req.query,
      reqBody: req.body,
    });

    // Require venueId to be present
    if (!venueId) {
      return res.status(400).json({ error: "Venue ID is required" });
    }

    // ✅ Check system_admin is only allowed in their own venue
    if (currentUser.access_level === "system_admin") {
      if (parseInt(currentUser.venue_id) !== parseInt(venueId)) {
        return res.status(403).json({
          error: "System Admins can only manage their own venue",
        });
      }
    }

    // ✅ Check manager is only allowed in their own venue
    if (currentUser.access_level === "manager") {
      if (parseInt(currentUser.venue_id) !== parseInt(venueId)) {
        return res.status(403).json({
          error: "Managers can only manage their own venue",
        });
      }
    }

    // Attach confirmed venueId for downstream handlers
    req.venue_id = venueId;
    next();
  };
}

function checkSelf(paramName = "staff_id") {
  return (req, res, next) => {
    const { currentUser } = req;

    if (!currentUser) {
      return res.status(500).json({ error: "Authentication error: currentUser missing" });
    }

    const staffIdFromRequest =
      (req.body && req.body[paramName]) ||
      (req.query && req.query[paramName]) ||
      (req.params && req.params[paramName]);

    if (currentUser.access_level === "employee") {
      if (!staffIdFromRequest || parseInt(staffIdFromRequest) !== parseInt(currentUser.staff_id)) {
        return res.status(403).json({ error: "Employees can only access their own data" });
      }
      if (req.body) req.body[paramName] = currentUser.staff_id;
      if (req.query) req.query[paramName] = currentUser.staff_id;
    }

    next();
  };
}

module.exports = { requireRole, restrictVenue, checkSelf };
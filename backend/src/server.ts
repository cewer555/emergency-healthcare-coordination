import express from "express";
import { db } from "./prisma/db";

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check
app.get("/", (req, res) => {
res.json({
message: "Emergency Healthcare Coordination API is running",
});
});

// Get all hospitals
app.get("/api/hospitals", async (req, res) => {
try {
const hospitals = await db.orm.public.Hospital.where({}).all();


res.status(200).json({
  success: true,
  count: hospitals.length,
  data: hospitals,
});


} catch (error) {
console.error("Error fetching hospitals:", error);


res.status(500).json({
  success: false,
  message: "Failed to fetch hospitals",
});


}
});


// Register a new hospital
app.post("/api/hospitals", async (req, res) => {
  try {
    const {
      name,
      code,
      latitude,
      longitude,
      address,
      status,
      emergencyContact,
      timezone,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !code ||
      latitude === undefined ||
      longitude === undefined ||
      !status ||
      !timezone
    ) {
      res.status(400).json({
        success: false,
        message:
          "Required fields: name, code, latitude, longitude, status, timezone",
      });
      return;
    }

    // Validate coordinates
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
      return;
    }

    // Create the hospital
    const hospital = await db.orm.public.Hospital.create({
      name,
      code,
      latitude,
      longitude,
      address: address ?? null,
      status,
      emergencyContact: emergencyContact ?? null,
      timezone,
    });

    res.status(201).json({
      success: true,
      message: "Hospital registered successfully",
      data: hospital,
    });
  } catch (error) {
    console.error("Error registering hospital:", error);

    res.status(500).json({
      success: false,
      message: "Failed to register hospital",
    });
  }
});




app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});

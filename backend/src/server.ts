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

app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});

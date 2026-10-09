import hospitalRoutes from "./routes/hospital.routes";
import express from "express";
import { db } from "./prisma/db";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api/hospitals", hospitalRoutes);
// Health check
app.get("/", (req, res) => {
res.json({
message: "Emergency Healthcare Coordination API is running",
});
});





app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});

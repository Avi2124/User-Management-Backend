import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended: true}));
app.get("/", (req, res) => {
    res.send("Server is working");
});
app.use("/api/users", userRoutes)
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

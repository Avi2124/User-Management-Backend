import express from "express";
import upload from "../middleware/upload.js";
import { validateCreateUser, validateUpdateUser } from "../middleware/validateUser.js";
import { checkDocumentList } from "../middleware/checkDocumentLimit.js";
import { deleteUser, getUserById, getUsers, login, profile, signup, updateUser } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();
userRoutes.post("/signup", upload.fields([{name: "profile", maxCount: 1}, {name: "documents", maxCount: 5}]),
validateCreateUser, checkDocumentList, signup);

userRoutes.post("/login", login);

userRoutes.get("/profile", verifyToken, profile);

userRoutes.get("/", getUsers);

userRoutes.put("/:id", upload.fields([{name: "profile", maxCount: 1}, {name: "documents", maxCount: 5}]),
validateUpdateUser, updateUser);

userRoutes.get("/:id", getUserById);

userRoutes.delete("/:id", deleteUser);

// userRoutes.post("/signup", signup);

export default userRoutes;

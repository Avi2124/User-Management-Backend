import cloudinary from "../config/cloudinary.js";
import pool from "../config/db.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
    try {
        const{name, mobile_no, email, password} = req.body;
        const profile = req.files?.profile?.[0];
        const documents = req.files?.documents || [];
        const [existingUsers] = await pool.query(`SELECT id FROM users WHERE email=? OR mobile_no=?`, [email, mobile_no]);
        if(existingUsers.length > 0){
            return res.status(400).json({
                success: false,
                message: "Email or Mobile already exists"
            });
        }
        const hashedPassword =await bcrypt.hash(password, 10);
        let profileUrl = null;
        let profilePublicId = null;
        if(profile){
            const uploadedProfile = await uploadToCloudinary(profile.buffer, "users/profile");
            profileUrl = uploadedProfile.secure_url;
            profilePublicId = uploadedProfile.public_id;
        }
        const [userResult] = await pool.query(`INSERT INTO users (name, mobile_no, email, password, profile_url, profile_public_id) VALUES
            (?, ?, ?, ?, ?, ?)`, [name, mobile_no, email, hashedPassword, profileUrl, profilePublicId]);
            const userId = userResult.insertId;
                for(const doc of documents){
                    const uploadedDoc = await uploadToCloudinary(doc.buffer, "users/documents");
                    await pool.query(`INSERT INTO user_documents(user_id, document_url, document_public_id) VALUES (?, ?, ?)`,
                        [userId, uploadedDoc.secure_url, uploadedDoc.public_id]);
                }
                const token = jwt.sign(
                    {
                        id: userId, email
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRES_IN
                    }
                );
            return res.status(201).json({
                success: true,
                message: "User created successfully",
                token
            });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message, error
        });
    }
};


export const updateUser = async (req, res) => {
    try {
        const {id} = req.params;
        const {name, mobile_no, email} = req.body;
        const [users] = await pool.query(`SELECT * FROM users WHERE id=? AND is_deleted=false`, [id]);
        if(users.length === 0){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const user = users[0];
        const [duplicateUsers] = await pool.query(`SELECT id FROM users WHERE (email=? OR mobile_no=?)AND id!=?`,
            [email, mobile_no, id]
        );
        if(duplicateUsers.length > 0){
            return res.status(400).json({
                success: false,
                message: "Email or Mobile already exists"
            });
        }
        let profileUrl = user.profile_url;
        let profilePublicId = user.profile_public_id;
        const profile = req.files?.profile?.[0];
        if(profile){
            if(profilePublicId){
                await cloudinary.uploader.destroy(profilePublicId);
            }
            const uploadedProfile = await uploadToCloudinary(profile.buffer, "users/profile");
            profileUrl = uploadedProfile.secure_url;
            profilePublicId = uploadedProfile.public_id;
        }
        const documents = req.files?.documents || [];
        if(documents.length > 0){
            const [existingDocs] = await pool.query(`SELECT COUNT(*) total FROM user_documents WHERE user_id=?`, [id]);
            const totalDocs = existingDocs[0].total;
            if(totalDocs + documents.length > 5){
                return res.status(400).json({
                    success: false,
                    message: "Maximum 5 documents allowed"
                });
            }
            for(const doc of documents){
                const uploadedDoc = await uploadToCloudinary(doc.buffer, "users/documents");
                await pool.query(`INSERT INTO user_documents(user_id, document_url, document_public_id) VALUES (?, ?, ?)`,
                    [id, uploadedDoc.secure_url, uploadedDoc.public_id]
                );
            }
        }
        await pool.query(`UPDATE users SET name=?, mobile_no=?, email=?, profile_url=?, profile_public_id=? WHERE id=?`,
            [name, mobile_no, email, profileUrl, profilePublicId, id]
        );
        return res.status(200).json({
            success: true,
            message: "User updated successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const offset = (page - 1) * limit;
        const [countResult] = await pool.query(`SELECT COUNT(*) total FROM users WHERE is_deleted = false AND (name LIKE ?
            OR mobile_no LIKE ? OR email LIKE ?)`, [`%${search}%`, `%${search}%`, `%${search}%`]);
        const totalRecords = countResult[0].total;
        const [users] = await pool.query(`SELECT * FROM users WHERE is_deleted = false AND (name LIKE ? OR mobile_no LIKE ?
            OR email LIKE ?) ORDER BY id DESC LIMIT ? OFFSET ?`, 
        [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]);
        const responseData = [];
        for (const user of users) {
            const [documents] = await pool.query(`SELECT id, document_url FROM user_documents WHERE user_id=?`, [user.id]);
            responseData.push({
                id: user.id,
                name: user.name,
                mobile_no: user.mobile_no,
                email: user.email,
                profile_url: user.profile_url,documents
            });
        }
        return res.status(200).json({
            success: true,
            page,
            limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit), 
            data: responseData
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const {id} = req.params;
        const [users] = await pool.query(`SELECT * FROM users WHERE id=? AND is_deleted=false`, [id]);
        if(users.length === 0){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const user = users[0];
        const [documents] = await pool.query(`SELECT id, document_url FROM user_documents WHERE user_id=?`, [id]);
        return res.status(200).json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                mobile_no: user.mobile_no,
                email: user.email,
                profile_url: user.profile_url, documents
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success:false,
            message: error.message
        });
    }
};

    export const deleteUser = async (req,res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const {id} = req.params;
        const [users] = await connection.query(`SELECT * FROM users WHERE id=? AND is_deleted=false`, [id]);
        if(users.length === 0){
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const user = users[0];
        const [documents] = await connection.query(`SELECT * FROM user_documents WHERE user_id=?`, [id]);
        if(user.profile_public_id){
            await cloudinary.uploader.destroy(user.profile_public_id);
        }
        for(const doc of documents){
            await cloudinary.uploader.destroy(doc.document_public_id);
        }
        await connection.query(`DELETE FROM user_documents WHERE user_id=?`, [id]);
        await connection.query(`UPDATE users SET is_deleted=true, profile_url=NULL, profile_public_id=NULL WHERE id=?`, [id]);
        await connection.commit();
        return res.status(200).json({
            success: true,
            message: "User Deleted Successfully"
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
};

export const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const[users] = await pool.query(`SELECT * FROM users WHERE email=? AND is_deleted=false`, [email]);
        if(users.length === 0){
            return res.status(401).json({
                success: false,
                message: "Invalid Credentials"
            });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(401).json({
                success: false,
                message: "Invalid Credentials"
            });
        }
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );
        return res.status(200).json({
            success: true, token
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const profile = async (req, res) => {
    try {
        const [users] = await pool.query(`SELECT id, name, mobile_no, email, profile_url FROM users WHERE id=? AND is_deleted=false`,
            [req.user.id]);
            if(users.length === 0){
                return res.status(404).json({
                    succes: false,
                    message: "User not found"
                });
            }
            return res.status(200).json({
                success: true,data: users[0]
            });
    } catch (error) { 
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


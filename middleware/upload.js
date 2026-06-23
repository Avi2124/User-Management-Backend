import multer from "multer";
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if(allowedTypes.includes(file.mimetype)){
        cb(null, true);
    } else {
        cb(new Error("Only jpg, jpeg and png files are allowed"));
    }
};
const upload = multer({storage, fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
export default upload;

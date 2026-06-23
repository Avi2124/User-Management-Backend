export const errorHandler = (err, req, res, next) => {
    if(err.code === "LIMIT_FILE_SIZE"){
        return res.status(400).json({
            success: false,
            message: "File size must be less than 5MB"
        });
    }
    return res.status(500).json({
        success: false,
        message: err.message
    });
};

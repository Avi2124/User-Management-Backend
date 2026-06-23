export const checkDocumentList = (req, res, next) => {
    const docs = req.files?.documents || [];
    if(docs.length > 5){
        return res.status(400).json({
            succesS: false,
            message: "Maximum 5 documents allowed"
        });
    }
    next();
};

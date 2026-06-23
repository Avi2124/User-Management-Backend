import Joi from "joi";
const createUserSchema = Joi.object({
    name: Joi.string().trim().required().messages({"any.required": "Name is required"}),
    mobile_no: Joi.string().pattern(/^[0-9]{10}$/).required().messages({"string.pattern.base": "Mobile number must be exactly 10 digits",
        "any.required": "Name is required",
    }),
    email: Joi.string().email().required().messages({"string.email": "Invalid email",
        "any.required": "Email is required"}),
    password: Joi.string().required().messages({"any.required": "Password is required "})
});

export const validateCreateUser = (req, res, next) => {
    const {error} = createUserSchema.validate(req.body);
    if(error){
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

const updateUserSchema = Joi.object({
    name: Joi.string().trim(),
    mobile_no: Joi.string().pattern(/^[0-9]{10}$/),
    email: Joi.string().email()
});

export const validateUpdateUser = (req, res, next) => {
    const{error} = updateUserSchema.validate(req.body);
    if(error){
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
};

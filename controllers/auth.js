const User = require('../models/User')
const ErrorResponse = require('../utils/ErrorResponse');
const sendEmail = require('../utils/sendEmail');

exports.register = async (req,res,next) => {
    const {username,email,password} = req.body;
    try {
        const user = await User.create({username: username, email: email , password: password});
        sendToken(user,201,res);

    } catch (error) {
        next(error);
    }
};
exports.login = async (req,res,next) => {
    const {email,password} = req.body;

    if(!email || !password) {
        return next(new ErrorResponse("Please provide email and password",400))
    }
    try {
        const user = await User.findOne({email}).select("+password");

        if(!user) {
            return next(new ErrorResponse("Invalid credentials",401))
        }
        const isMatch = await user.matchPasswords(password);

        if(!isMatch) {
            return next(new ErrorResponse("Invalid credentials",401))
        }
        sendToken(user,200,res);

    } catch (error) {
        res.status(404).json({success:false,error: error.message});
    }

};
exports.forgotpassword = async (req,res,next) => {
    const {email} = req.body;

    try {
        const user = await User.findOne({email: email});
        if(!user) {
            return next(new ErrorResponse("Email could not be sent",404));
        }

        const resetToken = user.getResetPasswordToken();

        await user.save();

        const resetUrl = `http://localhost:3000/passwordreset/${resetToken}`;
        const message = `
        <h1> You have requested reset password</h1>
        <p> Please go to this link to reset your password</p>
        <a href=${resetUrl} clicktracking =off>${resetUrl}</a>
        `
        try {
            await sendEmail({
                to : user.email,
                subject : "Password Reset Request",
                text : message
            });

            res.status(200).json({success:true,data: "Email sent"})
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save();

            return next(new ErrorResponse("Email could not be used",500))
        }
    } catch (error) {
        next(error);
    }

};
exports.resetpassword = (req,res,next) => {
    res.send("Reset Password Route");
};

const sendToken = (user,statusCode,res) => {
    const token = user.getSignedToken();
    res.status(statusCode).json({success : true, token});
}
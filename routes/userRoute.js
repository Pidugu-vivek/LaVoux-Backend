import express from 'express';
import { loginUser,registerUser,adminLogin,forgotPassword, resetPassword, getProfile, updateProfile, changePassword, sendSecurityOtp, verifySecurityOtp} from '../controllers/userController.js';
import authUser from '../middleware/auth.js';

const userRouter = express.Router();

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.post('/admin',adminLogin)
userRouter.post('/forgot', forgotPassword)
userRouter.post('/reset/:token', resetPassword)
userRouter.get('/profile',authUser,getProfile)
userRouter.post('/profile/update', authUser, updateProfile);
userRouter.post('/profile/change-password', authUser, changePassword);
userRouter.post('/profile/send-otp', authUser, sendSecurityOtp);
userRouter.post('/profile/verify-otp', authUser, verifySecurityOtp);

export default userRouter;
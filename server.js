import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js';
import { connectRedis } from './config/redis.js';
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'
import newsletterRouter from './routes/newsletterRoute.js';
import bannerRouter from './routes/bannerRoute.js';
import reviewRouter from './routes/reviewRoute.js'
import issueRouter from './routes/issueRoute.js'

// App Config
const app = express()
const port = process.env.PORT || 4000
connectDB();
connectCloudinary();
connectRedis();

// middlewares
app.use(express.json())
app.use(cors())
app.use('/api/user',userRouter)
app.use('/api/product',productRouter)
app.use('/api/cart',cartRouter)
app.use('/api/order',orderRouter)
app.use('/api/newsletter',newsletterRouter)
app.use('/api/banner', bannerRouter)
app.use('/api/review', reviewRouter)
app.use('/api/issue', issueRouter)

app.get('/',(req,res)=>{
    res.send("API Working")
})

app.listen(port, ()=> console.log('Server started on PORT : '+ port))
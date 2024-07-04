const express = require("express");
const mongoose= require('mongoose');
const PORT = process.env.PORT || 4040;

const jwt=require('jsonwebtoken')
const User = require('./models/User');
const Message = require('./models/Message')
const cors=require('cors');
const cookieParser=require('cookie-parser');
const bcrypt=require('bcryptjs');
const ws=require('ws');
//require('dotenv').config();
require('dotenv').config();
//const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

connectDB();

const app=express();
app.use(express.json())
app.use(cookieParser())
app.use(cors(  {origin: process.env.CLIENT_URL, // Allow requests from this origin
  credentials: true}));


const jwtsecret=process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);
app.get('/profile',(req,res)=>{
    const token=req.cookies?.token;
    if(token){
    jwt.verify(token,jwtsecret,{},(err, userData)=>{
        if(err) throw err;
       // const {id,username}=userData;
        res.json({
            userData
        });
    })
}else{
    res.status(401).json("no token");
}
})



app.get("/test",(req,res) => {
    res.json('test ok')
})

app.post('/login',async (req,res)=>{
    const {username,password} = req.body;
   const foundUser = await User.findOne({username});
   if(foundUser){
    const passOk=bcrypt.compareSync(password,foundUser.password)
    if(passOk){
         jwt.sign({userId:foundUser._id,username}, jwtsecret,{},(err,token)=>{
        
        res.cookie('token',token).json({
            id: foundUser._id,
            
        });
    })
    }
   }

})


app.post('/register',async (req,res)=>{
    const {username,password}=req.body;
    
    try{
        const hashedPassword = bcrypt.hashSync(password,bcryptSalt);
        const createdUser = await User.create({username,
          password: hashedPassword})
         jwt.sign({userId:createdUser._id,username}, jwtsecret,{},(err,token)=>{
        if(err) throw err;
        res.cookie('token',token).status(201).json({
            id: createdUser._id,
            
        });
    })
    } catch(err){
        if(err) throw err;
        res.status(500).json("error");
    }
   
})

const server=app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const wss=new ws.WebSocketServer({server})

wss.on("connection",(connection,req)=>{

//read username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if(cookies){
    const tokenCookieString = cookies.split(';').find(str=>str.startsWith('token='));
    if(tokenCookieString){
        const token = tokenCookieString.split('=')[1];
        if(token){
            jwt.verify(token, jwtsecret ,{},(err,userData)=>{
                if(err) throw err;
                const{userId,username}=userData;
                connection.userId = userId;
                connection.username = username;
            })
        }
    }
}

    connection.on('message' , async (message)=>
    {
        
        const messageData= JSON.parse(message.toString());
        const {recipient, text}=messageData;
        if(recipient && text){
          const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text
            });
            [...wss.clients]
            .filter(c=> c.userId === recipient)
            .forEach(c=>c.send(JSON.stringify({
                text,
                sender:connection.userId,
                recipient,
                id:messageDoc._id,
            })))
        }
    });
    //to notify everyone about online people (when someone connects)
    [...wss.clients].forEach(client=>{
        client.send(JSON.stringify(
           { online : [...wss.clients].map(c=>({userId:c.userId,username:c.username}))}
        ))
    })
})





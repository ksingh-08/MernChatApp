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
const fs=require('fs')

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
const app=express();
const path = require('path');

// Serve static files from the 'build' directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle any requests that don’t match the static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

connectDB();
const jwtsecret=process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json())
app.use(cookieParser())
app.use(cors(  {origin: "https://mernchatapp-ju18.onrender.com", // Allow requests from this origin
  credentials: true}));



app.get('/profile',(req,res)=>{
    const token=req.cookies?.token;
    if(token){
    jwt.verify(token,jwtsecret,{},(err, userData)=>{
        if(err) throw err;
       //const {id,username}=userData;
        res.json(
            userData
        );
    })
}else{
    res.status(401).json("no token");
}
})

async function getUserDataFromRequest(req){
    return new Promise((resolve,reject)=>{
         const token=req.cookies?.token;
    if(token){
        jwt.verify(token,jwtsecret,{},(err,userData)=>{
            if(err) throw err;
            resolve(userData);
        })   
    }
    else{
            reject('no token')
        }
    })
   
}


app.get("/test",(req,res) => {
    res.json('test ok')
})

app.get('/messages/:userId',async (req,res)=>{
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req)
    const ourUserId=userData.userId;
   const messages = await Message.find({
        sender:{$in:[userId,ourUserId]},
        recipient:{$in:[userId,ourUserId]}
    }).sort({createdAt: 1})

    res.json(messages);
})

app.get('/people',async(req,res)=>{
    const users= await User.find({},{'_id':1,username:1});
    res.json(users);
})

app.post('/login',async (req,res)=>{
    const {username,password} = req.body;
   const foundUser = await User.findOne({username});
   if(foundUser){
    const passOk=bcrypt.compareSync(password,foundUser.password)
    if(passOk){
         jwt.sign({userId:foundUser._id,username}, jwtsecret,{},(err,token)=>{
        
        res.cookie('token',token, {sameSite:'none', secure:true}).json({
            id: foundUser._id,
            
        });
    })
    }
   }

})

app.post('/logout',(req,res)=>{
    res.cookie('token','',{sameSite:'none',secure:true}).json('ok');
})

app.post('/register',async (req,res)=>{
    const {username,password}=req.body;
    
    try{
        const hashedPassword = bcrypt.hashSync(password,bcryptSalt);
        const createdUser = await User.create({username : username,
          password: hashedPassword})
         jwt.sign({userId:createdUser._id,username}, jwtsecret,{},(err,token)=>{
        if(err) throw err;
        res.cookie('token',token,{sameSite:'none', secure:true}).status(201).json({
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

    function notifyAboutOnlinePeople(){
         [...wss.clients].forEach(client=>{
        client.send(JSON.stringify(
           { online : [...wss.clients].map(c=>({userId:c.userId,username:c.username}))}
        ))
    })
    }

    connection.isAlive = true;

    connection.timer=setInterval(()=>{
        connection.ping()
        connection.deathTimer=setTimeout(()=>{
            connection.isAlive=false;
            clearInterval(connection.timer)
            //console.log('dead');
            connection.terminate();
            notifyAboutOnlinePeople();
        },1000)
    },2000);

    connection.on('pong',()=>{
        clearTimeout(connection.deathTimer);
    })

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
        const {recipient, text,file}=messageData;
        let filename = null
        if(file){
            //console.log({file});
            const parts=file.name.split('.')
            const ext = parts[parts.length -1];
            filename= Date.now() + '.'+ext;
            const path =__dirname + '/uploads/' + filename;
            const bufferData = new Buffer(file.data.split(',')[1],'base64');
            fs.writeFile(path,bufferData,()=>{
                console.log('file saved:'+path)
            })
        }

        if(recipient && (text || file)){
          const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text,
                file: file ? filename : null
            });
            [...wss.clients]
            .filter(c=> c.userId === recipient)
            .forEach(c=>c.send(JSON.stringify({
                text,
                sender:connection.userId,
                recipient,
                 file: file ? filename: null,
                _id:messageDoc._id,
            })))
        }
    });
    //to notify everyone about online people (when someone connects)
   notifyAboutOnlinePeople();
})



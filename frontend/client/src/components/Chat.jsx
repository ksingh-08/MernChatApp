import {useEffect,useState,useContext,useRef} from 'react'

import Logo from './Logo';
import {UserContext} from './UserContext';
import { uniqBy } from 'lodash';
import axios from 'axios'
import Contact from './Contact';


export default function Chat(){

    const [ws,setWs]= useState(null);
    const [onlinePeople,setOnlinePeople] = useState({})
    const [selectedUserId,setSelectedUserId]=useState(null);
    const [offlinePeople,setOfflinePeople]=useState({})
    const [newMessageText,setNewMessageText] = useState('');
    const [messages,setMessages]=useState([]);
    const {username,id,setId,setUsername} = useContext(UserContext)
    const divUnderMessages = useRef();
    useEffect(()=>{
       connectToWs();
    },[])

    function connectToWs(){
        const ws = new WebSocket('ws://mernchatapp-backend-lt9f.onrender.com');

        setWs(ws);

        ws.addEventListener('message', handleMessage)
        ws.addEventListener('close',() =>{
            setTimeout(() => {
                console.log("Disconnected. Trying to reconnect")
                connectToWs();
            },1000)
        })
    }

    function showOnlinePeople(peopleArray){
        const people ={};
        peopleArray.forEach(({userId,username})=>{
            people[userId]=username;
        })
      
        setOnlinePeople(people)
    }

    function handleMessage(ev){
        const messageData=JSON.parse(ev.data);
        console.log({ev,messageData})
        if('online' in messageData){
            showOnlinePeople(messageData.online)
          
        }
        else if('text' in messageData){
            // if(messageData.sender === selectedUserId){
              setMessages(prev => ([...prev , {...messageData}]))
        }
    }

    function logout(){
        axios.post('/logout').then(()=>{
            setWs(null);
            setId(null);
            setUsername(null);
        })
    }

    function sendMessage(ev,file=null){
        
       if(ev) ev.preventDefault();
        
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,
        }));
        
    if(file){
        axios.get('/messages/'+selectedUserId).then(res => {
                setMessages(res.data)
            })
    }
    else{
        setNewMessageText('');
        setMessages(prev => ([...prev,{
        text : newMessageText, 
        sender : id,
        recipient: selectedUserId,  
        _id: Date.now(),
    }]))
    }
    
    }

    function sendFile(ev){
       const reader = new FileReader();
       reader.readAsDataURL(ev.target.files[0]);
       reader.onload = () =>{
        sendMessage(null,{
            name: ev.target.files[0].name,
            data: reader.result,
        })
       }
    }

     useEffect(()=>{
        const div = divUnderMessages.current;
        if(div){
             div.scrollIntoView({behaviour: 'smooth', block:'end'})
        }
    },[messages]);


    useEffect(() => {
        axios.get('/people').then(res=>{
            const offlinePeopleArray=res.data.filter(p => p._id !== id).filter(p => !Object.keys(onlinePeople).includes(p._id))
            const offlinePeople={};
            offlinePeopleArray.forEach(p=>{
                offlinePeople[p._id] = p;
            })
            setOfflinePeople(offlinePeople);
        })

    }, [onlinePeople])



    useEffect(()=>{
        if(selectedUserId){
            axios.get('/messages/'+selectedUserId).then(res => {
                setMessages(res.data)
            })
        }

    },[selectedUserId])
    
    const onlinePeopleExclOurUser= {...onlinePeople};
    delete onlinePeopleExclOurUser[id];

    const messagesWithoutDupes =  uniqBy(messages,'_id');

   
    return (
        <div className="flex h-screen">
            <div className="bg-white w-1/3 flex flex-col">
            <div className='flex-grow'>
                     <Logo/>

            
            {Object.keys(onlinePeopleExclOurUser).map(userId=>(
                <Contact 
                key={userId}
                id={userId} 
                online={true}
                username={onlinePeopleExclOurUser[userId]}
                onClick={()=>setSelectedUserId(userId)}
                selected={userId === selectedUserId}/>
        ))}
        {Object.keys(offlinePeople).map(userId=>(
                <Contact 
                key={userId}
                id={userId} 
                online={false}
                username={offlinePeople[userId].username}
                onClick={()=>setSelectedUserId(userId)}
                selected={userId === selectedUserId}/>
        ))}
            </div>
           
        <div className='p-2 text-center flex items-center justify-between'>
           <span className='mr-2 text-sm text-gray-600 flex items-center'> 
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
</svg>
 {username}</span>
            <button 
            onClick={logout}
            className='text-sm text-gray-500 bg-blue-100 py-1 px-2 border rounded-sm'> Logout</button>
            </div>
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2"><div className="flex-grow">
                {!selectedUserId && (<div className='flex h-full items-center justify-center '>
                    <div className='text-gray-350'>&larr; Select a person from the sidebar</div></div>)}
                    {selectedUserId && (
                        
                        <div className='relative h-full '>
                        <div className='overflow-y-scroll absolute top-0 left-0 right-0 bottom-2'>
                        {messagesWithoutDupes.map(message => (
                          <div key={message.id}className={(message.sender === id ? 'text-right': 'text-left')}>
                            <div className={'text-left inline-block p-2.5 my-1 rounded-md text-sm '+ (message.sender === id ? 'bg-blue-500 text-white':'bg-white text-gray-700')}>
                          {message.text}
                          {message.file && (
                            <div>
                                <a target="blank" className='underline' href={axios.defaults.baseURL+'/uploads/'+ message.file}>
                                {message.file}
                                </a>
                            </div>
                          )}
                           </div>
                           </div>
                        ))}
                           <div ref={divUnderMessages}></div>
                    </div>
                </div>
                )}
                </div>
            {selectedUserId && (<form className="flex gap-2" onSubmit={sendMessage}>
                <input type="text" 
                value={newMessageText} onChange={ev => setNewMessageText(ev.target.value)}placeholder="Type your message here" className="bg-white border p-2 flex-grow rounded-sm"/>
                <label type='button' className='bg-blue-200 p-2 text-gray-600 rounded-sm border border-blue-200 cursor-pointer'>
                    <input type='file' className='hidden' onChange={sendFile}/>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
  <path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 0 0-5.304 0l-4.5 4.5a3.75 3.75 0 0 0 1.035 6.037.75.75 0 0 1-.646 1.353 5.25 5.25 0 0 1-1.449-8.45l4.5-4.5a5.25 5.25 0 1 1 7.424 7.424l-1.757 1.757a.75.75 0 1 1-1.06-1.06l1.757-1.757a3.75 3.75 0 0 0 0-5.304Zm-7.389 4.267a.75.75 0 0 1 1-.353 5.25 5.25 0 0 1 1.449 8.45l-4.5 4.5a5.25 5.25 0 1 1-7.424-7.424l1.757-1.757a.75.75 0 1 1 1.06 1.06l-1.757 1.757a3.75 3.75 0 1 0 5.304 5.304l4.5-4.5a3.75 3.75 0 0 0-1.035-6.037.75.75 0 0 1-.354-1Z" clipRule="evenodd" />
</svg>

                </label>
                    

                <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm ">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />

                </svg>
                </button>

                </form>)}
            
            </div>
            
        </div>
    )
}
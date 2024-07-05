import Register from "./Register";
import {useContext} from "react";
import{UserContext, UserContextProvider} from "./UserContext.jsx"
import Chat from "./Chat.jsx";

export default function Routes(){
    const{username,id} = useContext(UserContext);

    if(username){
        
        return <Chat/>;
         
    }
    return(
        <Register/>
    );
}
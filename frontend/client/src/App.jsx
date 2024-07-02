import './App.css'
import axios from 'axios'
import UserContext, { UserContextProvider } from './components/UserContext'
import Routes from './components/Routes'
function App() {
 axios.defaults.baseURL='http://localhost:4040';
 axios.defaults.withCredentials=true;
 
  return (
    <div>
      <UserContextProvider>
        <Routes/>
        </UserContextProvider>
    </div>
  )
}

export default App

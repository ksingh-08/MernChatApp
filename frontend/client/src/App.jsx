import './App.css'
import axios from 'axios'
import  { UserContextProvider } from './components/UserContext'
import { BrowserRouter as Router } from 'react-router-dom';
import Routes from './components/Routes'
function App() {
 axios.defaults.baseURL='http://localhost:4040';
 axios.defaults.withCredentials=true;

  return (
    
      <UserContextProvider>
         <Router>
                <Routes />
            </Router>
        </UserContextProvider>
    
  )
}

export default App

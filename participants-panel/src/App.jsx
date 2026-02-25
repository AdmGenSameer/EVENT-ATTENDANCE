import { useState } from 'react'
import Header from './components/Header'
import TicketCard from './components/TicketCard'
import Form from './components/Form'

function App() {
  const [count, setCount] = useState(0)
  const [showTicketCard, setShowTicketCard] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [message, setMessage] = useState("");

  const setMessageWithTimeout = (msg) => {
    setMessage(msg);
    setTimeout(() => {
      setMessage("");
    }, 2000); // Clear message after 3 seconds
  }

  const ErrorToast = ({ message }) => {
    if (!message) return null;
    return (
      <div className="fixed top-5 right-5 z-50 animate-slide-in">
        <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
          <span className="text-xl">❌</span>
          <p className="font-medium">{message}</p>
        </div>
      </div>
    )
  }

  return (
   <>
   <ErrorToast message={message} />
      <Header/>
      <Form setRegNo={setRegNo} setShowTicketCard={setShowTicketCard} msg={setMessageWithTimeout} regNo={regNo}/>
      {showTicketCard && <TicketCard onclose={()=>setShowTicketCard(false)} regNo={regNo} />}
      
   </>
  )
}

export default App

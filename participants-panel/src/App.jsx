import { useState } from 'react'
import Header from './components/Header'
import TicketCard from './components/TicketCard'
import Form from './components/Form'

function App() {
  const [showTicketCard, setShowTicketCard] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [message, setMessage] = useState("");

  const setMessageWithTimeout = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
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
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <ErrorToast message={message} />
      <Header/>
      <Form setRegNo={setRegNo} setShowTicketCard={setShowTicketCard} msg={setMessageWithTimeout} regNo={regNo}/>
      {showTicketCard && <TicketCard onClose={()=>setShowTicketCard(false)} regNo={regNo} />}
      {/* Decorative SVG */}
      <svg className="absolute bottom-0 right-0 w-64 h-64 opacity-10" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#3b82f6"/>
      </svg>
    </div>
  )
}

export default App

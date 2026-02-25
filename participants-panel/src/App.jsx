import { useState } from 'react'
import Header from './components/Header'
import TicketCard from './components/TicketCard'
import Form from './components/Form'

function App() {
  const [count, setCount] = useState(0)
  const [showTicketCard, setShowTicketCard] = useState(true);

  return (
   <>
      <Header/>
      <Form/>
      {showTicketCard && <TicketCard onclose={()=>setShowTicketCard(false)} />}
      
   </>
  )
}

export default App

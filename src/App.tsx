
import './App.css'
import DriverData from "./components/driverData.tsx";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PitTable from './components/pitTable';
import LiveStandings from './components/LiveStandings';


function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DriverData />} />
          <Route path="/table" element={<PitTable />} />
          <Route path="/standings" element={<LiveStandings />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App

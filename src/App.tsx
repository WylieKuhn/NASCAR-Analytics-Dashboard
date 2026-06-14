
import './App.css'
import DriverData from "./components/driverData.tsx";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PitTable from './components/pitTable';


function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DriverData />} />
          <Route path="/table" element={<PitTable />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App

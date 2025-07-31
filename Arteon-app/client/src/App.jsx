import './app.css'
import Gallery from './components/Gallery/Gallery'
import LeftBar from './components/LeftBar/LeftBar'
import TopBar from './components/TopBar/TopBar'

const App = () => {
  return (
    <div className='app'>
      <LeftBar></LeftBar>
      <div className="content">
        <TopBar></TopBar>
        <Gallery></Gallery>
      </div>
    </div>
  )
}

export default App
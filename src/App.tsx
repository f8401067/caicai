import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Records from "./pages/Records";
import My from "./pages/My";
import Scan from "./pages/Scan";
import NewRecord from "./pages/NewRecord";
import History from "./pages/History";
import Stats from "./pages/Stats";
import { TabBar } from "./components/layout/TabBar";

/**
 * 应用根组件
 * 使用 React Router 管理路由，包含底部 Tab 导航栏
 * 所有页面在深色背景下展示，底部保留 TabBar 空间
 */
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/records" element={<Records />} />
          <Route path="/my" element={<My />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/records/new" element={<NewRecord />} />
          <Route path="/my/history" element={<History />} />
          <Route path="/my/stats" element={<Stats />} />
        </Routes>
        <TabBar />
      </div>
    </Router>
  );
}

export default App;

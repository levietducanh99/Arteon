import { Outlet } from "react-router";
import LeftBar from "../components/LeftBar/LeftBar";
import TopBar from "../components/TopBar/TopBar";
import "./MainLayout.css";

export const MainLayout = () => {
  return (
    <div className="app">
      <LeftBar></LeftBar>
      <div className="content">
        <TopBar></TopBar>
        <Outlet />
      </div>

    </div>
  );
};

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import { MainLayout } from "./layout/MainLayout.jsx";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
// import { HomePage } from "./routes/homepage/HomePage.jsx";
// import { AuthPage } from "./routes/authpage/AuthPage.jsx";
// import { PostPage } from "./routes/postPage/PostPage.jsx";
// import { SearchPage } from "./routes/searchPage/SearchPage.jsx";
// import { CreatePage } from "./routes/createPage/CreatePage.jsx";
// import { ProfilePage } from "./routes/profilePage/ProfilePage.jsx";

const HomePage = React.lazy(() => import("./routes/homepage/HomePage"));
const AuthPage = React.lazy(() => import("./routes/authpage/AuthPage"));
const PostPage = React.lazy(() => import("./routes/postPage/PostPage"));
const SearchPage = React.lazy(() => import("./routes/searchPage/SearchPage"));
const CreatePage = React.lazy(() => import("./routes/createPage/CreatePage"));
const ProfilePage = React.lazy(() =>
  import("./routes/profilePage/ProfilePage")
);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />}></Route>
            <Route path="/pin/:id" element={<PostPage />}></Route>
            <Route path="/:username" element={<ProfilePage />}></Route>
            <Route path="/search" element={<SearchPage />}></Route>
          </Route>
          <Route path="/auth" element={<AuthPage />}></Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

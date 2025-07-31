import React, { useState } from "react";
import { useNavigate } from "react-router";
import "./AuthPage.css";
import Image from "../../components/image/image";
import apiRequest from "../../utils/apiRequest";
import useAuthStore from "../../utils/storeAuth";

const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(false);

  const navigate = useNavigate();

  const { setCurrentUser } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = Object.fromEntries(formData);

    if (isRegister && data.password !== data.reEnterPassword) {
      setError("Password do not match!!");
      return;
    }

    // console.log(data);
    delete data.reEnterPassword;

    try {
      const res = await apiRequest.post(
        `/users/auth/${isRegister ? "register" : "login"}`,
        data
      );

      setCurrentUser(res.data);

      navigate("/");
      // console.log(res.data);
    } catch (err) {
      setError(err.response.data.message);
    }

    setError(false);

    // console.log(data);
  };
  ``;

  return (
    <div className="authPage">
      <div className="authContainer">
        <Image path="/general/logo.png" w={36} h={36}></Image>
        <h1>{isRegister ? "Create an account" : "Login to your account"}</h1>
        {isRegister ? (
          <form key="register" onSubmit={handleSubmit}>
            <div className="formGroup">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                placeholder="Username"
                id="username"
                required
                name="username"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="displayName">Display name</label>
              <input
                type="text"
                placeholder="Display name"
                id="displayName"
                required
                name="displayName"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email"
                id="email"
                required
                name="email"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                placeholder="Password"
                id="password"
                required
                name="password"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="re-enter password">Re-enter password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                id="re-enterPassword"
                required
                name="reEnterPassword"
              />
            </div>
            <button type="submit">Register</button>
            <p onClick={() => setIsRegister(false)}>
              Already have an account?
              <b>Login</b>
            </p>
            {error && <p className="error">{error}</p>}
          </form>
        ) : (
          <form key="login" onSubmit={handleSubmit}>
            <div className="formGroup">
              <label htmlFor="email">Email</label>
              <input type="email" placeholder="Email" id="email" name="email" />
            </div>
            <div className="formGroup">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                placeholder="Password"
                id="password"
                name="password"
              />
            </div>
            <button type="submit">Login</button>
            <p onClick={() => setIsRegister(true)}>
              Don&apos;t have an account?
              <b>Register</b>
            </p>
            {error && <p className="error">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
};


export default AuthPage;
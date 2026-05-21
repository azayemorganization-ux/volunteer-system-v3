import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import axios from "axios";

// 🔥 إعداد الـ baseURL للـ API بشكل مباشر وداخلي لتجنب استدعاء ملفات خارجية
const setBaseUrl = (url: string) => {
  axios.defaults.baseURL = url;
};
setBaseUrl("https://volunteer-system-api-server-pearl.vercel.app/api");

// 🔥 مهم جداً: تفعيل إرسال الكوكي لكل الطلبات
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")!).render(<App />);

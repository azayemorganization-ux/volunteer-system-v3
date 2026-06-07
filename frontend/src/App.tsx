import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Success from "./pages/success";
import AdminLogin from "./pages/admin-login";
import AdminDashboard from "./pages/admin-dashboard";
import StatusCheck from "./pages/status";
import ProfilePage from "./pages/profile"; 
import AdvancedScannerPage from "./pages/verify"; // 👈 [إضافة 1] استدعاء صفحة الفحص الجديدة بأمان

const queryClient = new QueryClient();

// 🛑 1. مكون شاشة الصيانة الشيك اللي هتظهر للمتطوعين (لم يتم تعديلها)
function MaintenancePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', direction: 'rtl', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ fontSize: '70px' }}>⚠️</div>
      <h1 style={{ color: '#dc2626', marginTop: '20px', fontSize: '28px' }}>النظام تحت الصيانة والتحديث المؤقت</h1>
      <p style={{ fontSize: '18px', color: '#4b5563', maxWidth: '500px', lineHeight: '1.6' }}>
        نسعى لتطوير النظام لخدمتكم بشكل أفضل.. سيعود العمل قريباً جداً يا أبطال.
      </p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/success" component={Success} />
      <Route path="/status" component={StatusCheck} />

      {/* المسار الذكي لبيانات المتطوع (الخاص بالـ QR Code) */}
      <Route path="/profile/:id" component={ProfilePage} />

      {/* 👈 [إضافة 2] مسار بوابة التدقيق السريع عبر الكاميرا والملفات */}
      <Route path="/verify" component={AdvancedScannerPage} />

      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // 🔓 2. تم إيقاف قفل الصيانة وفتح النظام للجميع بنجاح (متروك كما هو تماماً)
  const IS_MAINTENANCE = false; // 👈 رجعناها false عشان الموقع يفتح للمتطوعين طبيعي
  const SECRET_KEY = "jabal";    // 🤫 البصمة السرية بتاعتك

  // فحص الرابط: لو ضفت في آخر الرابط ?secret=jabal هيحفظ المتصفح إنك المطور
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get("secret") === SECRET_KEY) {
    localStorage.setItem("maintenance_bypass", "true");
  }

  // التأكد هل المتصفح ده عنده إذن تخطي الصيانة ولا لأ
  const isAllowed = localStorage.getItem("maintenance_bypass") === "true";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, "") : ""}>
          
          {/* 🛑 3. الفلتر السحري: لو الصيانة شغالة وأنت مش المطور، اظهر صفحة الصيانة.. غير كدا افتح الموقع طبيعي */}
          {IS_MAINTENANCE && !isAllowed ? <MaintenancePage /> : <Router />}

        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

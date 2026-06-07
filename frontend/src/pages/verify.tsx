import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Html5Qrcode } from "html5-qrcode";

export default function AdvancedScannerPage() {
  const [, setLocation] = useLocation();
  
  // التحكم في شاشة الترحيب الافتتاحية
  const [showSplash, setShowSplash] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"file" | "manual">("file");
  const [idInput, setIdInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // شاشة الترحيب الافتتاحية تنتهي بعد 2.5 ثانية
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    setErrorMessage(null);
  }, [activeTab]);

  // معالجة قراءة وتحليل صورة البطاقة المرفوعة
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);
    setIsScanning(true);
    setErrorMessage(null);

    try {
      const html5QrCode = new Html5Qrcode("file-scanner-buffer");
      const result = await html5QrCode.scanFile(file, true);
      
      if (result) {
        extractAndNavigate(result);
      }
    } catch (err) {
      console.error(err);
      // 🛠️ 1. تأخير مصطنع ثانيتين في حالة الفشل عشان الليزر يظهر للمستخدم
      setTimeout(() => {
        setErrorMessage("يبدو أن جودة الصورة غير واضحة لذلك لم نتمكن من قراءة رمز الـ QR.. الرجاء رفع صورة واضحة وبجودة ممتازة.");
        setIsScanning(false);
      }, 2000);
    }
  };

  // دالة التوجيه عند النجاح (مع تأخير ثانيتين)
  const extractAndNavigate = (text: string) => {
    const match = text.match(/SRCS-2026-\d+/i);
    if (match) {
      setTimeout(() => {
        setLocation(`/profile/${match[0].toUpperCase()}`);
      }, 2000); 
    } else {
      setTimeout(() => {
        setErrorMessage("الرمز الممسوح غير مسجل في منظومة أكواد متطوعي المحلية.");
        setIsScanning(false);
      }, 2000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idInput.length === 4) {
      setLocation(`/profile/SRCS-2026-${idInput}`);
    }
  };

  // ========================================================
  // 🎬 1. واجهة شاشة الترحيب الاحترافية الحرة (Splash Screen)
  // ========================================================
  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 antialiased" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <div className="text-center space-y-6 select-none animate-[fadeIn_0.5s_ease-out]">
          
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl border border-red-50 animate-[pulse_1.8s_infinite]">
            <span className="text-5xl">❤️</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">بوابة الفحص الرقمية</h1>
            <p className="text-xs text-slate-400 font-bold tracking-widest">جمعية الهلال الأحمر السوداني — جبل أولياء</p>
          </div>
          
          <div className="w-36 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-red-600 rounded-full animate-[loadingBar_1.5s_ease-in-out_infinite] w-1/2"></div>
          </div>

        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes loadingBar {
            0% { transform: translateX(200%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    );
  }

  // ========================================================
  // 📱 2. واجهة صفحة الفحص المفتوحة (بعد التعديلات الشاملة)
  // ========================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 animate-[fadeIn_0.4s_ease-out] antialiased font-sans" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* هيدر الصفحة المحدث بحسب طلبك وبدون رموز عشوائية */}
      <div className="w-full max-w-sm text-center mb-8 relative z-10">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">افحص بطاقتك الرقمية وبياناتك</h1>
        <p className="text-xs text-slate-500 mt-1.5 font-bold">نافذة التحقق الميداني الفوري الموحدة</p>
      </div>

      {/* لوحة خيارات حرة عائمة */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
        <button
          onClick={() => setActiveTab("file")}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all duration-200 ${
            activeTab === "file"
              ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          البطاقة الرقمية
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all duration-200 ${
            activeTab === "manual"
              ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          رقم القيد
        </button>
      </div>

      {/* ساحة العمل والعرض الحرة المفتوحة كلياً */}
      <div className="w-full max-w-sm space-y-4">

        {/* 🛠️ لوحة ارفاق صورة البطاقة على شكل كارد مع زرار صريح وتنبيه ناعم */}
        {activeTab === "file" && (
          <div className="space-y-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative bg-white border border-slate-200 shadow-xl rounded-[2rem] overflow-hidden aspect-square flex flex-col items-center justify-center cursor-pointer group transition-all"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

              {imagePreview ? (
                <div className="w-full h-full relative p-3 bg-slate-50 flex items-center justify-center">
                  <img src={imagePreview} alt="البطاقة المرفوعة" className="w-full h-full object-contain rounded-2xl shadow-inner" />
                  
                  {/* خط الليزر فوق صورة البطاقة مباشرة في حال الفحص */}
                  {isScanning && (
                    <div className="absolute left-0 right-0 h-[3px] bg-red-600 shadow-[0_0_15px_#dc2626] animate-[laser_2.5s_ease-in-out_infinite]"></div>
                  )}
                </div>
              ) : (
                // واجهة الكارد المفتوح الحر مع زر الإدخال الصريح المكتوب
                <div className="text-center p-8 space-y-4">
                  <p className="text-base font-black text-slate-800">ارفع صورة البطاقة المراد فحصها</p>
                  
                  {/* 🛠️ الزرار الصريح الواضح لمنع الضغط بالصدفة */}
                  <button type="button" className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all group-hover:scale-105">
                    اضغط هنا لاختيار البطاقة من المعرض
                  </button>
                </div>
              )}
            </div>

            {/* 🛠️ تنبيه جودة الصورة المسبق باللغة السهلة المفهومة */}
            {!imagePreview && (
              <p className="text-[11px] text-slate-400 text-center font-semibold px-4 leading-relaxed">
                تنبيه: إذا كانت الصورة غير واضحة وجودتها ضعيفة، فلن يتمكن النظام من قراءة رمز الـ QR، لذلك يرجى التأكد من جودة الصورة قبل رفعها.
              </p>
            )}
          </div>
        )}

        {/* 🛠️ خانة الإدخال اليدوي الموحدة والمضبوطة الاتجاه بالملي (SRCS باليسار والأرقام تتبعها لليمين) */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200 shadow-xl rounded-[2rem] p-6 space-y-5">
            <p className="text-center text-xs text-slate-500 font-bold">أدخل رقم المتطوع لفحصه في السجل الميداني</p>
            
            {/* 🛠️ قلب الاتجاه ليكون LTR صريح لتظهر الخانات باليمين في آخر السطر تماماً */}
            <div className="flex flex-row items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 font-mono text-xl tracking-wider text-center focus-within:border-red-500 focus-within:bg-white transition-all shadow-inner" dir="ltr">
              <span className="text-slate-400 select-none font-black text-xl">SRCS-2026-</span>
              <input
                type="text"
                maxLength={4}
                placeholder="0000"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value.replace(/\D/g, ""))}
                className="bg-transparent text-slate-800 font-black w-16 focus:outline-none placeholder-slate-300 text-xl caret-red-600 ml-1 text-left"
              />
            </div>

            <button
              type="submit"
              disabled={idInput.length !== 4}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-red-600/10"
            >
              🔍 فحص السجل الميداني
            </button>
          </form>
        )}

        {/* رسائل التنبيه والخطأ بالصياغة اللغوية السهلة المفهومة التي طلبتها */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 text-center font-black leading-relaxed shadow-sm">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* مؤشر المعالجة اللطيف */}
        {isScanning && activeTab === "file" && (
          <p className="text-center text-xs text-emerald-600 font-bold animate-pulse">
            ⚙️ جاري التدقيق البصري لبيانات البطاقة بالليزر الرقمي...
          </p>
        )}
      </div>

      {/* تذييل أمني يعزز الطابع الرسمي للمنظومة */}
      <div className="text-center mt-12 opacity-60">
        <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
          جمعية الهلال الأحمر السوداني - فرع ولاية الخرطوم <br/>
          نافذة التحقق الفوري الميدانية الموحدة 2026
        </p>
      </div>

      <div id="file-scanner-buffer" className="hidden"></div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes laser {
          0% { top: 5%; opacity: 0.4; }
          50% { top: 92%; opacity: 1; }
          100% { top: 5%; opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Html5Qrcode } from "html5-qrcode";

export default function AdvancedScannerPage() {
  const [, setLocation] = useLocation();
  // 🛠️ 1. تحديد خيار الرفع كافتراضي لتبسيط الواجهة وحذف الكاميرا
  const [activeTab, setActiveTab] = useState<"file" | "manual">("file");
  const [idInput, setIdInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [activeTab]);

  // معالجة قراءة وتحليل صورة البطاقة المرفوعة
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // إظهار معاينة الصورة فوراً للمتطوع (حل مشكلة عشوائية الخلفية)
    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);
    setIsScanning(true); // تفعيل الليزر الحركي فوراً
    setErrorMessage(null);

    try {
      const html5QrCode = new Html5Qrcode("file-scanner-buffer");
      const result = await html5QrCode.scanFile(file, true);
      
      if (result) {
        // قراءة الـ QR ناجحة، نمرر الداتا لدالة التوجيه الذكي
        extractAndNavigate(result);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("لم نتمكن من العثور على رمز QR واضح في الصورة. تأكد من وضوح الإضاءة.");
      setIsScanning(false);
    }
  };

  // دالة التوجيه مع إضافة "التأخير السينمائي" لرؤية الليزر
  const extractAndNavigate = (text: string) => {
    const match = text.match(/SRCS-2026-\d+/i);
    if (match) {
      // 💥 2. التأخير المصطنع (2 ثانية) لإعطاء وقت لعرض حركة الليزر فوق البطاقة
      setTimeout(() => {
        setLocation(`/profile/${match[0].toUpperCase()}`);
      }, 2000); // 2000ms delay
    } else {
      setErrorMessage("الرمز الممسوح غير مسجل في منظومة أكواد متطوعي المحلية.");
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idInput.length === 4) {
      setLocation(`/profile/SRCS-2026-${idInput}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 antialiased font-sans" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* الهيدر الحر المفتوح في الأعلى بدون قيود القلب والرموز */}
      <div className="w-full max-w-sm text-center mb-8 relative z-10">
        {/* تم حذف القلب ❤️ */}
        <h1 className="text-2xl font-black tracking-tight text-slate-900">افحص بطاقتك الرقمية وبياناتك</h1>
        <p className="text-xs text-slate-500 mt-1.5 font-bold">جمعية الهلال الأحمر السوداني - جبل أولياء</p>
      </div>

      {/* 🛠️ لوحة خيارات حرة عائمة (حذف تبويب الكاميرا وحذف الرموز) */}
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

        {/* 🛠️ لوحة الرفع المفتوحة (حذف أيقونة الصندوق 📥 والصناديق الداخلية) */}
        {activeTab === "file" && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative bg-white border border-slate-200 shadow-xl rounded-[2rem] overflow-hidden aspect-square flex flex-col items-center justify-center cursor-pointer group transition-all"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {imagePreview ? (
              // عرض البطاقة المرفوعة في الخلفية بوضوح تام
              <div className="w-full h-full relative p-3 bg-slate-50 flex items-center justify-center">
                <img src={imagePreview} alt="البطاقة المرفوعة" className="w-full h-full object-contain rounded-2xl shadow-inner" />
                
                {/* تأثير خط الليزر الأحمر المضيء السينمائي فوق صورة البطاقة مباشرة */}
                {isScanning && (
                  <div className="absolute left-0 right-0 h-[3px] bg-red-600 shadow-[0_0_15px_#dc2626] animate-[laser_2.5s_ease-in-out_infinite]"></div>
                )}
              </div>
            ) : (
              // واجهة الرفع الافتراضية المفتوحة والحرّة
              <div className="text-center p-8 space-y-3">
                <div className="flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    {/* تم حذف أيقونة 📥 وإبقاء النص الحر */}
                </div>
                <p className="text-sm font-black text-slate-800">ارفع صورة البطاقة المراد فحصها</p>
                <p className="text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed font-medium">سيقوم النظام بمسح وقراءة رمز الـ QR تلقائياً من الصورة المرفقة</p>
              </div>
            )}
          </div>
        )}

        {/* 🛠️ إدخال يدوي مضبوط المقاس والوزن وتصحيح الترتيب كلياً (SRCS-2026- على اليمين) */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200 shadow-xl rounded-[2rem] p-6 space-y-5">
            <p className="text-center text-xs text-slate-500 font-bold">أدخل رقم المتطوع لفحصه في السجل الميداني</p>
            
            {/* القالب الموحد الأحجام والمضبوط بالترتيب الصح `Fixed Text` -> `Input` (من اليمين لليسار) */}
            <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 font-mono text-xl tracking-wider text-center focus-within:border-red-500 focus-within:bg-white transition-all shadow-inner">
              <span className="text-slate-400 select-none font-black text-xl">SRCS-2026-</span>
              <input
                type="text"
                maxLength={4}
                placeholder="0000"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value.replace(/\D/g, ""))}
                className="bg-transparent text-slate-800 font-black w-16 focus:outline-none placeholder-slate-300 text-xl caret-red-600 mr-1 text-right"
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

        {/* رسائل التنبيه والخطأ بتصميم ناعم ومطابق للهوية الرسمية */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 text-center font-black leading-relaxed shadow-sm">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* مؤشر المعالجة تحت اللوحة المفتوحة */}
        {isScanning && activeTab === "file" && (
          <p className="text-center text-xs text-emerald-600 font-bold animate-pulse">
            ⚙️ جاري التدقيق البصري لبيانات البطاقة بالليزر الرقمي...
          </p>
        )}
      </div>

      {/* تذييل أمني يعزز الطابع الرسمي للمنظومة (المتروك كما هو) */}
      <div className="text-center mt-12 opacity-60">
        <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
          جمعية الهلال الأحمر السوداني - فرع ولاية الخرطوم <br/>
          نافذة التحقق الفوري الميدانية الموحدة 2026
        </p>
      </div>

      {/* بافر داخلي مخفي لمعالجة ملفات الـ QR برمجياً */}
      <div id="file-scanner-buffer" className="hidden"></div>

      {/* كود حقن حركة الليزر الانسيابية لضمان الأداء الفخم على الهواتف */}
      <style>{`
        @keyframes laser {
          0% { top: 5%; opacity: 0.4; }
          50% { top: 92%; opacity: 1; }
          100% { top: 5%; opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
